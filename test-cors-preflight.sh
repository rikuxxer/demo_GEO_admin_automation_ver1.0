#!/bin/bash
# CORS Preflightテストスクリプト

echo "🧪 CORS Preflightテスト"
echo ""

# バックエンドURLを設定（実際のURLに置き換えてください）
BACKEND_URL="${1:-https://universegeo-backend-xxx-xx.a.run.app}"

if [ -z "$BACKEND_URL" ]; then
  echo "❌ エラー: バックエンドURLを指定してください"
  echo "使用方法: $0 <BACKEND_URL>"
  echo "例: $0 https://universegeo-backend-xxx-xx.a.run.app"
  exit 1
fi

API_URL="${BACKEND_URL}/api/sheets/export"

echo "📋 テスト設定:"
echo "  URL: ${API_URL}"
echo ""

# テスト1: Origin: null でのpreflight
echo "📤 テスト1: Origin: null でのpreflight"
echo "----------------------------------------"
curl -i -X OPTIONS \
  -H "Origin: null" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  "${API_URL}" 2>&1 | head -20

echo ""
echo ""

# テスト2: localhost でのpreflight
echo "📤 テスト2: localhost でのpreflight"
echo "----------------------------------------"
curl -i -X OPTIONS \
  -H "Origin: http://localhost:8000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type" \
  "${API_URL}" 2>&1 | head -20

echo ""
echo ""

# テスト3: 実際のPOSTリクエスト（Origin: null）
echo "📤 テスト3: 実際のPOSTリクエスト（Origin: null）"
echo "----------------------------------------"
curl -i -X POST \
  -H "Origin: null" \
  -H "Content-Type: application/json" \
  -d '{
    "rows": [
      {
        "半径": "500",
        "brand_name": "テストブランド",
        "poi_id": "TEST-001",
        "poi_name": "テスト地点",
        "latitude": "35.6812",
        "longitude": "139.7671",
        "prefecture": "東京都",
        "city": "千代田区",
        "setting_flag": "1",
        "created": "2024-01-01"
      }
    ]
  }' \
  "${API_URL}" 2>&1 | head -30

echo ""
echo ""
echo "✅ テスト完了"
echo ""
echo "📋 確認事項:"
echo "1. OPTIONSリクエストで Access-Control-Allow-Origin ヘッダーが返っているか"
echo "2. POSTリクエストが成功しているか（200 OK）"
echo "3. エラーメッセージがないか"

