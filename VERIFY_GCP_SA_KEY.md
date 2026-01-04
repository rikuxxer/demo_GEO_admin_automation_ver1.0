# GCP_SA_KEY の確認方法

## 1. GitHub Secretsでの確認

### Repository Secretsの場合

1. GitHubリポジトリを開く
2. **Settings** > **Secrets and variables** > **Actions** を開く
3. **Repository secrets** タブを選択
4. `GCP_SA_KEY` が存在するか確認
5. 存在する場合、値の長さが表示されます（内容は表示されません）

### Environment Secretsの場合

1. GitHubリポジトリを開く
2. **Settings** > **Environments** を開く
3. **production**（または設定したEnvironment名）をクリック
4. **Environment secrets** セクションを確認
5. `GCP_SA_KEY` が存在するか確認

## 2. 正しい形式の確認

GCP_SA_KEYは、以下のようなJSON形式である必要があります：

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "your-service-account@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

## 3. サービスアカウントキーの取得方法

### 方法1: gcloud CLIを使用

```bash
# サービスアカウントキーをダウンロード
gcloud iam service-accounts keys create key.json \
  --iam-account=your-service-account@your-project.iam.gserviceaccount.com

# ファイルの内容を確認
cat key.json
```

### 方法2: Google Cloud Consoleを使用

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. **IAM & Admin** > **Service Accounts** を開く
3. サービスアカウントを選択
4. **Keys** タブを開く
5. **Add Key** > **Create new key** をクリック
6. **JSON** を選択してダウンロード

## 4. GitHub Actionsでの確認

ワークフローにデバッグステップを追加すると、Secretが正しく取得できているか確認できます：

```yaml
- name: Verify GCP_SA_KEY
  run: |
    if [ -z "${{ secrets.GCP_SA_KEY }}" ]; then
      echo "❌ GCP_SA_KEY が空です"
      exit 1
    fi
    echo "✅ GCP_SA_KEY が設定されています"
    # 長さのみ表示（内容は表示しない）
    echo "長さ: ${#GCP_SA_KEY} 文字"
```

## 5. よくある問題

### 問題1: Secretが空

**症状**: `credentials_json` が空というエラー

**解決方法**:
- Repository secretsに `GCP_SA_KEY` を設定
- または、Environment secretsに `GCP_SA_KEY` を設定

### 問題2: JSON形式が正しくない

**症状**: 認証エラー

**解決方法**:
- JSONファイルの内容全体をコピー&ペースト
- 改行も含めてそのまま貼り付け
- 前後の空白を削除しない

### 問題3: サービスアカウントの権限不足

**症状**: BigQueryやCloud Runへのアクセスエラー

**解決方法**:
- サービスアカウントに適切な権限を付与
- `roles/bigquery.dataEditor`
- `roles/bigquery.jobUser`
- `roles/run.admin`

## 6. 確認コマンド（ローカル）

サービスアカウントキーが正しいか確認：

```bash
# サービスアカウントキーで認証
gcloud auth activate-service-account --key-file=key.json

# 認証状態を確認
gcloud auth list

# プロジェクトを設定
gcloud config set project your-project-id

# BigQueryへのアクセスをテスト
gcloud bq query --use_legacy_sql=false "SELECT 1"
```

## 7. トラブルシューティング

### Secretが設定されているのにエラーが出る場合

1. **Secret名の確認**
   - `GCP_SA_KEY` が正しいか（大文字小文字を確認）
   - スペースや特殊文字が含まれていないか

2. **Environment名の確認**
   - ワークフローの `environment: name:` と実際のEnvironment名が一致しているか

3. **Secretの値の確認**
   - JSON形式が正しいか
   - 前後の空白がないか
   - 改行が含まれているか





