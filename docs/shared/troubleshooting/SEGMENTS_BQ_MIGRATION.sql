-- =============================================================================
-- segments を現状仕様（定義書）に合わせるための「新規テーブル作成＋データ移行＋入れ替え」
--
-- ※ 既存テーブルの ALTER による修正ではありません。
--    BigQuery は STRING → ARRAY の型変更をサポートしていないため、
--    正スキーマの新規テーブルを作成し、既存データを変換して移行したうえで、
--    旧 segments を削除し、新テーブルを segments として使う手順です。
--
-- 前提: 現在の segments は delivery_media / media_id が STRING
-- 実行前: すべての your_project_id を実際の GCP プロジェクトIDに置き換える
-- データセットが universegeo_dataset でない場合も置き換える
--
-- 実行順: ステップ1 → ステップ2 → ステップ3 → ステップ4（bq cp）→ ステップ5（DROP new）
-- 既存テーブルに無い列がある場合は、SELECT 内でその列を NULL AS 列名 に変更すること
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ステップ1: 正スキーマで segments_new を作成
-- -----------------------------------------------------------------------------
CREATE TABLE `your_project_id.universegeo_dataset.segments_new` (
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


-- -----------------------------------------------------------------------------
-- ステップ2: 既存 segments からデータを変換して挿入
-- delivery_media / media_id: STRING → カンマ区切りで SPLIT して ARRAY に
-- detection_count: 既存が INT ならそのまま、STRING なら SAFE_CAST で INT64 に
-- -----------------------------------------------------------------------------
INSERT INTO `your_project_id.universegeo_dataset.segments_new` (
  segment_id, project_id, segment_name, segment_registered_at,
  delivery_media, media_id, poi_category, poi_type, attribute,
  extraction_period, extraction_period_type, extraction_start_date, extraction_end_date, extraction_dates,
  detection_count, detection_time_start, detection_time_end, stay_time, designated_radius,
  location_request_status, data_coordination_date, delivery_confirmed, registerd_provider_segment,
  created_at, updated_at
)
SELECT
  segment_id,
  project_id,
  segment_name,
  segment_registered_at,
  -- STRING → ARRAY<STRING>（カンマ区切りで分割、NULL/空は NULL）
  CASE
    WHEN delivery_media IS NULL OR TRIM(delivery_media) = '' THEN NULL
    ELSE ARRAY(SELECT TRIM(x) FROM UNNEST(SPLIT(delivery_media, ',')) AS x WHERE TRIM(x) != '')
  END,
  CASE
    WHEN media_id IS NULL OR TRIM(media_id) = '' THEN NULL
    ELSE ARRAY(SELECT TRIM(x) FROM UNNEST(SPLIT(media_id, ',')) AS x WHERE TRIM(x) != '')
  END,
  poi_category,
  poi_type,
  attribute,
  extraction_period,
  NULL AS extraction_period_type,
  extraction_start_date,
  extraction_end_date,
  extraction_dates,
  SAFE_CAST(detection_count AS INT64) AS detection_count,
  detection_time_start,
  detection_time_end,
  stay_time,
  designated_radius,
  location_request_status,
  data_coordination_date,
  delivery_confirmed,
  COALESCE(registerd_provider_segment, FALSE) AS registerd_provider_segment,
  created_at,
  updated_at
FROM `your_project_id.universegeo_dataset.segments`;


-- -----------------------------------------------------------------------------
-- ステップ3: 既存 segments を削除
-- ※ ステップ2のINSERTが成功していることを確認してから実行すること
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `your_project_id.universegeo_dataset.segments`;


-- -----------------------------------------------------------------------------
-- ステップ4: segments_new を segments として使う（bq コマンド）
-- BigQuery にはテーブルリネームがないため、ステップ3で segments を削除したあと、
-- 以下で segments_new の内容を segments としてコピーする。
--
-- コマンド例（PowerShell / コマンドプロンプト）:
--   bq cp your_project_id:universegeo_dataset.segments_new your_project_id:universegeo_dataset.segments
--
-- -----------------------------------------------------------------------------
-- ステップ5: 移行元の segments_new を削除（オプション）
-- -----------------------------------------------------------------------------
-- DROP TABLE IF EXISTS `your_project_id.universegeo_dataset.segments_new`;
