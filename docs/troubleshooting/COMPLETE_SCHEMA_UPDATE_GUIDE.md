# BigQuery全テーブルスキーマ一括更新ガイド

## 📊 概要

コードベースで使用されているフィールドに合わせて、すべてのBigQueryテーブルのスキーマを一括で更新します。

---

## 🚀 クイックスタート

### 方法1: 一括更新スクリプトを使用（推奨）

```bash
# スクリプトに実行権限を付与
chmod +x update_all_schemas_complete.sh

# スクリプトを実行
./update_all_schemas_complete.sh
```

### 方法2: 個別にテーブルを更新

各テーブルを個別に更新する場合は、以下のコマンドを順番に実行してください。

---

## 📋 各テーブルのスキーマ定義

### 1. projectsテーブル

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

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
  "${DATASET_ID}.projects"
```

### 2. segmentsテーブル

```bash
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
  "${DATASET_ID}.segments"
```

### 3. poisテーブル

```bash
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
  "${DATASET_ID}.pois"
```

### 4. usersテーブル

```bash
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
  "${DATASET_ID}.users"
```

### 5. user_requestsテーブル ⚠️ 重要

**既存の`request_id`と`desired_role`フィールドを保持しつつ、新しいフィールドを追加します。**

```bash
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
  "${DATASET_ID}.user_requests"
```

### 6. messagesテーブル

```bash
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
  "${DATASET_ID}.messages"
```

---

## 🔍 スキーマ確認コマンド

更新後、各テーブルのスキーマを確認します：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# 各テーブルのスキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.projects"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.segments"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.pois"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.users"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.messages"
```

---

## ⚠️ 注意事項

### 1. 既存フィールドの削除

BigQueryでは、既存のフィールドをスキーマから削除することはできません。そのため：
- `user_requests`テーブルの`request_id`と`desired_role`は保持されます
- コードは`user_id`と`requested_role`を使用しますが、スキーマに両方のフィールドがあるため動作します

### 2. REQUIREDフィールドの追加

既存のテーブルにREQUIREDフィールドを追加することはできません。そのため：
- 新しいREQUIREDフィールドを追加する場合は、テーブルを再作成する必要があります
- または、NULLABLEとして追加し、データを移行してからREQUIREDに変更します

### 3. 既存データの保持

`bq update`コマンドは既存のデータを保持します。新しいフィールドは`NULL`になります。

---

## 🛠️ トラブルシューティング

### エラー: "Field already exists"

フィールドが既に存在する場合は、スキップされます。エラーは無視して問題ありません。

### エラー: "Cannot add required field"

既存のテーブルにREQUIREDフィールドを追加することはできません。NULLABLEとして追加してください。

### エラー: "Field is missing in new schema"

既存のREQUIREDフィールドを新しいスキーマに含める必要があります。`user_requests`テーブルの場合、`request_id`と`desired_role`を含めてください。

---

## ✅ 更新後の確認

1. **スキーマ更新を実行**
2. **各テーブルのスキーマを確認**
3. **バックエンドを再デプロイ**（必要に応じて）
4. **動作確認**（ユーザー登録申請など）

---

## 📋 フィールド名の対応表（user_requestsテーブル）

| コード（送信） | 既存スキーマ | 新しいスキーマ（両方保持） |
|--------------|------------|----------------------|
| `user_id` | `request_id` ❌ | `user_id` ✅ + `request_id` (互換性のため保持) |
| `requested_role` | `desired_role` ❌ | `requested_role` ✅ + `desired_role` (互換性のため保持) |

**注意**: コードは`user_id`と`requested_role`を送信しますが、スキーマに両方のフィールドがあるため動作します。

