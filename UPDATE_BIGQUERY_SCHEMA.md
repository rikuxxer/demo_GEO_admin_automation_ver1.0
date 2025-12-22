# BigQueryテーブルスキーマ更新ガイド

## 現在のコードで使用されているフィールド

### 1. projectsテーブル

**必須フィールド:**
- `project_id` (STRING, REQUIRED)
- `advertiser_name` (STRING)
- `appeal_point` (STRING)
- `delivery_start_date` (DATE)
- `delivery_end_date` (DATE)
- `person_in_charge` (STRING)
- `_register_datetime` (TIMESTAMP)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**オプションフィールド:**
- `agency_name` (STRING, NULLABLE) - ✅ 既に追加済み
- `remarks` (STRING, NULLABLE) - ✅ 既に追加済み
- `project_status` (STRING, NULLABLE)
- `project_registration_started_at` (TIMESTAMP, NULLABLE)

### 2. segmentsテーブル

**必須フィールド:**
- `segment_id` (STRING, REQUIRED)
- `project_id` (STRING, REQUIRED)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**オプションフィールド:**
- `segment_name` (STRING, NULLABLE)
- `segment_registered_at` (TIMESTAMP, NULLABLE)
- `delivery_media` (STRING, NULLABLE)
- `media_id` (STRING, NULLABLE)
- `attribute` (STRING, NULLABLE)
- `extraction_period` (STRING, NULLABLE)
- `extraction_start_date` (DATE, NULLABLE)
- `extraction_end_date` (DATE, NULLABLE)
- `detection_count` (INTEGER, NULLABLE)
- `detection_time_start` (TIME, NULLABLE)
- `detection_time_end` (TIME, NULLABLE)
- `stay_time` (STRING, NULLABLE)
- `designated_radius` (STRING, NULLABLE)
- `location_request_status` (STRING, NULLABLE)
- `data_coordination_date` (DATE, NULLABLE)
- `delivery_confirmed` (BOOL, NULLABLE)

### 3. poisテーブル

**必須フィールド:**
- `poi_id` (STRING, REQUIRED)
- `project_id` (STRING, REQUIRED)
- `poi_name` (STRING, REQUIRED)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**オプションフィールド:**
- `segment_id` (STRING, NULLABLE)
- `location_id` (STRING, NULLABLE)
- `address` (STRING, NULLABLE)
- `latitude` (FLOAT64, NULLABLE)
- `longitude` (FLOAT64, NULLABLE)
- `prefectures` (ARRAY<STRING>, NULLABLE)
- `cities` (ARRAY<STRING>, NULLABLE)
- `poi_type` (STRING, NULLABLE)
- `poi_category` (STRING, NULLABLE)
- `designated_radius` (STRING, NULLABLE)
- `setting_flag` (STRING, NULLABLE)
- `visit_measurement_group_id` (STRING, NULLABLE)

### 4. usersテーブル

**必須フィールド:**
- `user_id` (STRING, REQUIRED)
- `name` (STRING, REQUIRED)
- `email` (STRING, REQUIRED)
- `password_hash` (STRING, REQUIRED)
- `role` (STRING, REQUIRED)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**オプションフィールド:**
- `department` (STRING, NULLABLE)
- `is_active` (BOOL, NULLABLE)
- `last_login` (TIMESTAMP, NULLABLE)

### 5. user_requestsテーブル

**必須フィールド:**
- `user_id` (STRING, REQUIRED)
- `name` (STRING)
- `email` (STRING)
- `password_hash` (STRING)
- `requested_role` (STRING)
- `status` (STRING)
- `requested_at` (TIMESTAMP)

**オプションフィールド:**
- `department` (STRING, NULLABLE)
- `reason` (STRING, NULLABLE)
- `reviewed_at` (TIMESTAMP, NULLABLE)
- `reviewed_by` (STRING, NULLABLE)
- `review_comment` (STRING, NULLABLE)

### 6. messagesテーブル

**必須フィールド:**
- `message_id` (STRING, REQUIRED)
- `project_id` (STRING, REQUIRED)
- `sender_id` (STRING, REQUIRED)
- `sender_name` (STRING, REQUIRED)
- `sender_role` (STRING, REQUIRED)
- `content` (STRING, REQUIRED)
- `is_read` (BOOL)
- `timestamp` (TIMESTAMP)

**オプションフィールド:**
- `message_type` (STRING, NULLABLE)

### 7. change_historyテーブル

**必須フィールド:**
- `history_id` (STRING, REQUIRED)
- `entity_type` (STRING, REQUIRED) - 'project' | 'segment' | 'poi'
- `entity_id` (STRING, REQUIRED)
- `project_id` (STRING, REQUIRED)
- `action` (STRING, REQUIRED) - 'create' | 'update' | 'delete'
- `changed_by` (STRING, REQUIRED)
- `changed_at` (TIMESTAMP, REQUIRED)

**オプションフィールド:**
- `segment_id` (STRING, NULLABLE)
- `changes` (STRING, NULLABLE) - JSON形式で保存
- `deleted_data` (STRING, NULLABLE) - JSON形式で保存

