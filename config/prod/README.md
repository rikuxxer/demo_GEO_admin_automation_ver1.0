# 本番環境設定ファイル

このディレクトリには、本番環境用の設定ファイルが含まれています。

## 📋 環境変数の設定

本番環境用の環境変数は、GitHub Environment Secretsで管理されます。

以下の環境変数が設定されている必要があります：

```env
# GCP設定
GCP_PROJECT_ID=univere-geo-demo
BQ_DATASET=universegeo_dataset

# バックエンド設定
PORT=8080
FRONTEND_URL=https://universegeo-i5xw76aisq-an.a.run.app
NODE_ENV=production

# Google Sheets API設定（本番環境）
GOOGLE_SPREADSHEET_ID=your-prod-spreadsheet-id
GOOGLE_SHEETS_API_KEY=your-prod-api-key
GOOGLE_SHEET_NAME=シート1

# サービスアカウント（本番環境）
# Cloud Runでは自動的にデフォルトサービスアカウントが使用されます
# GOOGLE_APPLICATION_CREDENTIALSは設定不要

# メール送信設定（本番環境）
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-prod-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@universegeo.com

# セキュリティ設定
DEBUG=false
LOG_LEVEL=info
```

## 📝 GitHub Environment Secretsの設定

本番環境の環境変数は、GitHubリポジトリのSettings > Environments > production で設定します。

## ⚠️ 注意事項

- 本番環境の環境変数は機密情報を含みます
- 変更時は必ずバックアップを取得してください
- 変更前にテスト環境で検証してください
