#!/bin/bash
# REST APIでテーブル一覧を取得するスクリプト（bq lsのタイムアウト問題を回避）

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "=========================================="
echo "📋 テーブル一覧（REST API経由）"
echo "=========================================="
echo ""
echo "📦 プロジェクト: ${PROJECT_ID}"
echo "📊 データセット: ${DATASET_ID}"
echo ""

# トークンの取得
TOKEN=$(gcloud auth print-access-token 2>&1)
if [ $? -ne 0 ]; then
  echo "❌ トークンの取得に失敗しました"
  exit 1
fi

# REST APIでテーブル一覧を取得
echo "📋 テーブル一覧を取得中..."
RESPONSE_FILE="/tmp/tables_list.json"
API_RESPONSE=$(timeout 20s curl -sS -o "${RESPONSE_FILE}" -w "http_code=%{http_code}" \
  -H "Authorization: Bearer ${TOKEN}" \
  "https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/datasets/${DATASET_ID}/tables" 2>&1)

HTTP_CODE=$(echo "${API_RESPONSE}" | grep -o "http_code=[0-9]*" | cut -d= -f2)

if [ "${HTTP_CODE}" != "200" ]; then
  echo "❌ テーブル一覧の取得に失敗しました (HTTP ${HTTP_CODE})"
  if [ -f "${RESPONSE_FILE}" ]; then
    head -c 500 "${RESPONSE_FILE}"
  fi
  exit 1
fi

# テーブル一覧を表示
echo ""
echo "📊 作成済みテーブル一覧:"
echo ""

# PythonでJSONをパースして表示
python3 - <<'PY'
import json
import sys

try:
    with open("/tmp/tables_list.json", "r", encoding="utf-8") as f:
        data = json.load(f)
    
    total_items = data.get("totalItems", 0)
    tables = data.get("tables", [])
    
    print(f"  総テーブル数: {total_items}個")
    print("")
    
    if tables:
        for i, table in enumerate(tables, 1):
            table_id = table.get("tableReference", {}).get("tableId", "unknown")
            print(f"  {i:2d}. ✅ {table_id}")
    else:
        print("  ⚠️  テーブルが見つかりません")
    
    print("")
    print(f"✅ 確認完了: {total_items}個のテーブルが存在します")
    
except Exception as e:
    print(f"❌ JSONのパースに失敗しました: {e}", file=sys.stderr)
    sys.exit(1)
PY

echo ""

# 期待されるテーブル一覧と比較
echo "📋 期待されるテーブルとの照合:"
echo ""

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

python3 - <<PY
import json

with open("/tmp/tables_list.json", "r", encoding="utf-8") as f:
    data = json.load(f)

tables = data.get("tables", [])
existing_table_ids = {table.get("tableReference", {}).get("tableId") for table in tables}

expected_tables = [
  "projects",
  "segments",
  "pois",
  "users",
  "user_requests",
  "messages",
  "change_history",
  "edit_requests",
  "feature_requests",
  "visit_measurement_groups"
]

missing_tables = [t for t in expected_tables if t not in existing_table_ids]

if missing_tables:
    print("  ⚠️  以下のテーブルが見つかりません:")
    for table in missing_tables:
        print(f"    - {table}")
    print("")
else:
    print("  ✅ すべての期待されるテーブルが存在します")
    print("")
PY

echo "=========================================="

