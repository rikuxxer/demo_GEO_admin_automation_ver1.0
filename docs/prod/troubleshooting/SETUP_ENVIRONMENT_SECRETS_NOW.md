# 緊急: Environment Secrets の設定（今すぐ実行）

## 現在のエラー

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

### ステップ2: Environment secretsにアクセス

**以下のリンクをクリックして開いてください:**

👉 **https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments/production**

### ステップ3: Environment secrets セクションを確認

1. ページが開いたら、**Environment secrets** セクションを探す
2. 既存のSecretsが表示されているか確認

### ステップ4: GCP_SA_KEY を追加または更新

#### 既に存在する場合

1. **GCP_SA_KEY** をクリック
2. **Update** をクリック
3. **Secret** フィールドに、コピーしたJSONファイルの内容全体を貼り付け（Ctrl+V）
4. **Update secret** をクリック

#### 存在しない場合

1. **Add secret** ボタンをクリック
2. **Name** フィールドに以下を**正確に**入力: `GCP_SA_KEY`
   - 大文字・小文字を正確に
   - スペースや余分な文字は入れない
3. **Secret** フィールドに、コピーしたJSONファイルの内容全体を貼り付け（Ctrl+V）
   - JSON全体（`{` から `}` まで）をそのまま貼り付け
   - 改行も含めてそのまま貼り付け
4. **Add secret** ボタンをクリック

### ステップ5: その他の必須Secretsも確認

以下のSecretsも**Environment secrets**に設定されているか確認してください：

- `GCP_PROJECT_ID` - 値: `univere-geo-demo`
- `BACKEND_SERVICE_ACCOUNT` - 値: `id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`
- `BQ_DATASET` - 値: あなたのBigQueryデータセット名

## 重要な確認事項

### 1. Secret名の確認

Secret名は**正確に**以下である必要があります：

- `GCP_SA_KEY` （正しい）
- `gcp_sa_key` （小文字 - 間違い）
- `GCP-SA-KEY` （ハイフン - 間違い）
- `GCP_SA_KEY_` （末尾にアンダースコア - 間違い）
- `GCP_SA_KEY ` （末尾にスペース - 間違い）

### 2. JSONの内容確認

- JSON全体（`{` から `}` まで）が含まれているか
- 改行も含めてそのまま貼り付けているか
- 前後の空白を削除していないか

### 3. 設定場所の確認

- **Environment secrets** に設定しているか
- Repository secrets ではないか確認

## 確認方法

1. **Environment secrets** セクションで、`GCP_SA_KEY` が表示されているか確認
2. `GCP_SA_KEY` をクリックして、**Update** ボタンが表示されるか確認（値は表示されませんが、設定されているか確認できます）
3. Secret名が正確に `GCP_SA_KEY` であるか確認

## 設定後の確認

すべてのSecretsを設定したら：

1. GitHub Actionsでデプロイを再実行
2. 「Debug Secrets」ステップのログを確認
3. `GCP_SA_KEY exists: ✅ YES` と表示されることを確認

## 直接リンク

- Environment secrets: `https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments/production`







