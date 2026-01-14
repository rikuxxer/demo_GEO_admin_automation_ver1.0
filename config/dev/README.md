# 開発環境設定ファイル

このディレクトリには、開発環境用の設定ファイルが含まれています。

## 📋 環境変数の設定

開発環境用の`.env`ファイルを作成する際は、以下の環境変数を設定してください：

```env
# GCP設定
GCP_PROJECT_ID=univere-geo-demo-dev
BQ_DATASET=universegeo_dataset_dev

# バックエンド設定
PORT=8080
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Google Sheets API設定（開発環境）
GOOGLE_SPREADSHEET_ID=your-dev-spreadsheet-id
GOOGLE_SHEETS_API_KEY=your-dev-api-key
GOOGLE_SHEET_NAME=シート1

# サービスアカウント（開発環境）
GOOGLE_APPLICATION_CREDENTIALS=./service-account-key-dev.json

# メール送信設定（開発環境）
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=your-dev-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply-dev@universegeo.com

# デバッグ設定
DEBUG=true
LOG_LEVEL=debug
```

## 📝 使用方法

1. プロジェクトルートに`.env`ファイルを作成
2. 上記の環境変数をコピーして設定
3. 実際の値を入力（`your-dev-*`の部分を置き換え）

## ⚠️ 注意事項

- `.env`ファイルはGitにコミットしないでください
- 機密情報を含むため、共有時は注意してください