### 8. edit_requestsテーブル

**必須フィールド:**
- `request_id` (STRING, REQUIRED)
- `request_type` (STRING, REQUIRED) - 'project' | 'segment' | 'poi'
- `target_id` (STRING, REQUIRED)
- `project_id` (STRING, REQUIRED)
- `requested_by` (STRING, REQUIRED)
- `requested_at` (TIMESTAMP, REQUIRED)
- `request_reason` (STRING, REQUIRED)
- `status` (STRING, REQUIRED) - 'pending' | 'approved' | 'rejected' | 'withdrawn'

**オプションフィールド:**
- `segment_id` (STRING, NULLABLE)
- `changes` (STRING, NULLABLE) - JSON形式で保存
- `reviewed_by` (STRING, NULLABLE)
- `reviewed_at` (TIMESTAMP, NULLABLE)
- `review_comment` (STRING, NULLABLE)

### 9. feature_requestsテーブル

**必須フィールド:**
- `request_id` (STRING, REQUIRED)
- `requested_by` (STRING, REQUIRED)
- `requested_by_name` (STRING, REQUIRED)
- `requested_at` (TIMESTAMP, REQUIRED)
- `title` (STRING, REQUIRED)
- `description` (STRING, REQUIRED)
- `category` (STRING, REQUIRED) - 'new_feature' | 'improvement' | 'bug_fix' | 'other'
- `priority` (STRING, REQUIRED) - 'low' | 'medium' | 'high'
- `status` (STRING, REQUIRED) - 'pending' | 'under_review' | 'approved' | 'rejected' | 'implemented'

**オプションフィールド:**
- `reviewed_by` (STRING, NULLABLE)
- `reviewed_at` (TIMESTAMP, NULLABLE)
- `review_comment` (STRING, NULLABLE)
- `implemented_at` (TIMESTAMP, NULLABLE)

### 10. visit_measurement_groupsテーブル

**必須フィールド:**
- `project_id` (STRING, REQUIRED)
- `group_id` (STRING, REQUIRED)
- `group_name` (STRING, REQUIRED)

**オプションフィールド:**
- `created` (TIMESTAMP, NULLABLE)

## スキーマ更新コマンド

### 方法1: 既存スキーマを確認してから更新

```bash
# プロジェクトIDとデータセットIDを設定
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# 現在のスキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.projects" > projects_schema.json
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.segments" > segments_schema.json
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.pois" > pois_schema.json
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.users" > users_schema.json
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests" > user_requests_schema.json
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.messages" > messages_schema.json
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.change_history" > change_history_schema.json
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.edit_requests" > edit_requests_schema.json
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.feature_requests" > feature_requests_schema.json
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.visit_measurement_groups" > visit_measurement_groups_schema.json

# スキーマを確認
cat projects_schema.json
cat segments_schema.json
cat pois_schema.json
cat users_schema.json
cat user_requests_schema.json
cat messages_schema.json
cat change_history_schema.json
cat edit_requests_schema.json
cat feature_requests_schema.json
cat visit_measurement_groups_schema.json
```

### 方法2: スキーマを更新（既存フィールドを保持）

#### projectsテーブル

