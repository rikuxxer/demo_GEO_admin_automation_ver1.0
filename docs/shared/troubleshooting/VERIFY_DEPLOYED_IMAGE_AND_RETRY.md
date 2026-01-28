# デプロイ済みイメージと「重複時リトライ」の確認手順

## 状況

- POST /api/projects が 500: `project_id "PRJ-1" already exists. Please use a different project_id.`
- リポジトリには「project_id 未指定時のみ、重複時に最大5回まで再採番してリトライ」する処理が入っている（`backend/src/index.ts`）。
- Cloud Run が参照しているイメージ: `asia-northeast1-docker.pkg.dev/.../universegeo@sha256:59f90926...`
- **その digest のイメージが、リトライ修正を含むビルドかどうかは未確認。**

## 1. 現在のリビジョンとイメージを確認する

Cloud Shell またはローカルで:

```bash
# サービス名は環境に合わせて変更（例: universegeo-00378-44v）
gcloud run services describe universegeo-00378-44v \
  --region=asia-northeast1 \
  --project=univere-geo-demo \
  --format="yaml(spec.template.spec.containers[0].image,metadata.annotations)"
```

- `spec.template.spec.containers[0].image` に digest 付きのイメージ URL が出る。
- 先頭が `sha256:59f90926...` かどうかで、今動いているイメージを特定できる。

リビジョンの作成日時を確認する例:

```bash
gcloud run revisions list \
  --service=universegeo-00378-44v \
  --region=asia-northeast1 \
  --project=univere-geo-demo \
  --format="table(metadata.name,status.conditions[0].lastTransitionTime,spec.containers[0].image)"
```

- 先頭リビジョンの `lastTransitionTime` が「リトライ修正を入れたデプロイ」の日時より前なら、そのリビジョンには修正が入っていない可能性が高い。

## 2. ログで「リトライが動いているか」を確認する

1. コンソール: **Cloud Run → 該当サービス → ログ**
2. POST /api/projects を実行して 500 を再現する。
3. 同じリクエストのログで、次のメッセージを探す:
   - `⚠️ project_id重複のため再採番します: PRJ-2 (attempt 2/5)` のような行
   - `⚠️ project_id重複エラーを検知:` の行

- **これらのログが一切出ない**場合、現在のコンテナにはリトライ処理が入っていない（= 59f90926 が古いビルドの可能性が高い）。
- **出ているのに 500 のまま**なら、`generateNextProjectId()` が毎回同じ ID（例: PRJ-1）を返しているか、別要因を疑う。

## 3. 最新コードで再デプロイして digest を更新する

「リトライ」を含むコードが確実に載ったイメージで動かすには、**現在のリポジトリから改めてビルド・デプロイ**する。

- GitHub Actions でデプロイしている場合: main に push してワークフローを実行し、成功後に上記の `gcloud run services describe` で **新しいイメージ digest** に変わっているか確認する。
- 手元でビルドして Cloud Run にデプロイする場合:
  - コンテナをビルドして Artifact Registry に push。
  - `gcloud run deploy ... --image=...` で、その新しいイメージを指定してデプロイ。

デプロイ後、再度 POST /api/projects（project_id 未指定）で新規作成を試す。  
リトライが効いていれば、重複時は「再採番します」のログのあと PRJ-2, PRJ-3... で作成が試行され、成功するか、最大5回で 500 になる。

## 4. Artifact Registry のイメージの日時を確認する（任意）

一覧の `--format=json` に `updateTime` などを含めると、いつ push されたイメージか分かる。

```bash
gcloud artifacts docker images list \
  "asia-northeast1-docker.pkg.dev/univere-geo-demo/universegeo/universegeo" \
  --include-tags \
  --format="json" \
  | jq '.[] | {version: .version, updateTime: .updateTime}'
```

- `version` が `sha256:59f90926...` の行の `updateTime` と、「リトライ修正を入れたコミットの日時」を比較する。
- updateTime が修正より前なら、その digest にはリトライが含まれていない。

## まとめ

| 確認内容 | コマンド・場所 |
|----------|----------------|
| 今動いているイメージ digest | `gcloud run services describe` の `spec.template.spec.containers[0].image` |
| リビジョンの作成日時 | `gcloud run revisions list` の `lastTransitionTime` |
| リトライが実行されているか | Cloud Run ログで「再採番します」「重複エラーを検知」を検索 |
| イメージの push 日時 | `gcloud artifacts docker images list --format=json` + jq で `updateTime` |

**まだ 500 が出る場合:** 上記のとおり「現在のイメージにリトライが入っているか」をログまたはリビジョン・イメージの日時で確認し、必要なら現在の main から再デプロイして新しい digest で動かす。
