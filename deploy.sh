#!/bin/bash

# Cloud Run デプロイスクリプト
# 使用方法: ./deploy.sh

# 設定
PROJECT_ID="your-gcp-project-id"
REGION="asia-northeast1"
SERVICE_NAME="universegeo"
IMAGE_NAME="gcr.io/${PROJECT_ID}/${SERVICE_NAME}"

# 環境変数（.envファイルから読み込むか、直接指定）
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# 環境変数のチェック
if [ -z "$VITE_API_BASE_URL" ]; then
  echo "⚠️  警告: VITE_API_BASE_URL が設定されていません"
  echo "バックエンドAPI URLを設定してください（例: https://universegeo-backend-xxx.run.app）"
  echo "続行しますか？ (y/n)"
  read -r response
  if [ "$response" != "y" ]; then
  exit 1
  fi
fi

echo "🚀 Cloud Run へのデプロイを開始します..."
echo "📦 プロジェクト: ${PROJECT_ID}"
echo "🌏 リージョン: ${REGION}"
echo "📱 サービス名: ${SERVICE_NAME}"

# Dockerイメージをビルド（環境変数をビルド引数として渡す）
echo "🔨 Dockerイメージをビルド中..."
BUILD_ARGS=""
if [ -n "$VITE_API_BASE_URL" ]; then
  BUILD_ARGS="${BUILD_ARGS} --build-arg VITE_API_BASE_URL=${VITE_API_BASE_URL}"
fi
if [ -n "$VITE_GOOGLE_SPREADSHEET_ID" ]; then
  BUILD_ARGS="${BUILD_ARGS} --build-arg VITE_GOOGLE_SPREADSHEET_ID=${VITE_GOOGLE_SPREADSHEET_ID}"
fi
if [ -n "$VITE_GOOGLE_SHEETS_API_KEY" ]; then
  BUILD_ARGS="${BUILD_ARGS} --build-arg VITE_GOOGLE_SHEETS_API_KEY=${VITE_GOOGLE_SHEETS_API_KEY}"
fi

docker build ${BUILD_ARGS} -t ${IMAGE_NAME}:latest .

if [ $? -ne 0 ]; then
  echo "❌ Dockerイメージのビルドに失敗しました"
  exit 1
fi

# Google Container Registryにプッシュ
echo "📤 イメージをプッシュ中..."
docker push ${IMAGE_NAME}:latest

if [ $? -ne 0 ]; then
  echo "❌ イメージのプッシュに失敗しました"
  exit 1
fi

# Cloud Runにデプロイ
echo "🚀 Cloud Run にデプロイ中..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --max-instances 10 \
  --project ${PROJECT_ID}

if [ $? -eq 0 ]; then
  echo "✅ デプロイが完了しました！"
  echo "🌐 サービスURL:"
  gcloud run services describe ${SERVICE_NAME} \
    --platform managed \
    --region ${REGION} \
    --format 'value(status.url)' \
    --project ${PROJECT_ID}
else
  echo "❌ デプロイに失敗しました"
  exit 1
fi

