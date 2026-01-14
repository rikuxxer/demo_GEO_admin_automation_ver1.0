# GitHub Push クイックガイド

## 最短手順

### ステップ1: Gitのインストール確認

```powershell
git --version
```

**エラーが出る場合** → [GIT_INSTALL_GUIDE.md](./GIT_INSTALL_GUIDE.md) を参照してGitをインストール

### ステップ2: リポジトリの初期化（初回のみ）

```powershell
# Gitリポジトリとして初期化（まだの場合）
git init

# リモートリポジトリを設定
git remote add origin https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git
```

### ステップ3: Push

```powershell
# すべての変更を追加
git add .

# コミット
git commit -m "Add backend API integration and deployment workflows"

# Push
git push -u origin main
```

## 重要な確認事項

### 機密情報が含まれていないか確認

```powershell
# .envファイルが除外されているか確認
git check-ignore .env

# サービスアカウントキーが除外されているか確認
git check-ignore backend/service-account-key.json

# ステージングされているファイルを確認
git status
```

以下のファイルが **ステージングされていない** ことを確認：
- `.env`
- `backend/service-account-key.json`
- `node_modules/`
- `dist/`

## よくあるエラーと対処法

### エラー: "remote origin already exists"

```powershell
git remote remove origin
git remote add origin https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git
```

### エラー: "failed to push some refs"

```powershell
git pull origin main --allow-unrelated-histories
git push -u origin main
```

### エラー: 認証エラー

GitHubの認証が必要な場合：

1. **Personal Access Tokenを作成**
   - GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
   - `repo` スコープを選択してトークンを作成

2. **トークンを使用してpush**

```powershell
git remote set-url origin https://YOUR_TOKEN@github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git
git push -u origin main
```

## 詳細な手順

詳細は以下のドキュメントを参照：
- [GITHUB_PUSH_GUIDE.md](./GITHUB_PUSH_GUIDE.md) - 詳細なpush手順
- [GIT_INSTALL_GUIDE.md](./GIT_INSTALL_GUIDE.md) - Gitインストール手順







