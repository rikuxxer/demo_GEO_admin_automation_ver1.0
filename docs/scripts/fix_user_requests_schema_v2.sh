#!/bin/bash
# user_requestsテーブルのスキーマ修正スクリプト（v2）
# 既存のREQUIREDフィールドを保持し、user_idをNULLABLEとして追加

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

echo "=========================================="
echo "🔧 user_requestsテーブルスキーマ修正（v2）"
echo "=========================================="
echo ""
echo "📦 プロジェクト: ${PROJECT_ID}"
echo "📊 データセット: ${DATASET_ID}"
echo "📋 テーブル: ${TABLE}"
echo ""

# ステップ1: 現在のスキーマを確認
echo "📋 ステップ1: 現在のスキーマを確認中..."
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > /tmp/current_schema.json
echo "✅ 現在のスキーマを確認しました"
echo ""

# ステップ2: 既存のフィールドを確認
echo "📋 ステップ2: 既存のフィールドを確認中..."
echo "既存のフィールド:"
cat /tmp/current_schema.json | grep '"name"' | sed 's/.*"name": "\([^"]*\)".*/  - \1/'
echo ""

# ステップ3: request_idとdesired_roleのモードを確認
if grep -q '"name": "request_id".*"mode": "REQUIRED"' /tmp/current_schema.json; then
  REQUEST_ID_MODE="REQUIRED"
  echo "⚠️  request_idはREQUIREDです（保持します）"
else
  REQUEST_ID_MODE="NULLABLE"
  echo "✅ request_idはNULLABLEです"
fi

if grep -q '"name": "desired_role"' /tmp/current_schema.json; then
  HAS_DESIRED_ROLE=true
  echo "✅ desired_roleが存在します（保持します）"
else
  HAS_DESIRED_ROLE=false
  echo "ℹ️  desired_roleが存在しません（追加します）"
fi
echo ""

# ステップ4: スキーマファイルを作成
# user_idはNULLABLEとして追加（既存テーブルにREQUIREDフィールドを追加できないため）
echo "📋 ステップ3: 新しいスキーマファイルを作成中..."
cat > /tmp/user_requests_schema.json << EOF
[
  {"name": "user_id", "type": "STRING", "mode": "NULLABLE"},
  {"name": "request_id", "type": "STRING", "mode": "${REQUEST_ID_MODE}"},
  {"name": "name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "email", "type": "STRING", "mode": "NULLABLE"},
  {"name": "password_hash", "type": "STRING", "mode": "NULLABLE"},
  {"name": "requested_role", "type": "STRING", "mode": "NULLABLE"},
  {"name": "desired_role", "type": "STRING", "mode": "NULLABLE"},
  {"name": "department", "type": "STRING", "mode": "NULLABLE"},
  {"name": "reason", "type": "STRING", "mode": "NULLABLE"},
  {"name": "status", "type": "STRING", "mode": "NULLABLE"},
  {"name": "requested_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "reviewed_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "reviewed_by", "type": "STRING", "mode": "NULLABLE"},
  {"name": "review_comment", "type": "STRING", "mode": "NULLABLE"}
]
EOF
echo "✅ スキーマファイルを作成しました"
echo "   注意: user_idはNULLABLEとして追加されます（既存テーブルにREQUIREDフィールドを追加できません）"
echo ""

# ステップ5: スキーマを更新
echo "📋 ステップ4: スキーマを更新中..."
if bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/user_requests_schema.json \
  "${DATASET_ID}.${TABLE}" 2>&1; then
  echo "✅ user_requestsテーブルのスキーマ更新が完了しました！"
else
  echo "❌ スキーマ更新でエラーが発生しました"
  echo ""
  echo "現在のスキーマ:"
  cat /tmp/current_schema.json
  echo ""
  echo "作成したスキーマ:"
  cat /tmp/user_requests_schema.json
  exit 1
fi
echo ""

# ステップ6: 更新後のスキーマを確認
echo "📋 ステップ5: 更新後のスキーマを確認中..."
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > /tmp/updated_schema.json
echo "✅ 更新後のスキーマを確認しました"
echo ""

echo "=========================================="
echo "🎉 スキーマ更新が完了しました！"
echo "=========================================="
echo ""
echo "📋 重要な注意事項:"
echo "  - user_idはNULLABLEとして追加されました"
echo "  - コードはuser_idを送信しますが、スキーマではNULLABLEのため動作します"
echo "  - 将来的にuser_idをREQUIREDにするには、テーブルを再作成する必要があります"
echo ""
echo "📋 次のステップ:"
echo "  1. ブラウザのキャッシュをクリア"
echo "  2. ユーザー登録申請を再試行"
echo "  3. エラーが解消されたか確認"
echo ""

