# GitHub Environment Secretsの使用方法

## 概要

GitHubのEnvironment secretsは使用可能です。ワークフローで`environment: Environment secrets`を設定することで、Environment secretsから環境変数を取得してCloud Runに設定できます。

## 設定方法

### 1. Environment secretsの設定

1. [GitHub Repository Settings](https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments)を開く
2. **Environment secrets**を選択
3. 以下のSecretsを追加：
   - `GCP_PROJECT_ID`: `univere-geo-demo`
   - `BQ_DATASET`: `universegeo_dataset`
   - `GOOGLE_SPREADSHEET_ID`: （スプレッドシートID）
   - `GOOGLE_SHEETS_API_KEY`: （APIキー）
   - `GOOGLE_SHEET_NAME`: `シート1`
   - `FRONTEND_URL`: `https://universegeo-i5xw76aisq-an.a.run.app`
   - `GCP_SA_KEY`: （サービスアカウントキーJSON）

### 2. ワークフローの確認

ワークフローは`environment: Environment secrets`を設定しているため、Environment secretsから自動的に環境変数を取得します。

```yaml
jobs:
  deploy-backend:
    environment:
      name: Environment secrets
```

### 3. 環境変数の設定

ワークフローでは、以下のように環境変数をCloud Runに設定します：

```bash
gcloud run deploy universegeo-backend \
  --set-env-vars GCP_PROJECT_ID="${{ secrets.GCP_PROJECT_ID }}" \
  --set-env-vars BQ_DATASET="${{ secrets.BQ_DATASET }}" \
  --set-env-vars GOOGLE_SPREADSHEET_ID="${{ secrets.GOOGLE_SPREADSHEET_ID }}" \
  --set-env-vars GOOGLE_SHEETS_API_KEY="${{ secrets.GOOGLE_SHEETS_API_KEY }}" \
  --set-env-vars GOOGLE_SHEET_NAME="${{ secrets.GOOGLE_SHEET_NAME || 'シート1' }}" \
  --set-env-vars FRONTEND_URL="${{ secrets.FRONTEND_URL || 'http://localhost:5173' }}" \
  ...
```

## トラブルシューティング

### 環境変数が設定されない場合

1. **Environment secretsの確認**
   - Secret名が正確に一致しているか確認（大文字・小文字）
   - Secretが正しく設定されているか確認

2. **ワークフローのログを確認**
   - `🔍 環境変数の確認（デバッグ）:`ステップで環境変数が設定されているか確認
   - `📋 設定する環境変数:`ステップで実際に設定される環境変数を確認

3. **Cloud Runの環境変数を確認**
   - `Verify Cloud Run Environment Variables`ステップで環境変数が正しく設定されているか確認

### よくある問題

#### 問題1: Secret名が一致していない

**解決方法**: Secret名は大文字・小文字を含めて正確に一致させる必要があります。
- ✅ 正しい: `GCP_PROJECT_ID`
- ❌ 間違い: `gcp_project_id`, `GCP-PROJECT-ID`, `GCP_PROJECT_ID_`

#### 問題2: Environment secretsが設定されていない

**解決方法**: Environment secretsに必要なSecretsを追加してください。

#### 問題3: ワークフローが実行されていない

**解決方法**: `backend/**`に変更をプッシュすると自動実行されます。または、[Actions](https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/actions)から手動実行できます。

## 推奨事項

1. **Environment secretsを使用**: 環境ごとに異なる設定を管理できるため、Environment secretsを使用することを推奨します。
2. **Secret名の統一**: Secret名は大文字・小文字を含めて正確に一致させる必要があります。
3. **定期的な確認**: ワークフローのログを定期的に確認して、環境変数が正しく設定されているか確認してください。

## 次のステップ

1. Environment secretsに必要なSecretsを設定
2. `backend/`ディレクトリに変更をプッシュしてワークフローを実行
3. ワークフローのログで環境変数が正しく設定されているか確認
4. Cloud Runの環境変数を確認

GitHubのEnvironment secretsを使用することで、環境変数をGitHubで一元管理でき、デプロイ時に自動的にCloud Runに設定されます。



