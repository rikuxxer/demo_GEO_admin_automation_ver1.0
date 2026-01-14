# GitHub Secrets トラブルシューティング

## エラー: credentials_json が空

このエラーは、`GCP_SA_KEY`が正しく取得できていない場合に発生します。

## 解決方法

### 方法1: Repository Secretsに設定（推奨）

Environment secretsではなく、**Repository secrets**に設定してください：

1. GitHubリポジトリの **Settings** > **Secrets and variables** > **Actions** を開く
2. **Repository secrets** タブを選択
3. **New repository secret** をクリック
4. 以下のSecretsを追加：

| Secret名 | 説明 |
|---------|------|
| `GCP_PROJECT_ID` | GCPプロジェクトID |
| `GCP_SA_KEY` | GCPサービスアカウントキー（JSON形式） |
| `BQ_DATASET` | BigQueryデータセット名 |
| `GOOGLE_SPREADSHEET_ID` | Google Sheets スプレッドシートID |
| `GOOGLE_SHEETS_API_KEY` | Google Sheets API キー |
| `BACKEND_SERVICE_ACCOUNT` | バックエンド用サービスアカウントメール |
| `GOOGLE_SHEET_NAME` | Google Sheets シート名（オプション） |
| `FRONTEND_URL` | フロントエンドURL（オプション） |

### 方法2: Environment Secretsを確認

Environment secretsを使う場合：

1. **Settings** > **Environments** > **production** を開く
2. **Environment secrets** セクションを確認
3. `GCP_SA_KEY` が存在し、値が正しく設定されているか確認

**重要**: Secretの値は、JSONファイルの内容全体をそのままコピー&ペーストしてください。

## GCP_SA_KEY の取得方法

### 1. サービスアカウントキーをダウンロード

```bash
# サービスアカウントキーをダウンロード
gcloud iam service-accounts keys create key.json \
  --iam-account=your-service-account@your-project.iam.gserviceaccount.com
```

### 2. JSONファイルの内容をコピー

```bash
# Windows PowerShell
Get-Content key.json | Set-Clipboard

# または、ファイルを開いて内容をコピー
```

### 3. GitHub Secretsに貼り付け

- Secret名: `GCP_SA_KEY`
- Secretの値: JSONファイルの内容全体（改行も含む）

## 確認方法

### Repository Secretsの場合

1. Settings > Secrets and variables > Actions
2. Repository secrets タブで確認
3. `GCP_SA_KEY` が存在するか確認

### Environment Secretsの場合

1. Settings > Environments > production
2. Environment secrets セクションで確認
3. `GCP_SA_KEY` が存在するか確認

## 推奨設定

**Repository secrets**を使用することを推奨します：

- より簡単に設定できる
- Environment secretsよりも確実に動作する
- 複数のEnvironmentで同じSecretを使える







