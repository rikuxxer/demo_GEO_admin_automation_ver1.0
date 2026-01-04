# 🔧 クイック修正: GitHub Secrets の設定

## 問題

`GCP_SA_KEY` が空になっているエラーが発生しています。

## ✅ 解決方法: Repository Secrets に設定（推奨）

Environment secretsではなく、**Repository secrets**に設定してください。これが最も確実に動作します。

### ステップ1: JSONファイルの内容をコピー

**PowerShellを使用:**
```powershell
Get-Content "C:\Users\sakamoto_riku_microa\Downloads\univere-geo-demo-e26fa6a79c50.json" | Set-Clipboard
```

### ステップ2: Repository Secretsに設定

1. GitHubリポジトリにアクセス: `https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0`
2. **Settings** タブをクリック
3. 左メニューから **Secrets and variables** > **Actions** を選択
4. **Repository secrets** タブを選択（重要：Environment secretsではない）
5. **New repository secret** をクリック

### ステップ3: 必要なSecretsを追加

以下のSecretsを1つずつ追加してください：

#### 1. GCP_SA_KEY

- **Name**: `GCP_SA_KEY`
- **Secret**: クリップボードの内容を貼り付け（Ctrl+V）
- **Add secret** をクリック

**重要**: JSON全体（`{` から `}` まで）をそのまま貼り付け

#### 2. GCP_PROJECT_ID

- **Name**: `GCP_PROJECT_ID`
- **Secret**: `univere-geo-demo`
- **Add secret** をクリック

#### 3. BACKEND_SERVICE_ACCOUNT

- **Name**: `BACKEND_SERVICE_ACCOUNT`
- **Secret**: `id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`
- **Add secret** をクリック

#### 4. その他のSecrets（必要に応じて）

- **BQ_DATASET**: BigQueryデータセット名
- **GOOGLE_SPREADSHEET_ID**: Google Sheets スプレッドシートID
- **GOOGLE_SHEETS_API_KEY**: Google Sheets API キー
- **GOOGLE_SHEET_NAME**: シート名（オプション）
- **FRONTEND_URL**: フロントエンドURL（オプション）

## 📍 設定場所の確認

### ✅ 正しい場所: Repository secrets

```
Settings > Secrets and variables > Actions > Repository secrets
```

### ❌ 間違った場所: Environment secrets

```
Settings > Environments > production > Environment secrets
```

**注意**: Environment secretsでも動作するはずですが、Repository secretsの方が確実です。

## 🔍 確認方法

1. **Settings** > **Secrets and variables** > **Actions** を開く
2. **Repository secrets** タブで以下を確認：
   - ✅ `GCP_SA_KEY` が存在する
   - ✅ `GCP_PROJECT_ID` が存在する
   - ✅ `BACKEND_SERVICE_ACCOUNT` が存在する

## 🚀 次のステップ

すべてのSecretsを設定したら：

1. GitHub Actionsでデプロイを再実行
2. 「Verify Secrets」ステップのログを確認
3. エラーが解消されているか確認

## 💡 なぜRepository secretsが推奨されるのか

- ✅ より簡単に設定できる
- ✅ Environment secretsよりも確実に動作する
- ✅ 複数のEnvironmentで同じSecretを使える
- ✅ 設定場所が明確




