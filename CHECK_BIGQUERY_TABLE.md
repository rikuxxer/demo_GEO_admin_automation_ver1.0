# BigQueryテーブルの確認方法

## 問題

プロジェクト作成APIは成功レスポンスを返しているが、プロジェクト一覧が空のまま。

## 確認手順

### 1. データセットの存在確認

```bash
# データセット一覧を確認
bq ls -d univere-geo-demo

# 特定のデータセットの詳細を確認
bq show univere-geo-demo:universegeo_dataset
```

### 2. テーブルの存在確認

```bash
# データセット内のテーブル一覧を確認
bq ls univere-geo-demo:universegeo_dataset

# テーブルの詳細（スキーマ）を確認
bq show univere-geo-demo:universegeo_dataset.projects
```

### 3. テーブルの内容を確認

```bash
# テーブル内のデータを確認
bq query --use_legacy_sql=false \
  "SELECT * FROM \`univere-geo-demo.universegeo_dataset.projects\` ORDER BY created_at DESC LIMIT 10"

# データ件数を確認
bq query --use_legacy_sql=false \
  "SELECT COUNT(*) as count FROM \`univere-geo-demo.universegeo_dataset.projects\`"
```

### 4. テーブルが存在しない場合の作成

テーブルが存在しない場合は、以下のスキーマで作成する必要があります：

```bash
# テーブルを作成
bq mk --table \
  --schema project_id:STRING,project_name:STRING,description:STRING,created_at:TIMESTAMP,updated_at:TIMESTAMP \
  univere-geo-demo:universegeo_dataset.projects
```

## トラブルシューティング

### エラー: "Dataset not found"

データセットが存在しない場合は作成：

```bash
# データセットを作成
bq mk --dataset --location=asia-northeast1 univere-geo-demo:universegeo_dataset
```

### エラー: "Table not found"

テーブルが存在しない場合は作成（上記のコマンドを実行）。

### エラー: "Permission denied"

サービスアカウントにBigQueryへのアクセス権限がない可能性があります。

権限を確認：
```bash
# サービスアカウントの権限を確認
gcloud projects get-iam-policy univere-geo-demo \
  --flatten="bindings[].members" \
  --filter="bindings.members:*compute@developer.gserviceaccount.com"
```

## 次のステップ

1. データセットとテーブルの存在を確認
2. テーブルが存在しない場合は作成
3. プロジェクト作成APIを再度実行
4. プロジェクト一覧を確認



