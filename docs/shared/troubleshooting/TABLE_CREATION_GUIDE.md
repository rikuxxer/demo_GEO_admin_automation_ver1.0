# スプレッドシートエクスポートテーブル作成ガイド

## 概要

スプレッドシートエクスポート機能を使用する前に、BigQueryに必要なテーブルを作成する必要があります。

## 作成するテーブル

1. **`sheet_exports`** - エクスポート履歴テーブル
2. **`sheet_export_data`** - エクスポートデータテーブル

## テーブル作成手順

### 方法1: BigQueryコンソールで実行（推奨）

#### ステップ1: BigQueryコンソールを開く

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択
3. 「BigQuery」を選択

#### ステップ2: SQLクエリを実行

1. 「クエリを作成」をクリック
2. 以下のSQLをコピー&ペースト

```sql
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
```

3. 「実行」をクリック
4. 成功メッセージが表示されることを確認

### 方法2: Cloud Shellで実行

#### ステップ1: Cloud Shellを開く

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択
3. Cloud Shellアイコンをクリック

#### ステップ2: SQLファイルをアップロード

```bash
# プロジェクトディレクトリに移動
cd /path/to/UNIVERSEGEO_backup

# SQLファイルを実行
bq query --use_legacy_sql=false < docs/scripts/create_sheet_export_tables.sql
```

### 方法3: bqコマンドで直接実行

```bash
# エクスポート履歴テーブル
bq mk --table \
  --project_id=your-project-id \
  --schema=export_id:STRING,project_id:STRING,segment_id:STRING,exported_by:STRING,exported_by_name:STRING,export_status:STRING,spreadsheet_id:STRING,sheet_name:STRING,row_count:INTEGER,exported_at:TIMESTAMP,completed_at:TIMESTAMP,error_message:STRING,created_at:TIMESTAMP,updated_at:TIMESTAMP \
  --time_partitioning_field=exported_at \
  --time_partitioning_expiration=63072000 \
  universegeo_dataset.sheet_exports

# エクスポートデータテーブル
bq mk --table \
  --project_id=your-project-id \
  --schema=export_data_id:STRING,export_id:STRING,project_id:STRING,segment_id:STRING,poi_id:STRING,category_id:STRING,brand_id:STRING,brand_name:STRING,poi_name:STRING,latitude:FLOAT64,longitude:FLOAT64,prefecture:STRING,city:STRING,radius:STRING,polygon:STRING,setting_flag:STRING,created:STRING,row_index:INTEGER,created_at:TIMESTAMP \
  --time_partitioning_field=created_at \
  --time_partitioning_expiration=31536000 \
  --clustering_fields=export_id,project_id \
  universegeo_dataset.sheet_export_data
```

## テーブル作成の確認

### 方法1: BigQueryコンソールで確認

1. BigQueryコンソールで `universegeo_dataset` を展開
2. `sheet_exports` と `sheet_export_data` が表示されていることを確認

### 方法2: SQLクエリで確認

```sql
-- テーブル一覧を確認
SELECT 
  table_name,
  ROUND(size_bytes / 1024 / 1024, 2) as size_mb,
  row_count,
  created,
  modified
FROM `universegeo_dataset.__TABLES__`
WHERE table_name IN ('sheet_exports', 'sheet_export_data')
ORDER BY table_name;
```

### 方法3: スキーマを確認

```sql
-- sheet_exportsのスキーマを確認
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  description
FROM `universegeo_dataset.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'sheet_exports'
ORDER BY ordinal_position;

-- sheet_export_dataのスキーマを確認
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  description
FROM `universegeo_dataset.INFORMATION_SCHEMA.COLUMNS`
WHERE table_name = 'sheet_export_data'
ORDER BY ordinal_position;
```

## 注意事項

### 1. データセットの存在確認

テーブルを作成する前に、`universegeo_dataset` データセットが存在することを確認してください。

```sql
-- データセット一覧を確認
SELECT schema_name 
FROM `universegeo_dataset.INFORMATION_SCHEMA.SCHEMATA`
WHERE schema_name = 'universegeo_dataset';
```

データセットが存在しない場合は、先にデータセットを作成してください。

```sql
CREATE SCHEMA IF NOT EXISTS `universegeo_dataset`
OPTIONS(
  location='asia-northeast1',
  description='UNIVERSEGEOシステムのデータセット'
);
```

### 2. パーティション有効期限

- `sheet_exports`: 2年（730日）で自動削除
- `sheet_export_data`: 1年（365日）で自動削除

必要に応じて、有効期限を変更できます。

```sql
-- 有効期限を変更（例: 3年に変更）
ALTER TABLE `universegeo_dataset.sheet_exports`
SET OPTIONS(partition_expiration_days=1095);
```

### 3. クラスタリング

`sheet_export_data` テーブルは `export_id` と `project_id` でクラスタリングされています。
これにより、特定のエクスポートIDやプロジェクトIDで検索する際のパフォーマンスが向上します。

## トラブルシューティング

### エラー: "Table already exists"

テーブルが既に存在する場合、`CREATE TABLE IF NOT EXISTS` を使用しているため、エラーは発生しません。
既存のテーブルを確認する場合は、上記の「テーブル作成の確認」を参照してください。

### エラー: "Dataset not found"

`universegeo_dataset` データセットが存在しない場合、先にデータセットを作成してください。

### エラー: "Permission denied"

BigQueryへの書き込み権限が必要です。以下の権限を確認してください：

- `bigquery.tables.create`
- `bigquery.tables.update`
- `bigquery.datasets.get`

## 関連ドキュメント

- [スプレッドシートエクスポート管理機能の実装ガイド](./SHEET_EXPORT_ADMIN_IMPLEMENTATION.md)
- [スプレッドシートエクスポートテーブル蓄積ガイド](./SPREADSHEET_EXPORT_TABLE_ACCUMULATION.md)
- [BigQueryテーブル定義書](../BIGQUERY_TABLE_DEFINITIONS.md)
- [テーブル作成SQLスクリプト](../scripts/create_sheet_export_tables.sql)
