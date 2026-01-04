# 環境変数の設定方法

## 問題

エラーログから、`GCP_PROJECT_ID`環境変数がCloud Runに設定されていないことが確認されました。

## 解決方法

### 方法1: gcloud CLIで手動設定（即座に解決）

Cloud Shellで以下のコマンドを実行：

```bash
gcloud run services update universegeo-backend \
  --set-env-vars GCP_PROJECT_ID="univere-geo-demo",BQ_DATASET="universegeo_dataset",GOOGLE_SPREADSHEET_ID="YOUR_SPREADSHEET_ID",GOOGLE_SHEETS_API_KEY="YOUR_API_KEY",GOOGLE_SHEET_NAME="シート1",FRONTEND_URL="https://universegeo-i5xw76aisq-an.a.run.app" \
  --region asia-northeast1 \
  --project univere-geo-demo
```

### 方法2: GitHub Secretsの確認

1. [GitHub Repository Settings](https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments)を開く
2. **Environment secrets**を選択
3. 以下のSecretsが設定されているか確認：
   - `GCP_PROJECT_ID`: `univere-geo-demo`
   - `BQ_DATASET`: `universegeo_dataset`
   - `GOOGLE_SPREADSHEET_ID`: （スプレッドシートID）
   - `GOOGLE_SHEETS_API_KEY`: （APIキー）
   - `GOOGLE_SHEET_NAME`: `シート1`
   - `FRONTEND_URL`: `https://universegeo-i5xw76aisq-an.a.run.app`

### 方法3: Google Cloud Consoleで設定

1. [Google Cloud Console](https://console.cloud.google.com/run)を開く
2. **universegeo-backend**サービスを選択
3. **編集と新しいリビジョンのデプロイ**をクリック
4. **変数とシークレット**タブで環境変数を追加
5. **デプロイ**をクリック

## 環境変数の確認

設定後、以下のコマンドで確認：

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.containers[0].env[?name="GCP_PROJECT_ID"].value)'
```

## 次のステップ

1. 環境変数を設定（方法1が最も簡単）
2. サービスが再起動されるまで待機（数秒）
3. `/health`エンドポイントにアクセスして環境変数が正しく設定されているか確認
4. `/api/projects`エンドポイントにアクセスしてエラーが解消されているか確認



