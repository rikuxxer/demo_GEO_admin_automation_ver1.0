# UNIVERSEGEO デプロイ手順書

このドキュメントでは、UNIVERSEGEOアプリケーションをGoogle Cloud Platform（GCP）にデプロイする手順を説明します。

## 前提条件

- Google Cloud Platform（GCP）アカウント
- `gcloud` CLI がインストール・設定済み
- BigQueryデータセットとテーブルが作成済み
- Google Sheets API の設定が完了

## アーキテクチャ

```
フロントエンド (Cloud Run)
    ↓
バックエンド API (Cloud Run)
    ↓
BigQuery + Google Sheets API
```

## 1. バックエンドのデプロイ

### 1.1 環境変数の設定

`backend/.env` ファイルを作成（またはCloud Runの環境変数として設定）：

```env
GCP_PROJECT_ID=your-project-id
BQ_DATASET=universegeo_dataset
GOOGLE_APPLICATION_CREDENTIALS=/app/service-account-key.json
PORT=8080
FRONTEND_URL=https://your-frontend-url.run.app

# Google Sheets API設定
GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
GOOGLE_SHEETS_API_KEY=your-api-key
GOOGLE_SHEET_NAME=シート1
```

### 1.2 サービスアカウントキーの準備

1. Google Cloud Consoleでサービスアカウントを作成
2. BigQueryとGoogle Sheets APIの権限を付与
3. キーファイルをダウンロード

### 1.3 Cloud Runにデプロイ

```bash
cd backend

# デプロイ
gcloud run deploy universegeo-backend \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT_ID=your-project-id \
  --set-env-vars BQ_DATASET=universegeo_dataset \
  --set-env-vars GOOGLE_SPREADSHEET_ID=your-spreadsheet-id \
  --set-env-vars GOOGLE_SHEETS_API_KEY=your-api-key \
  --set-env-vars GOOGLE_SHEET_NAME=シート1 \
  --set-env-vars FRONTEND_URL=https://your-frontend-url.run.app \
  --service-account=your-service-account@your-project.iam.gserviceaccount.com \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10
```

### 1.4 バックエンドURLの確認

デプロイ完了後、バックエンドのURLを確認：

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --format 'value(status.url)'
```

このURLをメモしておきます（例: `https://universegeo-backend-xxx.run.app`）

## 🎨 2. フロントエンドのデプロイ

### 2.1 環境変数の設定

プロジェクトルートに `.env` ファイルを作成：

```env
# バックエンドAPI URL
VITE_API_BASE_URL=https://universegeo-backend-xxx.run.app

# Google Sheets API（バックエンド経由で使用する場合は不要）
VITE_GOOGLE_SPREADSHEET_ID=your-spreadsheet-id
VITE_GOOGLE_SHEETS_API_KEY=your-api-key
```

### 2.2 ビルドとデプロイ

#### 方法1: deploy.shスクリプトを使用（推奨）

```bash
# .envファイルを設定
export VITE_API_BASE_URL=https://universegeo-backend-xxx.run.app

# デプロイスクリプトを実行
chmod +x deploy.sh
./deploy.sh
```

#### 方法2: 手動デプロイ

```bash
# Dockerイメージをビルド
docker build \
  --build-arg VITE_API_BASE_URL=https://universegeo-backend-xxx.run.app \
  -t gcr.io/your-project-id/universegeo:latest .

# Google Container Registryにプッシュ
docker push gcr.io/your-project-id/universegeo:latest

# Cloud Runにデプロイ
gcloud run deploy universegeo \
  --image gcr.io/your-project-id/universegeo:latest \
  --platform managed \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10
```

## ✅ 3. 動作確認

### 3.1 バックエンドAPIの確認

```bash
# ヘルスチェック
curl https://universegeo-backend-xxx.run.app/health

# プロジェクト一覧取得（認証が必要な場合）
curl https://universegeo-backend-xxx.run.app/api/projects
```

### 3.2 フロントエンドの確認

1. ブラウザでフロントエンドURLにアクセス
2. ログイン画面が表示されることを確認
3. ログインして動作確認

### 3.3 Google Sheets転記の確認

1. 地点格納依頼を実行
2. スプレッドシートにデータが追加されることを確認

## 🔧 4. トラブルシューティング

### 4.1 CORSエラー

バックエンドの `FRONTEND_URL` 環境変数が正しく設定されているか確認：

```bash
gcloud run services update universegeo-backend \
  --set-env-vars FRONTEND_URL=https://your-frontend-url.run.app \
  --region asia-northeast1
```

### 4.2 BigQuery接続エラー

- サービスアカウントにBigQueryの権限が付与されているか確認
- `GCP_PROJECT_ID` と `BQ_DATASET` が正しく設定されているか確認

### 4.3 Google Sheets APIエラー

- `GOOGLE_SPREADSHEET_ID` と `GOOGLE_SHEETS_API_KEY` が正しく設定されているか確認
- APIキーにGoogle Sheets APIの権限が付与されているか確認
- スプレッドシートの共有設定を確認

### 4.4 環境変数が反映されない

- フロントエンドの環境変数はビルド時に埋め込まれるため、変更後は再ビルドが必要
- バックエンドの環境変数は再デプロイで反映される

## 📝 5. 環境変数一覧

### バックエンド

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `GCP_PROJECT_ID` | GCPプロジェクトID | ✅ |
| `BQ_DATASET` | BigQueryデータセット名 | ✅ |
| `GOOGLE_APPLICATION_CREDENTIALS` | サービスアカウントキーファイルパス | ✅ |
| `PORT` | サーバーポート（デフォルト: 8080） | ❌ |
| `FRONTEND_URL` | フロントエンドURL（CORS設定用） | ✅ |
| `GOOGLE_SPREADSHEET_ID` | Google Sheets スプレッドシートID | ✅ |
| `GOOGLE_SHEETS_API_KEY` | Google Sheets API キー | ✅ |
| `GOOGLE_SHEET_NAME` | シート名（デフォルト: シート1） | ❌ |

### フロントエンド

| 変数名 | 説明 | 必須 |
|--------|------|------|
| `VITE_API_BASE_URL` | バックエンドAPI URL | ✅ |
| `VITE_GOOGLE_SPREADSHEET_ID` | Google Sheets スプレッドシートID（バックエンド未使用時） | ❌ |
| `VITE_GOOGLE_SHEETS_API_KEY` | Google Sheets API キー（バックエンド未使用時） | ❌ |

## 🔐 6. セキュリティ設定

### 6.1 サービスアカウントの権限

バックエンドのサービスアカウントに以下の権限を付与：

- `roles/bigquery.dataEditor` - BigQueryデータ編集
- `roles/bigquery.jobUser` - BigQueryジョブ実行

### 6.2 APIキーの制限

Google Sheets APIキーに以下の制限を設定：

- **アプリケーションの制限**: HTTPリファラー
- **APIの制限**: Google Sheets API のみ
- **許可するリファラー**: バックエンドのCloud Run URL

### 6.3 CORS設定

バックエンドの `FRONTEND_URL` 環境変数で、許可するフロントエンドURLを指定。

## 📚 7. 参考資料

- [BigQuery設定ガイド](./BIGQUERY_SETUP.md)
- [Google Sheets設定ガイド](./GOOGLE_SHEETS_SETUP.md)
- [バックエンドREADME](./backend/README.md)
