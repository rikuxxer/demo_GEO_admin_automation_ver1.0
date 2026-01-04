# 🔍 Secrets設定の確認方法

## 現在のエラー

`GCP_SA_KEY` が空になっているエラーが発生しています。

## ✅ 確認手順

### ステップ1: Repository Secretsにアクセス

1. 以下のリンクを開く: `https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/secrets/actions`
2. **Repository secrets** タブを選択

### ステップ2: 以下のSecretsが存在するか確認

以下のSecretsが **Repository secrets** に表示されているか確認してください：

- [ ] `GCP_SA_KEY` - 存在するか？
- [ ] `GCP_PROJECT_ID` - 存在するか？
- [ ] `BACKEND_SERVICE_ACCOUNT` - 存在するか？

### ステップ3: Secret名の確認

**重要**: Secret名は正確に以下である必要があります（大文字・小文字を区別）：

- ✅ `GCP_SA_KEY` （正しい）
- ❌ `gcp_sa_key` （間違い）
- ❌ `GCP-SA-KEY` （間違い）
- ❌ `GCP_SA_KEY_` （間違い）
- ❌ `GCP_SA_KEY ` （末尾にスペース）

### ステップ4: GCP_SA_KEY の値の確認

`GCP_SA_KEY` をクリックして、以下を確認：

1. **Update** ボタンをクリック（値は表示されませんが、設定されているか確認）
2. 値が設定されている場合、**Cancel** をクリック

### ステップ5: 再設定が必要な場合

もし `GCP_SA_KEY` が存在しない、または値が正しくない場合：

1. **New repository secret** をクリック（または既存のSecretを **Update**）
2. **Name**: `GCP_SA_KEY` と入力（正確に）
3. **Secret**: 以下のJSONファイルの内容全体を貼り付け

```powershell
# PowerShellでコピー
Get-Content "C:\Users\sakamoto_riku_microa\Downloads\univere-geo-demo-e26fa6a79c50.json" | Set-Clipboard
```

4. **Add secret** をクリック

## 🔍 デバッグ情報の確認

次回のGitHub Actions実行時に、「Debug Secrets」ステップで以下が表示されます：

- `GCP_SA_KEY exists: YES/NO`
- `GCP_SA_KEY length: XXX`
- `GCP_PROJECT_ID exists: YES/NO`
- `GCP_PROJECT_ID value: XXX`

この情報を確認して、問題を特定してください。

## ⚠️ よくある問題

### 問題1: Repository secretsではなくEnvironment secretsに設定している

**確認方法**:
- Settings > Secrets and variables > Actions > **Repository secrets** を確認
- Settings > Environments > production > Environment secrets ではない

### 問題2: Secret名が間違っている

**確認方法**:
- Secret名が正確に `GCP_SA_KEY` であるか確認
- 大文字・小文字、アンダースコアが正確か確認

### 問題3: JSONの内容が不完全

**確認方法**:
- JSONファイルを開いて、`{` から `}` まで全体が含まれているか確認
- 改行も含めてそのままコピー&ペーストしているか確認

### 問題4: ワークフローが古いバージョンを実行している

**確認方法**:
- 最新のコードがGitHubにpushされているか確認
- GitHub Actionsの実行ログで、最新のワークフローが実行されているか確認

## 📝 設定済みSecretsの一覧

以下のSecretsが **Repository secrets** に設定されている必要があります：

| Secret名 | 値の例 | 必須 |
|---------|--------|------|
| `GCP_SA_KEY` | JSONファイルの内容全体 | ✅ |
| `GCP_PROJECT_ID` | `univere-geo-demo` | ✅ |
| `BACKEND_SERVICE_ACCOUNT` | `id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com` | ✅ |
| `BQ_DATASET` | BigQueryデータセット名 | ⚠️ |
| `GOOGLE_SPREADSHEET_ID` | Google Sheets スプレッドシートID | ⚠️ |
| `GOOGLE_SHEETS_API_KEY` | Google Sheets API キー | ⚠️ |

## 🚀 次のステップ

1. 上記の確認手順を実行
2. 問題があれば修正
3. GitHub Actionsでデプロイを再実行
4. 「Debug Secrets」ステップのログを確認




