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

### 2. user_requestsテーブル

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

## スキーマ更新コマンド

### 方法1: 既存スキーマを確認してから更新

```bash
# プロジェクトIDとデータセットIDを設定
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# 現在のスキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.projects" > projects_schema.json
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests" > user_requests_schema.json

# スキーマを確認
cat projects_schema.json
cat user_requests_schema.json
```

### 方法2: スキーマを更新（既存フィールドを保持）

#### projectsテーブル

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="projects"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# 新しいフィールドを追加（既に存在する場合はスキップ）
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"agency_name","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"remarks","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"project_status","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"project_registration_started_at","type":"TIMESTAMP","mode":"NULLABLE"})
' schema.json > schema_new.json

# スキーマを更新
bq update -t --schema schema_new.json "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
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

# projectsテーブルのスキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.projects"

# user_requestsテーブルのスキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests"
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

