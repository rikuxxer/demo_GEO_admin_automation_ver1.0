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

**オプションフィールド:**
- `poi_category` (STRING, NULLABLE) - `'tg'` | `'visit_measurement'`（UIのタブ情報から自動判定、デフォルトは`'tg'`）
- `updated_at` (TIMESTAMP)

**オプションフィールド:**
- `segment_name` (STRING, NULLABLE)
- `segment_registered_at` (TIMESTAMP, NULLABLE)
- `delivery_media` (ARRAY&lt;STRING&gt;, REPEATED) - 配信媒体（universe, tver_sp, tver_ctv の複数可）
- `media_id` (ARRAY&lt;STRING&gt;, REPEATED)
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
- `polygon` (STRING, NULLABLE) - ポリゴン座標をJSON文字列形式で保存

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
- `attribute` (STRING, NULLABLE) - `detector`, `resident`, `worker`, `resident_and_worker`
- `extraction_period` (STRING, NULLABLE) - `1month`, `2month`, `3month`
- `extraction_period_type` (STRING, NULLABLE) - `preset`, `custom`, `specific_dates`
- `extraction_start_date` (DATE, NULLABLE)
- `extraction_end_date` (DATE, NULLABLE)
- `extraction_dates` (ARRAY<STRING>, NULLABLE)
- `detection_count` (INTEGER, NULLABLE)
- `detection_time_start` (TIME, NULLABLE)
- `detection_time_end` (TIME, NULLABLE)
- `stay_time` (STRING, NULLABLE)
- `designated_radius` (STRING, NULLABLE)
- `created` (TIMESTAMP, NULLABLE)
- `updated_at` (TIMESTAMP, NULLABLE)

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

### 方法2: segmentsテーブルにpoi_categoryカラムを追加

**注意**: BigQueryでは、`ALTER COLUMN SET DEFAULT`はサポートされていません。以下の2つのステップに分けて実行する必要があります：

```sql
-- ステップ1: カラムを追加
ALTER TABLE `universegeo_dataset.segments`
ADD COLUMN IF NOT EXISTS poi_category STRING;

-- ステップ2: 既存データにデフォルト値を設定
UPDATE `universegeo_dataset.segments`
SET poi_category = 'tg'
WHERE poi_category IS NULL;
```

**補足**: BigQueryでは、新規に追加されたカラムは自動的に`NULL`になります。デフォルト値を設定するには、`UPDATE`文で明示的に値を設定する必要があります。アプリケーション側でデフォルト値（`'tg'`）を処理するように実装されています。

### 方法2-2: segmentsテーブルにregisterd_provider_segmentカラムを追加

**注意**: BigQueryでは、`ALTER COLUMN SET DEFAULT`はサポートされていません。以下の2つのステップに分けて実行する必要があります：

```sql
-- ステップ1: カラムを追加
ALTER TABLE `universegeo_dataset.segments`
ADD COLUMN IF NOT EXISTS registerd_provider_segment BOOL;

-- ステップ2: 既存データにデフォルト値を設定
UPDATE `universegeo_dataset.segments`
SET registerd_provider_segment = FALSE
WHERE registerd_provider_segment IS NULL;
```

**補足**: BigQueryでは、新規に追加されたカラムは自動的に`NULL`になります。デフォルト値を設定するには、`UPDATE`文で明示的に値を設定する必要があります。アプリケーション側でデフォルト値（`false`）を処理するように実装されています。

### 方法2-3: segments の delivery_media / media_id を STRING から ARRAY&lt;STRING&gt; へ変更（新規テーブル作成＋移行）

**注意**: これは既存テーブルの ALTER による修正ではなく、**正スキーマの新規テーブルを作成し、データを移行したうえで入れ替える**手順です。BigQuery では列の型を STRING → ARRAY に変更する ALTER がサポートされていないため、この方式で対応します。

**前提**: 既存の `segments` で `delivery_media` と `media_id` が STRING 型の場合、定義書どおり ARRAY&lt;STRING&gt; に揃えるために、新規テーブル作成・データ移行・旧テーブル削除・コピーで `segments` を差し替えます。

