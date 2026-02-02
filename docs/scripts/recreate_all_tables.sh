#!/bin/bash
# 全テーブルを削除して再作成するスクリプト（リリース前用）
# コードベースのリクエスト内容に合わせて正しいスキーマで再作成します

set -e  # エラーが発生したら停止

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "=========================================="
echo "🔄 全テーブル再作成スクリプト（リリース前用）"
echo "=========================================="
echo ""
echo "📦 プロジェクト: ${PROJECT_ID}"
echo "📊 データセット: ${DATASET_ID}"
echo ""
echo "⚠️  警告: この操作は既存のすべてのテーブルとデータを削除します"
echo "   リリース前で既存データがない、または少ない場合のみ実行してください"
echo ""
echo "削除・再作成されるテーブル:"
echo "  1. projects"
echo "  2. segments"
echo "  3. pois"
echo "  4. users"
echo "  5. user_requests"
echo "  6. messages"
echo "  7. change_history"
echo "  8. edit_requests"
echo "  9. feature_requests"
echo "  10. visit_measurement_groups"
echo ""
read -p "本当に続行しますか？ (yes/no): " -r
echo ""
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ 操作をキャンセルしました"
  exit 1
fi
echo ""

# ==================== 1. projectsテーブル ====================
echo "📋 1. projectsテーブルを再作成中..."

# 既存テーブルを削除
bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.projects" 2>/dev/null || echo "  テーブルが存在しません（スキップ）"

# 新しいスキーマでテーブルを作成
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

bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/projects_schema.json \
  "${DATASET_ID}.projects"

echo "  ✅ projectsテーブルを作成しました"
echo ""

# ==================== 2. segmentsテーブル ====================
echo "📋 2. segmentsテーブルを再作成中..."

bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.segments" 2>/dev/null || echo "  テーブルが存在しません（スキップ）"

cat > /tmp/segments_schema.json << 'EOF'
[
  {"name": "segment_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "segment_name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "segment_registered_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "delivery_media", "type": "STRING", "mode": "REPEATED"},
  {"name": "media_id", "type": "STRING", "mode": "NULLABLE"},
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

bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/segments_schema.json \
  "${DATASET_ID}.segments"

echo "  ✅ segmentsテーブルを作成しました"
echo ""

# ==================== 3. poisテーブル ====================
echo "📋 3. poisテーブルを再作成中..."

bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.pois" 2>/dev/null || echo "  テーブルが存在しません（スキップ）"

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

bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/pois_schema.json \
  "${DATASET_ID}.pois"

echo "  ✅ poisテーブルを作成しました"
echo ""

# ==================== 4. usersテーブル ====================
echo "📋 4. usersテーブルを再作成中..."

bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.users" 2>/dev/null || echo "  テーブルが存在しません（スキップ）"

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

bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/users_schema.json \
  "${DATASET_ID}.users"

echo "  ✅ usersテーブルを作成しました"
echo ""

# ==================== 5. user_requestsテーブル ====================
echo "📋 5. user_requestsテーブルを再作成中..."

bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.user_requests" 2>/dev/null || echo "  テーブルが存在しません（スキップ）"

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

bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/user_requests_schema.json \
  "${DATASET_ID}.user_requests"

echo "  ✅ user_requestsテーブルを作成しました"
echo ""

# ==================== 6. messagesテーブル ====================
echo "📋 6. messagesテーブルを再作成中..."

bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.messages" 2>/dev/null || echo "  テーブルが存在しません（スキップ）"

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

bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/messages_schema.json \
  "${DATASET_ID}.messages"

echo "  ✅ messagesテーブルを作成しました"
echo ""

# ==================== 7. change_historyテーブル ====================
echo "📋 7. change_historyテーブルを再作成中..."

bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.change_history" 2>/dev/null || echo "  テーブルが存在しません（スキップ）"

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

bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/change_history_schema.json \
  "${DATASET_ID}.change_history"

echo "  ✅ change_historyテーブルを作成しました"
echo ""

# ==================== 8. edit_requestsテーブル ====================
echo "📋 8. edit_requestsテーブルを再作成中..."

bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.edit_requests" 2>/dev/null || echo "  テーブルが存在しません（スキップ）"

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

bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/edit_requests_schema.json \
  "${DATASET_ID}.edit_requests"

echo "  ✅ edit_requestsテーブルを作成しました"
echo ""

# ==================== 9. feature_requestsテーブル ====================
echo "📋 9. feature_requestsテーブルを再作成中..."

bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.feature_requests" 2>/dev/null || echo "  テーブルが存在しません（スキップ）"

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

bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/feature_requests_schema.json \
  "${DATASET_ID}.feature_requests"

echo "  ✅ feature_requestsテーブルを作成しました"
echo ""

# ==================== 10. visit_measurement_groupsテーブル ====================
echo "📋 10. visit_measurement_groupsテーブルを再作成中..."

bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.visit_measurement_groups" 2>/dev/null || echo "  テーブルが存在しません（スキップ）"

cat > /tmp/visit_measurement_groups_schema.json << 'EOF'
[
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "group_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "group_name", "type": "STRING", "mode": "REQUIRED"},
  {"name": "created", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
EOF

bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/visit_measurement_groups_schema.json \
  "${DATASET_ID}.visit_measurement_groups"

echo "  ✅ visit_measurement_groupsテーブルを作成しました"
echo ""

# ==================== 完了 ====================
echo "=========================================="
echo "🎉 全テーブルの再作成が完了しました！"
echo "=========================================="
echo ""
echo "📋 作成されたテーブル:"
echo "  1. ✅ projects"
echo "  2. ✅ segments"
echo "  3. ✅ pois"
echo "  4. ✅ users"
echo "  5. ✅ user_requests"
echo "  6. ✅ messages"
echo "  7. ✅ change_history"
echo "  8. ✅ edit_requests"
echo "  9. ✅ feature_requests"
echo "  10. ✅ visit_measurement_groups"
echo ""
echo "📋 スキーマ確認コマンド:"
echo "  bq show --schema --format=prettyjson \"${PROJECT_ID}:${DATASET_ID}.projects\""
echo "  bq show --schema --format=prettyjson \"${PROJECT_ID}:${DATASET_ID}.segments\""
echo "  bq show --schema --format=prettyjson \"${PROJECT_ID}:${DATASET_ID}.pois\""
echo "  bq show --schema --format=prettyjson \"${PROJECT_ID}:${DATASET_ID}.users\""
echo "  bq show --schema --format=prettyjson \"${PROJECT_ID}:${DATASET_ID}.user_requests\""
echo "  bq show --schema --format=prettyjson \"${PROJECT_ID}:${DATASET_ID}.messages\""
echo "  bq show --schema --format=prettyjson \"${PROJECT_ID}:${DATASET_ID}.change_history\""
echo "  bq show --schema --format=prettyjson \"${PROJECT_ID}:${DATASET_ID}.edit_requests\""
echo "  bq show --schema --format=prettyjson \"${PROJECT_ID}:${DATASET_ID}.feature_requests\""
echo "  bq show --schema --format=prettyjson \"${PROJECT_ID}:${DATASET_ID}.visit_measurement_groups\""
echo ""
echo "✅ 次のステップ:"
echo "  1. ブラウザのキャッシュをクリア"
echo "  2. ユーザー登録申請を再試行"
echo "  3. エラーが解消されたか確認"
echo ""

