#!/bin/bash

# バックエンド Cloud Run デプロイスクリプト
# 使用方法: ./deploy.sh

# 設定
PROJECT_ID="${GCP_PROJECT_ID:-your-gcp-project-id}"
REGION="asia-northeast1"
SERVICE_NAME="universegeo-backend"

# 環境変数のチェック
if [ -z "$GCP_PROJECT_ID" ]; then
  echo "❌ エラー: GCP_PROJECT_ID が設定されていません"
  echo "環境変数 GCP_PROJECT_ID を設定するか、スクリプト内の PROJECT_ID を編集してください"
  exit 1
fi

if [ -z "$SERVICE_ACCOUNT_EMAIL" ]; then
  echo "⚠️  警告: SERVICE_ACCOUNT_EMAIL が設定されていません"
  echo "サービスアカウントのメールアドレスを設定してください"
  echo "例: universegeo-backend-sa@${PROJECT_ID}.iam.gserviceaccount.com"
  echo ""
  echo "続行しますか？ (y/n)"
  read -r response
  if [ "$response" != "y" ]; then
    exit 1
  fi
fi

echo "🚀 バックエンド Cloud Run へのデプロイを開始します..."
echo "📦 プロジェクト: ${PROJECT_ID}"
echo "🌏 リージョン: ${REGION}"
echo "📱 サービス名: ${SERVICE_NAME}"

# Cloud Runにデプロイ（ソースから直接）
echo "🔨 ソースからビルド・デプロイ中..."
gcloud run deploy ${SERVICE_NAME} \
  --source . \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --set-env-vars GCP_PROJECT_ID=${GCP_PROJECT_ID} \
  --set-env-vars BQ_DATASET=${BQ_DATASET:-universegeo_dataset} \
  --set-env-vars GOOGLE_SPREADSHEET_ID=${GOOGLE_SPREADSHEET_ID} \
  --set-env-vars GOOGLE_SHEETS_API_KEY=${GOOGLE_SHEETS_API_KEY} \
  --set-env-vars GOOGLE_SHEET_NAME=${GOOGLE_SHEET_NAME:-シート1} \
  --set-env-vars FRONTEND_URL=${FRONTEND_URL:-http://localhost:5173} \
  ${SERVICE_ACCOUNT_EMAIL:+--service-account=${SERVICE_ACCOUNT_EMAIL}} \
  --project ${PROJECT_ID}

if [ $? -eq 0 ]; then
  echo "✅ デプロイが完了しました！"
  echo "🌐 サービスURL:"
  gcloud run services describe ${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --format 'value(status.url)' \
    --project ${PROJECT_ID}
  echo ""
  echo "💡 このURLをフロントエンドの VITE_API_BASE_URL に設定してください"
else
  echo "❌ デプロイに失敗しました"
  exit 1
fi

