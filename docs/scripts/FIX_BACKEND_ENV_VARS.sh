#!/bin/bash

# バックエンドの環境変数修正スクリプト
# このスクリプトは、500エラーを返しているリビジョンを特定し、
# 環境変数を修正して、トラフィックを最新リビジョンに固定します。

set -e

PROJECT_ID="univere-geo-demo"
REGION="asia-northeast1"
SERVICE="universegeo-backend"

echo "🔍 500エラーを返しているリビジョンを特定中..."
echo ""

# 1) 500を返しているリビジョン名を特定
REVISION_NAME=$(gcloud logging read \
  'resource.type="cloud_run_revision"
   AND resource.labels.service_name="universegeo-backend"
   AND httpRequest.requestUrl:"/api/projects"
   AND httpRequest.status=500' \
  --project "$PROJECT_ID" \
  --freshness=2h \
  --limit 1 \
  --format='value(resource.labels.revision_name)' 2>/dev/null | head -1)

if [ -z "$REVISION_NAME" ] || [ "$REVISION_NAME" = "" ]; then
  echo "⚠️ 500エラーを返しているリビジョンが見つかりませんでした"
  echo "   最新のリビジョンを確認します..."
  REVISION_NAME=$(gcloud run revisions list \
    --service "$SERVICE" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --format='value(name)' \
    --limit=1 2>/dev/null | head -1)
fi

if [ -z "$REVISION_NAME" ] || [ "$REVISION_NAME" = "" ]; then
  echo "❌ エラー: リビジョン名を取得できませんでした"
  exit 1
fi

echo "📋 特定されたリビジョン: $REVISION_NAME"
echo ""

# 2) そのリビジョンにenvが入っているか確認
echo "🔍 リビジョンの環境変数を確認中..."
echo ""

ENV_VARS=$(gcloud run revisions describe "$REVISION_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format='yaml(spec.containers[0].env)' 2>/dev/null || echo '')

if echo "$ENV_VARS" | grep -q "GCP_PROJECT_ID"; then
  GCP_PROJECT_ID_VALUE=$(echo "$ENV_VARS" | grep -A 1 "GCP_PROJECT_ID" | grep "value:" | awk '{print $2}' | tr -d '"' || echo '')
  if [ -z "$GCP_PROJECT_ID_VALUE" ] || [ "$GCP_PROJECT_ID_VALUE" = "null" ]; then
    echo "❌ GCP_PROJECT_IDが空またはnullです"
    NEED_FIX=true
  else
    echo "✅ GCP_PROJECT_ID: $GCP_PROJECT_ID_VALUE"
    NEED_FIX=false
  fi
else
  echo "❌ GCP_PROJECT_IDが設定されていません"
  NEED_FIX=true
fi

echo ""
echo "環境変数の詳細:"
echo "$ENV_VARS"
echo ""

if [ "$NEED_FIX" = "true" ]; then
  echo "🔧 環境変数を修正中..."
  echo ""
  
  # 3) サービスにenvを追記更新
  echo "📝 必須環境変数を設定中..."
  gcloud run services update "$SERVICE" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --update-env-vars GCP_PROJECT_ID="univere-geo-demo",BQ_DATASET="universegeo_dataset" \
    --quiet
  
  echo "✅ 必須環境変数の設定が完了しました"
  echo ""
  
  # FRONTEND_URLも設定（必要に応じて）
  echo "📝 FRONTEND_URLを設定中..."
  gcloud run services update "$SERVICE" \
    --region "$REGION" \
    --project "$PROJECT_ID" \
    --update-env-vars FRONTEND_URL="https://universegeo-i5xw76aisq-an.a.run.app" \
    --quiet
  
  echo "✅ FRONTEND_URLの設定が完了しました"
  echo ""
else
  echo "✅ 環境変数は既に正しく設定されています"
  echo ""
fi

# 4) 交通を最新リビジョン100%に固定
echo "🔧 トラフィックを最新リビジョンに100%固定中..."
gcloud run services update-traffic "$SERVICE" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --to-latest

echo "✅ トラフィックを最新リビジョンに100%固定しました"
echo ""

# 5) 動作確認
echo "🔍 動作確認中..."
echo ""

echo "📋 /api/projects の確認:"
curl -i "https://universegeo-backend-i5xw76aisq-an.a.run.app/api/projects" || echo "❌ リクエストに失敗しました"
echo ""
echo ""

echo "📋 /health の確認:"
curl -i "https://universegeo-backend-i5xw76aisq-an.a.run.app/health" || echo "❌ リクエストに失敗しました"
echo ""

echo "✅ 修正が完了しました"
echo ""
echo "📝 確認事項:"
echo "  - /api/projects が200を返すことを確認"
echo "  - /health が正常に応答することを確認"
echo "  - 最新のリビジョンにトラフィックが100%ルーティングされていることを確認"

