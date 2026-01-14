# 開発環境デプロイガイド

## 📋 概要

開発環境へのデプロイ手順を説明します。

## 🚀 デプロイ方法

### 方法1: GitHub Actionsワークフローを使用（推奨）

#### バックエンドのみデプロイ

1. GitHubリポジトリの **Actions** タブを開く
2. **Deploy Backend to Cloud Run (Development)** ワークフローを選択
3. **Run workflow** をクリック
4. 必要に応じてオプションを設定
5. **Run workflow** をクリック

#### フロントエンドのみデプロイ

1. GitHubリポジトリの **Actions** タブを開く
2. **Deploy Frontend to Cloud Run (Development)** ワークフローを選択
3. **Run workflow** をクリック
4. 必要に応じてオプションを設定
5. **Run workflow** をクリック

#### バックエンドとフロントエンドを同時にデプロイ

1. GitHubリポジトリの **Actions** タブを開く
2. **Deploy All (Backend + Frontend) - Development** ワークフローを選択
3. **Run workflow** をクリック
4. デプロイするコンポーネントを選択
5. **Run workflow** をクリック

### 方法2: 自動デプロイ（push時）

`develop`または`dev`ブランチにpushすると、自動的にデプロイが実行されます：

- **バックエンド**: `backend/**` が変更された場合
- **フロントエンド**: `src/**`, `public/**`, `package.json`, `Dockerfile`, `config/dev/**` が変更された場合

## ⚙️ 前提条件

### GitHub Environment Secretsの設定

開発環境用のSecretsを設定する必要があります：

1. **Settings** > **Environments** > **development** を開く
2. 以下のSecretsを設定：

| Secret名 | 説明 | 必須 |
|---------|------|------|
| `GCP_SA_KEY` | GCPサービスアカウントキー（JSON） | ✅ |
| `GCP_PROJECT_ID` | GCPプロジェクトID（開発環境用） | ✅ |
| `BQ_DATASET` | BigQueryデータセット名（開発環境用） | ✅ |
| `GOOGLE_SPREADSHEET_ID` | GoogleスプレッドシートID（開発環境用） | ✅ |
| `GOOGLE_SHEETS_API_KEY` | Google Sheets APIキー | ⚠️ |
| `GOOGLE_SHEET_NAME` | シート名（デフォルト: シート1） | ⚠️ |
| `FRONTEND_URL` | フロントエンドURL（開発環境） | ⚠️ |
| `BACKEND_URL` | バックエンドURL（開発環境） | ⚠️ |
| `VITE_GOOGLE_SPREADSHEET_ID` | フロントエンド用スプレッドシートID | ⚠️ |
| `VITE_GOOGLE_SHEETS_API_KEY` | フロントエンド用APIキー | ⚠️ |

## 🔍 デプロイ後の確認

### 1. サービスURLの確認

デプロイ完了後、以下のURLを確認：

- **バックエンド**: `https://universegeo-backend-dev-*.asia-northeast1.run.app`
- **フロントエンド**: `https://universegeo-dev-*.asia-northeast1.run.app`

### 2. ログの確認

```bash
# バックエンドログ
gcloud run services logs read universegeo-backend-dev \
  --region asia-northeast1 \
  --project univere-geo-demo-dev \
  --limit 50

# フロントエンドログ
gcloud run services logs read universegeo-dev \
  --region asia-northeast1 \
  --project univere-geo-demo-dev \
  --limit 50
```

### 3. 環境変数の確認

```bash
# バックエンド環境変数
gcloud run services describe universegeo-backend-dev \
  --region asia-northeast1 \
  --project univere-geo-demo-dev \
  --format 'value(spec.template.spec.containers[0].env)'
```

## 📝 関連ドキュメント

- [開発環境セットアップガイド](./SETUP.md)
- [トラブルシューティング](./troubleshooting/)
- [共通ドキュメント](../shared/)
