#!/bin/bash
# REST APIを使用して全テーブルを作成するスクリプト（bqコマンドのタイムアウト問題を回避）

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "=========================================="
echo "📋 全テーブル作成（REST API経由）"
echo "=========================================="
echo ""
echo "📦 プロジェクト: ${PROJECT_ID}"
echo "📊 データセット: ${DATASET_ID}"
echo ""

# トークンの取得
echo "📋 認証トークンを取得中..."
TOKEN=$(gcloud auth print-access-token 2>&1)
if [ $? -ne 0 ]; then
  echo "  ❌ トークンの取得に失敗しました"
  echo "  📋 エラー詳細: ${TOKEN}"
  exit 1
fi
echo "  ✅ トークンを取得しました"
echo ""

# データセットの存在確認
echo "📋 データセットの存在確認..."
DATASET_CHECK_OUTPUT=$(timeout 10s curl -sS -w "http_code=%{http_code}" \
  -H "Authorization: Bearer ${TOKEN}" \
  "https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/datasets/${DATASET_ID}" 2>&1)

if echo "${DATASET_CHECK_OUTPUT}" | grep -q "http_code=200"; then
  echo "  ✅ データセット '${DATASET_ID}' が存在します"
else
  echo "  ❌ データセット '${DATASET_ID}' が存在しません"
  echo "  📋 データセットを作成してください"
  exit 1
fi
echo ""

