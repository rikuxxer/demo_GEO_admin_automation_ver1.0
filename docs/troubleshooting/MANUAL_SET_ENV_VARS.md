# Cloud Run環境変数の手動設定ガイド

## 問題
Cloud Runサービスに環境変数が設定されていない場合、以下のエラーが発生します：
```
GCP_PROJECT_ID環境変数が設定されていません
```

## 解決方法

### 方法1: gcloudコマンドで手動設定（推奨）

以下のコマンドを実行して、環境変数を手動で設定してください：

```bash
# プロジェクトIDを設定
export PROJECT_ID="univere-geo-demo"
export SERVICE_NAME="universegeo-backend"
export REGION="asia-northeast1"

# 環境変数を設定
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --set-env-vars GCP_PROJECT_ID="univere-geo-demo",BQ_DATASET="universegeo_dataset",FRONTEND_URL="https://universegeo-i5xw76aisq-an.a.run.app"
```

### 方法2: 個別に設定

```bash
# GCP_PROJECT_IDを設定
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --set-env-vars GCP_PROJECT_ID="univere-geo-demo"

# BQ_DATASETを設定
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --update-env-vars BQ_DATASET="universegeo_dataset"

# FRONTEND_URLを設定
gcloud run services update $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --update-env-vars FRONTEND_URL="https://universegeo-i5xw76aisq-an.a.run.app"
```

### 方法3: Google Cloud Consoleから設定

1. [Google Cloud Console](https://console.cloud.google.com/run)を開く
2. プロジェクトを選択: `univere-geo-demo`
3. `universegeo-backend`サービスをクリック
4. 「編集と新しいリビジョンをデプロイ」をクリック
5. 「変数とシークレット」タブを開く
6. 以下の環境変数を追加：
   - `GCP_PROJECT_ID`: `univere-geo-demo`
   - `BQ_DATASET`: `universegeo_dataset`
   - `FRONTEND_URL`: `https://universegeo-i5xw76aisq-an.a.run.app`
7. 「デプロイ」をクリック

## 環境変数の確認

設定後、以下のコマンドで環境変数が正しく設定されているか確認できます：

```bash
gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --format='value(spec.template.spec.containers[0].env)'
```

または、個別の環境変数を確認：

```bash
gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --project $PROJECT_ID \
  --format='value(spec.template.spec.containers[0].env[?name="GCP_PROJECT_ID"].value)'
```

## 必要な環境変数

| 環境変数名 | 値 | 必須 |
|-----------|-----|------|
| `GCP_PROJECT_ID` | `univere-geo-demo` | ✅ |
| `BQ_DATASET` | `universegeo_dataset` | ✅ |
| `FRONTEND_URL` | `https://universegeo-i5xw76aisq-an.a.run.app` | ⚠️ |
| `GOOGLE_SPREADSHEET_ID` | (スプレッドシートID) | ❌ |
| `GOOGLE_SHEETS_API_KEY` | (APIキー) | ❌ |
| `GOOGLE_SHEET_NAME` | `シート1` | ❌ |

## トラブルシューティング

### 環境変数が設定されない場合

1. **プロジェクトIDの確認**
   ```bash
   gcloud config get-value project
   ```

2. **サービス名の確認**
   ```bash
   gcloud run services list --region $REGION --project $PROJECT_ID
   ```

3. **権限の確認**
   ```bash
   gcloud projects get-iam-policy $PROJECT_ID
   ```
   必要な権限: `run.services.update`

### デプロイ後に環境変数が消える場合

GitHub Actionsのワークフローで`--set-env-vars`を使用している場合、既存の環境変数が上書きされる可能性があります。
`--update-env-vars`を使用するか、すべての環境変数を一度に設定してください。

