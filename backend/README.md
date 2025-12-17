# UNIVERSEGEO Backend API

BigQueryと連携するバックエンドAPIサーバーです。

## 🚀 セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env`ファイルを作成（`.env.example`を参考）：

```env
GCP_PROJECT_ID=your-project-id
BQ_DATASET=universegeo_dataset
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
PORT=8080
FRONTEND_URL=http://localhost:5173

# Google Sheets API設定
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEETS_API_KEY=your-api-key
GOOGLE_SHEET_NAME=シート1
```

### 3. サービスアカウントキーの配置

Google Cloud Consoleからダウンロードした`service-account-key.json`を`backend/`ディレクトリに配置します。

⚠️ **重要**: このファイルは`.gitignore`に含まれています。Gitにコミットしないでください。

### 4. ローカルでの起動

```bash
# 開発モード（ホットリロード）
npm run dev

# ビルド & 本番モード
npm run build
npm start
```

## 📊 API エンドポイント

### プロジェクト
- `GET /api/projects` - プロジェクト一覧取得
- `GET /api/projects/:project_id` - プロジェクト詳細取得
- `POST /api/projects` - プロジェクト作成
- `PUT /api/projects/:project_id` - プロジェクト更新
- `DELETE /api/projects/:project_id` - プロジェクト削除

### セグメント
- `GET /api/segments` - セグメント一覧取得
- `GET /api/segments/project/:project_id` - プロジェクト別セグメント取得
- `POST /api/segments` - セグメント作成
- `PUT /api/segments/:segment_id` - セグメント更新

### POI
- `GET /api/pois` - POI一覧取得
- `GET /api/pois/project/:project_id` - プロジェクト別POI取得
- `POST /api/pois` - POI作成
- `POST /api/pois/bulk` - POI一括作成
- `PUT /api/pois/:poi_id` - POI更新
- `DELETE /api/pois/:poi_id` - POI削除

### ユーザー
- `GET /api/users` - ユーザー一覧取得
- `GET /api/users/email/:email` - メールアドレスでユーザー取得
- `POST /api/users` - ユーザー作成
- `PUT /api/users/:user_id` - ユーザー更新

### ユーザー登録申請
- `GET /api/user-requests` - ユーザー登録申請一覧取得
- `POST /api/user-requests` - ユーザー登録申請作成
- `POST /api/user-requests/:request_id/approve` - ユーザー登録申請承認
- `POST /api/user-requests/:request_id/reject` - ユーザー登録申請却下

### Google Sheets
- `POST /api/sheets/export` - スプレッドシートにデータをエクスポート

### メッセージ
- `GET /api/messages/:project_id` - プロジェクト別メッセージ取得
- `GET /api/messages` - 全メッセージ取得
- `POST /api/messages` - メッセージ作成
- `POST /api/messages/mark-read` - メッセージ既読化

## 🐳 Docker

### ローカルでDockerイメージをビルド

```bash
docker build -t universegeo-backend .
```

### ローカルでDockerコンテナを起動

```bash
docker run -p 8080:8080 \
  -e GCP_PROJECT_ID=your-project-id \
  -e BQ_DATASET=universegeo_dataset \
  -e GOOGLE_APPLICATION_CREDENTIALS=/app/service-account-key.json \
  -v $(pwd)/service-account-key.json:/app/service-account-key.json \
  universegeo-backend
```

## ☁️ Cloud Runへのデプロイ

### Cloud Runにデプロイ

```bash
gcloud run deploy universegeo-backend \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=your-project-id \
  --set-env-vars BQ_DATASET=universegeo_dataset
```

サービスアカウントキーは、Cloud Runの「サービスアカウント」設定で自動的に認証されます。

## 🔒 セキュリティ

- サービスアカウントキーは絶対にGitにコミットしない
- `.env`ファイルも`.gitignore`に含める
- 本番環境では適切なCORS設定を行う
- Cloud Runでは環境変数で認証情報を管理

