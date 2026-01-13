-- BigQueryクエリ最適化の実装例
-- 実行前に必ずバックアップを取ってください

-- ============================================
-- 1. テーブル有効期限の設定（データ保持期間の最適化）
-- ============================================

-- POIテーブル: 3年で自動削除
ALTER TABLE `universegeo_dataset.pois`
SET OPTIONS(
  partition_expiration_days=1095,  -- 3年 = 1095日
  description="POI（地点）情報（3年で自動削除）"
);

-- プロジェクトテーブル: 5年で自動削除
ALTER TABLE `universegeo_dataset.projects`
SET OPTIONS(
  partition_expiration_days=1825,  -- 5年 = 1825日
  description="案件情報（5年で自動削除）"
);

-- セグメントテーブル: 3年で自動削除
ALTER TABLE `universegeo_dataset.segments`
SET OPTIONS(
  partition_expiration_days=1095,  -- 3年 = 1095日
  description="セグメント情報（3年で自動削除）"
);

-- ============================================
-- 2. クラスタリングの追加（クエリパフォーマンス向上）
-- ============================================

-- 注意: 既存テーブルにクラスタリングを追加する場合は、テーブルを再作成する必要があります
-- 以下のSQLは新規テーブル作成時の例です

-- POIテーブルにクラスタリングを追加（再作成が必要）
-- CREATE TABLE `universegeo_dataset.pois_clustered`
-- (
--   poi_id STRING NOT NULL,
--   project_id STRING NOT NULL,
--   segment_id STRING,
--   -- その他のフィールド...
-- )
-- PARTITION BY DATE(created_at)
-- CLUSTER BY project_id, segment_id
-- OPTIONS(
--   description="POI（地点）情報（クラスタリング適用）"
-- );

-- ============================================
-- 3. 最適化されたクエリ例
-- ============================================

-- プロジェクト一覧取得（SELECT * を避ける）
-- 最適化前: SELECT * FROM `universegeo_dataset.projects`
-- 最適化後:
SELECT 
  project_id,
  advertiser_name,
  appeal_point,
  project_status,
  _register_datetime,
  created_at,
  updated_at
FROM `universegeo_dataset.projects`
ORDER BY COALESCE(_register_datetime, created_at, updated_at) DESC
LIMIT 50;  -- ページネーション

-- POI取得（パーティションプルーニング + 必要な列のみ）
-- 最適化前: SELECT * FROM `universegeo_dataset.pois` WHERE project_id = @project_id
-- 最適化後:
SELECT 
  poi_id,
  project_id,
  segment_id,
  location_id,
  poi_name,
  address,
  latitude,
  longitude,
  poi_type,
  poi_category,
  created_at
FROM `universegeo_dataset.pois`
WHERE project_id = @project_id
  AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 YEAR)  -- パーティションプルーニング
ORDER BY created_at DESC
LIMIT 100;  -- ページネーション

-- 案件サマリ取得（集計処理をBigQueryで実行）
SELECT 
  project_status,
  COUNT(*) as count
FROM `universegeo_dataset.projects`
GROUP BY project_status;

-- ============================================
-- 4. マテリアライズドビューの作成（集計結果の事前計算）
-- ============================================

-- 案件サマリのマテリアライズドビュー
CREATE MATERIALIZED VIEW IF NOT EXISTS `universegeo_dataset.project_summary_mv`
PARTITION BY DATE(_snapshot_date)
CLUSTER BY project_status
OPTIONS(
  enable_refresh=true,
  refresh_interval_minutes=60,  -- 1時間ごとに更新
  description="案件サマリのマテリアライズドビュー"
)
AS
SELECT 
  CURRENT_DATE() as _snapshot_date,
  project_status,
  COUNT(*) as project_count,
  COUNT(DISTINCT project_id) as unique_project_count
FROM `universegeo_dataset.projects`
GROUP BY project_status;

-- ============================================
-- 5. 古いデータのアーカイブ（3年以上古いデータを削除）
-- ============================================

-- 注意: 実行前に必ずバックアップを取ってください
-- DELETE FROM `universegeo_dataset.pois`
-- WHERE created_at < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 3 YEAR);

-- ============================================
-- 6. クエリパフォーマンスの確認
-- ============================================

-- クエリの実行計画を確認
EXPLAIN SELECT 
  project_id,
  COUNT(*) as poi_count
FROM `universegeo_dataset.pois`
WHERE project_id = 'PRJ-1'
  AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 YEAR)
GROUP BY project_id;

-- ============================================
-- 7. テーブルサイズとコストの確認
-- ============================================

-- テーブルサイズを確認
SELECT 
  table_name,
  ROUND(size_bytes / 1024 / 1024 / 1024, 2) as size_gb,
  ROUND(size_bytes / 1024 / 1024 / 1024 * 0.020, 2) as monthly_cost_usd
FROM `universegeo_dataset.__TABLES__`
ORDER BY size_bytes DESC;

-- パーティションサイズを確認
SELECT 
  partition_id,
  ROUND(total_rows, 0) as rows,
  ROUND(size_bytes / 1024 / 1024, 2) as size_mb
FROM `universegeo_dataset.INFORMATION_SCHEMA.PARTITIONS`
WHERE table_name = 'pois'
ORDER BY partition_id DESC
LIMIT 10;
