# Cloud Run環境変数の手動設定方法

## 問題
`GCP_PROJECT_ID`環境変数がCloud Runに設定されていない場合、以下のエラーが発生します：
```
Error: GCP_PROJECT_ID環境変数が設定されていません
```

## 解決方法

### 方法1: gcloud CLIで手動設定（推奨）

```bash
# プロジェクトIDを設定
export PROJECT_ID="univere-geo-demo"
export SERVICE_NAME="universegeo-backend"
export REGION="asia-northeast1"

# 環境変数を設定
gcloud run services update $SERVICE_NAME \
  --set-env-vars GCP_PROJECT_ID="$PROJECT_ID" \
  --set-env-vars BQ_DATASET="universegeo_dataset" \
  --set-env-vars GOOGLE_SPREADSHEET_ID="YOUR_SPREADSHEET_ID" \
  --set-env-vars GOOGLE_SHEETS_API_KEY="YOUR_API_KEY" \
  --set-env-vars GOOGLE_SHEET_NAME="シート1" \
  --set-env-vars FRONTEND_URL="https://universegeo-i5xw76aisq-an.a.run.app" \
  --region $REGION \
  --project $PROJECT_ID
```

### 方法2: Google Cloud Consoleで設定

1. [Google Cloud Console](https://console.cloud.google.com/)を開く
2. **Cloud Run** > **universegeo-backend** を選択
3. **編集と新しいリビジョンのデプロイ**をクリック
4. **変数とシークレット**タブを開く
5. 以下の環境変数を追加：
   - `GCP_PROJECT_ID`: `univere-geo-demo`
   - `BQ_DATASET`: `universegeo_dataset`
   - `GOOGLE_SPREADSHEET_ID`: （スプレッドシートID）
   - `GOOGLE_SHEETS_API_KEY`: （APIキー）
   - `GOOGLE_SHEET_NAME`: `シート1`
   - `FRONTEND_URL`: `https://universegeo-i5xw76aisq-an.a.run.app`
6. **デプロイ**をクリック

### 方法3: GitHub Secretsの確認

1. [GitHub Repository Settings](https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/secrets/actions)を開く
2. **Environments** > **Environment secrets**を選択
3. 以下のSecretsが設定されているか確認：
   - `GCP_PROJECT_ID`: `univere-geo-demo`
   - `BQ_DATASET`: `universegeo_dataset`
   - `GOOGLE_SPREADSHEET_ID`: （スプレッドシートID）
   - `GOOGLE_SHEETS_API_KEY`: （APIキー）
   - `GOOGLE_SHEET_NAME`: `シート1`
   - `FRONTEND_URL`: `https://universegeo-i5xw76aisq-an.a.run.app`

## 環境変数の確認

設定後、以下のコマンドで環境変数を確認できます：

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.containers[0].env)'
```

または、各環境変数を個別に確認：

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.containers[0].env[?name="GCP_PROJECT_ID"].value)'
```

## トラブルシューティング

### 環境変数が設定されない場合

1. **GitHub Secretsの確認**
   - Environment secretsに`GCP_PROJECT_ID`が設定されているか確認
   - Secret名が正確に`GCP_PROJECT_ID`であるか確認（大文字・小文字）

2. **Cloud Runの権限確認**
   - Cloud Runサービスに環境変数を設定する権限があるか確認
   - サービスアカウントに適切な権限があるか確認

3. **デプロイログの確認**
   - GitHub Actionsのログで`--set-env-vars`が正しく実行されているか確認
   - エラーメッセージがないか確認

## 次のステップ

環境変数を設定した後：
1. Cloud Runサービスが再起動されるまで待機（数秒）
2. `/health`エンドポイントにアクセスして環境変数が正しく設定されているか確認
3. `/api/projects`エンドポイントにアクセスしてエラーが解消されているか確認

