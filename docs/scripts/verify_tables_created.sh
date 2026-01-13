#!/bin/bash
# テーブル作成の確認スクリプト

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "=========================================="
echo "📋 テーブル作成の確認"
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

echo "📋 作成済みテーブル一覧:"
echo ""
TABLE_LIST=$(bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1 | tail -n +3)
TABLE_COUNT=$(echo "${TABLE_LIST}" | grep -v "^$" | wc -l)

if [ -z "${TABLE_LIST}" ] || [ "${TABLE_COUNT}" -eq 0 ]; then
  echo "  ⚠️  テーブルが見つかりません"
else
  echo "${TABLE_LIST}" | while read -r line; do
    if [ -n "${line}" ]; then
      TABLE_NAME=$(echo "${line}" | awk '{print $1}')
      echo "  ✅ ${TABLE_NAME}"
    fi
  done
fi

echo ""
echo "期待されるテーブル数: ${#EXPECTED_TABLES[@]}個"
echo "作成済みテーブル数: ${TABLE_COUNT}個"
echo ""

# 各テーブルの存在確認
echo "📋 各テーブルの詳細確認:"
echo ""
MISSING_TABLES=()

for table in "${EXPECTED_TABLES[@]}"; do
  FQTN="${PROJECT_ID}:${DATASET_ID}.${table}"
  if timeout 10s bq show --project_id="${PROJECT_ID}" "${FQTN}" >/dev/null 2>&1; then
    echo "  ✅ ${table}"
  else
    echo "  ❌ ${table} (見つかりません)"
    MISSING_TABLES+=("${table}")
  fi
done

echo ""

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
  echo "=========================================="
  echo "🎉 すべてのテーブルが正常に作成されました！"
  echo "=========================================="
  echo ""
  echo "📋 次のステップ:"
  echo "  1. ブラウザのキャッシュをクリア"
  echo "  2. ユーザー登録申請を再試行"
  echo "  3. エラーが解消されたか確認"
  echo ""
  exit 0
else
  echo "=========================================="
  echo "⚠️  以下のテーブルが見つかりません:"
  echo "=========================================="
  for table in "${MISSING_TABLES[@]}"; do
    echo "  - ${table}"
  done
  echo ""
  echo "📋 これらのテーブルを作成してください"
  echo ""
  exit 1
fi

