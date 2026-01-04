# プロジェクト作成のデバッグ方法

## 問題

プロジェクト作成APIは成功レスポンスを返しているが、プロジェクト一覧が空のまま。

## 確認方法

### 1. Cloud Runのログを確認

```bash
# 最新のログを確認（プロジェクト作成関連）
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=universegeo-backend AND textPayload=~\"project\"" \
  --limit 50 \
  --project univere-geo-demo \
  --format="table(timestamp,severity,textPayload,jsonPayload.message)"

# エラーログのみ
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=universegeo-backend AND severity>=ERROR" \
  --limit 50 \
  --project univere-geo-demo \
  --format="table(timestamp,severity,textPayload,jsonPayload.message)"
```

### 2. BigQueryのテーブルを直接確認

```bash
# テーブルの内容を確認
bq query --use_legacy_sql=false \
  "SELECT * FROM \`univere-geo-demo.universegeo_dataset.projects\` ORDER BY created_at DESC LIMIT 10"

# テーブルのスキーマを確認
bq show univere-geo-demo:universegeo_dataset.projects
```

### 3. プロジェクト作成APIを再度実行（詳細ログ付き）

```bash
curl -v -X POST https://universegeo-backend-223225164238.asia-northeast1.run.app/api/projects \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "TEST-002",
    "project_name": "テストプロジェクト2",
    "description": "テスト用プロジェクト2"
  }'
```

## 考えられる原因

### 1. テーブルが存在しない

**確認方法**:
```bash
bq ls univere-geo-demo:universegeo_dataset
```

**解決方法**:
テーブルが存在しない場合は作成が必要です。

### 2. テーブルのスキーマが一致しない

**確認方法**:
```bash
bq show univere-geo-demo:universegeo_dataset.projects
```

**解決方法**:
送信するデータのフィールド名がテーブルのスキーマと一致しているか確認。

### 3. 権限の問題

**確認方法**:
ログで`Permission denied`エラーを確認。

**解決方法**:
サービスアカウントにBigQueryへの書き込み権限を付与。

### 4. データが挿入されたが、クエリで取得できていない

**確認方法**:
BigQueryのテーブルを直接確認。

**解決方法**:
クエリの条件やフィールド名を確認。

## トラブルシューティング手順

1. **ログを確認** - エラーメッセージを特定
2. **テーブルを確認** - データが実際に挿入されているか確認
3. **スキーマを確認** - フィールド名が一致しているか確認
4. **権限を確認** - サービスアカウントの権限を確認



