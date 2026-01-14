# 本番環境デプロイガイド

## 📋 概要

本番環境へのデプロイ手順を説明します。

## 🚀 デプロイ方法

### 方法1: GitHub Actionsワークフローを使用（推奨）

#### バックエンドのみデプロイ

1. GitHubリポジトリの **Actions** タブを開く
2. **Deploy Backend to Cloud Run (Production)** ワークフローを選択
3. **Run workflow** をクリック
4. 必要に応じてオプションを設定
5. **Run workflow** をクリック

#### フロントエンドのみデプロイ

1. GitHubリポジトリの **Actions** タブを開く
2. **Deploy Frontend to Cloud Run (Production)** ワークフローを選択
3. **Run workflow** をクリック
4. 必要に応じてオプションを設定
5. **Run workflow** をクリック

#### バックエンドとフロントエンドを同時にデプロイ

1. GitHubリポジトリの **Actions** タブを開く
2. **Deploy All (Backend + Frontend) - Production** ワークフローを選択
3. **Run workflow** をクリック
4. デプロイするコンポーネントを選択
5. **Run workflow** をクリック

### 方法2: 自動デプロイ（push時）

`main`ブランチにpushすると、自動的にデプロイが実行されます：

- **バックエンド**: `backend/**` が変更された場合
- **フロントエンド**: `src/**`, `public/**`, `package.json`, `Dockerfile`, `config/prod/**` が変更された場合

## ⚙️ 前提条件

### GitHub Environment Secretsの設定

本番環境用のSecretsを設定する必要があります：

1. **Settings** > **Environments** > **production** を開く
2. 以下のSecretsを設定：

| Secret名 | 説明 | 必須 |
|---------|------|------|
| `GCP_SA_KEY` | GCPサービスアカウントキー（JSON） | ✅ |
| `GCP_PROJECT_ID` | GCPプロジェクトID | ✅ |
| `BQ_DATASET` | BigQueryデータセット名 | ✅ |
| `GOOGLE_SPREADSHEET_ID` | GoogleスプレッドシートID | ✅ |
| `GOOGLE_SHEETS_API_KEY` | Google Sheets APIキー | ⚠️ |
| `GOOGLE_SHEET_NAME` | シート名（デフォルト: シート1） | ⚠️ |
| `FRONTEND_URL` | フロントエンドURL | ✅ |
| `BACKEND_URL` | バックエンドURL | ⚠️ |
| `EMAIL_SERVICE` | メールサービス（sendgrid等） | ⚠️ |
| `SENDGRID_API_KEY` | SendGrid APIキー | ⚠️ |
| `SENDGRID_FROM_EMAIL` | 送信元メールアドレス | ⚠️ |
| `VITE_GOOGLE_SPREADSHEET_ID` | フロントエンド用スプレッドシートID | ⚠️ |
| `VITE_GOOGLE_SHEETS_API_KEY` | フロントエンド用APIキー | ⚠️ |

## 🔍 デプロイ後の確認

### 1. サービスURLの確認

デプロイ完了後、以下のURLを確認：

- **バックエンド**: `https://universegeo-backend-*.asia-northeast1.run.app`
- **フロントエンド**: `https://universegeo-*.asia-northeast1.run.app`

### 2. ログの確認

```bash
# バックエンドログ
gcloud run services logs read universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --limit 50

# フロントエンドログ
gcloud run services logs read universegeo \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --limit 50
```

### 3. 環境変数の確認

```bash
# バックエンド環境変数
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format 'value(spec.template.spec.containers[0].env)'

# フロントエンド環境変数
gcloud run services describe universegeo \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format 'value(spec.template.spec.containers[0].env)'
```

## ⚠️ 注意事項

1. **バックアップ**: デプロイ前に必ずバックアップを取得してください
2. **テスト**: 本番環境へのデプロイ前に、テスト環境で検証してください
3. **ロールバック計画**: 問題が発生した場合のロールバック計画を確認してください
4. **モニタリング**: デプロイ後はモニタリングを確認してください

## 📝 関連ドキュメント

- [本番環境セットアップガイド](./SETUP.md)
- [トラブルシューティング](./troubleshooting/)
- [共通ドキュメント](../shared/)
