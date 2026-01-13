-- BigQueryコスト監視用クエリ
-- 定期的に実行してコストを監視してください

-- ============================================
-- 1. 月間スキャン量の確認
-- ============================================

-- 過去30日間のクエリスキャン量
SELECT 
  DATE(creation_time) as date,
  SUM(total_bytes_processed) / 1024 / 1024 / 1024 as total_gb_scanned,
  COUNT(*) as query_count,
  AVG(total_bytes_processed) / 1024 / 1024 as avg_mb_per_query
FROM `region-asia-northeast1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
WHERE 
  creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
GROUP BY date
ORDER BY date DESC;

-- ============================================
-- 2. テーブル別のスキャン量
-- ============================================

-- 過去30日間で最もスキャンされたテーブル
SELECT 
  referenced_table.project_id,
  referenced_table.dataset_id,
  referenced_table.table_id,
  SUM(total_bytes_processed) / 1024 / 1024 / 1024 as total_gb_scanned,
  COUNT(*) as query_count
FROM `region-asia-northeast1.INFORMATION_SCHEMA.JOBS_BY_PROJECT` AS jobs,
  UNNEST(referenced_tables) AS referenced_table
WHERE 
  jobs.creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND jobs.job_type = 'QUERY'
  AND jobs.state = 'DONE'
GROUP BY 
  referenced_table.project_id,
  referenced_table.dataset_id,
  referenced_table.table_id
ORDER BY total_gb_scanned DESC
LIMIT 10;

-- ============================================
-- 3. 高コストクエリの特定
-- ============================================

-- 過去30日間で最もコストがかかったクエリ
SELECT 
  DATE(creation_time) as date,
  job_id,
  query,
  total_bytes_processed / 1024 / 1024 / 1024 as gb_scanned,
  ROUND((total_bytes_processed / 1024 / 1024 / 1024 - 1) * 6.00, 2) as cost_usd,  -- 無料枠1TB適用後
  total_slot_ms / 1000 / 60 as slot_minutes,
  TIMESTAMP_DIFF(end_time, start_time, SECOND) as execution_seconds
FROM `region-asia-northeast1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
WHERE 
  creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
  AND total_bytes_processed > 1024 * 1024 * 1024  -- 1GB以上
ORDER BY total_bytes_processed DESC
LIMIT 20;

-- ============================================
-- 4. ストレージコストの確認
-- ============================================

-- テーブル別のストレージサイズとコスト
SELECT 
  table_catalog as project_id,
  table_schema as dataset_id,
  table_name,
  ROUND(size_bytes / 1024 / 1024 / 1024, 2) as size_gb,
  ROUND(size_bytes / 1024 / 1024 / 1024 * 0.020, 2) as monthly_cost_usd,
  ROUND(size_bytes / 1024 / 1024 / 1024 * 0.020 * 150, 0) as monthly_cost_jpy  -- 1USD = 150円
FROM `universegeo_dataset.__TABLES__`
ORDER BY size_bytes DESC;

-- ============================================
-- 5. パーティション別のサイズ確認
-- ============================================

-- POIテーブルのパーティション別サイズ
SELECT 
  partition_id,
  ROUND(total_rows, 0) as rows,
  ROUND(size_bytes / 1024 / 1024, 2) as size_mb,
  ROUND(size_bytes / 1024 / 1024 / 1024 * 0.020, 4) as monthly_cost_usd
FROM `universegeo_dataset.INFORMATION_SCHEMA.PARTITIONS`
WHERE table_name = 'pois'
ORDER BY partition_id DESC
LIMIT 30;

-- ============================================
-- 6. クエリ実行回数の確認
-- ============================================

-- 過去30日間のクエリ実行回数（時間別）
SELECT 
  DATE_TRUNC(creation_time, HOUR) as hour,
  COUNT(*) as query_count,
  SUM(total_bytes_processed) / 1024 / 1024 / 1024 as total_gb_scanned
FROM `region-asia-northeast1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
WHERE 
  creation_time >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'QUERY'
  AND state = 'DONE'
GROUP BY hour
ORDER BY hour DESC;

-- ============================================
-- 7. 月間コストの見積もり
-- ============================================

-- 今月のスキャン量とコスト見積もり
WITH monthly_stats AS (
  SELECT 
    SUM(total_bytes_processed) / 1024 / 1024 / 1024 / 1024 as total_tb_scanned
  FROM `region-asia-northeast1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
  WHERE 
    DATE(creation_time) >= DATE_TRUNC(CURRENT_DATE(), MONTH)
    AND job_type = 'QUERY'
    AND state = 'DONE'
)
SELECT 
  total_tb_scanned,
  CASE 
    WHEN total_tb_scanned <= 1 THEN 0
    ELSE (total_tb_scanned - 1) * 6.00
  END as estimated_cost_usd,
  CASE 
    WHEN total_tb_scanned <= 1 THEN 0
    ELSE (total_tb_scanned - 1) * 6.00 * 150
  END as estimated_cost_jpy
FROM monthly_stats;

-- ============================================
-- 8. 無料枠の使用状況
-- ============================================

-- 今月の無料枠使用状況
SELECT 
  SUM(total_bytes_processed) / 1024 / 1024 / 1024 / 1024 as total_tb_scanned,
  CASE 
    WHEN SUM(total_bytes_processed) / 1024 / 1024 / 1024 / 1024 <= 1 THEN '無料枠内'
    ELSE CONCAT('無料枠超過: ', CAST((SUM(total_bytes_processed) / 1024 / 1024 / 1024 / 1024 - 1) AS STRING), 'TB')
  END as free_tier_status
FROM `region-asia-northeast1.INFORMATION_SCHEMA.JOBS_BY_PROJECT`
WHERE 
  DATE(creation_time) >= DATE_TRUNC(CURRENT_DATE(), MONTH)
  AND job_type = 'QUERY'
  AND state = 'DONE';
