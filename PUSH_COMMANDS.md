# GitHubへのPushコマンド（クイックリファレンス）

## 🚀 基本的なPush手順

```bash
# 1. リモートリポジトリを設定（初回のみ）
git remote add origin https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git

# または、既存のリモートを変更
git remote set-url origin https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git

# 2. 変更をステージング
git add .

# 3. コミット
git commit -m "Add backend API integration and GitHub Actions workflows"

# 4. Push
git push -u origin main
```

## ⚠️ Push前の確認事項

### 機密情報が含まれていないか確認

```bash
# .envファイルが除外されているか確認
git check-ignore .env

# サービスアカウントキーが除外されているか確認
git check-ignore backend/service-account-key.json

# ステージングされているファイルを確認
git status
```

### 重要なファイルが除外されていることを確認

以下のファイルが **ステージングされていない** ことを確認：
- `.env`
- `backend/service-account-key.json`
- `node_modules/`
- `dist/`

## 📝 段階的なPush（推奨）

```bash
# 1. ワークフローファイルのみ
git add .github/
git commit -m "Add GitHub Actions workflows for deployment"
git push -u origin main

# 2. ドキュメント
git add *.md
git commit -m "Add deployment documentation"
git push

# 3. ソースコード
git add src/ backend/
git commit -m "Add backend API and frontend integration"
git push

# 4. 設定ファイル
git add package.json Dockerfile deploy.sh backend/deploy.sh
git commit -m "Add deployment configuration"
git push
```

## 🔧 トラブルシューティング

### リモートが既に存在する場合

```bash
git remote -v
git remote remove origin
git remote add origin https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git
```

### 認証エラーの場合

```bash
# Personal Access Tokenを使用
git remote set-url origin https://YOUR_TOKEN@github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git
```

### コンフリクトが発生した場合

```bash
git fetch origin
git pull origin main --allow-unrelated-histories
# コンフリクトを解決後
git push -u origin main
```

