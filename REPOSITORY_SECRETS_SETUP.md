# 🔧 Repository Secrets 設定手順（必須）

## ⚠️ 現在の状況

`GCP_SA_KEY` が空になっているエラーが発生しています。**Repository secrets**に設定する必要があります。

## 📋 設定手順

### ステップ1: JSONファイルの内容をコピー

**PowerShellを使用:**
```powershell
Get-Content "C:\Users\sakamoto_riku_microa\Downloads\univere-geo-demo-e26fa6a79c50.json" | Set-Clipboard
Write-Host "✅ JSONファイルの内容をクリップボードにコピーしました"
```

### ステップ2: GitHub Repository Secretsにアクセス

1. ブラウザで以下を開く: `https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/secrets/actions`
2. または、GitHubリポジトリの **Settings** > **Secrets and variables** > **Actions** を開く
3. **Repository secrets** タブを選択（重要：Environment secretsではない）

### ステップ3: GCP_SA_KEY を設定

1. **New repository secret** をクリック
2. **Name**: `GCP_SA_KEY` と入力（大文字・小文字を正確に）
3. **Secret**: クリップボードの内容を貼り付け（Ctrl+V）
   - JSON全体（`{` から `}` まで）をそのまま貼り付け
   - 改行も含めてそのまま貼り付け
4. **Add secret** をクリック

### ステップ4: その他の必須Secretsを設定

以下のSecretsも **Repository secrets** に追加してください：

#### GCP_PROJECT_ID

1. **New repository secret** をクリック
2. **Name**: `GCP_PROJECT_ID`
3. **Secret**: `univere-geo-demo`
4. **Add secret** をクリック

#### BACKEND_SERVICE_ACCOUNT

1. **New repository secret** をクリック
2. **Name**: `BACKEND_SERVICE_ACCOUNT`
3. **Secret**: `id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`
4. **Add secret** をクリック

#### その他のSecrets（必要に応じて）

- **BQ_DATASET**: BigQueryデータセット名（例: `universegeo_dataset`）
- **GOOGLE_SPREADSHEET_ID**: Google Sheets スプレッドシートID
- **GOOGLE_SHEETS_API_KEY**: Google Sheets API キー
- **GOOGLE_SHEET_NAME**: シート名（オプション、デフォルト: `シート1`）
- **FRONTEND_URL**: フロントエンドURL（オプション）

## ✅ 設定確認チェックリスト

Repository secretsに以下が設定されているか確認してください：

- [ ] `GCP_SA_KEY` - サービスアカウントキー（JSON形式）
- [ ] `GCP_PROJECT_ID` - `univere-geo-demo`
- [ ] `BACKEND_SERVICE_ACCOUNT` - `id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`
- [ ] `BQ_DATASET` - BigQueryデータセット名
- [ ] `GOOGLE_SPREADSHEET_ID` - Google Sheets スプレッドシートID
- [ ] `GOOGLE_SHEETS_API_KEY` - Google Sheets API キー

## 🔍 確認方法

1. **Settings** > **Secrets and variables** > **Actions** を開く
2. **Repository secrets** タブで以下を確認：
   - ✅ `GCP_SA_KEY` が存在する
   - ✅ `GCP_PROJECT_ID` が存在する
   - ✅ `BACKEND_SERVICE_ACCOUNT` が存在する

## ⚠️ よくある間違い

### 間違い1: Environment secretsに設定している

- ❌ 間違い: Settings > Environments > production > Environment secrets
- ✅ 正しい: Settings > Secrets and variables > Actions > Repository secrets

### 間違い2: Secret名が間違っている

- ❌ 間違い: `gcp_sa_key`、`GCP-SA-KEY`、`GCP_SA_KEY_` など
- ✅ 正しい: `GCP_SA_KEY`（大文字、アンダースコア）

### 間違い3: JSONの内容が不完全

- ❌ 間違い: JSONの一部だけをコピー
- ✅ 正しい: `{` から `}` まで全体をコピー

## 🚀 次のステップ

すべてのSecretsを設定したら：

1. GitHub Actionsでデプロイを再実行
2. 「Verify Secrets」ステップのログを確認
3. エラーが解消されているか確認

## 📝 直接リンク

- Repository secrets: `https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/secrets/actions`

