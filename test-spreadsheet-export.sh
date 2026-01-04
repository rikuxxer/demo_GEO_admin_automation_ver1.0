#!/bin/bash
# スプレッドシート書き出し機能のテストスクリプト

echo "🧪 スプレッドシート書き出し機能のテスト"
echo ""

# バックエンドのURLを取得
echo "📋 バックエンドのURLを取得中..."
BACKEND_URL=$(gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(status.url)' 2>/dev/null)

if [ -z "$BACKEND_URL" ]; then
  echo "❌ エラー: バックエンドのURLを取得できませんでした"
  echo "   gcloudコマンドが正しく設定されているか確認してください"
  exit 1
fi

echo "✅ バックエンドURL: $BACKEND_URL"
echo ""

# 環境変数の確認
echo "📋 環境変数の確認中..."
GOOGLE_SPREADSHEET_ID=$(gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.containers[0].env[?name="GOOGLE_SPREADSHEET_ID"].value)' 2>/dev/null)

GOOGLE_SHEETS_API_KEY=$(gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.containers[0].env[?name="GOOGLE_SHEETS_API_KEY"].value)' 2>/dev/null)

if [ -z "$GOOGLE_SPREADSHEET_ID" ]; then
  echo "⚠️  警告: GOOGLE_SPREADSHEET_IDが設定されていません"
else
  echo "✅ GOOGLE_SPREADSHEET_ID: 設定済み"
fi

if [ -z "$GOOGLE_SHEETS_API_KEY" ]; then
  echo "⚠️  警告: GOOGLE_SHEETS_API_KEYが設定されていません"
else
  echo "✅ GOOGLE_SHEETS_API_KEY: 設定済み"
fi

echo ""

# テストデータの準備
echo "📝 テストデータを準備中..."
TEST_DATA=$(cat <<EOF
{
  "rows": [
    {
      "半径": "500",
      "brand_name": "テストブランド",
      "poi_id": "TEST-$(date +%s)",
      "poi_name": "テスト地点（自動テスト）",
      "latitude": "35.6812",
      "longitude": "139.7671",
      "prefecture": "東京都",
      "city": "千代田区",
      "setting_flag": "1",
      "created": "$(date +%Y-%m-%d)"
    }
  ]
}
EOF
)

echo "テストデータ:"
echo "$TEST_DATA" | jq '.' 2>/dev/null || echo "$TEST_DATA"
echo ""

# APIリクエストを送信
echo "📤 APIリクエストを送信中..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BACKEND_URL}/api/sheets/export" \
  -H "Content-Type: application/json" \
  -d "$TEST_DATA")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo ""
echo "📥 レスポンス:"
echo "HTTPステータスコード: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ 成功！"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
  echo "❌ エラーが発生しました"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "📋 次のステップ:"
echo "1. スプレッドシートを開いて、データが追加されているか確認"
echo "2. バックエンドのログを確認:"
echo "   gcloud run services logs read universegeo-backend --region asia-northeast1 --project univere-geo-demo --limit 20"

