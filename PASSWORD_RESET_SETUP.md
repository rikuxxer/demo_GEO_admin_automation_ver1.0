# パスワードリセット機能のセットアップガイド

## 📋 概要

本番環境でパスワードリセット機能を使用するためのセットアップ手順です。

## 🗄️ 1. BigQueryテーブルの作成

`password_reset_tokens`テーブルを作成する必要があります。

### Cloud Shellで実行

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "password_reset_tokensテーブルを作成中..."
cat > /tmp/password_reset_tokens_schema.json << 'EOF'
[
  {"name": "token_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "user_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "email", "type": "STRING", "mode": "REQUIRED"},
  {"name": "token", "type": "STRING", "mode": "REQUIRED"},
  {"name": "expires_at", "type": "TIMESTAMP", "mode": "REQUIRED"},
  {"name": "used", "type": "BOOL", "mode": "NULLABLE"},
  {"name": "created_at", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
EOF
bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/password_reset_tokens_schema.json "${DATASET_ID}.password_reset_tokens"
echo "✅ password_reset_tokensテーブルを作成しました"
```

または、`FIX_DATASET_NOT_FOUND.md`の一括作成スクリプトを実行してください。

## 📧 2. メール送信サービスの設定

パスワードリセットメールを送信するために、以下のいずれかを設定します。

### オプションA: Gmail APIを使用

1. **Gmail APIを有効化**
   - Google Cloud ConsoleでGmail APIを有効化
   - サービスアカウントにGmail送信権限を付与

2. **環境変数の設定**
   ```env
   EMAIL_SERVICE=gmail
   FRONTEND_URL=https://your-frontend-url.com
   ```

### オプションB: SendGridを使用（推奨）

1. **SendGridアカウントの作成**
   - [SendGrid](https://sendgrid.com/)でアカウントを作成
   - APIキーを生成

2. **パッケージのインストール**
   ```bash
   cd backend
   npm install @sendgrid/mail
   ```

3. **環境変数の設定**
   ```env
   EMAIL_SERVICE=sendgrid
   SENDGRID_API_KEY=your-sendgrid-api-key
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   FRONTEND_URL=https://your-frontend-url.com
   ```

## 🔧 3. バックエンド環境変数の設定

`.env`ファイルまたはCloud Runの環境変数に以下を追加：

```env
# メール送信サービス（gmail または sendgrid）
EMAIL_SERVICE=sendgrid

# SendGrid設定（SendGridを使用する場合）
SENDGRID_API_KEY=your-sendgrid-api-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# フロントエンドURL（リセットリンクの生成に使用）
FRONTEND_URL=https://your-frontend-url.com
```

## 🚀 4. デプロイ

### Cloud Runへのデプロイ

```bash
gcloud run deploy universegeo-backend \
  --source . \
  --region asia-northeast1 \
  --allow-unauthenticated \
  --set-env-vars EMAIL_SERVICE=sendgrid \
  --set-env-vars SENDGRID_API_KEY=your-sendgrid-api-key \
  --set-env-vars SENDGRID_FROM_EMAIL=noreply@yourdomain.com \
  --set-env-vars FRONTEND_URL=https://your-frontend-url.com
```

## ✅ 5. 動作確認

1. ログイン画面で「パスワードを忘れた場合」をクリック
2. メールアドレスを入力
3. メールが送信されることを確認
4. メール内のリンクからパスワードをリセット

## 🔒 セキュリティ注意事項

- リセットトークンは24時間有効
- トークンは1回のみ使用可能
- ユーザーが存在しない場合でも成功メッセージを返す（セキュリティ上の理由）
- メール送信に失敗しても、トークンは生成される（ログを確認して手動で対応可能）

## 🐛 トラブルシューティング

### メールが送信されない

1. 環境変数が正しく設定されているか確認
2. SendGrid APIキーが有効か確認
3. バックエンドのログを確認
4. 開発環境では、ログにリセットURLが出力される

### トークンが無効と表示される

1. トークンの有効期限（24時間）を確認
2. トークンが既に使用されていないか確認
3. BigQueryの`password_reset_tokens`テーブルを確認

