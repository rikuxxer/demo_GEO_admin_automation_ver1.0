# クイックスタートガイド

UNIVERSEGEO案件管理システムを最速でデプロイする手順です。

---

## 🚀 5ステップでデプロイ

### ステップ1: 環境変数を設定（2分）

```powershell
# env.exampleをコピー
Copy-Item env.example .env

# .envファイルを編集してAPIキーを設定
# VITE_GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
# VITE_GOOGLE_SHEETS_API_KEY=your_api_key
```

---

### ステップ2: GCPプロジェクトを準備（3分）

```powershell
# Google Cloud SDKにログイン
gcloud auth login

# プロジェクトを作成
gcloud projects create universegeo-project --name="UNIVERSEGEO"

# プロジェクトを設定
gcloud config set project universegeo-project

# APIを有効化
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

---

### ステップ3: デプロイスクリプトを設定（1分）

`deploy.ps1` を編集：

```powershell
$PROJECT_ID = "universegeo-project"  # ← あなたのGCPプロジェクトID
$REGION = "asia-northeast1"          # ← リージョン
$SERVICE_NAME = "universegeo"        # ← サービス名
```

---

### ステップ4: デプロイ実行（5-10分）

```powershell
# Windows
.\deploy.ps1

# Mac/Linux
chmod +x deploy.sh
./deploy.sh
```

---

### ステップ5: 動作確認（1分）

表示されたURLにアクセス：

```
✅ デプロイが完了しました！
🌐 サービスURL:
https://universegeo-xxxxxxxxx-an.a.run.app
```

---

## 📝 チェックリスト

デプロイ前に確認：

- [ ] `.env` ファイルを作成し、APIキーを設定
- [ ] Google Sheets APIが有効化されている
- [ ] Google Cloud SDK がインストールされている
- [ ] Docker Desktop がインストールされている
- [ ] `deploy.ps1` のプロジェクトIDを設定
- [ ] `.env` ファイルが `.gitignore` に含まれている

---

## ⚡ 簡易版（Netlifyで無料デプロイ）

Cloud Runを使わず、無料でデプロイする方法：

### 1. Netlifyにログイン

[Netlify](https://www.netlify.com/) にアクセスしてログイン

### 2. GitHubリポジトリをインポート

「Add new site」→「Import an existing project」→ GitHubを選択

### 3. ビルド設定

```
Build command: npm run build
Publish directory: dist
```

### 4. 環境変数を設定

`Site settings` → `Environment variables` → 以下を追加：
- `VITE_GOOGLE_SPREADSHEET_ID`
- `VITE_GOOGLE_SHEETS_API_KEY`

### 5. デプロイ

「Deploy site」をクリック → 完了！

---

## 🆘 トラブルシューティング

### エラー: 環境変数が見つからない

**対処法:**
```powershell
# .envファイルが存在するか確認
Test-Path .env

# なければ作成
Copy-Item env.example .env
```

---

### エラー: Dockerビルド失敗

**対処法:**
```powershell
# Dockerを起動
# Docker Desktop を開く

# キャッシュをクリア
docker system prune -a
```

---

### エラー: GCP権限不足

**対処法:**
```powershell
# プロジェクトオーナー権限を確認
gcloud projects get-iam-policy universegeo-project
```

---

## 📚 詳細情報

- 詳細なデプロイ手順: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- Google Sheets API設定: [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md)
- 環境変数テンプレート: [env.example](./env.example)

---

## 💡 次のステップ

1. **カスタムドメインを設定**
   - Cloud Runでカスタムドメインをマッピング

2. **CI/CDを設定**
   - GitHub Actionsで自動デプロイ

3. **モニタリングを設定**
   - Cloud Loggingでログを監視

4. **バックアップを設定**
   - 定期的なデータバックアップ





