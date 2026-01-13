#!/bin/bash
# user_requestsテーブルを再作成するスクリプト（リリース前用）
# 既存データがない、または少ない場合に使用

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

echo "=========================================="
echo "🔄 user_requestsテーブル再作成（リリース前用）"
echo "=========================================="
echo ""
echo "📦 プロジェクト: ${PROJECT_ID}"
echo "📊 データセット: ${DATASET_ID}"
echo "📋 テーブル: ${TABLE}"
echo ""
echo "⚠️  警告: この操作は既存のデータを削除します"
echo "   リリース前で既存データがない、または少ない場合のみ実行してください"
echo ""
read -p "続行しますか？ (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ 操作をキャンセルしました"
  exit 1
fi
echo ""

# ステップ1: 既存データの確認（オプション）
echo "📋 ステップ1: 既存データの確認（オプション）..."
ROW_COUNT=$(bq query --use_legacy_sql=false --format=csv --quiet \
  "SELECT COUNT(*) as count FROM \`${PROJECT_ID}.${DATASET_ID}.${TABLE}\`" 2>/dev/null | tail -1)

if [ -n "$ROW_COUNT" ] && [ "$ROW_COUNT" != "count" ]; then
  echo "   既存データ数: ${ROW_COUNT}件"
  if [ "$ROW_COUNT" -gt 0 ]; then
    echo "   ⚠️  既存データがあります。削除されます。"
    read -p "   本当に続行しますか？ (yes/no): " -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
      echo "❌ 操作をキャンセルしました"
      exit 1
    fi
  fi
else
  echo "   ✅ 既存データはありません"
fi
echo ""

# ステップ2: 既存テーブルを削除
echo "📋 ステップ2: 既存テーブルを削除中..."
if bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.${TABLE}" 2>&1; then
  echo "✅ 既存テーブルを削除しました"
else
  echo "⚠️  テーブルが存在しないか、削除に失敗しました（続行します）"
fi
echo ""

# ステップ3: 正しいスキーマでテーブルを作成
echo "📋 ステップ3: 新しいテーブルを作成中..."
cat > /tmp/user_requests_schema.json << 'EOF'
[
  {"name": "user_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "email", "type": "STRING", "mode": "NULLABLE"},
  {"name": "password_hash", "type": "STRING", "mode": "NULLABLE"},
  {"name": "requested_role", "type": "STRING", "mode": "NULLABLE"},
  {"name": "department", "type": "STRING", "mode": "NULLABLE"},
  {"name": "reason", "type": "STRING", "mode": "NULLABLE"},
  {"name": "status", "type": "STRING", "mode": "NULLABLE"},
  {"name": "requested_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "reviewed_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "reviewed_by", "type": "STRING", "mode": "NULLABLE"},
  {"name": "review_comment", "type": "STRING", "mode": "NULLABLE"}
]
EOF

if bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/user_requests_schema.json \
  "${DATASET_ID}.${TABLE}" 2>&1; then
  echo "✅ 新しいテーブルを作成しました"
else
  echo "❌ テーブルの作成に失敗しました"
  exit 1
fi
echo ""

# ステップ4: 作成されたスキーマを確認
echo "📋 ステップ4: 作成されたスキーマを確認中..."
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > /tmp/new_schema.json
echo "✅ スキーマを確認しました"
echo ""
echo "作成されたスキーマ:"
cat /tmp/new_schema.json
echo ""

echo "=========================================="
echo "🎉 テーブル再作成が完了しました！"
echo "=========================================="
echo ""
echo "✅ 正しいスキーマでテーブルが作成されました:"
echo "   - user_id: REQUIRED（コードと一致）"
echo "   - requested_role: NULLABLE（コードと一致）"
echo "   - request_id: 削除（不要）"
echo "   - desired_role: 削除（不要）"
echo ""
echo "📋 次のステップ:"
echo "  1. ブラウザのキャッシュをクリア"
echo "  2. ユーザー登録申請を再試行"
echo "  3. エラーが解消されたか確認"
echo ""

