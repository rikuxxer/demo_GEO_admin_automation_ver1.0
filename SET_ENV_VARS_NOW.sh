#!/bin/bash

# Cloud Run環境変数の即座設定スクリプト
# このスクリプトを実行して、環境変数を即座に設定してください

set -e

# 設定
PROJECT_ID="univere-geo-demo"
SERVICE_NAME="universegeo-backend"
REGION="asia-northeast1"

echo "🔧 Cloud Run環境変数を設定中..."
echo ""
echo "📋 設定情報:"
echo "  プロジェクトID: $PROJECT_ID"
echo "  サービス名: $SERVICE_NAME"
echo "  リージョン: $REGION"
echo ""

# 環境変数を設定
echo "📝 環境変数を設定中..."
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --update-env-vars GCP_PROJECT_ID="$PROJECT_ID",BQ_DATASET="universegeo_dataset",FRONTEND_URL="https://universegeo-i5xw76aisq-an.a.run.app" \
  --quiet

echo ""
echo "✅ 環境変数の設定が完了しました"
echo ""

# 設定を確認
echo "🔍 設定された環境変数を確認中..."
sleep 3

GCP_PROJECT_ID=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --format='value(spec.template.spec.containers[0].env[?name="GCP_PROJECT_ID"].value)' 2>/dev/null || echo '')

BQ_DATASET=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --format='value(spec.template.spec.containers[0].env[?name="BQ_DATASET"].value)' 2>/dev/null || echo '')

FRONTEND_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --format='value(spec.template.spec.containers[0].env[?name="FRONTEND_URL"].value)' 2>/dev/null || echo '')

echo "📋 設定された環境変数:"
echo "  GCP_PROJECT_ID: ${GCP_PROJECT_ID:-NOT SET}"
echo "  BQ_DATASET: ${BQ_DATASET:-NOT SET}"
echo "  FRONTEND_URL: ${FRONTEND_URL:-NOT SET}"
echo ""

if [ -n "$GCP_PROJECT_ID" ] && [ "$GCP_PROJECT_ID" = "$PROJECT_ID" ]; then
  echo "✅ GCP_PROJECT_IDが正しく設定されました"
else
  echo "❌ エラー: GCP_PROJECT_IDの設定に失敗しました"
  exit 1
fi

if [ -n "$BQ_DATASET" ] && [ "$BQ_DATASET" = "universegeo_dataset" ]; then
  echo "✅ BQ_DATASETが正しく設定されました"
else
  echo "❌ エラー: BQ_DATASETの設定に失敗しました"
  exit 1
fi

echo ""
echo "🎉 すべての環境変数が正しく設定されました！"
echo "   サービスが再起動されるまで数秒お待ちください。"



