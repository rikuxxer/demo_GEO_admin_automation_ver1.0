# GitHub Environment Secrets 設定手順

## 📋 現在の状況

サービスアカウントキーファイル: `univere-geo-demo-e26fa6a79c50.json`
- プロジェクトID: `univere-geo-demo`
- サービスアカウント: `id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`

## 🔧 設定手順

### ステップ1: JSONファイルの内容をコピー

**PowerShellを使用する場合:**

```powershell
# JSONファイルの内容をクリップボードにコピー
Get-Content "C:\Users\sakamoto_riku_microa\Downloads\univere-geo-demo-e26fa6a79c50.json" | Set-Clipboard
```

**メモ帳を使用する場合:**
1. JSONファイルを右クリック > **プログラムから開く** > **メモ帳**
2. 内容全体を選択（Ctrl+A）
3. コピー（Ctrl+C）

### ステップ2: GitHub Environment Secretsに設定

1. GitHubリポジトリにアクセス: `https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0`
2. **Settings** タブをクリック
3. 左メニューから **Environments** を選択
4. **production** 環境をクリック（存在しない場合は **New environment** で作成）
5. **Environment secrets** セクションで **Add secret** をクリック
6. 以下のSecretsを1つずつ追加：

#### GCP_SA_KEY

- **Name**: `GCP_SA_KEY`
- **Secret**: コピーしたJSONファイルの内容全体を貼り付け
- **Add secret** をクリック

**重要**: 
- JSON全体をそのままコピー&ペーストしてください
- 改行も含めてそのまま貼り付け
- 前後の空白を削除しない
- `{` から `}` まで全体を含める

#### GCP_PROJECT_ID

- **Name**: `GCP_PROJECT_ID`
- **Secret**: `univere-geo-demo`
- **Add secret** をクリック

#### BACKEND_SERVICE_ACCOUNT

- **Name**: `BACKEND_SERVICE_ACCOUNT`
- **Secret**: `id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`
- **Add secret** をクリック

#### その他のSecrets（必要に応じて）

- **BQ_DATASET**: BigQueryデータセット名（例: `universegeo_dataset`）
- **GOOGLE_SPREADSHEET_ID**: Google Sheets スプレッドシートID
- **GOOGLE_SHEETS_API_KEY**: Google Sheets API キー
- **GOOGLE_SHEET_NAME**: シート名（オプション、デフォルト: `シート1`）
- **FRONTEND_URL**: フロントエンドURL（オプション）

### ステップ3: 設定の確認

1. **Environment secrets** セクションで、以下のSecretsが表示されているか確認：
   - ✅ `GCP_SA_KEY`
   - ✅ `GCP_PROJECT_ID`
   - ✅ `BACKEND_SERVICE_ACCOUNT`
   - （その他のSecrets）

2. 各Secretの名前が正確に一致しているか確認（大文字・小文字を区別）

## ⚠️ よくある間違い

### 間違い1: Environment名が一致していない

- ❌ 間違い: Environment名が `Production` や `prod` など
- ✅ 正しい: Environment名は `production`（すべて小文字）

### 間違い2: Secret名が間違っている

- ❌ 間違い: `gcp_sa_key`、`GCP-SA-KEY` など
- ✅ 正しい: `GCP_SA_KEY`（大文字、アンダースコア）

### 間違い3: JSONの内容が不完全

- ❌ 間違い: JSONの一部だけをコピー
- ✅ 正しい: `{` から `}` まで全体をコピー

### 間違い4: Repository secretsに設定している

- ❌ 間違い: Settings > Secrets and variables > Actions > Repository secrets
- ✅ 正しい: Settings > Environments > production > Environment secrets

## 🔍 トラブルシューティング

### 問題: Secretが空になる

**確認事項:**
1. Environment名が `production` であるか確認
2. Secret名が正確に `GCP_SA_KEY` であるか確認（大文字・小文字）
3. JSONファイルの内容全体をコピー&ペーストしているか確認
4. Environment secretsに設定しているか確認（Repository secretsではない）

### 問題: Environmentが見つからない

**解決方法:**
1. Settings > Environments を開く
2. **New environment** をクリック
3. **Name**: `production` と入力
4. **Configure environment** をクリック

### 問題: Secretを更新したい

**解決方法:**
1. Settings > Environments > production を開く
2. **Environment secrets** セクションで、更新したいSecretをクリック
3. **Update** をクリック
4. 新しい値を貼り付け
5. **Update secret** をクリック

## 📝 確認チェックリスト

- [ ] Environment `production` が作成されている
- [ ] Environment secretsに `GCP_SA_KEY` が設定されている
- [ ] `GCP_SA_KEY` の値がJSONファイルの内容全体である
- [ ] Environment secretsに `GCP_PROJECT_ID` が設定されている
- [ ] `GCP_PROJECT_ID` の値が `univere-geo-demo` である
- [ ] Environment secretsに `BACKEND_SERVICE_ACCOUNT` が設定されている
- [ ] `BACKEND_SERVICE_ACCOUNT` の値が `id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com` である
- [ ] その他の必要なSecretsも設定されている

## 🚀 次のステップ

すべてのSecretsを設定したら：

1. GitHub Actionsでデプロイを再実行
2. 「Verify Secrets」ステップのログを確認
3. エラーが解消されているか確認





