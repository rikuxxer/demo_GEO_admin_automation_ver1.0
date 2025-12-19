# APIエラーの確認方法

## ヘルスチェック結果

ヘルスチェックエンドポイント（`/health`）の結果：
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T08:18:58.205Z",
  "environment": {
    "GCP_PROJECT_ID": "SET",
    "BQ_DATASET": "universegeo_dataset"
  }
}
```

✅ `GCP_PROJECT_ID`は正しく設定されています。

## ログの確認方法

### 1. Cloud Shellでログを確認

```bash
# 最新の50件のログを取得
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=universegeo-backend" \
  --limit 50 \
  --project univere-geo-demo \
  --format json

# エラーログのみを取得
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=universegeo-backend AND severity>=ERROR" \
  --limit 50 \
  --project univere-geo-demo \
  --format json

# 特定のエラーメッセージを検索
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=universegeo-backend AND textPayload=~\"GCP_PROJECT_ID\"" \
  --limit 50 \
  --project univere-geo-demo \
  --format json
```

### 2. Google Cloud Consoleでログを確認

1. [Cloud Run ログ](https://console.cloud.google.com/run/detail/asia-northeast1/universegeo-backend/logs?project=univere-geo-demo)を開く
2. フィルターで以下を検索：
   - `GCP_PROJECT_ID`
   - `BigQuery error`
   - `Error fetching projects`

### 3. ログで確認すべき項目

- `🔍 BigQuery query config:` - クエリ設定が正しいか
- `❌ BigQuery getProjects error:` - エラーの詳細
- `GCP_PROJECT_ID環境変数が設定されていません` - 環境変数の問題
- `Not found: Project` - プロジェクトIDの問題

## トラブルシューティング

### エラー: "GCP_PROJECT_ID環境変数が設定されていません"

**原因**: アプリケーション起動時に環境変数が読み込まれていない

**解決方法**:
1. Cloud Runの環境変数を確認：
   ```bash
   gcloud run services describe universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --format='value(spec.template.spec.containers[0].env)'
   ```

2. 環境変数が設定されていない場合は、再設定：
   ```bash
   gcloud run services update universegeo-backend \
     --set-env-vars GCP_PROJECT_ID="univere-geo-demo",BQ_DATASET="universegeo_dataset" \
     --region asia-northeast1 \
     --project univere-geo-demo
   ```

### エラー: "Not found: Project universegeo-project"

**原因**: プロジェクトIDが正しく設定されていない、またはデフォルト値が使用されている

**解決方法**:
1. 環境変数の値を確認
2. `univere-geo-demo`が正しく設定されているか確認

### エラー: BigQuery権限エラー

**原因**: サービスアカウントにBigQueryへのアクセス権限がない

**解決方法**:
1. Cloud Runのサービスアカウントを確認
2. BigQueryの権限を付与：
   ```bash
   gcloud projects add-iam-policy-binding univere-geo-demo \
     --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
     --role="roles/bigquery.dataEditor"
   ```

## 次のステップ

1. ログを確認してエラーの詳細を把握
2. エラーメッセージに基づいて適切な対処を実施
3. `/api/projects`エンドポイントに再度アクセスして動作確認

