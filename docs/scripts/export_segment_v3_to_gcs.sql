-- 対象: ポリゴンかつ半径50mの targeting 未取り込みセグメント
-- 出力: GCS gs://unerry-auto-batch-prod-12113/segment_v3_YYYYMMDDH_*.csv
-- 実行前にデータセットのロケーションを確認（US で実行する場合はデータセットも US に作成すること）

EXPORT DATA OPTIONS (
  uri=FORMAT_TIMESTAMP('gs://unerry-auto-batch-prod-12113/segment_v3_%Y%m%d%H_*.csv', CURRENT_TIMESTAMP(), 'Asia/Tokyo'),
  format='CSV',
  overwrite=true,
  header=true
) AS
WITH target_segments AS (
  SELECT
    segment_id
  FROM `universe-geo-admin-dev-12246.universegeo_dataset.segments`
  WHERE
    poi_category = 'tg'                           -- targeting用途
    AND registerd_provider_segment = false        -- 未取り込みのみ
    AND poi_type = 'polygon'                      -- ポリゴン
    AND designated_radius = '50m'                 -- 半径50m
)
SELECT DISTINCT
  log_manual_v3.poi_id AS segment_code,
  log_manual_v3.poi_name AS segment_sub_code,
  log_manual_v3.uid AS ifa,
  log_manual_v3.uid_type AS ifa_type,
  log_manual_v3.ip_v4 AS ip,
  log_manual_v3.ip_v6 AS ip_v6
FROM `beaconbank-datawarehouse.to_microad_vms.log_manual_v3` AS log_manual_v3
WHERE
  log_manual_v3.poi_id IN (SELECT segment_id FROM target_segments)
  AND log_manual_v3.created = DATE_SUB(CURRENT_DATE('Asia/Tokyo'), INTERVAL 1 DAY);
