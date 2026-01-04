#!/bin/bash
# user_requestsテーブルのスキーマ修正スクリプト
# 既存のrequest_idフィールドがREQUIREDの場合に対応

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

echo "=========================================="
echo "🔧 user_requestsテーブルスキーマ修正"
echo "=========================================="
echo ""
echo "📦 プロジェクト: ${PROJECT_ID}"
echo "📊 データセット: ${DATASET_ID}"
echo "📋 テーブル: ${TABLE}"
echo ""

# ステップ1: 現在のスキーマを確認
echo "📋 ステップ1: 現在のスキーマを確認中..."
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > current_schema.json
echo "✅ 現在のスキーマを current_schema.json に保存しました"
echo ""

# ステップ2: request_idがREQUIREDかどうかを確認
echo "📋 ステップ2: request_idフィールドのモードを確認中..."
if grep -q '"name": "request_id".*"mode": "REQUIRED"' current_schema.json; then
  echo "⚠️  request_idフィールドがREQUIREDとして定義されています"
  REQUEST_ID_MODE="REQUIRED"
else
  echo "✅ request_idフィールドはREQUIREDではありません"
  REQUEST_ID_MODE="NULLABLE"
fi
echo ""

# ステップ3: スキーマファイルを作成
echo "📋 ステップ3: 新しいスキーマファイルを作成中..."
cat > user_requests_schema.json << EOF
[
  {"name": "user_id", "type": "STRING", "mode": "REQUIRED"},
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
echo "   request_idのモード: ${REQUEST_ID_MODE}"
echo ""

# ステップ4: スキーマを更新
echo "📋 ステップ4: スキーマを更新中..."
if bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema user_requests_schema.json \
  "${DATASET_ID}.${TABLE}" 2>&1; then
  echo "✅ user_requestsテーブルのスキーマ更新が完了しました！"
else
  echo "❌ スキーマ更新でエラーが発生しました"
  echo ""
  echo "現在のスキーマを確認してください:"
  cat current_schema.json
  echo ""
  echo "作成したスキーマ:"
  cat user_requests_schema.json
  exit 1
fi
echo ""

# ステップ5: 更新後のスキーマを確認
echo "📋 ステップ5: 更新後のスキーマを確認中..."
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > updated_schema.json
echo "✅ 更新後のスキーマを updated_schema.json に保存しました"
echo ""

echo "=========================================="
echo "🎉 スキーマ更新が完了しました！"
echo "=========================================="
echo ""
echo "📋 次のステップ:"
echo "  1. ブラウザのキャッシュをクリア"
echo "  2. ユーザー登録申請を再試行"
echo "  3. エラーが解消されたか確認"
echo ""

