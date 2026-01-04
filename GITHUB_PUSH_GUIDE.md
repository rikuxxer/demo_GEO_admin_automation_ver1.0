# GitHubへのPush手順

このドキュメントでは、現在のプロジェクトをGitHubリポジトリ `https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git` にpushする手順を説明します。

## 📋 前提条件

1. Gitがインストールされている
2. GitHubアカウントにアクセス権限がある
3. リポジトリが既に作成されている

## 🚀 Push手順

### ステップ1: Gitの状態を確認

```bash
# 現在のGitの状態を確認
git status

# リモートリポジトリを確認
git remote -v
```

### ステップ2: リモートリポジトリを設定

リモートリポジトリが設定されていない場合：

```bash
# リモートリポジトリを追加
git remote add origin https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git

# 既存のリモートを変更する場合
git remote set-url origin https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git
```

### ステップ3: 変更をコミット

```bash
# すべての変更をステージング
git add .

# コミット（必要に応じてメッセージを変更）
git commit -m "Add backend API integration and deployment workflows"
```

### ステップ4: GitHubにPush

```bash
# mainブランチにpush
git push -u origin main

# または、既存のブランチ名が異なる場合
git push -u origin master
```

## ⚠️ 重要な注意事項

### 1. 機密情報をコミットしない

以下のファイルは **絶対にコミットしないでください**：

- `.env` - 環境変数ファイル
- `backend/service-account-key.json` - GCPサービスアカウントキー
- `*.key` - 秘密鍵ファイル
- `node_modules/` - 依存関係（既に.gitignoreに含まれているはず）

### 2. .gitignoreの確認

以下の内容が `.gitignore` に含まれていることを確認してください：

```
# 環境変数
.env
.env.local
.env.*.local

# サービスアカウントキー
backend/service-account-key.json
*.json
!package.json
!package-lock.json
!tsconfig.json

# 依存関係
node_modules/
dist/
build/

# ログ
*.log
npm-debug.log*

# OS
.DS_Store
Thumbs.db
```

### 3. GitHub Secretsの設定

push後、GitHubリポジトリの **Settings > Secrets and variables > Actions** で以下のSecretsを設定してください：

- `GCP_PROJECT_ID`
- `GCP_SA_KEY`
- `BQ_DATASET`
- `GOOGLE_SPREADSHEET_ID`
- `GOOGLE_SHEETS_API_KEY`
- `BACKEND_SERVICE_ACCOUNT`

詳細は [GITHUB_DEPLOYMENT.md](./GITHUB_DEPLOYMENT.md) を参照してください。

## 🔧 トラブルシューティング

### エラー: "remote origin already exists"

```bash
# 既存のリモートを確認
git remote -v

# リモートを削除して再追加
git remote remove origin
git remote add origin https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git
```

### エラー: "failed to push some refs"

```bash
# リモートの変更を取得
git fetch origin

# リモートとマージ
git pull origin main --allow-unrelated-histories

# 再度push
git push -u origin main
```

### エラー: 認証エラー

GitHubの認証が必要な場合：

```bash
# Personal Access Tokenを使用する場合
git remote set-url origin https://YOUR_TOKEN@github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git

# または、SSHを使用
git remote set-url origin git@github.com:rikuxxer/demo_GEO_admin_automation_ver1.0.git
```

## 📝 推奨されるPush手順（安全版）

### 1. 変更内容を確認

```bash
# ステージング前の変更を確認
git status

# 変更内容を確認
git diff
```

### 2. 重要なファイルを除外

```bash
# .envファイルがコミットされていないか確認
git check-ignore .env

# サービスアカウントキーがコミットされていないか確認
git check-ignore backend/service-account-key.json
```

### 3. 段階的にコミット

```bash
# ワークフローファイルのみをコミット
git add .github/
git commit -m "Add GitHub Actions workflows"

# ドキュメントをコミット
git add *.md
git commit -m "Add deployment documentation"

# ソースコードをコミット
git add src/ backend/
git commit -m "Add backend API and frontend integration"

# 設定ファイルをコミット
git add package.json Dockerfile deploy.sh
git commit -m "Add deployment configuration"
```

### 4. Push

```bash
git push -u origin main
```

## ✅ Push後の確認

1. **GitHubリポジトリを確認**
   - ファイルが正しくアップロードされているか確認
   - `.github/workflows/` ディレクトリが存在するか確認

2. **GitHub Actionsを確認**
   - Actionsタブでワークフローが表示されるか確認
   - エラーがないか確認

3. **Secretsを設定**
   - Settings > Secrets and variables > Actions
   - 必要なSecretsを設定

4. **初回デプロイを実行**
   - Actionsタブから「Deploy All (Backend + Frontend)」を実行

## 🔗 関連ドキュメント

- [GitHub Actions デプロイガイド](./GITHUB_DEPLOYMENT.md)
- [Cloud Run デプロイ手順](./CLOUD_RUN_DEPLOY.md)
- [デプロイ手順書](./DEPLOYMENT_GUIDE.md)