**実行用SQL（コピー用）**: [SEGMENTS_BQ_MIGRATION.sql](SEGMENTS_BQ_MIGRATION.sql) にプロジェクトIDを置き換えて実行できる一式を用意しています。

**手順概要**:
1. 正スキーマで `segments_new` を作成する。
2. 既存 `segments` からデータを変換して `segments_new` に挿入する（STRING はカンマ区切りで SPLIT して ARRAY に）。
3. 既存 `segments` を削除し、`segments_new` を `segments` にリネームする（またはテーブルスワップ）。

**ステップ1: 新規テーブル作成**

定義書 [BIGQUERY_TABLE_DEFINITIONS.md](../BIGQUERY_TABLE_DEFINITIONS.md) の「2. segments」の CREATE 文をそのまま使い、テーブル名だけ `segments_new` にして実行する。

```sql
CREATE TABLE `universegeo_dataset.segments_new` (
  segment_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_name STRING,
  segment_registered_at TIMESTAMP,
  delivery_media ARRAY<STRING>,
  media_id ARRAY<STRING>,
  poi_category STRING,
  poi_type STRING,
  attribute STRING,
  extraction_period STRING,
  extraction_period_type STRING,
  extraction_start_date DATE,
  extraction_end_date DATE,
  extraction_dates ARRAY<STRING>,
  detection_count INT64,
  detection_time_start TIME,
  detection_time_end TIME,
  stay_time STRING,
  designated_radius STRING,
  location_request_status STRING,
  data_coordination_date DATE,
  delivery_confirmed BOOL,
  registerd_provider_segment BOOL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
PARTITION BY DATE(segment_registered_at)
OPTIONS(description="セグメント情報（移行先）");
```

**ステップ2: データ移行（STRING → ARRAY 変換）**

既存の `delivery_media` / `media_id` がカンマ区切り STRING の場合は `SPLIT`、単一値の場合は 1 要素の ARRAY にする。`detection_count` が既に INT64 ならそのまま、STRING なら `SAFE_CAST(detection_count AS INT64)` で変換する。

```sql
INSERT INTO `universegeo_dataset.segments_new` (
  segment_id, project_id, segment_name, segment_registered_at,
  delivery_media, media_id, poi_category, poi_type, attribute,
  extraction_period, extraction_period_type, extraction_start_date, extraction_end_date, extraction_dates,
  detection_count, detection_time_start, detection_time_end, stay_time, designated_radius,
  location_request_status, data_coordination_date, delivery_confirmed, registerd_provider_segment,
  created_at, updated_at
)
SELECT
  segment_id, project_id, segment_name, segment_registered_at,
  -- STRING をカンマ区切りで分割して ARRAY に（NULL/空は NULL）
  CASE WHEN delivery_media IS NULL OR TRIM(delivery_media) = '' THEN NULL
       ELSE ARRAY(SELECT TRIM(x) FROM UNNEST(SPLIT(delivery_media, ',')) AS x WHERE TRIM(x) != '') END,
  CASE WHEN media_id IS NULL OR TRIM(media_id) = '' THEN NULL
       ELSE ARRAY(SELECT TRIM(x) FROM UNNEST(SPLIT(media_id, ',')) AS x WHERE TRIM(x) != '') END,
  poi_category, poi_type, attribute,
  extraction_period,
  NULL AS extraction_period_type,  -- 既存テーブルに無い列のため NULL で投入
  extraction_start_date, extraction_end_date, extraction_dates,
  SAFE_CAST(detection_count AS INT64) AS detection_count,
  detection_time_start, detection_time_end, stay_time, designated_radius,
  location_request_status, data_coordination_date, delivery_confirmed, registerd_provider_segment,
  created_at, updated_at
FROM `universegeo_dataset.segments`;
```

**ステップ3: テーブル入れ替え**

