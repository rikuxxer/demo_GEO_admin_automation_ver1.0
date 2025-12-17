# GCP_SA_KEY（サービスアカウントキー）のダウンロード方法

## 方法1: Google Cloud Consoleを使用（推奨）

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

### ステップ5: キーの作成

1. 作成したサービスアカウントをクリック
2. **Keys** タブを開く
3. **ADD KEY** > **Create new key** をクリック
4. **Key type** で **JSON** を選択
5. **CREATE** をクリック
6. JSONファイルが自動的にダウンロードされます

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

## トラブルシューティング

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

