# パスワードリセット機能 本番環境対応チェックリスト

## ✅ 完了済み
- [x] `password_reset_tokens`テーブルの作成

## 📋 残りの対応事項

### 1. メール送信サービスの選択と設定

#### オプションA: Gmail API（推奨 - 完全無料）

**手順:**
1. Google Cloud ConsoleでGmail APIを有効化
   ```bash
   # Cloud Shellで実行
   gcloud services enable gmail-api.googleapis.com --project=univere-geo-demo
   ```

2. サービスアカウントにGmail送信権限を付与
   - Google Cloud Console > IAM & Admin > Service Accounts
   - 使用しているサービスアカウントを選択
   - 「権限を付与」> Gmail APIの権限を追加

3. OAuth 2.0認証の設定（必要に応じて）
   - Gmail APIを使用するには、OAuth 2.0認証が必要な場合があります
   - サービスアカウントでGmail送信を行う場合は、ドメイン全体の委任が必要

**環境変数:**
```env
EMAIL_SERVICE=gmail
FRONTEND_URL=https://your-frontend-url.com
```

#### オプションB: SendGrid（設定が簡単）

**手順:**
1. [SendGrid](https://sendgrid.com/)でアカウントを作成（無料プランでOK）
2. APIキーを生成
   - Settings > API Keys > Create API Key
   - 権限: "Mail Send" の "Full Access"
3. 送信者認証を設定（ドメイン認証または単一送信者認証）

**環境変数:**
```env
EMAIL_SERVICE=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=https://your-frontend-url.com
```

### 2. バックエンドの依存関係インストール

```bash
cd backend
npm install
```

これにより、以下のパッケージがインストールされます：
- `@sendgrid/mail` (SendGrid使用時)
- `googleapis` (Gmail API使用時)

### 3. 環境変数の設定

#### 方法A: Cloud Runに直接設定（即座に反映）

```bash
gcloud run services update universegeo-backend \
  --set-env-vars EMAIL_SERVICE=sendgrid \
  --set-env-vars SENDGRID_API_KEY=your-sendgrid-api-key \
  --set-env-vars SENDGRID_FROM_EMAIL=noreply@yourdomain.com \
  --set-env-vars FRONTEND_URL=https://your-frontend-url.com \
  --region asia-northeast1 \
  --project univere-geo-demo
```

#### 方法B: GitHub Environment Secretsに追加（推奨）

1. [GitHub Repository Settings](https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments)を開く
2. **Environment secrets**（または`production`環境）を選択
3. 以下のSecretsを追加：
   - `EMAIL_SERVICE`: `sendgrid` または `gmail`
   - `SENDGRID_API_KEY`: （SendGrid使用時のみ）
   - `SENDGRID_FROM_EMAIL`: （SendGrid使用時のみ）
   - `FRONTEND_URL`: フロントエンドのURL（既に設定済みの可能性あり）

### 4. デプロイワークフローの更新

`.github/workflows/deploy-backend.yml`に環境変数を追加する必要があります。

現在のワークフローを確認し、以下の環境変数が含まれているか確認：
- `EMAIL_SERVICE`
- `SENDGRID_API_KEY`（SendGrid使用時）
- `SENDGRID_FROM_EMAIL`（SendGrid使用時）
- `FRONTEND_URL`（既に設定済みの可能性あり）

### 5. バックエンドの再デプロイ

環境変数を設定した後、バックエンドを再デプロイ：

```bash
# GitHub Actions経由で自動デプロイされる場合
# または手動でデプロイ
cd backend
gcloud run deploy universegeo-backend \
  --source . \
  --region asia-northeast1 \
  --project univere-geo-demo
```

### 6. 動作確認

1. **ログイン画面でテスト**
   - ログイン画面で「パスワードを忘れた場合」をクリック
   - 登録済みのメールアドレスを入力
   - 申請を送信

2. **メールの確認**
   - メールボックスを確認
   - パスワードリセットリンクが含まれているか確認

3. **パスワードリセットの実行**
   - メール内のリンクをクリック
   - 新しいパスワードを入力
   - パスワードをリセット

4. **ログイン確認**
   - 新しいパスワードでログインできるか確認

### 7. トラブルシューティング

#### メールが送信されない場合

1. **バックエンドのログを確認**
   ```bash
   gcloud run services logs read universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --limit 50
   ```

2. **環境変数の確認**
   ```bash
   gcloud run services describe universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --format='value(spec.template.spec.containers[0].env)'
   ```

3. **SendGrid APIキーの確認**
   - SendGridダッシュボードでAPIキーが有効か確認
   - 送信者認証が完了しているか確認

4. **Gmail APIの確認**
   - Gmail APIが有効化されているか確認
   - サービスアカウントに適切な権限が付与されているか確認

#### トークンが無効と表示される場合

1. BigQueryの`password_reset_tokens`テーブルを確認
2. トークンの有効期限（24時間）を確認
3. トークンが既に使用されていないか確認

## 📝 次のステップ

1. メール送信サービスを選択（Gmail API または SendGrid）
2. 環境変数を設定
3. バックエンドを再デプロイ
4. 動作確認

完了後、パスワードリセット機能が本番環境で使用可能になります。

