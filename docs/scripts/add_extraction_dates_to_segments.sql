-- セグメントテーブルに extraction_dates (ARRAY<STRING>) を追加
-- 抽出期間で「特定日付」を選択した場合、'YYYY-MM-DD' 形式の日付文字列の配列を格納する
--
-- 実行例（BigQuery）:
--   bq query --use_legacy_sql=false < add_extraction_dates_to_segments.sql
-- または、Cloud Console の BigQuery エディタにこのSQLを貼り付けて実行
--
-- 注意: データセット名 (universegeo_dataset) は環境に合わせて変更してください
-- 注意: 既に extraction_dates が存在する場合はエラーになります。その場合は当該行をコメントアウトしてください。

ALTER TABLE `universegeo_dataset.segments`
ADD COLUMN IF NOT EXISTS extraction_dates ARRAY<STRING>
OPTIONS(description="抽出対象日付（特定日付指定時）['YYYY-MM-DD', ...]");

-- extraction_period_type に 'specific_dates' を追加: 既存の STRING のためスキーマ変更不要。
-- アプリケーションで 'preset' | 'custom' | 'specific_dates' のいずれかを保存。