```bash
# プロジェクトIDとデータセットIDを設定
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="projects"

# 変数が正しく設定されているか確認
echo "PROJECT_ID: $PROJECT_ID"
echo "DATASET_ID: $DATASET_ID"
echo "TABLE: $TABLE"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# スキーマファイルが正しく作成されたか確認
if [ ! -f schema.json ]; then
  echo "❌ エラー: schema.jsonが作成されませんでした"
  exit 1
fi

# 新しいフィールドを追加（既に存在する場合はスキップ）
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"agency_name","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"remarks","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"project_status","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"project_registration_started_at","type":"TIMESTAMP","mode":"NULLABLE"})
' schema.json > schema_new.json

# 更新後のスキーマを確認
echo "📋 更新後のスキーマ:"
cat schema_new.json

# スキーマを更新（--projectフラグを明示的に指定）
bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema schema_new.json \
  "${DATASET_ID}.${TABLE}"

# または、完全修飾名を使用
# bq update -t --schema schema_new.json "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

#### user_requestsテーブル

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# 新しいフィールドを追加（既に存在する場合はスキップ）
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"department","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"reason","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"reviewed_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"reviewed_by","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"review_comment","type":"STRING","mode":"NULLABLE"})
' schema.json > schema_new.json

# スキーマを更新
bq update -t --schema schema_new.json "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

#### segmentsテーブル

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="segments"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# 新しいフィールドを追加（既に存在する場合はスキップ）
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"segment_name","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"segment_registered_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"delivery_media","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"media_id","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"attribute","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"extraction_period","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"extraction_start_date","type":"DATE","mode":"NULLABLE"}) |
  addfield({"name":"extraction_end_date","type":"DATE","mode":"NULLABLE"}) |
  addfield({"name":"detection_count","type":"INTEGER","mode":"NULLABLE"}) |
  addfield({"name":"detection_time_start","type":"TIME","mode":"NULLABLE"}) |
  addfield({"name":"detection_time_end","type":"TIME","mode":"NULLABLE"}) |
  addfield({"name":"stay_time","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"designated_radius","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"location_request_status","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"data_coordination_date","type":"DATE","mode":"NULLABLE"}) |
  addfield({"name":"delivery_confirmed","type":"BOOL","mode":"NULLABLE"}) |
  addfield({"name":"created_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"updated_at","type":"TIMESTAMP","mode":"NULLABLE"})
' schema.json > schema_new.json

# スキーマを更新
bq update -t --schema schema_new.json "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

#### poisテーブル

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="pois"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# 新しいフィールドを追加（既に存在する場合はスキップ）
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"location_id","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"address","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"latitude","type":"FLOAT64","mode":"NULLABLE"}) |
  addfield({"name":"longitude","type":"FLOAT64","mode":"NULLABLE"}) |
  addfield({"name":"prefectures","type":"STRING","mode":"REPEATED"}) |
  addfield({"name":"cities","type":"STRING","mode":"REPEATED"}) |
  addfield({"name":"poi_type","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"poi_category","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"designated_radius","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"setting_flag","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"visit_measurement_group_id","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"created_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"updated_at","type":"TIMESTAMP","mode":"NULLABLE"})
' schema.json > schema_new.json

# スキーマを更新
bq update -t --schema schema_new.json "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

#### usersテーブル

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="users"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# 新しいフィールドを追加（既に存在する場合はスキップ）
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"department","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"is_active","type":"BOOL","mode":"NULLABLE"}) |
  addfield({"name":"last_login","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"created_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"updated_at","type":"TIMESTAMP","mode":"NULLABLE"})
' schema.json > schema_new.json

# スキーマを更新
bq update -t --schema schema_new.json "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

#### messagesテーブル

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="messages"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# 新しいフィールドを追加（既に存在する場合はスキップ）
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"message_type","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"is_read","type":"BOOL","mode":"NULLABLE"}) |
  addfield({"name":"timestamp","type":"TIMESTAMP","mode":"NULLABLE"})
' schema.json > schema_new.json

# スキーマを更新
bq update -t --schema schema_new.json "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

#### change_historyテーブル

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="change_history"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# 新しいフィールドを追加（既に存在する場合はスキップ）
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"segment_id","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"changes","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"deleted_data","type":"STRING","mode":"NULLABLE"})
' schema.json > schema_new.json

# スキーマを更新
bq update -t --schema schema_new.json "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

#### edit_requestsテーブル

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="edit_requests"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# 新しいフィールドを追加（既に存在する場合はスキップ）
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"segment_id","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"changes","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"reviewed_by","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"reviewed_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"review_comment","type":"STRING","mode":"NULLABLE"})
' schema.json > schema_new.json

# スキーマを更新
bq update -t --schema schema_new.json "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

#### feature_requestsテーブル

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="feature_requests"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# 新しいフィールドを追加（既に存在する場合はスキップ）
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"reviewed_by","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"reviewed_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"review_comment","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"implemented_at","type":"TIMESTAMP","mode":"NULLABLE"})
' schema.json > schema_new.json

# スキーマを更新
bq update -t --schema schema_new.json "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

#### visit_measurement_groupsテーブル

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="visit_measurement_groups"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# 新しいフィールドを追加（既に存在する場合はスキップ）
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"created","type":"TIMESTAMP","mode":"NULLABLE"})
' schema.json > schema_new.json

# スキーマを更新
bq update -t --schema schema_new.json "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

### 方法3: 完全なスキーマ定義で上書き（注意: 既存データは保持されます）

#### projectsテーブル

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

bq update -t --schema projects_schema.json "${PROJECT_ID}:${DATASET_ID}.projects"
```

#### user_requestsテーブル

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

cat > user_requests_schema.json << 'EOF'
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

bq update -t --schema user_requests_schema.json "${PROJECT_ID}:${DATASET_ID}.user_requests"
```

## スキーマ確認コマンド

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# すべてのテーブルのスキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.projects"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.segments"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.pois"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.users"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.messages"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.change_history"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.edit_requests"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.feature_requests"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.visit_measurement_groups"
```

## 注意事項

1. **既存データの保持**: `bq update`コマンドは既存のデータを保持します。新しいフィールドは`NULL`になります。

2. **REQUIREDフィールドの追加**: 既存のテーブルにREQUIREDフィールドを追加することはできません。NULLABLEフィールドのみ追加可能です。

3. **フィールドの削除**: スキーマからフィールドを削除することはできません。削除する場合は、テーブルを再作成する必要があります。

4. **型の変更**: フィールドの型を変更することはできません。変更する場合は、新しいフィールドを追加してデータを移行する必要があります。

## トラブルシューティング

### エラー: "Field already exists"
フィールドが既に存在する場合は、スキップされます。エラーは無視して問題ありません。

### エラー: "Cannot add required field"
既存のテーブルにREQUIREDフィールドを追加することはできません。NULLABLEフィールドとして追加してください。

### エラー: "Cannot change field type"
フィールドの型を変更することはできません。新しいフィールドを追加してデータを移行してください。

