-- BigQueryテーブルにpolygonフィールドを追加するSQL
-- 実行方法: BigQueryコンソールまたはCloud Shellで実行
-- 
-- 注意: 2025年1月時点で既にpolygonフィールドが追加済みです
-- このSQLは、フィールドが存在しない場合のみ実行してください

-- polygonフィールドを追加（既に存在する場合は何もしない）
ALTER TABLE `universegeo_dataset.pois`
ADD COLUMN IF NOT EXISTS polygon STRING;

-- 追加後のスキーマを確認
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  description
FROM `universegeo_dataset.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'pois'
ORDER BY ordinal_position;
