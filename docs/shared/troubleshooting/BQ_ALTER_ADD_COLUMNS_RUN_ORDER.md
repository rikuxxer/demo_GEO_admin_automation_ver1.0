# BQ 列追加：実行用文章（必須・任意を含む）

**使い方:** 下の各ブロックを BigQuery の「クエリを入力」にコピーし、**`your_project_id`** を実際のプロジェクト ID に置換してから実行してください。1ブロックずつ実行し、既存列でエラーになったらそのブロックはスキップして次へ。

---

## 1. projects（案件）

```sql
ALTER TABLE `your_project_id.universegeo_dataset.projects`
  ADD COLUMN IF NOT EXISTS agency_name STRING,
  ADD COLUMN IF NOT EXISTS remarks STRING,
  ADD COLUMN IF NOT EXISTS project_status STRING,
  ADD COLUMN IF NOT EXISTS project_registration_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS universe_service_id STRING,
  ADD COLUMN IF NOT EXISTS universe_service_name STRING,
  ADD COLUMN IF NOT EXISTS sub_person_in_charge STRING;
```

---

## 2. segments（セグメント）※任意分を含む

```sql
ALTER TABLE `your_project_id.universegeo_dataset.segments`
  ADD COLUMN IF NOT EXISTS segment_name STRING,
  ADD COLUMN IF NOT EXISTS segment_registered_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS poi_category STRING,
  ADD COLUMN IF NOT EXISTS poi_type STRING,
  ADD COLUMN IF NOT EXISTS attribute STRING,
  ADD COLUMN IF NOT EXISTS extraction_period STRING,
  ADD COLUMN IF NOT EXISTS extraction_period_type STRING,
  ADD COLUMN IF NOT EXISTS extraction_start_date DATE,
  ADD COLUMN IF NOT EXISTS extraction_end_date DATE,
  ADD COLUMN IF NOT EXISTS extraction_dates ARRAY<STRING>,
  ADD COLUMN IF NOT EXISTS detection_count INT64,
  ADD COLUMN IF NOT EXISTS detection_time_start TIME,
  ADD COLUMN IF NOT EXISTS detection_time_end TIME,
  ADD COLUMN IF NOT EXISTS stay_time STRING,
  ADD COLUMN IF NOT EXISTS designated_radius STRING,
  ADD COLUMN IF NOT EXISTS location_request_status STRING,
  ADD COLUMN IF NOT EXISTS data_coordination_date DATE,
  ADD COLUMN IF NOT EXISTS delivery_confirmed BOOL,
  ADD COLUMN IF NOT EXISTS registerd_provider_segment BOOL,
  ADD COLUMN IF NOT EXISTS data_link_status STRING,
  ADD COLUMN IF NOT EXISTS data_link_request_date DATE,
  ADD COLUMN IF NOT EXISTS data_link_scheduled_date DATE,
  ADD COLUMN IF NOT EXISTS ads_account_id STRING,
  ADD COLUMN IF NOT EXISTS provider_segment_id STRING,
  ADD COLUMN IF NOT EXISTS segment_expire_date DATE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
```

※ `delivery_media` / `media_id` が STRING のままの場合は ALTER では ARRAY に変更できません。型変更は [UPDATE_BIGQUERY_SCHEMA](UPDATE_BIGQUERY_SCHEMA.md) の方法2-3を参照。

---

## 3. pois（地点情報）

```sql
ALTER TABLE `your_project_id.universegeo_dataset.pois`
  ADD COLUMN IF NOT EXISTS segment_id STRING,
  ADD COLUMN IF NOT EXISTS location_id STRING,
  ADD COLUMN IF NOT EXISTS address STRING,
  ADD COLUMN IF NOT EXISTS latitude FLOAT64,
  ADD COLUMN IF NOT EXISTS longitude FLOAT64,
  ADD COLUMN IF NOT EXISTS prefectures ARRAY<STRING>,
  ADD COLUMN IF NOT EXISTS cities ARRAY<STRING>,
  ADD COLUMN IF NOT EXISTS poi_type STRING,
  ADD COLUMN IF NOT EXISTS poi_category STRING,
  ADD COLUMN IF NOT EXISTS designated_radius STRING,
  ADD COLUMN IF NOT EXISTS setting_flag STRING,
  ADD COLUMN IF NOT EXISTS visit_measurement_group_id STRING,
  ADD COLUMN IF NOT EXISTS polygon STRING,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
```

---

## 4. users（ユーザー）

```sql
ALTER TABLE `your_project_id.universegeo_dataset.users`
  ADD COLUMN IF NOT EXISTS department STRING,
  ADD COLUMN IF NOT EXISTS is_active BOOL,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
```

---

## 5. user_requests（ユーザー登録申請）

```sql
ALTER TABLE `your_project_id.universegeo_dataset.user_requests`
  ADD COLUMN IF NOT EXISTS department STRING,
  ADD COLUMN IF NOT EXISTS reason STRING,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reviewed_by STRING,
  ADD COLUMN IF NOT EXISTS review_comment STRING;
```

---

## 6. messages（メッセージ）

```sql
ALTER TABLE `your_project_id.universegeo_dataset.messages`
  ADD COLUMN IF NOT EXISTS message_type STRING,
  ADD COLUMN IF NOT EXISTS is_read BOOL,
  ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP;
```

---

## 7. change_history（変更履歴）

```sql
ALTER TABLE `your_project_id.universegeo_dataset.change_history`
  ADD COLUMN IF NOT EXISTS segment_id STRING,
  ADD COLUMN IF NOT EXISTS changes STRING,
  ADD COLUMN IF NOT EXISTS deleted_data STRING;
```

---

## 8. edit_requests（編集依頼）

```sql
ALTER TABLE `your_project_id.universegeo_dataset.edit_requests`
  ADD COLUMN IF NOT EXISTS segment_id STRING,
  ADD COLUMN IF NOT EXISTS changes STRING,
  ADD COLUMN IF NOT EXISTS reviewed_by STRING,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS review_comment STRING;
```

---

## 9. feature_requests（機能リクエスト）

```sql
ALTER TABLE `your_project_id.universegeo_dataset.feature_requests`
  ADD COLUMN IF NOT EXISTS reviewed_by STRING,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS review_comment STRING,
  ADD COLUMN IF NOT EXISTS implemented_at TIMESTAMP;
```

---

## 10. visit_measurement_groups（来店計測地点グループ）

```sql
ALTER TABLE `your_project_id.universegeo_dataset.visit_measurement_groups`
  ADD COLUMN IF NOT EXISTS created TIMESTAMP;
```

---

**補足:** `ADD COLUMN IF NOT EXISTS` がエラーになる環境では、列ごとに `ALTER TABLE ... ADD COLUMN 列名 型;` を1文ずつ実行し、既存列のエラーは無視して続行してください。
