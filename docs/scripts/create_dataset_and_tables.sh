#!/bin/bash
# データセットと全テーブルを作成するスクリプト

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
LOCATION="asia-northeast1"

echo "=========================================="
echo "📋 データセットと全テーブル作成"
echo "=========================================="
echo ""
echo "📦 プロジェクト: ${PROJECT_ID}"
echo "📊 データセット: ${DATASET_ID}"
echo "📍 ロケーション: ${LOCATION}"
echo ""

# ステップ1: データセットの存在確認
echo "📋 ステップ1: データセットの存在確認..."
DATASET_CHECK_OUTPUT=$(bq show --dataset --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1)
DATASET_CHECK_EXIT_CODE=$?

if [ ${DATASET_CHECK_EXIT_CODE} -eq 0 ]; then
  echo "  ✅ データセット '${DATASET_ID}' が既に存在します"
  echo "  📊 データセット情報:"
  echo "${DATASET_CHECK_OUTPUT}" | head -n 5
else
  echo "  ⚠️  データセット '${DATASET_ID}' が存在しません"
  echo "  📋 データセットを作成中..."
  
  DATASET_CREATE_OUTPUT=$(bq mk --dataset \
    --project_id="${PROJECT_ID}" \
    --location="${LOCATION}" \
    --description="UNIVERSEGEO データセット" \
    "${DATASET_ID}" 2>&1)
  DATASET_CREATE_EXIT_CODE=$?
  
  if [ ${DATASET_CREATE_EXIT_CODE} -eq 0 ]; then
    echo "  ✅ データセットを作成しました"
  else
    echo "  ❌ データセットの作成に失敗しました"
    echo "  📋 エラー詳細:"
    echo "${DATASET_CREATE_OUTPUT}"
    exit 1
  fi
fi
echo ""

# ステップ2: 全テーブルを作成
echo "📋 ステップ2: 全テーブルを作成中..."
echo ""