```sql
-- 既存 segments を削除
DROP TABLE `universegeo_dataset.segments`;

-- 新規テーブルを segments にリネーム（BigQuery では bq cp または CREATE TABLE ... AS SELECT の後に DROP で対応）
-- リネームが使えない場合は: 新規作成時から segments という名前で別データセットに作り、元 segments を DROP してからコピーする運用も可。
```

**補足**: BigQuery にはテーブル名の直接リネームがないため、運用では次のいずれかを用いる。

- **A.** 一時データセットを使う: `segments_new` を `segments` という名前で別データセットに作成し、元データセットの `segments` を DROP したあと、`segments_new` を元データセットにコピーして `segments` として作成する。
- **B.** 運用ウィンドウで DROP → 再作成: 上記 INSERT の直後に元 `segments` を DROP し、`CREATE TABLE segments AS SELECT * FROM segments_new` で `segments` を再作成したうえで `segments_new` を DROP する。

移行後、アプリケーション（バックエンド）は定義書どおり **ARRAY&lt;STRING&gt; で送受信**するようにする。一時的に STRING で送っている実装は、BQ 変更後に配列送信に戻すこと。

### 方法3: スキーマを更新（既存フィールドを保持）

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
# プロジェクトIDとデータセットIDを設定
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

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
  addfield({"name":"user_id","type":"STRING","mode":"REQUIRED"}) |
  addfield({"name":"name","type":"STRING","mode":"REQUIRED"}) |
  addfield({"name":"email","type":"STRING","mode":"REQUIRED"}) |
  addfield({"name":"password_hash","type":"STRING","mode":"REQUIRED"}) |
  addfield({"name":"requested_role","type":"STRING","mode":"REQUIRED"}) |
  addfield({"name":"status","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"department","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"reason","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"requested_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"reviewed_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"reviewed_by","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"review_comment","type":"STRING","mode":"NULLABLE"})
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
  addfield({"name":"delivery_media","type":"STRING","mode":"REPEATED"}) |
  addfield({"name":"media_id","type":"STRING","mode":"REPEATED"}) |
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

### エラー: "Syntax error: Unexpected keyword IF"
BigQueryでは`ADD COLUMN IF NOT EXISTS`構文がサポートされていない場合があります。以下のように修正してください：

**修正前（エラーが発生する場合）:**
```sql
ALTER TABLE `universegeo_dataset.segments`
ADD COLUMN IF NOT EXISTS registerd_provider_segment BOOL;
```

**修正後:**
```sql
-- カラムが存在しない場合のみ追加（エラーハンドリングが必要）
ALTER TABLE `universegeo_dataset.segments`
ADD COLUMN registerd_provider_segment BOOL;
```

**注意**: カラムが既に存在する場合はエラーが発生します。その場合は、エラーを無視して次のステップ（UPDATE）に進んでください。

### エラー: "UPDATE statement cannot modify partition key column"
パーティション分割テーブルでは、パーティションキーカラムを直接UPDATEすることはできません。新規追加したカラムは通常パーティションキーではないため、このエラーは発生しませんが、念のため確認してください。

### エラー: "Query exceeded resource limits"
大量のデータがある場合、UPDATE文がタイムアウトする可能性があります。以下のように条件を追加して、段階的に更新してください：

```sql
-- 例: 1000件ずつ更新
UPDATE `universegeo_dataset.segments`
SET registerd_provider_segment = FALSE
WHERE registerd_provider_segment IS NULL
LIMIT 1000;
```

### エラー: "Table not found" または "Dataset not found"
プロジェクトID、データセットID、テーブル名が正しいか確認してください：

```sql
-- 正しい形式
ALTER TABLE `プロジェクトID.データセットID.テーブル名`
ADD COLUMN registerd_provider_segment BOOL;

-- 例
ALTER TABLE `univere-geo-demo.universegeo_dataset.segments`
ADD COLUMN registerd_provider_segment BOOL;
```

### エラー: "Column name is reserved"
カラム名がBigQueryの予約語と競合している可能性があります。カラム名を変更するか、バッククォートで囲んでください（通常は不要ですが、予約語の場合は必要です）。
