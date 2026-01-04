<!-- ⚠️ 削除候補: このファイルは一時的なトラブルシューティングガイドです。問題が解決されたら削除可能です。 -->

# データセットが見つからないエラーの修正

## 🚨 エラー

```
BigQuery error in mk operation: Not found: Dataset univere-geo-demo:universegeo_dataset
```

## 🔍 原因

データセット `universegeo_dataset` が存在しないため、テーブルを作成できません。

## 🛠️ 解決方法

### ステップ1: データセットを作成

Cloud Shellで以下のコマンドを実行：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
LOCATION="asia-northeast1"

echo "データセットを作成中..."
bq mk --dataset \
  --project_id="${PROJECT_ID}" \
  --location="${LOCATION}" \
  --description="UNIVERSEGEO データセット" \
  "${DATASET_ID}"

echo "✅ データセットを作成しました"
```

### ステップ2: データセットの存在確認

```bash
bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}"
```

データセットが表示されれば成功です。

### ステップ3: 全テーブルを作成

データセットが作成されたら、全テーブルを作成します。

---

## 🚀 一括実行（データセット作成 + 全テーブル作成）

Cloud Shellで以下のコマンドをコピー&ペーストして実行：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
LOCATION="asia-northeast1"

echo "=========================================="
echo "📋 データセットと全テーブル作成"
echo "=========================================="
echo ""

# ステップ1: データセットの作成
echo "📋 ステップ1: データセットの作成..."
if bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" &> /dev/null; then
  echo "  ✅ データセット '${DATASET_ID}' が既に存在します"
else
  echo "  📋 データセットを作成中..."
  bq mk --dataset \
    --project_id="${PROJECT_ID}" \
    --location="${LOCATION}" \
    --description="UNIVERSEGEO データセット" \
    "${DATASET_ID}"
  echo "  ✅ データセットを作成しました"
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
bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/projects_schema.json "${DATASET_ID}.projects" 2>/dev/null && echo "    ✅ projects" || echo "    ⚠️  projects (既に存在)"
echo ""

# 2. segmentsテーブル
echo "  2. segmentsテーブルを作成中..."
cat > /tmp/segments_schema.json << 'EOF'
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
bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/segments_schema.json "${DATASET_ID}.segments" 2>/dev/null && echo "    ✅ segments" || echo "    ⚠️  segments (既に存在)"
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
bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/pois_schema.json "${DATASET_ID}.pois" 2>/dev/null && echo "    ✅ pois" || echo "    ⚠️  pois (既に存在)"
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
bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/users_schema.json "${DATASET_ID}.users" 2>/dev/null && echo "    ✅ users" || echo "    ⚠️  users (既に存在)"
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
bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/user_requests_schema.json "${DATASET_ID}.user_requests" 2>/dev/null && echo "    ✅ user_requests" || echo "    ⚠️  user_requests (既に存在)"
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
bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/messages_schema.json "${DATASET_ID}.messages" 2>/dev/null && echo "    ✅ messages" || echo "    ⚠️  messages (既に存在)"
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
bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/change_history_schema.json "${DATASET_ID}.change_history" 2>/dev/null && echo "    ✅ change_history" || echo "    ⚠️  change_history (既に存在)"
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
bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/edit_requests_schema.json "${DATASET_ID}.edit_requests" 2>/dev/null && echo "    ✅ edit_requests" || echo "    ⚠️  edit_requests (既に存在)"
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
bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/feature_requests_schema.json "${DATASET_ID}.feature_requests" 2>/dev/null && echo "    ✅ feature_requests" || echo "    ⚠️  feature_requests (既に存在)"
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
bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/visit_measurement_groups_schema.json "${DATASET_ID}.visit_measurement_groups" 2>/dev/null && echo "    ✅ visit_measurement_groups" || echo "    ⚠️  visit_measurement_groups (既に存在)"
echo ""

echo "=========================================="
echo "🎉 データセットと全テーブルの作成が完了しました！"
echo "=========================================="
echo ""
echo "📋 確認コマンド:"
echo "  bq ls --project_id=\"${PROJECT_ID}\" \"${DATASET_ID}\""
```

---

## ✅ 確認

実行後、データセットとテーブルが正しく作成されたか確認：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# データセットの存在確認
echo "データセットの存在確認:"
bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}"

# テーブル一覧
echo ""
echo "作成済みテーブル一覧:"
bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1 | tail -n +3

echo ""
echo "期待されるテーブル数: 10個"
echo "作成済みテーブル数: $(bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1 | tail -n +3 | wc -l)個"
```

---

## 📋 次のステップ

1. データセットを作成（上記のコマンドを実行）
2. 全テーブルを作成（上記のコマンドで自動的に作成されます）
3. テーブル一覧を確認（10個すべてが表示されることを確認）
4. ブラウザのキャッシュをクリア
5. ユーザー登録申請を再試行
6. エラーが解消されたか確認

