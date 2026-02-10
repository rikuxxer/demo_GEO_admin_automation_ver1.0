-- =============================================================================
-- BigQuery: 定義書の状態に合わせた列追加用 SQL
-- =============================================================================
-- 使い方:
-- 1. 下の SET で @project_id を実際の GCP プロジェクトIDに置換する。
-- 2. 既に存在する列に対して ADD COLUMN するとエラーになります。
--    先に bq show --schema PROJECT_ID:DATASET.TABLE でスキーマを確認し、
--    無い列だけを実行するか、エラーになった文をスキップして続行してください。
-- 3. segments の delivery_media / media_id が STRING のままの場合は
--    ALTER では ARRAY に変更できません。SEGMENTS_BQ_MIGRATION.sql の手順で
--    新規テーブル作成＋データ移行を行ってください。
-- =============================================================================

-- 実行前に your_project_id を実際の GCP プロジェクトIDに一括置換してください。
-- データセットは universegeo_dataset を想定しています。
--
-- ADD COLUMN IF NOT EXISTS がエラーになる環境では:
-- - 各 ALTER を「1列ずつ」に分け、既存列の場合はエラーを無視して次を実行するか、
-- - [UPDATE_BIGQUERY_SCHEMA.md](UPDATE_BIGQUERY_SCHEMA.md) の「方法3」（bq show → jq → bq update）を使用してください。

-- -----------------------------------------------------------------------------
-- 1. projects（案件）
-- -----------------------------------------------------------------------------
ALTER TABLE `your_project_id.universegeo_dataset.projects`
  ADD COLUMN IF NOT EXISTS agency_name STRING,
  ADD COLUMN IF NOT EXISTS remarks STRING,
  ADD COLUMN IF NOT EXISTS project_status STRING,
  ADD COLUMN IF NOT EXISTS project_registration_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS universe_service_id STRING,
  ADD COLUMN IF NOT EXISTS universe_service_name STRING,
  ADD COLUMN IF NOT EXISTS sub_person_in_charge STRING;

-- ※ BigQuery によっては ADD COLUMN IF NOT EXISTS が未対応の場合は、以下を1列ずつ実行し、
--   既存列の場合はエラーを無視する。
-- ALTER TABLE `your_project_id.universegeo_dataset.projects` ADD COLUMN agency_name STRING;
-- ALTER TABLE `your_project_id.universegeo_dataset.projects` ADD COLUMN remarks STRING;
-- ... 以下同様

-- -----------------------------------------------------------------------------
-- 2. segments（セグメント）
-- ※ delivery_media / media_id が STRING の場合は型変更不可。方法2-3の移行を参照。
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3. pois（地点情報）
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 4. users（ユーザー）
-- -----------------------------------------------------------------------------
ALTER TABLE `your_project_id.universegeo_dataset.users`
  ADD COLUMN IF NOT EXISTS department STRING,
  ADD COLUMN IF NOT EXISTS is_active BOOL,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- -----------------------------------------------------------------------------
-- 5. user_requests（ユーザー登録申請）
-- テーブルが無い場合は CREATE TABLE で作成。既存テーブルに列を足す場合のみ以下を実行。
-- -----------------------------------------------------------------------------
ALTER TABLE `your_project_id.universegeo_dataset.user_requests`
  ADD COLUMN IF NOT EXISTS department STRING,
  ADD COLUMN IF NOT EXISTS reason STRING,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS reviewed_by STRING,
  ADD COLUMN IF NOT EXISTS review_comment STRING;

-- -----------------------------------------------------------------------------
-- 6. messages（メッセージ）
-- -----------------------------------------------------------------------------
ALTER TABLE `your_project_id.universegeo_dataset.messages`
  ADD COLUMN IF NOT EXISTS message_type STRING,
  ADD COLUMN IF NOT EXISTS is_read BOOL,
  ADD COLUMN IF NOT EXISTS timestamp TIMESTAMP;

-- -----------------------------------------------------------------------------
-- 7. change_history（変更履歴）
-- -----------------------------------------------------------------------------
ALTER TABLE `your_project_id.universegeo_dataset.change_history`
  ADD COLUMN IF NOT EXISTS segment_id STRING,
  ADD COLUMN IF NOT EXISTS changes STRING,
  ADD COLUMN IF NOT EXISTS deleted_data STRING;

-- -----------------------------------------------------------------------------
-- 8. edit_requests（編集依頼）
-- -----------------------------------------------------------------------------
ALTER TABLE `your_project_id.universegeo_dataset.edit_requests`
  ADD COLUMN IF NOT EXISTS segment_id STRING,
  ADD COLUMN IF NOT EXISTS changes STRING,
  ADD COLUMN IF NOT EXISTS reviewed_by STRING,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS review_comment STRING;

-- -----------------------------------------------------------------------------
-- 9. feature_requests（機能リクエスト）
-- -----------------------------------------------------------------------------
ALTER TABLE `your_project_id.universegeo_dataset.feature_requests`
  ADD COLUMN IF NOT EXISTS reviewed_by STRING,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS review_comment STRING,
  ADD COLUMN IF NOT EXISTS implemented_at TIMESTAMP;

-- -----------------------------------------------------------------------------
-- 10. visit_measurement_groups（来店計測地点グループ）
-- -----------------------------------------------------------------------------
ALTER TABLE `your_project_id.universegeo_dataset.visit_measurement_groups`
  ADD COLUMN IF NOT EXISTS created TIMESTAMP;
