-- スプレッドシートエクスポート関連テーブル作成SQL
-- 実行方法: BigQueryコンソールまたはCloud Shellで実行

-- ============================================
-- 1. sheet_exports（エクスポート履歴テーブル）
-- ============================================

CREATE TABLE IF NOT EXISTS `universegeo_dataset.sheet_exports` (
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
  description="スプレッドシートエクスポート履歴",
  partition_expiration_days=730  -- 2年で自動削除
);

-- ============================================
-- 2. sheet_export_data（エクスポートデータテーブル）
-- ============================================

CREATE TABLE IF NOT EXISTS `universegeo_dataset.sheet_export_data` (
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
  description="スプレッドシートエクスポートデータ",
  partition_expiration_days=365  -- 1年で自動削除
);

-- ============================================
-- 3. テーブル作成確認
-- ============================================

SELECT 
  table_name,
  ROUND(size_bytes / 1024 / 1024, 2) as size_mb,
  row_count,
  created,
  modified
FROM `universegeo_dataset.__TABLES__`
WHERE table_name IN ('sheet_exports', 'sheet_export_data')
ORDER BY table_name;
