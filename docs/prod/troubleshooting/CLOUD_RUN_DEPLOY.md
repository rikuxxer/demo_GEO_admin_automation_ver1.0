# Cloud Run デプロイ手順（実践ガイド）

このドキュメントでは、UNIVERSEGEOをCloud Runにデプロイする具体的な手順を説明します。

## 🔍 ステップ0: バックエンドのデプロイ状況確認

まず、バックエンドが既にデプロイされているか確認します。

```bash
# 現在のプロジェクトを確認
gcloud config get-value project

# 全Cloud Runサービスを一覧表示
gcloud run services list --region asia-northeast1

# バックエンドサービスが存在するか確認（grepで検索）
gcloud run services list --region asia-northeast1 | grep universegeo-backend

# または、直接describeコマンドで確認（存在しない場合はエラーになる）
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --format 'value(status.url)' 2>/dev/null && echo "バックエンドは既にデプロイされています" || echo "バックエンドはまだデプロイされていません"
```

**バックエンドが存在しない場合** → ステップ1から開始  
**バックエンドが存在する場合** → ステップ2から開始（URLをメモ）

---

## ステップ1: バックエンドのデプロイ

### 1.1 前提条件の確認

```bash
# gcloud CLIがインストールされているか確認
gcloud --version

# 認証状態を確認
gcloud auth list

# プロジェクトを設定（まだ設定していない場合）
gcloud config set project YOUR_PROJECT_ID

# 必要なAPIを有効化
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable bigquery.googleapis.com
gcloud services enable sheets.googleapis.com
```

### 1.2 サービスアカウントの準備

```bash
# サービスアカウントを作成（既に存在する場合はスキップ）
gcloud iam service-accounts create universegeo-backend-sa \
  --display-name="UNIVERSEGEO Backend Service Account"

# BigQueryの権限を付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:universegeo-backend-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:universegeo-backend-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

# サービスアカウントのメールアドレスをメモ
echo "universegeo-backend-sa@YOUR_PROJECT_ID.iam.gserviceaccount.com"
```

### 1.3 環境変数の準備

以下の情報を準備してください：

- `GCP_PROJECT_ID`: GCPプロジェクトID
- `BQ_DATASET`: BigQueryデータセット名（例: `universegeo_dataset`）
- `GOOGLE_SPREADSHEET_ID`: Google Sheets スプレッドシートID
- `GOOGLE_SHEETS_API_KEY`: Google Sheets API キー
- `FRONTEND_URL`: フロントエンドのURL（後で更新可能、最初は `http://localhost:5173` でも可）

### 1.4 バックエンドのデプロイ

```bash
cd backend

# 環境変数を設定
export GCP_PROJECT_ID="your-project-id"
export BQ_DATASET="universegeo_dataset"
export GOOGLE_SPREADSHEET_ID="your-spreadsheet-id"
export GOOGLE_SHEETS_API_KEY="your-api-key"
export FRONTEND_URL="http://localhost:5173"  # 後で更新
export SERVICE_ACCOUNT_EMAIL="universegeo-backend-sa@your-project-id.iam.gserviceaccount.com"

# デプロイスクリプトに実行権限を付与
chmod +x deploy.sh

# デプロイ実行
./deploy.sh
```

**または、手動でデプロイする場合：**

```bash
cd backend

gcloud run deploy universegeo-backend \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars GCP_PROJECT_ID=your-project-id \
  --set-env-vars BQ_DATASET=universegeo_dataset \
  --set-env-vars GOOGLE_SPREADSHEET_ID=your-spreadsheet-id \
  --set-env-vars GOOGLE_SHEETS_API_KEY=your-api-key \
  --set-env-vars GOOGLE_SHEET_NAME=シート1 \
  --set-env-vars FRONTEND_URL=http://localhost:5173 \
  --service-account=universegeo-backend-sa@your-project-id.iam.gserviceaccount.com \
  --project your-project-id
```

### 1.5 バックエンドURLの取得

```bash
# バックエンドURLを取得
BACKEND_URL=$(gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --format 'value(status.url)')

echo "バックエンドURL: ${BACKEND_URL}"
```

このURLをメモしてください（例: `https://universegeo-backend-xxx-xx.a.run.app`）

### 1.6 動作確認

```bash
# ヘルスチェック
curl ${BACKEND_URL}/health

# 正常な場合、以下のようなJSONが返ります：
# {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

---

## ステップ2: フロントエンドのデプロイ

### 2.1 環境変数の設定

プロジェクトルートで `.env` ファイルを作成：

```bash
cd ..  # プロジェクトルートに戻る

