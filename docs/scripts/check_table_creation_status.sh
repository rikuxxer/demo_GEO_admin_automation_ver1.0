#!/bin/bash
# テーブル作成状況を確認するスクリプト

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "=========================================="
echo "📊 テーブル作成状況確認"
echo "=========================================="
echo ""
echo "📦 プロジェクト: ${PROJECT_ID}"
echo "📊 データセット: ${DATASET_ID}"
echo ""

# 期待されるテーブル一覧
EXPECTED_TABLES=(
  "projects"
  "segments"
  "pois"
  "users"
  "user_requests"
  "messages"
  "change_history"
  "edit_requests"
  "feature_requests"
  "visit_measurement_groups"
)

# 実際のテーブル一覧を取得
EXISTING_TABLES=$(bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1 | tail -n +3 | awk '{print $1}')

echo "📋 テーブル作成状況:"
echo ""

for table in "${EXPECTED_TABLES[@]}"; do
  if echo "$EXISTING_TABLES" | grep -q "^${table}$"; then
    echo "  ✅ ${table}"
  else
    echo "  ❌ ${table} (未作成)"
  fi
done

echo ""
echo "=========================================="
CREATED_COUNT=$(echo "$EXISTING_TABLES" | wc -l)
EXPECTED_COUNT=${#EXPECTED_TABLES[@]}

if [ "$CREATED_COUNT" -eq "$EXPECTED_COUNT" ]; then
  echo "🎉 すべてのテーブルが作成されました！"
  echo "   作成済み: ${CREATED_COUNT}/${EXPECTED_COUNT}"
else
  echo "⚠️  一部のテーブルが未作成です"
  echo "   作成済み: ${CREATED_COUNT}/${EXPECTED_COUNT}"
  echo ""
  echo "未作成のテーブル:"
  for table in "${EXPECTED_TABLES[@]}"; do
    if ! echo "$EXISTING_TABLES" | grep -q "^${table}$"; then
      echo "  - ${table}"
    fi
  done
fi
echo "=========================================="
echo ""

