# SendGrid設定ガイド（Google Workspace不要）

Google Workspaceを利用しない場合、Gmail APIの設定が複雑なため、**SendGridを使用することを強く推奨します**。

SendGridは無料プランで月1,000通まで送信可能で、設定が簡単です。

## 📋 設定手順

### ステップ1: SendGridアカウントの作成

1. [SendGrid](https://sendgrid.com/)にアクセス
2. **「無料で始める」** をクリック
3. アカウント情報を入力して登録
4. メールアドレスを確認（確認メールが届きます）

### ステップ2: APIキーの生成

1. SendGridダッシュボードにログイン
2. 左メニューから **Settings** > **API Keys** を選択
3. **Create API Key** をクリック
4. 以下の設定を入力：
   - **API Key Name**: `universegeo-password-reset`（任意の名前）
   - **API Key Permissions**: **Full Access** を選択（または **Restricted Access** で **Mail Send** の **Full Access** を選択）
5. **Create & View** をクリック
6. **重要**: 表示されたAPIキーをコピー（後で再表示できません）
   - 例: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

### ステップ3: 送信者認証の設定

SendGridでメールを送信するには、送信者認証が必要です。

#### オプションA: 単一送信者認証（最も簡単）

1. SendGridダッシュボードで **Settings** > **Sender Authentication** を選択
2. **Single Sender Verification** をクリック
3. **Create Sender** をクリック
4. 以下の情報を入力：
   - **From Email Address**: 送信元メールアドレス（例: `noreply@yourdomain.com`）
   - **From Name**: 送信者名（例: `UNIVERSEGEO案件管理システム`）
   - **Reply To**: 返信先メールアドレス（任意）
   - **Company Address**: 会社の住所
   - **Company Website**: 会社のウェブサイト
5. **Create** をクリック
6. 確認メールが送信されるので、メール内のリンクをクリックして認証

#### オプションB: ドメイン認証（推奨 - より信頼性が高い）

1. SendGridダッシュボードで **Settings** > **Sender Authentication** を選択
2. **Domain Authentication** をクリック
3. **Authenticate Your Domain** をクリック
4. ドメイン名を入力（例: `yourdomain.com`）
5. DNSレコードを追加（SendGridが提供するDNSレコードをドメインのDNS設定に追加）
6. **Verify** をクリックして認証

### ステップ4: GitHub Environment Secretsに追加

1. [GitHub Repository Settings](https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments)を開く
2. **Environment secrets**（または`production`環境）を選択
3. 以下のSecretsを追加：

   **既存のSecretsを更新:**
   - `EMAIL_SERVICE`: `sendgrid`（既に`gmail`が設定されている場合は更新）

   **新しいSecretsを追加:**
   - `SENDGRID_API_KEY`: SendGridのAPIキー（ステップ2でコピーしたもの）
     - 例: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - `SENDGRID_FROM_EMAIL`: 送信元メールアドレス（ステップ3で認証したメールアドレス）
     - 例: `noreply@yourdomain.com`

   **既存のSecrets（確認）:**
   - `FRONTEND_URL`: フロントエンドのURL（既に設定済みの可能性あり）

### ステップ5: バックエンドの再デプロイ

環境変数を反映するため、バックエンドを再デプロイします。

#### 方法A: GitHub Actionsで自動デプロイ（推奨）

1. リポジトリに何か変更をpushするか
2. GitHub Actionsから手動でワークフローを実行：
   - **Actions** タブを開く
   - **Deploy Backend to Cloud Run** ワークフローを選択
   - **Run workflow** をクリック
   - **Run workflow** ボタンをクリック

#### 方法B: 手動でデプロイ

```bash
cd backend
gcloud run deploy universegeo-backend \
  --source . \
  --region asia-northeast1 \
  --project univere-geo-demo
```

### ステップ6: 動作確認

1. **環境変数の確認**

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.containers[0].env)'
```

以下が設定されていることを確認：
- `EMAIL_SERVICE=sendgrid`
- `SENDGRID_API_KEY=SG.xxxxxxxxxxxxx`
- `SENDGRID_FROM_EMAIL=noreply@yourdomain.com`
- `FRONTEND_URL=https://your-frontend-url.com`

2. **パスワードリセット申請のテスト**

   - ログイン画面で「パスワードを忘れた場合」をクリック
   - 登録済みのメールアドレスを入力
   - 申請を送信

3. **バックエンドのログを確認**

```bash
gcloud run services logs read universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --limit 50
```

以下のようなログが表示されることを確認：
- `✅ SendGrid経由でメールを送信しました: [メールアドレス]`
- または、エラーメッセージ（設定に問題がある場合）

4. **メールの確認**

   - メールボックスを確認
   - パスワードリセットリンクが含まれているか確認

## 🐛 トラブルシューティング

### エラー: "SENDGRID_API_KEY環境変数が設定されていません"

**原因**: GitHub Environment Secretsに`SENDGRID_API_KEY`が設定されていない、またはバックエンドが再デプロイされていない

**対処法**:
1. GitHub Environment Secretsに`SENDGRID_API_KEY`が設定されているか確認
2. バックエンドを再デプロイ

### エラー: "The from address does not match a verified Sender Identity"

**原因**: `SENDGRID_FROM_EMAIL`で指定したメールアドレスがSendGridで認証されていない

**対処法**:
1. SendGridダッシュボードで **Settings** > **Sender Authentication** を確認
2. 送信元メールアドレスが認証されているか確認
3. 認証されていない場合は、ステップ3を実行して認証

### メールが送信されない

**確認事項**:
1. SendGridのAPIキーが正しいか確認
2. 送信元メールアドレスが認証されているか確認
3. SendGridのダッシュボードで **Activity** を確認（送信履歴が表示されます）
4. バックエンドのログでエラーメッセージを確認

### SendGridの無料プランの制限

- 月1,000通まで送信可能
- 制限を超えると、追加料金が発生するか、送信が停止されます
- 使用量はSendGridダッシュボードで確認できます

## 📝 まとめ

1. ✅ SendGridアカウントを作成
2. ✅ APIキーを生成
3. ✅ 送信者認証を設定
4. ✅ GitHub Environment Secretsに追加
5. ✅ バックエンドを再デプロイ
6. ✅ 動作確認

完了後、パスワードリセット機能が本番環境で使用可能になります。