# .envファイルを作成
cat > .env << EOF
VITE_API_BASE_URL=https://universegeo-backend-xxx-xx.a.run.app
EOF
```

**重要**: `VITE_API_BASE_URL` には、ステップ1.5で取得したバックエンドURLを設定してください。

### 2.2 デプロイスクリプトの設定

`deploy.sh` を開いて、`PROJECT_ID` を編集：

```bash
# deploy.sh の7行目付近を編集
PROJECT_ID="your-gcp-project-id"  # ここを実際のプロジェクトIDに変更
```

### 2.3 フロントエンドのデプロイ

```bash
# デプロイスクリプトに実行権限を付与
chmod +x deploy.sh

# デプロイ実行
./deploy.sh
```

**または、手動でデプロイする場合：**

```bash
# プロジェクトIDを設定
export PROJECT_ID="your-gcp-project-id"
export REGION="asia-northeast1"
export SERVICE_NAME="universegeo"
export IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# 環境変数を読み込み
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Dockerイメージをビルド
docker build \
  --build-arg VITE_API_BASE_URL=${VITE_API_BASE_URL} \
  -t ${IMAGE_NAME}:latest .

# Google Container Registryにプッシュ
docker push ${IMAGE_NAME}:latest

# Cloud Runにデプロイ
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --project ${PROJECT_ID}
```

### 2.4 フロントエンドURLの取得

```bash
# フロントエンドURLを取得
FRONTEND_URL=$(gcloud run services describe universegeo \
  --region asia-northeast1 \
  --format 'value(status.url)')

echo "フロントエンドURL: ${FRONTEND_URL}"
```

### 2.5 バックエンドのFRONTEND_URLを更新

フロントエンドURLが確定したら、バックエンドのCORS設定を更新：

```bash
gcloud run services update universegeo-backend \
  --set-env-vars FRONTEND_URL=${FRONTEND_URL} \
  --region asia-northeast1
```

---

## ステップ3: 動作確認

### 3.1 フロントエンドにアクセス

ブラウザでフロントエンドURLにアクセスし、以下を確認：

1. ログイン画面が表示される
2. ログインができる
3. データが表示される

### 3.2 API接続の確認

ブラウザの開発者ツール（F12）を開き、Networkタブで以下を確認：

- フロントエンドからバックエンドAPIへのリクエストが成功しているか
- CORSエラーが発生していないか

### 3.3 Google Sheets転記の確認

1. 地点格納依頼を実行
2. スプレッドシートにデータが追加されることを確認

---

## トラブルシューティング

### バックエンドが起動しない

```bash
# ログを確認
gcloud run services logs read universegeo-backend \
  --region asia-northeast1 \
  --limit 50
```

### CORSエラーが発生する

バックエンドの `FRONTEND_URL` 環境変数が正しく設定されているか確認：

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --format 'value(spec.template.spec.containers[0].env)'
```

### BigQuery接続エラー

サービスアカウントにBigQueryの権限が付与されているか確認：

```bash
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:universegeo-backend-sa@*"
```

### 環境変数が反映されない（フロントエンド）

フロントエンドの環境変数はビルド時に埋め込まれるため、変更後は再ビルド・再デプロイが必要です。

---

## デプロイ後のメンテナンス

### バックエンドの更新

```bash
cd backend
./deploy.sh
```

### フロントエンドの更新

```bash
# .envファイルを確認・更新
# その後、デプロイ
./deploy.sh
```

### ログの確認

```bash
# バックエンドのログ
gcloud run services logs read universegeo-backend --region asia-northeast1

# フロントエンドのログ
gcloud run services logs read universegeo --region asia-northeast1
```

---

## クイックリファレンス

### バックエンドの存在確認
```bash
# 方法1: 全サービス一覧から検索
gcloud run services list --region asia-northeast1 | grep universegeo-backend

# 方法2: 直接確認（存在する場合のみURLを表示）
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --format 'value(status.url)' 2>/dev/null
```

### バックエンドURLの取得
```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --format 'value(status.url)'
```

### フロントエンドURLの確認
```bash
gcloud run services describe universegeo \
  --region asia-northeast1 \
  --format 'value(status.url)'
```

### 全サービスの一覧
```bash
gcloud run services list --region asia-northeast1
```

### バックエンドが存在しない場合の確認方法
```bash
# エラーメッセージを確認せずに、存在チェックのみ
if gcloud run services describe universegeo-backend --region asia-northeast1 --format 'value(status.url)' 2>/dev/null; then
  echo "✅ バックエンドはデプロイ済みです"
else
  echo "❌ バックエンドはまだデプロイされていません。ステップ1から開始してください"
fi
```

