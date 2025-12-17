# Repository Secrets 設定ガイド

## 🚨 重要: Repository Secretsに設定してください

Environment secretsではなく、**Repository secrets**に設定することで、確実に動作します。

## 📝 設定手順

### ステップ1: GitHubリポジトリを開く

1. https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0 を開く
2. **Settings** タブをクリック

### ステップ2: Secrets and variables > Actions を開く

1. 左メニューから **Secrets and variables** > **Actions** を選択
2. **Repository secrets** タブを確認（Environment secrets ではない）

### ステップ3: Secretsを追加

**New repository secret** をクリックして、以下のSecretsを1つずつ追加：

#### 1. GCP_PROJECT_ID

- **Name**: `GCP_PROJECT_ID`
- **Secret**: あなたのGCPプロジェクトID（例: `your-project-id`）

#### 2. GCP_SA_KEY（最重要）

- **Name**: `GCP_SA_KEY`
- **Secret**: サービスアカウントキー（JSON）の内容全体

**取得方法**:
```bash
# サービスアカウントキーをダウンロード
gcloud iam service-accounts keys create key.json \
  --iam-account=your-service-account@your-project.iam.gserviceaccount.com

# ファイルの内容をコピー（Windows PowerShell）
Get-Content key.json | Set-Clipboard
```

**重要**: JSONファイルの内容全体をそのままコピー&ペーストしてください（改行も含む）

#### 3. BQ_DATASET

- **Name**: `BQ_DATASET`
- **Secret**: BigQueryデータセット名（例: `universegeo-dataset`）

#### 4. GOOGLE_SPREADSHEET_ID

- **Name**: `GOOGLE_SPREADSHEET_ID`
- **Secret**: Google Sheets スプレッドシートID

#### 5. GOOGLE_SHEETS_API_KEY

- **Name**: `GOOGLE_SHEETS_API_KEY`
- **Secret**: Google Sheets API キー

#### 6. BACKEND_SERVICE_ACCOUNT

- **Name**: `BACKEND_SERVICE_ACCOUNT`
- **Secret**: サービスアカウントのメールアドレス（例: `universegeo-backend-sa@your-project-id.iam.gserviceaccount.com`）

#### 7. GOOGLE_SHEET_NAME（オプション）

- **Name**: `GOOGLE_SHEET_NAME`
- **Secret**: シート名（例: `シート1` または `Sheet1`）

#### 8. FRONTEND_URL（オプション）

- **Name**: `FRONTEND_URL`
- **Secret**: フロントエンドURL（デフォルト: `http://localhost:5173`）

## ✅ 設定後の確認

1. **Repository secrets** タブで、すべてのSecretsが表示されているか確認
2. 各Secretの名前が正しいか確認（大文字小文字も含む）
3. 再度デプロイを実行

## 🔍 トラブルシューティング

### Secretが表示されない

- **Repository secrets** タブを確認（Environment secrets ではない）
- ブラウザをリロード

### GCP_SA_KEY が空

- JSONファイルの内容全体をコピー&ペースト
- 前後の空白を削除しない
- 改行も含めてそのまま貼り付け

### 認証エラーが続く

1. Secret名が正しいか確認（`GCP_SA_KEY`）
2. Secretの値が正しい形式（JSON）か確認
3. GitHub Actionsのログで「Verify Secrets」ステップを確認

## 📋 チェックリスト

- [ ] `GCP_PROJECT_ID` が設定されている
- [ ] `GCP_SA_KEY` が設定されている（JSON形式）
- [ ] `BQ_DATASET` が設定されている
- [ ] `GOOGLE_SPREADSHEET_ID` が設定されている
- [ ] `GOOGLE_SHEETS_API_KEY` が設定されている
- [ ] `BACKEND_SERVICE_ACCOUNT` が設定されている
- [ ] すべて **Repository secrets** に設定されている（Environment secrets ではない）

