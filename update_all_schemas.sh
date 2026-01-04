#!/bin/bash

# BigQuery全テーブルスキーマ一括更新スクリプト
# コードベースで使用されているフィールドに合わせてスキーマを更新します

set -e  # エラーが発生したら停止

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "🚀 BigQuery全テーブルスキーマ更新を開始します..."
echo "📦 プロジェクト: ${PROJECT_ID}"
echo "📊 データセット: ${DATASET_ID}"
echo ""

# ==================== 1. projectsテーブル ====================
echo "📋 1. projectsテーブルのスキーマを更新中..."

cat > projects_schema.json << 'EOF'
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

bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema projects_schema.json \
  "${DATASET_ID}.projects" || echo "⚠️ projectsテーブルの更新でエラーが発生しました（既存フィールドとの競合の可能性）"

echo "✅ projectsテーブルの更新完了"
echo ""

# ==================== 2. segmentsテーブル ====================
echo "📋 2. segmentsテーブルのスキーマを更新中..."

cat > segments_schema.json << 'EOF'
[
  {"name": "segment_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "segment_name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "segment_registered_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "delivery_media", "type": "STRING", "mode": "NULLABLE"},
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

bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema segments_schema.json \
  "${DATASET_ID}.segments" || echo "⚠️ segmentsテーブルの更新でエラーが発生しました（既存フィールドとの競合の可能性）"

echo "✅ segmentsテーブルの更新完了"
echo ""

# ==================== 3. poisテーブル ====================
echo "📋 3. poisテーブルのスキーマを更新中..."

cat > pois_schema.json << 'EOF'
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

bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema pois_schema.json \
  "${DATASET_ID}.pois" || echo "⚠️ poisテーブルの更新でエラーが発生しました（既存フィールドとの競合の可能性）"

echo "✅ poisテーブルの更新完了"
echo ""

# ==================== 4. usersテーブル ====================
echo "📋 4. usersテーブルのスキーマを更新中..."

cat > users_schema.json << 'EOF'
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

bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema users_schema.json \
  "${DATASET_ID}.users" || echo "⚠️ usersテーブルの更新でエラーが発生しました（既存フィールドとの競合の可能性）"

echo "✅ usersテーブルの更新完了"
echo ""

# ==================== 5. user_requestsテーブル ====================
echo "📋 5. user_requestsテーブルのスキーマを更新中..."
echo "⚠️  注意: 既存のrequest_idフィールドがある場合は、まず現在のスキーマを確認してください"

# まず現在のスキーマを確認
echo "📋 現在のスキーマを確認中..."
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests" > user_requests_current_schema.json || echo "⚠️ スキーマの取得に失敗しました"

# 既存のrequest_idとdesired_roleフィールドを保持しつつ、新しいフィールドを追加
cat > user_requests_schema.json << 'EOF'
[
  {"name": "user_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "request_id", "type": "STRING", "mode": "NULLABLE"},
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

bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema user_requests_schema.json \
  "${DATASET_ID}.user_requests" || echo "⚠️ user_requestsテーブルの更新でエラーが発生しました"

echo "✅ user_requestsテーブルの更新完了"
echo ""

# ==================== 6. messagesテーブル ====================
echo "📋 6. messagesテーブルのスキーマを更新中..."

cat > messages_schema.json << 'EOF'
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

bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema messages_schema.json \
  "${DATASET_ID}.messages" || echo "⚠️ messagesテーブルの更新でエラーが発生しました（既存フィールドとの競合の可能性）"

echo "✅ messagesテーブルの更新完了"
echo ""

# ==================== 完了 ====================
echo "🎉 全テーブルのスキーマ更新が完了しました！"
echo ""
echo "📋 更新されたテーブル:"
echo "  1. projects"
echo "  2. segments"
echo "  3. pois"
echo "  4. users"
echo "  5. user_requests"
echo "  6. messages"
echo ""
echo "⚠️  注意: エラーが発生したテーブルがある場合は、既存フィールドとの競合の可能性があります。"
echo "   各テーブルの現在のスキーマを確認して、手動で調整してください。"

