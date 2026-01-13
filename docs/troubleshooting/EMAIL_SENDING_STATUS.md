# メール送信機能の現状確認

## ✅ 完了済み

1. **コードの修正**
   - ✅ 登録されているメールアドレスに送信するように修正済み
   - ✅ バックエンドとフロントエンドの両方で実装済み

2. **GitHub Environment Secrets**
   - ✅ `EMAIL_SERVICE=gmail` 設定済み
   - ✅ `FRONTEND_URL` 設定済み

3. **Gmail APIの有効化**
   - ✅ `gmail.googleapis.com` 有効化済み

4. **デプロイワークフロー**
   - ✅ `.github/workflows/deploy-backend.yml` に `EMAIL_SERVICE` と `FRONTEND_URL` が含まれている

## ⚠️ まだ完了していない設定

### 1. サービスアカウントへのGmail API権限付与（重要）

現在の実装では、Cloud RunのサービスアカウントがGmail APIを使用してメールを送信しようとしますが、**サービスアカウントにGmail APIの権限が付与されていない可能性があります**。

#### 確認方法

```bash
# Cloud Runで使用しているサービスアカウントを確認
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.serviceAccountName)'
```

#### 設定方法

**重要**: Gmail APIでメールを送信するには、以下のいずれかの方法が必要です：

**方法A: ドメイン全体の委任（推奨）**

1. Google Workspace管理者に依頼して、サービスアカウントにドメイン全体の委任を設定
2. これにより、サービスアカウントが特定のユーザーアカウントの代わりにメールを送信可能

**方法B: OAuth 2.0認証（代替案）**

1. OAuth 2.0認証情報を作成
2. 実際のGmailアカウントで認証
3. アクセストークンを保存して使用

**方法C: SendGridに切り替え（最も簡単）**

Gmail APIの設定が複雑な場合は、SendGridを使用することをお勧めします：

1. SendGridでアカウント作成（無料プランでOK）
2. APIキーを生成
3. GitHub Environment Secretsに以下を追加：
   - `EMAIL_SERVICE=sendgrid`
   - `SENDGRID_API_KEY=SG.xxxxxxxxxxxxx`
   - `SENDGRID_FROM_EMAIL=noreply@yourdomain.com`

### 2. バックエンドの再デプロイ

環境変数（`EMAIL_SERVICE`、`FRONTEND_URL`）を反映するため、バックエンドを再デプロイする必要があります。

#### 方法A: GitHub Actionsで自動デプロイ

1. リポジトリに変更をpushするか
2. GitHub Actionsから手動でワークフローを実行：
   - **Actions** タブを開く
   - **Deploy Backend to Cloud Run** ワークフローを選択
   - **Run workflow** をクリック

#### 方法B: 手動でデプロイ

```bash
cd backend
gcloud run deploy universegeo-backend \
  --source . \
  --region asia-northeast1 \
  --project univere-geo-demo
```

## 🔍 動作確認方法

### 1. 環境変数の確認

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.containers[0].env)'
```

以下が設定されていることを確認：
- `EMAIL_SERVICE=gmail`
- `FRONTEND_URL=https://your-frontend-url.com`

### 2. パスワードリセット申請のテスト

1. ログイン画面で「パスワードを忘れた場合」をクリック
2. 登録済みのメールアドレスを入力
3. 申請を送信

### 3. バックエンドのログを確認

```bash
gcloud run services logs read universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --limit 50
```

以下のようなログが表示されることを確認：
- `✅ Gmail API経由でメールを送信しました: [メールアドレス]`
- または、エラーメッセージ（設定に問題がある場合）

### 4. メールの確認

- メールボックスを確認
- パスワードリセットリンクが含まれているか確認

## ❌ よくあるエラーと対処法

### エラー: "Permission denied" または "403 Forbidden"

**原因**: サービスアカウントにGmail APIの権限が付与されていない

**対処法**:
1. サービスアカウントにGmail APIの権限を付与
2. または、SendGridに切り替え

### エラー: "userId: 'me' is not supported for service accounts"

**原因**: Gmail APIで`userId: 'me'`を使用する場合、サービスアカウントでは動作しません

**対処法**:
1. ドメイン全体の委任を設定
2. または、SendGridに切り替え

### メールが送信されない

**確認事項**:
1. 環境変数が正しく設定されているか
2. Gmail APIが有効化されているか
3. サービスアカウントに適切な権限が付与されているか
4. バックエンドのログでエラーメッセージを確認

## 📝 次のステップ

1. **サービスアカウントへのGmail API権限付与**（またはSendGridに切り替え）
2. **バックエンドの再デプロイ**
3. **動作確認**

完了後、パスワードリセット機能が本番環境で使用可能になります。

