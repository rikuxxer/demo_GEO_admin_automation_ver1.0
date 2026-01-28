# エラー分析: POST /api/projects 500 と favicon.ico 404

## エラー1: favicon.ico 404 (Not Found)

### エラーメッセージ
```
GET https://universegeo-223225164238.asia-northeast1.run.app/favicon.ico 404 (Not Found)
```

### 原因
- `index.html` に favicon のリンクタグがない
- `src/public/favicon.svg` は存在するが、HTMLで参照されていない
- ブラウザが自動的に `/favicon.ico` をリクエストするが、ファイルが存在しない

### 影響
- **無害**: アプリケーションの動作には影響しない
- ブラウザのコンソールにエラーが表示されるだけ

### 修正方法
`index.html` の `<head>` セクションに favicon のリンクを追加:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>UNIVERSEGEO案件管理ツール (コピー)</title>
</head>
```

または、`public/favicon.ico` を作成して配置する。

---

## エラー2: POST /api/projects 500 (Internal Server Error)

### エラーメッセージ
```
POST https://universegeo-backend-i5xw76aisq-an.a.run.app/api/projects 500 (Internal Server Error)
```

### スタックトレース
```
createProject @ index-Dp496NP2.js:44
createProject @ index-Dp496NP2.js:83
onSubmit @ index-Dp496NP2.js:83
```

### 原因の可能性

#### 1. **リトライ処理がまだ動いていない（最も可能性が高い）**
- 以前の会話で「project_id "PRJ-1" already exists」のエラーに対応するため、リトライ処理を追加した
- しかし、**Cloud Run が古いイメージ（`sha256:59f90926...`）を参照している可能性がある**
- 新しいイメージがデプロイされていない、またはデプロイが完了していない

#### 2. **リトライが5回すべて失敗している**
- `generateNextProjectId()` が毎回同じ ID（例: PRJ-1）を返している
- または、BigQuery のテーブル参照に問題がある（データセット名、プロジェクトIDの不一致など）

#### 3. **リトライ以外のエラー**
- 環境変数（`GCP_PROJECT_ID`, `BQ_DATASET`）が設定されていない
- BigQuery への接続エラー
- 権限エラー

### 確認手順

#### ステップ1: Cloud Run のログを確認
1. GCP コンソール → Cloud Run → `universegeo-backend-i5xw76aisq-an`
2. **ログ**タブを開く
3. POST /api/projects を実行して 500 を再現
4. 同じリクエストのログで以下を確認:

**リトライ処理が動いている場合、以下のログが出るはず:**
```
⚠️ project_id重複のため再採番します: PRJ-2 (attempt 2/5)
⚠️ project_id重複エラーを検知: project_id "PRJ-1" already exists...
```

**これらのログが一切出ない場合:**
- 現在のコンテナにはリトライ処理が入っていない（古いイメージ）
- → **最新コードから再デプロイが必要**

#### ステップ2: エラーレスポンスの詳細を確認
ブラウザの開発者ツール → Network タブ → POST /api/projects のレスポンスを確認:

```json
{
  "error": "project_id \"PRJ-1\" already exists. Please use a different project_id.",
  "type": "Error",
  ...
}
```

このメッセージが「already exists」なら、リトライ処理が効いていない可能性が高い。

#### ステップ3: 現在のイメージ digest を確認
```bash
gcloud run services describe universegeo-backend-i5xw76aisq-an \
  --region=asia-northeast1 \
  --project=univere-geo-demo \
  --format="value(spec.template.spec.containers[0].image)"
```

- 出力された digest が `sha256:59f90926...` のままなら、古いイメージが動いている
- 最新のコミット（`7db80239`）からビルドされた新しい digest に変わっているか確認

#### ステップ4: GitHub Actions のデプロイ状況を確認
1. GitHub → Actions タブ
2. 最新のワークフロー実行を確認
3. 成功しているか、失敗しているか
4. 成功していても、Cloud Run のリビジョンが更新されているか確認

### 修正方法

#### 方法1: 最新コードから再デプロイ（推奨）
1. 現在の main ブランチが最新であることを確認
2. GitHub Actions でデプロイを実行（または手動でデプロイ）
3. デプロイ完了後、Cloud Run のイメージ digest が更新されたか確認
4. 再度 POST /api/projects を試す

#### 方法2: Cloud Run のログで原因を特定
- ログに「再採番します」が出ない → リトライ処理が入っていない → 再デプロイが必要
- ログに「再採番します」が出るが、5回すべて失敗 → `generateNextProjectId()` の問題を調査
- ログに環境変数エラー → Cloud Run の環境変数設定を確認

#### 方法3: 一時的な回避策（本番では非推奨）
- フロントエンドで `project_id` を明示的に指定する（例: `PRJ-${Date.now()}`）
- ただし、これは「連番形式（PRJ-1, PRJ-2...）」の要件に合わない

### 関連ドキュメント
- [VERIFY_DEPLOYED_IMAGE_AND_RETRY.md](./VERIFY_DEPLOYED_IMAGE_AND_RETRY.md) - デプロイ済みイメージとリトライ処理の確認手順
