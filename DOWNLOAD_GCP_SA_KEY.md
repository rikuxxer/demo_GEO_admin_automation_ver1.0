# GCP_SA_KEY（サービスアカウントキー）のダウンロード方法

## 📋 既にキーファイルを持っている場合

### ステップ1: 既存のJSONファイルを探す

以下の場所を確認してください：

- **ダウンロードフォルダ**: `C:\Users\YourName\Downloads\`
- **デスクトップ**: `C:\Users\YourName\Desktop\`
- **プロジェクトフォルダ**: プロジェクトのルートディレクトリ

ファイル名の例：
- `your-project-id-xxxxx.json`
- `key.json`
- `service-account-key.json`
- `universegeo-backend-sa-xxxxx.json`

### ステップ2: JSONファイルの内容をコピー

#### PowerShellを使用する場合

```powershell
# ファイルのパスを指定してクリップボードにコピー
Get-Content "C:\Users\YourName\Downloads\your-project-id-xxxxx.json" | Set-Clipboard

# または、ファイルを探す
Get-ChildItem -Path $env:USERPROFILE\Downloads -Filter "*.json" | Select-Object -First 1 | Get-Content | Set-Clipboard
```

#### メモ帳などのテキストエディタを使用

1. JSONファイルを右クリック > **プログラムから開く** > **メモ帳**
2. 内容全体を選択（Ctrl+A）
3. コピー（Ctrl+C）

### ステップ3: GitHub Environment Secretsに設定

1. GitHubリポジトリの **Settings** > **Environments** > **production** を開く
2. **Environment secrets** セクションで **Add secret** をクリック
3. **Name**: `GCP_SA_KEY`
4. **Secret**: コピーしたJSONの内容全体を貼り付け
5. **Add secret** をクリック

**重要**: 
- JSON全体をそのままコピー&ペーストしてください
- 改行も含めてそのまま貼り付け
- 前後の空白を削除しない

---

## 🔄 既存のキーを再ダウンロードする場合

既存のキーファイルが見つからない、または失効した場合は、新しいキーを作成する必要があります。

### 方法1: Google Cloud Consoleを使用（推奨）

### ステップ1: Google Cloud Consoleにアクセス

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. プロジェクトを選択

### ステップ2: サービスアカウントに移動

1. 左メニューから **IAM & Admin** > **Service Accounts** を選択
2. 既存のサービスアカウントを選択、または新規作成

### ステップ3: サービスアカウントの作成（まだない場合）

1. 画面上部の **+ CREATE SERVICE ACCOUNT** をクリック
2. **Service account name**: `universegeo-backend-sa` と入力
3. **Service account ID**: 自動生成される（そのままでOK）
4. **Description**: `UNIVERSEGEO Backend Service Account` と入力
5. **CREATE AND CONTINUE** をクリック

### ステップ4: 権限の付与

1. **Grant this service account access to project** で以下を選択：
   - **BigQuery Data Editor** (`roles/bigquery.dataEditor`)
   - **BigQuery Job User** (`roles/bigquery.jobUser`)
2. **CONTINUE** をクリック
3. **DONE** をクリック

### ステップ5: キーの作成（新規作成または再ダウンロード）

1. 既存のサービスアカウントをクリック
2. **Keys** タブを開く
3. **ADD KEY** > **Create new key** をクリック
4. **Key type** で **JSON** を選択
5. **CREATE** をクリック
6. JSONファイルが自動的にダウンロードされます

**注意**: 
- 既存のキーがある場合、新しいキーを作成すると古いキーは無効になりません
- セキュリティのため、古いキーは削除することを推奨します

### ステップ6: キーファイルの内容をコピー

#### Windows PowerShellの場合

```powershell
# ダウンロードしたJSONファイルのパスを指定
Get-Content "C:\Users\YourName\Downloads\your-project-id-xxxxx.json" | Set-Clipboard
```

#### メモ帳などのテキストエディタを使用

1. ダウンロードしたJSONファイルを開く
2. 内容全体を選択（Ctrl+A）
3. コピー（Ctrl+C）

---

## 方法2: gcloud CLIを使用

### ステップ1: サービスアカウントの作成（まだない場合）

```bash
# プロジェクトIDを設定
export PROJECT_ID="your-project-id"