# テーブル作成関数（REST API経由）
create_table_via_api() {
  local TABLE=$1
  local SCHEMA_FILE="/tmp/${TABLE}_schema.json"
  local REQUEST_FILE="/tmp/create_${TABLE}.json"
  local RESPONSE_FILE="/tmp/create_${TABLE}_resp.json"
  
  echo "  ${TABLE}テーブル:"
  
  # 1) 既に存在するか確認
  TABLE_CHECK_OUTPUT=$(timeout 10s curl -sS -w "http_code=%{http_code}" \
    -H "Authorization: Bearer ${TOKEN}" \
    "https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/datasets/${DATASET_ID}/tables/${TABLE}" 2>&1)
  
  if echo "${TABLE_CHECK_OUTPUT}" | grep -q "http_code=200"; then
    echo "    ⚠️  ${TABLE} は既に存在します"
    return 0
  fi
  
  # 2) スキーマファイルの存在確認
  if [ ! -f "${SCHEMA_FILE}" ]; then
    echo "    ❌ スキーマファイル ${SCHEMA_FILE} が見つかりません"
    return 1
  fi
  
  # 3) JSONリクエストボディを作成
  python3 - <<PY
import json, os
schema = json.load(open("${SCHEMA_FILE}", "r", encoding="utf-8"))
body = {
  "tableReference": {
    "projectId": os.environ["PROJECT_ID"],
    "datasetId": os.environ["DATASET_ID"],
    "tableId": "${TABLE}"
  },
  "schema": {"fields": schema}
}
with open("${REQUEST_FILE}", "w", encoding="utf-8") as f:
  json.dump(body, f, ensure_ascii=False)
print("    📋 リクエストボディを作成しました")
PY
  
  if [ $? -ne 0 ]; then
    echo "    ❌ リクエストボディの作成に失敗しました"
    return 1
  fi
  
  # 4) REST APIでテーブルを作成
  echo "    ➡️  ${TABLE} を作成中..."
  API_RESPONSE=$(timeout 30s curl -sS -o "${RESPONSE_FILE}" -w "http_code=%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    --data-binary @"${REQUEST_FILE}" \
    "https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/datasets/${DATASET_ID}/tables" 2>&1)
  
  HTTP_CODE=$(echo "${API_RESPONSE}" | grep -o "http_code=[0-9]*" | cut -d= -f2)
  
  if [ "${HTTP_CODE}" = "200" ]; then
    echo "    ✅ ${TABLE} を作成しました"
    return 0
  else
    echo "    ❌ ${TABLE} の作成に失敗しました (HTTP ${HTTP_CODE})"
    if [ -f "${RESPONSE_FILE}" ]; then
      echo "    📋 エラー詳細:"
      head -c 500 "${RESPONSE_FILE}" | python3 -m json.tool 2>/dev/null || head -c 500 "${RESPONSE_FILE}"
      echo ""
    fi
    return 1
  fi
}

# 全テーブルを作成
echo "📋 全テーブルを作成中..."
echo ""

# 1. projectsテーブル
echo "1. projectsテーブル:"
cat > /tmp/projects_schema.json <<'EOF'
[
  {"name":"project_id","type":"STRING","mode":"REQUIRED"},
  {"name":"advertiser_name","type":"STRING","mode":"NULLABLE"},
  {"name":"agency_name","type":"STRING","mode":"NULLABLE"},
  {"name":"appeal_point","type":"STRING","mode":"NULLABLE"},
  {"name":"delivery_start_date","type":"DATE","mode":"NULLABLE"},
  {"name":"delivery_end_date","type":"DATE","mode":"NULLABLE"},
  {"name":"person_in_charge","type":"STRING","mode":"NULLABLE"},
  {"name":"project_status","type":"STRING","mode":"NULLABLE"},
  {"name":"remarks","type":"STRING","mode":"NULLABLE"},
  {"name":"project_registration_started_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"_register_datetime","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"created_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"updated_at","type":"TIMESTAMP","mode":"NULLABLE"}
]
EOF
create_table_via_api "projects"
echo ""

# 2. segmentsテーブル
echo "2. segmentsテーブル:"
cat > /tmp/segments_schema.json <<'EOF'
[
  {"name":"segment_id","type":"STRING","mode":"REQUIRED"},
  {"name":"project_id","type":"STRING","mode":"REQUIRED"},
  {"name":"segment_name","type":"STRING","mode":"NULLABLE"},
  {"name":"segment_registered_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"delivery_media","type":"STRING","mode":"NULLABLE"},
  {"name":"media_id","type":"STRING","mode":"NULLABLE"},
  {"name":"attribute","type":"STRING","mode":"NULLABLE"},
  {"name":"extraction_period","type":"STRING","mode":"NULLABLE"},
  {"name":"extraction_start_date","type":"DATE","mode":"NULLABLE"},
  {"name":"extraction_end_date","type":"DATE","mode":"NULLABLE"},
  {"name":"detection_count","type":"INTEGER","mode":"NULLABLE"},
  {"name":"detection_time_start","type":"TIME","mode":"NULLABLE"},
  {"name":"detection_time_end","type":"TIME","mode":"NULLABLE"},
  {"name":"stay_time","type":"STRING","mode":"NULLABLE"},
  {"name":"designated_radius","type":"STRING","mode":"NULLABLE"},
  {"name":"location_request_status","type":"STRING","mode":"NULLABLE"},
  {"name":"data_coordination_date","type":"DATE","mode":"NULLABLE"},
  {"name":"delivery_confirmed","type":"BOOL","mode":"NULLABLE"},
  {"name":"created_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"updated_at","type":"TIMESTAMP","mode":"NULLABLE"}
]
EOF
create_table_via_api "segments"
echo ""

# 3. poisテーブル
echo "3. poisテーブル:"
cat > /tmp/pois_schema.json <<'EOF'
[
  {"name":"poi_id","type":"STRING","mode":"REQUIRED"},
  {"name":"project_id","type":"STRING","mode":"REQUIRED"},
  {"name":"segment_id","type":"STRING","mode":"NULLABLE"},
  {"name":"location_id","type":"STRING","mode":"NULLABLE"},
  {"name":"poi_name","type":"STRING","mode":"REQUIRED"},
  {"name":"address","type":"STRING","mode":"NULLABLE"},
  {"name":"latitude","type":"FLOAT64","mode":"NULLABLE"},
  {"name":"longitude","type":"FLOAT64","mode":"NULLABLE"},
  {"name":"prefectures","type":"STRING","mode":"REPEATED"},
  {"name":"cities","type":"STRING","mode":"REPEATED"},
  {"name":"poi_type","type":"STRING","mode":"NULLABLE"},
  {"name":"poi_category","type":"STRING","mode":"NULLABLE"},
  {"name":"designated_radius","type":"STRING","mode":"NULLABLE"},
  {"name":"setting_flag","type":"STRING","mode":"NULLABLE"},
  {"name":"visit_measurement_group_id","type":"STRING","mode":"NULLABLE"},
  {"name":"created_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"updated_at","type":"TIMESTAMP","mode":"NULLABLE"}
]
EOF
create_table_via_api "pois"
echo ""

# 4. usersテーブル
echo "4. usersテーブル:"
cat > /tmp/users_schema.json <<'EOF'
[
  {"name":"user_id","type":"STRING","mode":"REQUIRED"},
  {"name":"name","type":"STRING","mode":"REQUIRED"},
  {"name":"email","type":"STRING","mode":"REQUIRED"},
  {"name":"password_hash","type":"STRING","mode":"REQUIRED"},
  {"name":"role","type":"STRING","mode":"REQUIRED"},
  {"name":"department","type":"STRING","mode":"NULLABLE"},
  {"name":"is_active","type":"BOOL","mode":"NULLABLE"},
  {"name":"last_login","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"created_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"updated_at","type":"TIMESTAMP","mode":"NULLABLE"}
]
EOF
create_table_via_api "users"
echo ""

# 5. user_requestsテーブル
echo "5. user_requestsテーブル:"
cat > /tmp/user_requests_schema.json <<'EOF'
[
  {"name":"user_id","type":"STRING","mode":"REQUIRED"},
  {"name":"name","type":"STRING","mode":"NULLABLE"},
  {"name":"email","type":"STRING","mode":"NULLABLE"},
  {"name":"password_hash","type":"STRING","mode":"NULLABLE"},
  {"name":"requested_role","type":"STRING","mode":"NULLABLE"},
  {"name":"department","type":"STRING","mode":"NULLABLE"},
  {"name":"reason","type":"STRING","mode":"NULLABLE"},
  {"name":"status","type":"STRING","mode":"NULLABLE"},
  {"name":"requested_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"reviewed_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"reviewed_by","type":"STRING","mode":"NULLABLE"},
  {"name":"review_comment","type":"STRING","mode":"NULLABLE"}
]
EOF
create_table_via_api "user_requests"
echo ""

# 6. messagesテーブル
echo "6. messagesテーブル:"
cat > /tmp/messages_schema.json <<'EOF'
[
  {"name":"message_id","type":"STRING","mode":"REQUIRED"},
  {"name":"project_id","type":"STRING","mode":"REQUIRED"},
  {"name":"sender_id","type":"STRING","mode":"REQUIRED"},
  {"name":"sender_name","type":"STRING","mode":"REQUIRED"},
  {"name":"sender_role","type":"STRING","mode":"REQUIRED"},
  {"name":"content","type":"STRING","mode":"REQUIRED"},
  {"name":"message_type","type":"STRING","mode":"NULLABLE"},
  {"name":"is_read","type":"BOOL","mode":"NULLABLE"},
  {"name":"timestamp","type":"TIMESTAMP","mode":"NULLABLE"}
]
EOF
create_table_via_api "messages"
echo ""

# 7. change_historyテーブル
echo "7. change_historyテーブル:"
cat > /tmp/change_history_schema.json <<'EOF'
[
  {"name":"history_id","type":"STRING","mode":"REQUIRED"},
  {"name":"entity_type","type":"STRING","mode":"REQUIRED"},
  {"name":"entity_id","type":"STRING","mode":"REQUIRED"},
  {"name":"project_id","type":"STRING","mode":"REQUIRED"},
  {"name":"segment_id","type":"STRING","mode":"NULLABLE"},
  {"name":"action","type":"STRING","mode":"REQUIRED"},
  {"name":"changed_by","type":"STRING","mode":"REQUIRED"},
  {"name":"changed_at","type":"TIMESTAMP","mode":"REQUIRED"},
  {"name":"changes","type":"STRING","mode":"NULLABLE"},
  {"name":"deleted_data","type":"STRING","mode":"NULLABLE"}
]
EOF
create_table_via_api "change_history"
echo ""

# 8. edit_requestsテーブル
echo "8. edit_requestsテーブル:"
cat > /tmp/edit_requests_schema.json <<'EOF'
[
  {"name":"request_id","type":"STRING","mode":"REQUIRED"},
  {"name":"request_type","type":"STRING","mode":"REQUIRED"},
  {"name":"target_id","type":"STRING","mode":"REQUIRED"},
  {"name":"project_id","type":"STRING","mode":"REQUIRED"},
  {"name":"segment_id","type":"STRING","mode":"NULLABLE"},
  {"name":"requested_by","type":"STRING","mode":"REQUIRED"},
  {"name":"requested_at","type":"TIMESTAMP","mode":"REQUIRED"},
  {"name":"request_reason","type":"STRING","mode":"REQUIRED"},
  {"name":"status","type":"STRING","mode":"REQUIRED"},
  {"name":"changes","type":"STRING","mode":"NULLABLE"},
  {"name":"reviewed_by","type":"STRING","mode":"NULLABLE"},
  {"name":"reviewed_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"review_comment","type":"STRING","mode":"NULLABLE"}
]
EOF
create_table_via_api "edit_requests"
echo ""

# 9. feature_requestsテーブル
echo "9. feature_requestsテーブル:"
cat > /tmp/feature_requests_schema.json <<'EOF'
[
  {"name":"request_id","type":"STRING","mode":"REQUIRED"},
  {"name":"requested_by","type":"STRING","mode":"REQUIRED"},
  {"name":"requested_by_name","type":"STRING","mode":"REQUIRED"},
  {"name":"requested_at","type":"TIMESTAMP","mode":"REQUIRED"},
  {"name":"title","type":"STRING","mode":"REQUIRED"},
  {"name":"description","type":"STRING","mode":"REQUIRED"},
  {"name":"category","type":"STRING","mode":"REQUIRED"},
  {"name":"priority","type":"STRING","mode":"REQUIRED"},
  {"name":"status","type":"STRING","mode":"REQUIRED"},
  {"name":"reviewed_by","type":"STRING","mode":"NULLABLE"},
  {"name":"reviewed_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"review_comment","type":"STRING","mode":"NULLABLE"},
  {"name":"implemented_at","type":"TIMESTAMP","mode":"NULLABLE"}
]
EOF
create_table_via_api "feature_requests"
echo ""

# 10. visit_measurement_groupsテーブル
echo "10. visit_measurement_groupsテーブル:"
cat > /tmp/visit_measurement_groups_schema.json <<'EOF'
[
  {"name":"project_id","type":"STRING","mode":"REQUIRED"},
  {"name":"group_id","type":"STRING","mode":"REQUIRED"},
  {"name":"group_name","type":"STRING","mode":"REQUIRED"},
  {"name":"created","type":"TIMESTAMP","mode":"NULLABLE"}
]
EOF
create_table_via_api "visit_measurement_groups"
echo ""

echo "=========================================="
echo "🎉 全テーブル作成が完了しました！"
echo "=========================================="
echo ""
echo "📋 確認コマンド:"
echo "  bq ls --project_id=\"${PROJECT_ID}\" \"${DATASET_ID}\""
echo ""

