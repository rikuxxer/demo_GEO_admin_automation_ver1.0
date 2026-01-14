# 緊急: Repository Secrets の設定（今すぐ実行）

## 現在の状況

`GCP_SA_KEY` が空になっているため、デプロイが失敗しています。

## 今すぐ実行する手順

### ステップ1: JSONファイルの内容をコピー

**PowerShellを開いて以下を実行:**

```powershell
Get-Content "C:\Users\sakamoto_riku_microa\Downloads\univere-geo-demo-e26fa6a79c50.json" | Set-Clipboard
Write-Host "JSONファイルの内容をクリップボードにコピーしました"
```

**または、メモ帳で開いて:**
1. `C:\Users\sakamoto_riku_microa\Downloads\univere-geo-demo-e26fa6a79c50.json` を開く
2. 内容全体を選択（Ctrl+A）
3. コピー（Ctrl+C）

### ステップ2: GitHub Repository Secretsにアクセス

**以下のリンクをクリックして開いてください:**

👉 **https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/secrets/actions**

### ステップ3: Repository secrets タブを選択

1. ページが開いたら、**Repository secrets** タブをクリック
2. **Environment secrets** タブではないことを確認

### ステップ4: GCP_SA_KEY を追加

1. **New repository secret** ボタンをクリック
2. **Name** フィールドに以下を**正確に**入力: `GCP_SA_KEY`
   - 大文字・小文字を正確に
   - スペースや余分な文字は入れない
3. **Secret** フィールドに、コピーしたJSONファイルの内容全体を貼り付け（Ctrl+V）
   - JSON全体（`{` から `}` まで）をそのまま貼り付け
   - 改行も含めてそのまま貼り付け
4. **Add secret** ボタンをクリック

### ステップ5: その他の必須Secretsも追加

以下のSecretsも同じように追加してください：

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

#### BQ_DATASET

1. **New repository secret** をクリック
2. **Name**: `BQ_DATASET`
3. **Secret**: あなたのBigQueryデータセット名（例: `universegeo_dataset`）
4. **Add secret** をクリック

## 設定確認

設定後、**Repository secrets** タブで以下が表示されているか確認してください：

- `GCP_SA_KEY`
- `GCP_PROJECT_ID`
- `BACKEND_SERVICE_ACCOUNT`
- `BQ_DATASET`

## よくある間違い

### 間違い1: Environment secretsに設定している

- **間違い**: Settings > Environments > production > Environment secrets
- **正しい**: Settings > Secrets and variables > Actions > **Repository secrets**

### 間違い2: Secret名が間違っている

- `gcp_sa_key`（小文字）
- `GCP-SA-KEY`（ハイフン）
- `GCP_SA_KEY_`（末尾にアンダースコア）
- `GCP_SA_KEY`（正しい）

### 間違い3: JSONの内容が不完全

- JSONの一部だけをコピー
- JSON全体（`{` から `}` まで）をコピー

## 設定後の確認

1. **Repository secrets** タブで、`GCP_SA_KEY` が表示されているか確認
2. `GCP_SA_KEY` をクリックして、**Update** ボタンが表示されるか確認（値は表示されませんが、設定されているか確認できます）
3. GitHub Actionsでデプロイを再実行

## 次のステップ

すべてのSecretsを設定したら：

1. GitHub Actionsでデプロイを再実行
2. 「Debug Secrets」ステップのログを確認
3. `GCP_SA_KEY exists: YES` と表示されることを確認