# サービスアカウントを作成
gcloud iam service-accounts create universegeo-backend-sa \
  --display-name="UNIVERSEGEO Backend Service Account" \
  --project=$PROJECT_ID
```

### ステップ2: 権限の付与

```bash
# BigQueryの権限を付与
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:universegeo-backend-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:universegeo-backend-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"
```

### ステップ3: キーのダウンロード

```bash
# サービスアカウントキーをダウンロード
gcloud iam service-accounts keys create key.json \
  --iam-account=universegeo-backend-sa@$PROJECT_ID.iam.gserviceaccount.com \
  --project=$PROJECT_ID
```

### ステップ4: キーファイルの内容を確認

#### Windows PowerShellの場合

```powershell
# ファイルの内容を表示
Get-Content key.json

# クリップボードにコピー
Get-Content key.json | Set-Clipboard
```

#### コマンドプロンプトの場合

```cmd
type key.json
```

---

## GitHub Secretsへの設定

### ステップ1: JSONファイルの内容をコピー

上記の方法で取得したJSONファイルの内容全体をコピーしてください。

### ステップ2: GitHub Secretsに設定

1. GitHubリポジトリの **Settings** > **Environments** > **production** を開く
2. **Environment secrets** セクションで **Add secret** をクリック
3. **Name**: `GCP_SA_KEY`
4. **Secret**: コピーしたJSONの内容全体を貼り付け
5. **Add secret** をクリック

**重要**: 
- JSON全体をそのままコピー&ペーストしてください
- 改行も含めてそのまま貼り付け
- 前後の空白を削除しない

---

## JSONファイルの形式確認

正しい形式のJSONファイルは以下のような構造です：

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "universegeo-backend-sa@your-project-id.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/universegeo-backend-sa%40your-project-id.iam.gserviceaccount.com"
}
```

---

## セキュリティ注意事項

⚠️ **重要**: 

1. **キーファイルは絶対にGitにコミットしない**
   - `.gitignore` に `*.json` と `key.json` が含まれているか確認
   - 既にコミットしてしまった場合は、すぐに削除してキーを再生成

2. **キーファイルを共有しない**
   - メールやチャットで送信しない
   - 公開リポジトリにアップロードしない

3. **定期的にキーをローテーション**
   - 定期的に新しいキーを生成して古いキーを削除

---

## 🔍 既存のキーが有効か確認する方法

### 方法1: gcloud CLIで確認

```bash
# サービスアカウントキーで認証を試す
gcloud auth activate-service-account --key-file=key.json

# 認証が成功したら、プロジェクト情報を取得
gcloud config get-value project
```

### 方法2: キーファイルの内容を確認

JSONファイルが正しい形式か確認：

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "...@...iam.gserviceaccount.com",
  ...
}
```

**確認ポイント**:
- `type` が `"service_account"` である
- `project_id` が正しいプロジェクトIDである
- `private_key` が存在する（`-----BEGIN PRIVATE KEY-----` で始まる）
- `client_email` が正しいサービスアカウントのメールアドレスである

---

## トラブルシューティング

### エラー: 既存のキーファイルが見つからない

**解決方法**:
1. Google Cloud Consoleで既存のキーを確認
2. キーが存在する場合は再ダウンロードできないため、新しいキーを作成
3. 古いキーを削除して新しいキーを使用

### エラー: キーが無効になっている

**原因**: キーが削除された、または期限切れ

**解決方法**:
1. Google Cloud Console > Service Accounts > Keys タブを確認
2. キーが存在しない場合は、新しいキーを作成
3. 新しいキーをGitHub Secretsに設定

### エラー: 権限が不足している

```bash
# サービスアカウントに権限を付与
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:universegeo-backend-sa@your-project-id.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"
```

### エラー: サービスアカウントが見つからない

```bash
# サービスアカウント一覧を確認
gcloud iam service-accounts list --project=your-project-id
```

### エラー: キーが作成できない

- サービスアカウントが存在するか確認
- プロジェクトIDが正しいか確認
- 適切な権限があるか確認

