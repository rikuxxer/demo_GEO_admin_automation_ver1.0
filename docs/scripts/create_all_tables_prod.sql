-- =============================================================================
-- UNIVERSEGEO BigQuery 全テーブル作成スクリプト（本番環境）
-- =============================================================================
-- プロジェクト: universe-geo-admin-prod-12246
-- データセット: universegeo_dataset
--
-- 【必須】実行前にデータセットを作成してください。
--
-- データセット作成（いずれか。ジョブロケーションと一致させること）:
--   US:
--     bq mk --dataset --location=US universe-geo-admin-prod-12246:universegeo_dataset
--   東京（asia-northeast1）:
--     bq mk --dataset --location=asia-northeast1 universe-geo-admin-prod-12246:universegeo_dataset
--
-- 実行: BigQuery コンソールでプロジェクトを本番に切り替え、
--       ジョブロケーションをデータセットのロケーションに合わせてから本SQLを実行。
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. projects（案件）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `universe-geo-admin-prod-12246.universegeo_dataset.projects` (
  project_id STRING NOT NULL,
  _register_datetime TIMESTAMP,
  project_registration_started_at TIMESTAMP,
  advertiser_name STRING,
  agency_name STRING,
  appeal_point STRING,
  universe_service_id STRING,
  universe_service_name STRING,
  delivery_start_date DATE,
  delivery_end_date DATE,
  person_in_charge STRING,
  sub_person_in_charge STRING,
  remarks STRING,
  project_status STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(_register_datetime)
OPTIONS(
  description="案件情報"
);

-- -----------------------------------------------------------------------------
-- 2. segments（セグメント）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `universe-geo-admin-prod-12246.universegeo_dataset.segments` (
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
  registerd_provider_segment BOOL DEFAULT FALSE,
  data_link_status STRING,
  data_link_request_date DATE,
  data_link_scheduled_date DATE,
  ads_account_id STRING,
  provider_segment_id STRING,
  segment_expire_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(segment_registered_at)
OPTIONS(
  description="セグメント情報"
);

-- -----------------------------------------------------------------------------
-- 3. pois（地点情報）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `universe-geo-admin-prod-12246.universegeo_dataset.pois` (
  poi_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_id STRING,
  location_id STRING,
  poi_name STRING NOT NULL,
  address STRING,
  latitude FLOAT64,
  longitude FLOAT64,
  prefectures ARRAY<STRING>,
  cities ARRAY<STRING>,
  poi_type STRING,
  poi_category STRING,
  designated_radius STRING,
  setting_flag STRING,
  visit_measurement_group_id STRING,
  polygon STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
OPTIONS(
  description="POI（地点）情報"
);

-- -----------------------------------------------------------------------------
-- 4. users（ユーザー）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `universe-geo-admin-prod-12246.universegeo_dataset.users` (
  user_id STRING NOT NULL,
  name STRING NOT NULL,
  email STRING NOT NULL,
  password_hash STRING NOT NULL,
  role STRING NOT NULL,
  department STRING,
  is_active BOOL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  last_login TIMESTAMP
)
OPTIONS(
  description="ユーザー情報"
);

-- -----------------------------------------------------------------------------
-- 5. user_requests（ユーザー登録申請）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `universe-geo-admin-prod-12246.universegeo_dataset.user_requests` (
  user_id STRING NOT NULL,
  name STRING,
  email STRING,
  password_hash STRING,
  requested_role STRING,
  status STRING,
  requested_at TIMESTAMP,
  department STRING,
  reason STRING,
  reviewed_at TIMESTAMP,
  reviewed_by STRING,
  review_comment STRING
)
OPTIONS(
  description="ユーザー登録申請"
);

-- -----------------------------------------------------------------------------
-- 6. messages（メッセージ）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `universe-geo-admin-prod-12246.universegeo_dataset.messages` (
  message_id STRING NOT NULL,
  project_id STRING NOT NULL,
  sender_id STRING NOT NULL,
  sender_name STRING NOT NULL,
  sender_role STRING NOT NULL,
  content STRING NOT NULL,
  message_type STRING,
  is_read BOOL DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(timestamp)
OPTIONS(
  description="プロジェクトメッセージ"
);

-- -----------------------------------------------------------------------------
-- 7. change_history（変更履歴）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `universe-geo-admin-prod-12246.universegeo_dataset.change_history` (
  history_id STRING NOT NULL,
  entity_type STRING NOT NULL,
  entity_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_id STRING,
  action STRING NOT NULL,
  changed_by STRING NOT NULL,
  changed_at TIMESTAMP NOT NULL,
  changes STRING,
  deleted_data STRING
)
OPTIONS(
  description="変更履歴"
);

-- -----------------------------------------------------------------------------
-- 8. edit_requests（編集依頼）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `universe-geo-admin-prod-12246.universegeo_dataset.edit_requests` (
  request_id STRING NOT NULL,
  request_type STRING NOT NULL,
  target_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_id STRING,
  requested_by STRING NOT NULL,
  requested_at TIMESTAMP NOT NULL,
  request_reason STRING NOT NULL,
  status STRING NOT NULL,
  changes STRING,
  reviewed_by STRING,
  reviewed_at TIMESTAMP,
  review_comment STRING
)
OPTIONS(
  description="編集依頼"
);

-- -----------------------------------------------------------------------------
-- 9. feature_requests（機能リクエスト）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `universe-geo-admin-prod-12246.universegeo_dataset.feature_requests` (
  request_id STRING NOT NULL,
  requested_by STRING NOT NULL,
  requested_by_name STRING NOT NULL,
  requested_at TIMESTAMP NOT NULL,
  title STRING NOT NULL,
  description STRING NOT NULL,
  category STRING NOT NULL,
  priority STRING NOT NULL,
  status STRING NOT NULL,
  reviewed_by STRING,
  reviewed_at TIMESTAMP,
  review_comment STRING,
  implemented_at TIMESTAMP
)
OPTIONS(
  description="機能リクエスト"
);

-- -----------------------------------------------------------------------------
-- 10. visit_measurement_groups（来店計測地点グループ）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `universe-geo-admin-prod-12246.universegeo_dataset.visit_measurement_groups` (
  project_id STRING NOT NULL,
  group_id STRING NOT NULL,
  group_name STRING NOT NULL,
  attribute STRING,
  extraction_period STRING,
  extraction_period_type STRING,
  extraction_start_date DATE,
  extraction_end_date DATE,
  extraction_dates ARRAY<STRING>,
  detection_count INTEGER,
  detection_time_start TIME,
  detection_time_end TIME,
  stay_time STRING,
  designated_radius STRING,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
OPTIONS(
  description="来店計測地点グループ"
);

-- -----------------------------------------------------------------------------
-- 11. sheet_exports（スプレッドシートエクスポート履歴）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `universe-geo-admin-prod-12246.universegeo_dataset.sheet_exports` (
  export_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_id STRING,
  exported_by STRING NOT NULL,
  exported_by_name STRING NOT NULL,
  export_status STRING NOT NULL,
  spreadsheet_id STRING,
  sheet_name STRING,
  row_count INTEGER,
  exported_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP,
  error_message STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(exported_at)
OPTIONS(
  description="スプレッドシートエクスポート履歴"
);

-- -----------------------------------------------------------------------------
-- 12. sheet_export_data（スプレッドシートエクスポートデータ）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `universe-geo-admin-prod-12246.universegeo_dataset.sheet_export_data` (
  export_data_id STRING NOT NULL,
  export_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_id STRING,
  poi_id STRING,
  category_id STRING,
  brand_id STRING,
  brand_name STRING,
  poi_name STRING,
  latitude FLOAT64,
  longitude FLOAT64,
  prefecture STRING,
  city STRING,
  radius STRING,
  polygon STRING,
  setting_flag STRING,
  created STRING,
  row_index INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
CLUSTER BY export_id, project_id
OPTIONS(
  description="スプレッドシートエクスポートデータ"
);

-- -----------------------------------------------------------------------------
-- 13. report_requests（レポート作成依頼）
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `universe-geo-admin-prod-12246.universegeo_dataset.report_requests` (
  request_id STRING NOT NULL,
  requested_by STRING NOT NULL,
  requested_by_name STRING NOT NULL,
  requested_at TIMESTAMP NOT NULL,
  project_id STRING NOT NULL,
  report_type STRING NOT NULL,
  report_title STRING NOT NULL,
  description STRING,
  start_date DATE,
  end_date DATE,
  segment_ids STRING,
  status STRING NOT NULL,
  reviewed_by STRING,
  reviewed_at TIMESTAMP,
  review_comment STRING,
  report_url STRING,
  completed_at TIMESTAMP,
  error_message STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(requested_at)
OPTIONS(
  description="レポート作成依頼"
);

-- =============================================================================
-- 実行後（任意）: パーティション有効期限の設定
-- =============================================================================
-- ALTER TABLE `universe-geo-admin-prod-12246.universegeo_dataset.pois`
-- SET OPTIONS(partition_expiration_days=1095);
--
-- ALTER TABLE `universe-geo-admin-prod-12246.universegeo_dataset.segments`
-- SET OPTIONS(partition_expiration_days=1095);
--
-- ALTER TABLE `universe-geo-admin-prod-12246.universegeo_dataset.projects`
-- SET OPTIONS(partition_expiration_days=1825);
