#!/bin/bash
# データセットとテーブルの状態を確認するスクリプト

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "=========================================="
echo "📊 データセットとテーブルの状態確認"
echo "=========================================="
echo ""
echo "📦 プロジェクト: ${PROJECT_ID}"
echo "📊 データセット: ${DATASET_ID}"
echo ""

# データセットの存在確認
echo "📋 データセットの存在確認..."
if bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" &> /dev/null; then
  echo "✅ データセット '${DATASET_ID}' が存在します"
  echo ""
  
  # テーブル一覧を取得
  echo "📋 テーブル一覧:"
  TABLES=$(bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1 | tail -n +3 | awk '{print $1}')
  
  if [ -z "$TABLES" ]; then
    echo "  ⚠️  テーブルが存在しません"
  else
    echo "$TABLES" | while read -r table; do
      if [ -n "$table" ]; then
        ROW_COUNT=$(bq query --use_legacy_sql=false --format=csv --quiet \
          "SELECT COUNT(*) as count FROM \`${PROJECT_ID}.${DATASET_ID}.${table}\`" 2>/dev/null | tail -1)
        echo "  - ${table} (行数: ${ROW_COUNT:-0})"
      fi
    done
  fi
else
  echo "❌ データセット '${DATASET_ID}' が存在しません"
fi
echo ""

