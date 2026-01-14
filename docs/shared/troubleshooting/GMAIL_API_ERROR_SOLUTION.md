# Gmail API 有効化エラーの解決方法

## ✅ 解決済み

正しいサービス名は `gmail.googleapis.com` です（`gmail-api.googleapis.com` ではありません）。

```bash
# 正しいコマンド
gcloud services enable gmail.googleapis.com --project=univere-geo-demo
```

## エラー内容（過去のエラー）

```
ERROR: (gcloud.services.enable) PERMISSION_DENIED: Not found or permission denied for service(s): gmail-api.googleapis.com.
SERVICE_CONFIG_NOT_FOUND_OR_PERMISSION_DENIED
```

**原因**: サービス名が間違っていました（`gmail-api.googleapis.com` → `gmail.googleapis.com`）

## 原因

Gmail APIは、以下の理由で有効化できない場合があります：

1. **Google Workspaceアカウントが必要**: Gmail APIは個人のGoogleアカウントでは制限がある場合があります
2. **プロジェクトの種類**: 一部のプロジェクトタイプではGmail APIが利用できない場合があります
3. **APIの可用性**: 地域やプロジェクト設定によっては利用できない場合があります

## 解決方法

### オプション1: Google Cloud Consoleから有効化を試す

1. [Google Cloud Console](https://console.cloud.google.com/)を開く
2. プロジェクト `univere-geo-demo` を選択
3. **APIとサービス** > **ライブラリ** を開く
4. 検索ボックスに「Gmail API」と入力
5. **Gmail API** をクリック
6. **有効にする** ボタンをクリック

もしここでもエラーが出る場合は、Gmail APIがこのプロジェクトで利用できない可能性があります。

### オプション2: SendGridを使用する（推奨）

Gmail APIが利用できない場合は、SendGridを使用することを推奨します。

#### SendGridの利点

- 設定が簡単
- 無料プランあり（1日100通まで）
- パスワードリセット用途では無料プランで十分
- 信頼性が高い
- ドメイン認証不要（初期設定）

#### SendGridのセットアップ手順

1. **SendGridアカウントの作成**
   - [SendGrid](https://sendgrid.com/)にアクセス
   - 無料アカウントを作成（メールアドレスとパスワードで登録）

2. **APIキーの生成**
   - SendGridダッシュボードにログイン
   - **Settings** > **API Keys** を選択
   - **Create API Key** をクリック
   - **API Key Name**: `universegeo-password-reset` など
   - **API Key Permissions**: **Full Access** を選択（または **Restricted Access** で **Mail Send** のみ）
   - **Create & View** をクリック
   - **API Key** をコピー（表示されるのは一度だけなので注意）

3. **送信者認証の設定（推奨）**
   - **Settings** > **Sender Authentication** を選択
   - **Single Sender Verification** を選択（簡単）
   - または **Domain Authentication** を選択（本番環境推奨）

4. **GitHub Environment Secretsに追加**
   - [GitHub Repository Settings](https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments)を開く
   - **Environment secrets** を選択
   - 以下のSecretsを追加：
     - `EMAIL_SERVICE`: `sendgrid`
     - `SENDGRID_API_KEY`: コピーしたAPIキー（`SG.`で始まる文字列）
     - `SENDGRID_FROM_EMAIL`: 送信者メールアドレス（例: `noreply@yourdomain.com` または SendGridで認証したメールアドレス）

### オプション3: Gmail SMTPを使用する（代替案）

Gmail APIの代わりに、Gmail SMTPを使用することも可能ですが、実装の変更が必要です。

## 推奨される対応

**Gmail APIが利用できない場合は、SendGridを使用することを強く推奨します。**

理由：
- パスワードリセット用途では1日100通の無料枠で十分
- 設定が簡単で、すぐに使用可能
- 信頼性が高く、本番環境でも問題なく動作
- Gmail APIのような制限がない

## SendGrid設定後の次のステップ

1. GitHub Environment Secretsを更新：
   - `EMAIL_SERVICE`: `sendgrid` に変更
   - `SENDGRID_API_KEY`: SendGridのAPIキーを追加
   - `SENDGRID_FROM_EMAIL`: 送信者メールアドレスを追加

2. バックエンドを再デプロイ

3. 動作確認

詳細は `PASSWORD_RESET_SETUP.md` の「オプションB: SendGridを使用」セクションを参照してください。

