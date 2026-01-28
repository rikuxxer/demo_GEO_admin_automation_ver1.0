# ログタイムラインの整理

## 1. Cloud Run ReplaceService（デプロイ）

| 日時 (JST) | 内容 |
|------------|------|
| 2026-01-23 15:32 | ReplaceService |
| 2026-01-23 18:04 | ReplaceService |
| 2026-01-23 19:36 | ReplaceService |
| 2026-01-24 23:21 | ReplaceService |
| 2026-01-24 23:25 | ReplaceService |
| 2026-01-25 21:25 | ReplaceService |
| 2026-01-27 00:53 | ReplaceService |
| 2026-01-27 14:46 | ReplaceService |
| 2026-01-27 17:27 | ReplaceService |
| 2026-01-27 18:15 | ReplaceService |
| **2026-01-28 15:15** | **ReplaceService（直近）** — **severity: ERROR** |

- **methodName**: `google.cloud.run.v1.Services.ReplaceService` → Cloud Run サービスを更新（デプロイ）しようとした記録
- **principal**: `id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`（デプロイを実行した主体）
- **resourceName**: `namespaces/univere-geo-demo/services/universegeo` → サービス名は **universegeo**

### 重要: 2026-01-28 15:15:39 の ReplaceService は ERROR

- **severity: ERROR** なので、このデプロイは**失敗**しています。
- そのため、このタイミングで「リトライ処理」や「favicon 修正」が Cloud Run に反映されていない可能性が高いです。
- **status.code: 10 (ABORTED/Conflict)**  
  `Conflict for resource 'universegeo': version '1769545956565275' was specified but current version is '1769580938921278'.`  
  → **同時に別の更新が入ったため、古いリソースバージョンで更新しようとして衝突**しています。
- **次のアクション**:
  1. **並行デプロイや自動再試行が走っていないか** GitHub Actions と Cloud Run の履歴を確認する。
  2. 競合が止んだ状態で **再度デプロイ** を実行する（このエラーは再試行で解消することが多い）。
  3. 以後の衝突防止のため、**同一サービスのデプロイを直列化**する（同時実行を避ける）。

favicon.ico 404 や POST /api/projects 500 が続く一因として、**このデプロイ失敗で最新イメージが入っていない**可能性があります。

---

## 2. GET 404（favicon・アセット）

| 日時 (JST) | URL | 内容 |
|------------|-----|------|
| 2026-01-24 20:48 | universegeo-i5xw76aisq-an.a.run.app/assets/index-DKGVNRMw.js | アセット 404 |
| 2026-01-24 20:48 | universegeo-i5xw76aisq-an.a.run.app/favicon.ico | favicon 404 |
| 2026-01-24 22:44 | universegeo-i5xw76aisq-an.a.run.app/favicon.ico | favicon 404 |
| 2026-01-24 23:14 | universegeo-223225164238.asia-northeast1.run.app/favicon.ico | favicon 404 |
| 2026-01-27 14:56 | universegeo-223225164238.asia-northeast1.run.app/assets/index-gTKbULUD.js | アセット 404 |
| 2026-01-28 12:58 | universegeo-i5xw76aisq-an.a.run.app/favicon.ico | favicon 404 |
| 2026-01-28 16:43 | universegeo-223225164238.asia-northeast1.run.app/favicon.ico | favicon 404（run.googleapis.com/requests, WARNING） |

### favicon.ico 404
- リポジトリでは `index.html` に `<link rel="icon" href="/favicon.svg" />` を追加済み
- **デプロイ済みフロント**にその変更が入っていないと、まだ `/favicon.ico` をリクエストするブラウザでは 404 になる
- 対応: フロントを最新で再デプロイし、キャッシュクリアまたはハードリロードで確認

### アセット（index-*.js）404
- `index-DKGVNRMw.js` / `index-gTKbULUD.js` などは Vite のビルドで付くハッシュ名
- **古い index.html が新しいアセット名を参照している**、または**新しい index.html がデプロイされていないのに新しいアセットだけデプロイされた**状態で発生しうる
- 対応: フロントを **同一ビルドでまとめて** 再デプロイし、古いリビジョンを切替えないようにする

---

## 3. まとめ

| 種類 | 意味 | アクション |
|------|------|------------|
| ReplaceService | Cloud Run へのデプロイが実行された | 2026-01-28 15:15 のデプロイが「リトライ入り main」か GitHub Actions で確認 |
| favicon.ico 404 | フロントに favicon リンク修正が未反映の可能性 | フロント最新で再デプロイ・キャッシュ確認 |
| index-*.js 404 | ビルドと index.html の不整合 | フロントを同一ビルドで再デプロイ |

**POST /api/projects 500** については、このログ一覧には出ていません。500 の原因は **Cloud Run の「アプリケーションログ」（stdout/stderr）** で確認してください（「再採番します」「already exists」などのメッセージ）。  
ReplaceService のログは「デプロイが行われた」ことだけを示しており、500 の有無やリトライの有無はアプリログで判断します。
