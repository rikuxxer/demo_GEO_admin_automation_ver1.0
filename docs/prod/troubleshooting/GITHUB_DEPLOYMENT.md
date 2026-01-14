# GitHub Actions による自動デプロイ

このドキュメントでは、GitHub Actionsを使用してCloud Runに自動デプロイする方法を説明します。

## 📋 前提条件

1. GitHubリポジトリが設定されている
2. Google Cloud Platform（GCP）の認証情報が準備されている
3. 必要なGitHub Secretsが設定されている

## 🔐 GitHub Secrets の設定

GitHubリポジトリの **Settings > Secrets and variables > Actions** で以下のSecretsを設定してください：

### 必須のSecrets

| Secret名 | 説明 | 例 |
|---------|------|-----|
| `GCP_PROJECT_ID` | GCPプロジェクトID | `your-project-id` |
| `GCP_SA_KEY` | GCPサービスアカウントキー（JSON形式） | `{"type":"service_account",...}` |
| `BQ_DATASET` | BigQueryデータセット名 | `universegeo_dataset` |
| `GOOGLE_SPREADSHEET_ID` | Google Sheets スプレッドシートID | `1aBcDeFg...` |
| `GOOGLE_SHEETS_API_KEY` | Google Sheets API キー | `AIzaSy...` |
| `BACKEND_SERVICE_ACCOUNT` | バックエンド用サービスアカウントメール | `universegeo-backend-sa@project.iam.gserviceaccount.com` |

### オプションのSecrets

| Secret名 | 説明 | デフォルト値 |
|---------|------|------------|
| `BACKEND_URL` | バックエンドAPI URL（既にデプロイ済みの場合） | - |
| `FRONTEND_URL` | フロントエンドURL（CORS設定用） | `http://localhost:5173` |
| `GOOGLE_SHEET_NAME` | Google Sheets シート名 | `シート1` |
| `VITE_GOOGLE_SPREADSHEET_ID` | フロントエンド用（バックエンド未使用時） | - |
| `VITE_GOOGLE_SHEETS_API_KEY` | フロントエンド用（バックエンド未使用時） | - |

## 🚀 デプロイ方法

### 方法1: 自動デプロイ（push時）

`main` ブランチにpushすると、自動的にデプロイが開始されます：

- **バックエンド**: `backend/` ディレクトリに変更がある場合
- **フロントエンド**: `src/`, `public/`, `package.json`, `Dockerfile` に変更がある場合

```bash
git add .
git commit -m "Update application"
git push origin main
```

### 方法2: 手動デプロイ（workflow_dispatch）

GitHubの **Actions** タブから手動でデプロイを実行できます：

1. **Actions** タブを開く
2. 左側のメニューからワークフローを選択：
   - `Deploy Backend to Cloud Run` - バックエンドのみ
   - `Deploy Frontend to Cloud Run` - フロントエンドのみ
   - `Deploy All (Backend + Frontend)` - 両方
3. **Run workflow** ボタンをクリック
4. 必要に応じてパラメータを入力
5. **Run workflow** をクリック

### 方法3: 全自動デプロイ（推奨）

`Deploy All` ワークフローを使用すると、バックエンドとフロントエンドを順番にデプロイします：

1. バックエンドをデプロイ
2. バックエンドURLを取得
3. フロントエンドをビルド（バックエンドURLを環境変数として設定）
4. フロントエンドをデプロイ
5. バックエンドのCORS設定を更新

## 📁 ワークフローファイル

### `.github/workflows/deploy-backend.yml`
バックエンドのみをデプロイするワークフロー

**トリガー:**
- `backend/` ディレクトリへのpush
- 手動実行（workflow_dispatch）

### `.github/workflows/deploy-frontend.yml`
フロントエンドのみをデプロイするワークフロー

**トリガー:**
- `src/`, `public/`, `package.json`, `Dockerfile` へのpush
- 手動実行（workflow_dispatch）

**注意**: バックエンドURLが必要です（Secretsまたは手動入力）

### `.github/workflows/deploy-all.yml`
バックエンドとフロントエンドを順番にデプロイするワークフロー

**トリガー:**
- 手動実行のみ（workflow_dispatch）

**特徴:**
- バックエンドを先にデプロイ
- バックエンドURLを自動取得
- フロントエンドにバックエンドURLを自動設定
- バックエンドのCORS設定を自動更新

## 🔧 初回デプロイ手順

### 1. GitHub Secretsの設定

上記の「GitHub Secrets の設定」を参照して、必要なSecretsを設定してください。

### 2. サービスアカウントキーの準備

```bash
# サービスアカウントキーをダウンロード
gcloud iam service-accounts keys create key.json \
  --iam-account=your-service-account@your-project.iam.gserviceaccount.com

# JSONファイルの内容をコピーしてGitHub Secretsの GCP_SA_KEY に設定
cat key.json
```

### 3. 初回デプロイ

**推奨**: `Deploy All` ワークフローを使用

1. GitHubの **Actions** タブを開く
2. **Deploy All (Backend + Frontend)** を選択
3. **Run workflow** をクリック
4. デプロイが完了するまで待つ（約5-10分）

### 4. デプロイ後の確認

```bash
# バックエンドURLを確認
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --format 'value(status.url)'

# フロントエンドURLを確認
gcloud run services describe universegeo \
  --region asia-northeast1 \
  --format 'value(status.url)'
```

## 🔄 継続的なデプロイ

### バックエンドの更新

```bash
# backend/ ディレクトリに変更を加える
git add backend/
git commit -m "Update backend"
git push origin main
```

自動的にバックエンドのみがデプロイされます。

### フロントエンドの更新

```bash
# src/ ディレクトリに変更を加える
git add src/
git commit -m "Update frontend"
git push origin main
```

自動的にフロントエンドのみがデプロイされます。

**注意**: フロントエンドデプロイ時は、`BACKEND_URL` Secretが設定されている必要があります。

### 両方の更新

```bash
# 両方に変更を加える
git add .
git commit -m "Update both"
git push origin main
```

バックエンドとフロントエンドが順番にデプロイされます。

## 🐛 トラブルシューティング

### デプロイが失敗する

1. **GitHub Actionsのログを確認**
   - Actionsタブで失敗したワークフローを開く
   - エラーメッセージを確認

2. **Secretsが正しく設定されているか確認**
   - Settings > Secrets and variables > Actions
   - すべての必須Secretsが設定されているか確認

3. **GCPの権限を確認**
   - サービスアカウントにCloud Runの権限があるか確認
   - BigQueryの権限があるか確認

### バックエンドURLが取得できない

- `Deploy All` ワークフローを使用する（自動でURLを取得）
- または、`BACKEND_URL` Secretを手動で設定

### CORSエラーが発生する

- バックエンドの `FRONTEND_URL` 環境変数が正しく設定されているか確認
- `Deploy All` ワークフローを使用すると自動で更新されます

## 📝 ベストプラクティス

1. **初回デプロイ**: `Deploy All` ワークフローを使用
2. **通常の更新**: pushによる自動デプロイを使用
3. **緊急の修正**: 手動デプロイ（workflow_dispatch）を使用
4. **環境変数の変更**: Secretsを更新してから再デプロイ

## 🔗 関連ドキュメント

- [Cloud Run デプロイ手順](./CLOUD_RUN_DEPLOY.md) - 手動デプロイ手順
- [デプロイ手順書](./DEPLOYMENT_GUIDE.md) - 詳細なデプロイガイド







