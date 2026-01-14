# テーブルスキーマの確認方法

## テーブルスキーマの確認

```bash
# テーブルの詳細スキーマを確認
bq show --format=prettyjson univere-geo-demo:universegeo_dataset.projects

# または、簡易形式で確認
bq show univere-geo-demo:universegeo_dataset.projects
```

## テーブルの内容を確認

```bash
# テーブル内のデータを確認
bq query --use_legacy_sql=false \
  "SELECT * FROM \`univere-geo-demo.universegeo_dataset.projects\` ORDER BY _register_datetime DESC LIMIT 10"

# データ件数を確認
bq query --use_legacy_sql=false \
  "SELECT COUNT(*) as count FROM \`univere-geo-demo.universegeo_dataset.projects\`"
```

## フィールド名の不一致の確認

コードを確認すると：
- `getProjects()`: `_register_datetime`でソート
- `createProject()`: `created_at`と`updated_at`を設定

テーブルのスキーマで実際のフィールド名を確認する必要があります。






