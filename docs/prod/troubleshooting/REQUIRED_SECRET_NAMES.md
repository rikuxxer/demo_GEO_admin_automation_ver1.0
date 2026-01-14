# ワークフローが参照しているSecret名一覧

## 必須Secrets（Environment secretsに設定が必要）

ワークフローは以下のSecret名を**正確に**参照しています：

### 1. GCP_SA_KEY
- **参照箇所**: `${{ secrets.GCP_SA_KEY }}`
- **説明**: GCPサービスアカウントキー（JSON形式）
- **値**: JSONファイルの内容全体
- **重要**: Secret名は **`GCP_SA_KEY`** と完全に一致する必要があります

### 2. GCP_PROJECT_ID
- **参照箇所**: `${{ secrets.GCP_PROJECT_ID }}`
- **説明**: GCPプロジェクトID
- **値**: `univere-geo-demo`

### 3. BACKEND_SERVICE_ACCOUNT
- **参照箇所**: `${{ secrets.BACKEND_SERVICE_ACCOUNT }}`
- **説明**: バックエンド用サービスアカウントのメールアドレス
- **値**: `id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`

### 4. BQ_DATASET
- **参照箇所**: `${{ secrets.BQ_DATASET }}`
- **説明**: BigQueryデータセット名
- **値**: あなたのBigQueryデータセット名（例: `universegeo_dataset`）

## オプションSecrets（必要に応じて設定）

### 5. GOOGLE_SPREADSHEET_ID
- **参照箇所**: `${{ secrets.GOOGLE_SPREADSHEET_ID }}`
- **説明**: Google Sheets スプレッドシートID
- **必須**: オプション

### 6. GOOGLE_SHEETS_API_KEY
- **参照箇所**: `${{ secrets.GOOGLE_SHEETS_API_KEY }}`
- **説明**: Google Sheets API キー
- **必須**: オプション

### 7. GOOGLE_SHEET_NAME
- **参照箇所**: `${{ secrets.GOOGLE_SHEET_NAME }}`
- **説明**: Google Sheets シート名
- **デフォルト値**: `シート1`
- **必須**: オプション

### 8. FRONTEND_URL
- **参照箇所**: `${{ secrets.FRONTEND_URL }}`
- **説明**: フロントエンドURL
- **デフォルト値**: `http://localhost:5173`
- **必須**: オプション

### 9. VITE_GOOGLE_SPREADSHEET_ID
- **参照箇所**: `${{ secrets.VITE_GOOGLE_SPREADSHEET_ID }}`
- **説明**: フロントエンド用Google Sheets スプレッドシートID
- **必須**: オプション

### 10. VITE_GOOGLE_SHEETS_API_KEY
- **参照箇所**: `${{ secrets.VITE_GOOGLE_SHEETS_API_KEY }}`
- **説明**: フロントエンド用Google Sheets API キー
- **必須**: オプション

## Secret名の規則

### 正しいSecret名

- `GCP_SA_KEY` - 大文字、アンダースコア
- `GCP_PROJECT_ID` - 大文字、アンダースコア
- `BACKEND_SERVICE_ACCOUNT` - 大文字、アンダースコア

### 間違ったSecret名の例

- `gcp_sa_key` - 小文字（間違い）
- `GCP-SA-KEY` - ハイフン（間違い）
- `GCP_SA_KEY_` - 末尾にアンダースコア（間違い）
- `GCP_SA_KEY ` - 末尾にスペース（間違い）
- `Gcp_Sa_Key` - 大文字・小文字が混在（間違い）

## 確認方法

1. **Environment secrets** にアクセス:
   `https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments/production`

2. **Environment secrets** セクションで、上記のSecret名が**正確に**設定されているか確認

3. 各Secret名が上記の正しい名前と**完全に一致**しているか確認

## 設定手順

1. Environment secretsにアクセス
2. **Add secret** をクリック
3. **Name** に上記の正しいSecret名を入力（大文字・小文字を正確に）
4. **Secret** に値を貼り付け
5. **Add secret** をクリック

## 重要

- Secret名は**大文字・小文字を区別**します
- Secret名は**完全に一致**する必要があります
- **Environment secrets** に設定してください（Repository secretsではない）







