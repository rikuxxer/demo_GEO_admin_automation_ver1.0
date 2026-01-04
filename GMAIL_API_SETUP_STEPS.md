# Gmail API セットアップ手順

## ✅ 完了済み
- [x] `password_reset_tokens`テーブルの作成
- [x] GitHub Environment Secretsに`EMAIL_SERVICE=gmail`を設定
- [x] GitHub Environment Secretsに`FRONTEND_URL`を設定

## 📋 次のステップ

### ステップ1: Gmail APIを有効化

Cloud ShellまたはGoogle Cloud Consoleで実行：

#### 方法A: Cloud Shellで実行（推奨）

```bash
# Cloud Shellを開く
# https://console.cloud.google.com/cloudshell

# Gmail APIを有効化
gcloud services enable gmail-api.googleapis.com --project=univere-geo-demo

# 有効化の確認
gcloud services list --enabled --project=univere-geo-demo | grep gmail
```

#### 方法B: Google Cloud Consoleで実行

1. [Google Cloud Console](https://console.cloud.google.com/)を開く
2. プロジェクト `univere-geo-demo` を選択
3. 左メニューから **APIとサービス** > **ライブラリ** を選択
4. 検索ボックスに「Gmail API」と入力
5. **Gmail API** をクリック
6. **有効にする** ボタンをクリック
7. 「APIが有効になりました」と表示されるのを確認

### ステップ2: サービスアカウントにGmail送信権限を付与

Cloud Runで使用しているサービスアカウントにGmail APIの権限を付与します。

#### 方法A: Google Cloud Consoleで実行

1. [Google Cloud Console](https://console.cloud.google.com/)を開く
2. **IAM & Admin** > **Service Accounts** を選択
3. Cloud Runで使用しているサービスアカウントを探す
   - 通常は `universegeo-backend@univere-geo-demo.iam.gserviceaccount.com` のような形式
   - または、Cloud Runサービスの設定で確認可能
4. サービスアカウントをクリック
5. **権限** タブを開く
6. **権限を付与** ボタンをクリック
7. **新しいプリンシパル** にサービスアカウントのメールアドレスを入力（既に入力されている）
8. **ロールを選択** で以下を検索・選択：
   - `Gmail API ユーザー` または
   - `Service Account User` + カスタムロールで `gmail.send` 権限
9. **保存** をクリック

#### 方法B: gcloud CLIで実行

```bash
# Cloud Runで使用しているサービスアカウントのメールアドレスを確認
# Cloud Runサービスの設定から確認するか、以下で一覧表示
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.serviceAccountName)'

# サービスアカウントにGmail API ユーザーロールを付与
# （サービスアカウントのメールアドレスを SERVICE_ACCOUNT_EMAIL に置き換える）
SERVICE_ACCOUNT_EMAIL="your-service-account@univere-geo-demo.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding univere-geo-demo \
  --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
  --role="roles/gmail.api" \
  --condition=None
```

**注意**: Gmail APIには専用のロールがない場合があります。その場合は、サービスアカウントに適切な権限を付与する必要があります。

### ステップ3: Cloud Runサービスアカウントの確認

Cloud Runサービスが使用しているサービスアカウントを確認：

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.serviceAccountName)'
```

サービスアカウントが設定されていない場合は、デフォルトのCompute Engineサービスアカウントが使用されます。

### ステップ4: バックエンドの再デプロイ

環境変数が設定されたので、バックエンドを再デプロイします。

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

### ステップ5: 動作確認

1. **ログイン画面でテスト**
   - ログイン画面を開く
   - 「パスワードを忘れた場合」をクリック
   - 登録済みのメールアドレスを入力
   - 申請を送信

2. **バックエンドのログを確認**
   ```bash
   gcloud run services logs read universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --limit 50
   ```
   
   以下のようなログが表示されることを確認：
   - `✅ Gmail API経由でメールを送信しました: [メールアドレス]`
   - または、エラーメッセージ（設定に問題がある場合）

3. **メールの確認**
   - メールボックスを確認
   - パスワードリセットリンクが含まれているか確認

4. **パスワードリセットの実行**
   - メール内のリンクをクリック
   - 新しいパスワードを入力
   - パスワードをリセット

5. **ログイン確認**
   - 新しいパスワードでログインできるか確認

## 🐛 トラブルシューティング

### Gmail APIが有効化されない

- プロジェクトIDが正しいか確認: `univere-geo-demo`
- 必要な権限があるか確認（プロジェクトのオーナーまたは編集者）

### サービスアカウントに権限を付与できない

- サービスアカウントのメールアドレスが正しいか確認
- IAM権限があるか確認（プロジェクトのオーナーまたはIAM管理者）

### メールが送信されない

1. **バックエンドのログを確認**
   ```bash
   gcloud run services logs read universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --limit 100
   ```

2. **環境変数の確認**
   ```bash
   gcloud run services describe universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --format='value(spec.template.spec.containers[0].env)'
   ```
   
   `EMAIL_SERVICE=gmail` が設定されているか確認

3. **Gmail APIの有効化確認**
   ```bash
   gcloud services list --enabled --project=univere-geo-demo | grep gmail
   ```

4. **サービスアカウントの権限確認**
   - Google Cloud Console > IAM & Admin > Service Accounts
   - サービスアカウントを選択 > 権限タブ
   - Gmail API関連の権限があるか確認

### エラーメッセージ: "Permission denied" または "403 Forbidden"

- サービスアカウントにGmail APIの権限が付与されているか確認
- Gmail APIが有効化されているか確認
- サービスアカウントが正しく設定されているか確認

## 📝 次のステップ

上記の手順を完了後、パスワードリセット機能が本番環境で使用可能になります。

