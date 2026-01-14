# フロントエンドが接続しているURLに環境変数を設定

## 問題

フロントエンドが接続しているURL（`https://universegeo-backend-i5xw76aisq-an.a.run.app`）に`GCP_PROJECT_ID`環境変数が設定されていません。

## 解決方法

### Cloud Shellで実行

```bash
gcloud run services update universegeo-backend \
  --set-env-vars GCP_PROJECT_ID="univere-geo-demo",BQ_DATASET="universegeo_dataset",GOOGLE_SPREADSHEET_ID="YOUR_SPREADSHEET_ID",GOOGLE_SHEETS_API_KEY="YOUR_API_KEY",GOOGLE_SHEET_NAME="シート1",FRONTEND_URL="https://universegeo-i5xw76aisq-an.a.run.app" \
  --region asia-northeast1 \
  --project univere-geo-demo
```

### 環境変数の確認

設定後、以下のコマンドで確認：

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.containers[0].env[?name="GCP_PROJECT_ID"].value)'
```

## 注意事項

- フロントエンドが接続しているURLと、GCLで設定したURLが異なる場合があります
- 同じサービス名でも、リビジョンによってURLが変わる可能性があります
- 環境変数は、すべてのリビジョンに適用されます