# 1. projectsテーブル
echo "  1. projectsテーブルを作成中..."
cat > /tmp/projects_schema.json << 'EOF'
[
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "advertiser_name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "agency_name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "appeal_point", "type": "STRING", "mode": "NULLABLE"},
  {"name": "delivery_start_date", "type": "DATE", "mode": "NULLABLE"},
  {"name": "delivery_end_date", "type": "DATE", "mode": "NULLABLE"},
  {"name": "person_in_charge", "type": "STRING", "mode": "NULLABLE"},
  {"name": "project_status", "type": "STRING", "mode": "NULLABLE"},
  {"name": "remarks", "type": "STRING", "mode": "NULLABLE"},
  {"name": "project_registration_started_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "_register_datetime", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "created_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "updated_at", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
EOF
TABLE_CREATE_OUTPUT=$(bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/projects_schema.json "${DATASET_ID}.projects" 2>&1)
TABLE_CREATE_EXIT_CODE=$?
if [ ${TABLE_CREATE_EXIT_CODE} -eq 0 ]; then
  echo "    ✅ projects"
else
  if echo "${TABLE_CREATE_OUTPUT}" | grep -q "Already Exists"; then
    echo "    ⚠️  projects (既に存在します)"
  else
    echo "    ❌ projects の作成に失敗しました"
    echo "    📋 エラー詳細: ${TABLE_CREATE_OUTPUT}"
  fi
fi
echo ""

# 2. segmentsテーブル
echo "  2. segmentsテーブルを作成中..."
cat > /tmp/segments_schema.json << 'EOF'
[
  {"name": "segment_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "segment_name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "segment_registered_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "delivery_media", "type": "STRING", "mode": "REPEATED"},
  {"name": "media_id", "type": "STRING", "mode": "REPEATED"},
  {"name": "attribute", "type": "STRING", "mode": "NULLABLE"},
  {"name": "extraction_period", "type": "STRING", "mode": "NULLABLE"},
  {"name": "extraction_start_date", "type": "DATE", "mode": "NULLABLE"},
  {"name": "extraction_end_date", "type": "DATE", "mode": "NULLABLE"},
  {"name": "detection_count", "type": "INTEGER", "mode": "NULLABLE"},
  {"name": "detection_time_start", "type": "TIME", "mode": "NULLABLE"},
  {"name": "detection_time_end", "type": "TIME", "mode": "NULLABLE"},
  {"name": "stay_time", "type": "STRING", "mode": "NULLABLE"},
  {"name": "designated_radius", "type": "STRING", "mode": "NULLABLE"},
  {"name": "location_request_status", "type": "STRING", "mode": "NULLABLE"},
  {"name": "data_coordination_date", "type": "DATE", "mode": "NULLABLE"},
  {"name": "delivery_confirmed", "type": "BOOL", "mode": "NULLABLE"},
  {"name": "created_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "updated_at", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
EOF
TABLE_CREATE_OUTPUT=$(bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/segments_schema.json "${DATASET_ID}.segments" 2>&1)
TABLE_CREATE_EXIT_CODE=$?
if [ ${TABLE_CREATE_EXIT_CODE} -eq 0 ]; then
  echo "    ✅ segments"
else
  if echo "${TABLE_CREATE_OUTPUT}" | grep -q "Already Exists"; then
    echo "    ⚠️  segments (既に存在します)"
  else
    echo "    ❌ segments の作成に失敗しました"
    echo "    📋 エラー詳細: ${TABLE_CREATE_OUTPUT}"
  fi
fi
echo ""

# 3. poisテーブル
echo "  3. poisテーブルを作成中..."
cat > /tmp/pois_schema.json << 'EOF'
[
  {"name": "poi_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "segment_id", "type": "STRING", "mode": "NULLABLE"},
  {"name": "location_id", "type": "STRING", "mode": "NULLABLE"},
  {"name": "poi_name", "type": "STRING", "mode": "REQUIRED"},
  {"name": "address", "type": "STRING", "mode": "NULLABLE"},
  {"name": "latitude", "type": "FLOAT64", "mode": "NULLABLE"},
  {"name": "longitude", "type": "FLOAT64", "mode": "NULLABLE"},
  {"name": "prefectures", "type": "STRING", "mode": "REPEATED"},
  {"name": "cities", "type": "STRING", "mode": "REPEATED"},
  {"name": "poi_type", "type": "STRING", "mode": "NULLABLE"},
  {"name": "poi_category", "type": "STRING", "mode": "NULLABLE"},
  {"name": "designated_radius", "type": "STRING", "mode": "NULLABLE"},
  {"name": "setting_flag", "type": "STRING", "mode": "NULLABLE"},
  {"name": "visit_measurement_group_id", "type": "STRING", "mode": "NULLABLE"},
  {"name": "created_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "updated_at", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
EOF
TABLE_CREATE_OUTPUT=$(bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/pois_schema.json "${DATASET_ID}.pois" 2>&1)
TABLE_CREATE_EXIT_CODE=$?
if [ ${TABLE_CREATE_EXIT_CODE} -eq 0 ]; then
  echo "    ✅ pois"
else
  if echo "${TABLE_CREATE_OUTPUT}" | grep -q "Already Exists"; then
    echo "    ⚠️  pois (既に存在します)"
  else
    echo "    ❌ pois の作成に失敗しました"
    echo "    📋 エラー詳細: ${TABLE_CREATE_OUTPUT}"
  fi
fi
echo ""

# 4. usersテーブル
echo "  4. usersテーブルを作成中..."
cat > /tmp/users_schema.json << 'EOF'
[
  {"name": "user_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "name", "type": "STRING", "mode": "REQUIRED"},
  {"name": "email", "type": "STRING", "mode": "REQUIRED"},
  {"name": "password_hash", "type": "STRING", "mode": "REQUIRED"},
  {"name": "role", "type": "STRING", "mode": "REQUIRED"},
  {"name": "department", "type": "STRING", "mode": "NULLABLE"},
  {"name": "is_active", "type": "BOOL", "mode": "NULLABLE"},
  {"name": "last_login", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "created_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "updated_at", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
EOF
TABLE_CREATE_OUTPUT=$(bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/users_schema.json "${DATASET_ID}.users" 2>&1)
TABLE_CREATE_EXIT_CODE=$?
if [ ${TABLE_CREATE_EXIT_CODE} -eq 0 ]; then
  echo "    ✅ users"
else
  if echo "${TABLE_CREATE_OUTPUT}" | grep -q "Already Exists"; then
    echo "    ⚠️  users (既に存在します)"
  else
    echo "    ❌ users の作成に失敗しました"
    echo "    📋 エラー詳細: ${TABLE_CREATE_OUTPUT}"
  fi
fi
echo ""

# 5. user_requestsテーブル
echo "  5. user_requestsテーブルを作成中..."
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
TABLE_CREATE_OUTPUT=$(bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/user_requests_schema.json "${DATASET_ID}.user_requests" 2>&1)
TABLE_CREATE_EXIT_CODE=$?
if [ ${TABLE_CREATE_EXIT_CODE} -eq 0 ]; then
  echo "    ✅ user_requests"
else
  if echo "${TABLE_CREATE_OUTPUT}" | grep -q "Already Exists"; then
    echo "    ⚠️  user_requests (既に存在します)"
  else
    echo "    ❌ user_requests の作成に失敗しました"
    echo "    📋 エラー詳細: ${TABLE_CREATE_OUTPUT}"
  fi
fi
echo ""

# 6. messagesテーブル
echo "  6. messagesテーブルを作成中..."
cat > /tmp/messages_schema.json << 'EOF'
[
  {"name": "message_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "sender_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "sender_name", "type": "STRING", "mode": "REQUIRED"},
  {"name": "sender_role", "type": "STRING", "mode": "REQUIRED"},
  {"name": "content", "type": "STRING", "mode": "REQUIRED"},
  {"name": "message_type", "type": "STRING", "mode": "NULLABLE"},
  {"name": "is_read", "type": "BOOL", "mode": "NULLABLE"},
  {"name": "timestamp", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
EOF
TABLE_CREATE_OUTPUT=$(bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/messages_schema.json "${DATASET_ID}.messages" 2>&1)
TABLE_CREATE_EXIT_CODE=$?
if [ ${TABLE_CREATE_EXIT_CODE} -eq 0 ]; then
  echo "    ✅ messages"
else
  if echo "${TABLE_CREATE_OUTPUT}" | grep -q "Already Exists"; then
    echo "    ⚠️  messages (既に存在します)"
  else
    echo "    ❌ messages の作成に失敗しました"
    echo "    📋 エラー詳細: ${TABLE_CREATE_OUTPUT}"
  fi
fi
echo ""

# 7. change_historyテーブル
echo "  7. change_historyテーブルを作成中..."
cat > /tmp/change_history_schema.json << 'EOF'
[
  {"name": "history_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "entity_type", "type": "STRING", "mode": "REQUIRED"},
  {"name": "entity_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "segment_id", "type": "STRING", "mode": "NULLABLE"},
  {"name": "action", "type": "STRING", "mode": "REQUIRED"},
  {"name": "changed_by", "type": "STRING", "mode": "REQUIRED"},
  {"name": "changed_at", "type": "TIMESTAMP", "mode": "REQUIRED"},
  {"name": "changes", "type": "STRING", "mode": "NULLABLE"},
  {"name": "deleted_data", "type": "STRING", "mode": "NULLABLE"}
]
EOF
TABLE_CREATE_OUTPUT=$(bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/change_history_schema.json "${DATASET_ID}.change_history" 2>&1)
TABLE_CREATE_EXIT_CODE=$?
if [ ${TABLE_CREATE_EXIT_CODE} -eq 0 ]; then
  echo "    ✅ change_history"
else
  if echo "${TABLE_CREATE_OUTPUT}" | grep -q "Already Exists"; then
    echo "    ⚠️  change_history (既に存在します)"
  else
    echo "    ❌ change_history の作成に失敗しました"
    echo "    📋 エラー詳細: ${TABLE_CREATE_OUTPUT}"
  fi
fi
echo ""

# 8. edit_requestsテーブル
echo "  8. edit_requestsテーブルを作成中..."
cat > /tmp/edit_requests_schema.json << 'EOF'
[
  {"name": "request_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "request_type", "type": "STRING", "mode": "REQUIRED"},
  {"name": "target_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "segment_id", "type": "STRING", "mode": "NULLABLE"},
  {"name": "requested_by", "type": "STRING", "mode": "REQUIRED"},
  {"name": "requested_at", "type": "TIMESTAMP", "mode": "REQUIRED"},
  {"name": "request_reason", "type": "STRING", "mode": "REQUIRED"},
  {"name": "status", "type": "STRING", "mode": "REQUIRED"},
  {"name": "changes", "type": "STRING", "mode": "NULLABLE"},
  {"name": "reviewed_by", "type": "STRING", "mode": "NULLABLE"},
  {"name": "reviewed_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "review_comment", "type": "STRING", "mode": "NULLABLE"}
]
EOF
TABLE_CREATE_OUTPUT=$(bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/edit_requests_schema.json "${DATASET_ID}.edit_requests" 2>&1)
TABLE_CREATE_EXIT_CODE=$?
if [ ${TABLE_CREATE_EXIT_CODE} -eq 0 ]; then
  echo "    ✅ edit_requests"
else
  if echo "${TABLE_CREATE_OUTPUT}" | grep -q "Already Exists"; then
    echo "    ⚠️  edit_requests (既に存在します)"
  else
    echo "    ❌ edit_requests の作成に失敗しました"
    echo "    📋 エラー詳細: ${TABLE_CREATE_OUTPUT}"
  fi
fi
echo ""

# 9. feature_requestsテーブル
echo "  9. feature_requestsテーブルを作成中..."
cat > /tmp/feature_requests_schema.json << 'EOF'
[
  {"name": "request_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "requested_by", "type": "STRING", "mode": "REQUIRED"},
  {"name": "requested_by_name", "type": "STRING", "mode": "REQUIRED"},
  {"name": "requested_at", "type": "TIMESTAMP", "mode": "REQUIRED"},
  {"name": "title", "type": "STRING", "mode": "REQUIRED"},
  {"name": "description", "type": "STRING", "mode": "REQUIRED"},
  {"name": "category", "type": "STRING", "mode": "REQUIRED"},
  {"name": "priority", "type": "STRING", "mode": "REQUIRED"},
  {"name": "status", "type": "STRING", "mode": "REQUIRED"},
  {"name": "reviewed_by", "type": "STRING", "mode": "NULLABLE"},
  {"name": "reviewed_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "review_comment", "type": "STRING", "mode": "NULLABLE"},
  {"name": "implemented_at", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
EOF
TABLE_CREATE_OUTPUT=$(bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/feature_requests_schema.json "${DATASET_ID}.feature_requests" 2>&1)
TABLE_CREATE_EXIT_CODE=$?
if [ ${TABLE_CREATE_EXIT_CODE} -eq 0 ]; then
  echo "    ✅ feature_requests"
else
  if echo "${TABLE_CREATE_OUTPUT}" | grep -q "Already Exists"; then
    echo "    ⚠️  feature_requests (既に存在します)"
  else
    echo "    ❌ feature_requests の作成に失敗しました"
    echo "    📋 エラー詳細: ${TABLE_CREATE_OUTPUT}"
  fi
fi
echo ""

# 10. visit_measurement_groupsテーブル
echo "  10. visit_measurement_groupsテーブルを作成中..."
cat > /tmp/visit_measurement_groups_schema.json << 'EOF'
[
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "group_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "group_name", "type": "STRING", "mode": "REQUIRED"},
  {"name": "created", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
EOF
TABLE_CREATE_OUTPUT=$(bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/visit_measurement_groups_schema.json "${DATASET_ID}.visit_measurement_groups" 2>&1)
TABLE_CREATE_EXIT_CODE=$?
if [ ${TABLE_CREATE_EXIT_CODE} -eq 0 ]; then
  echo "    ✅ visit_measurement_groups"
else
  if echo "${TABLE_CREATE_OUTPUT}" | grep -q "Already Exists"; then
    echo "    ⚠️  visit_measurement_groups (既に存在します)"
  else
    echo "    ❌ visit_measurement_groups の作成に失敗しました"
    echo "    📋 エラー詳細: ${TABLE_CREATE_OUTPUT}"
  fi
fi
echo ""

echo "=========================================="
echo "🎉 データセットと全テーブルの作成が完了しました！"
echo "=========================================="
echo ""
echo "📋 確認コマンド:"
echo "  bq ls --project_id=\"${PROJECT_ID}\" \"${DATASET_ID}\""
echo ""

