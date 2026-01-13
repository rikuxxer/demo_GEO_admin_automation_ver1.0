# Gmail API サービスアカウント権限設定ガイド

## ✅ 完了済み
- [x] Gmail APIの有効化（`gmail.googleapis.com`）
- [x] アクセストークンの確認

## 📋 次のステップ: サービスアカウントに権限を付与

### ステップ1: Cloud Runで使用しているサービスアカウントを確認

Cloud Shellで実行：

```bash
# Cloud Runサービスで使用しているサービスアカウントを確認
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.serviceAccountName)'
```

出力例：
- `universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`
- または、デフォルトのCompute Engineサービスアカウント: `PROJECT_NUMBER-compute@developer.gserviceaccount.com`
- または、`(default)` と表示される場合（デフォルトサービスアカウントを使用）

### ステップ2: サービスアカウントにGmail送信権限を付与

Gmail APIを使用する場合、サービスアカウントに適切な権限を付与する必要があります。

#### 方法A: IAMロールを付与（推奨）

```bash
# ステップ1で確認したサービスアカウントのメールアドレスを設定
SERVICE_ACCOUNT="your-service-account@univere-geo-demo.iam.gserviceaccount.com"

# サービスアカウントにService Account Userロールを付与
# （Gmail APIはサービスアカウントの認証情報を使用するため）
gcloud projects add-iam-policy-binding univere-geo-demo \
  --member="serviceAccount:${SERVICE_ACCOUNT}" \
  --role="roles/iam.serviceAccountUser" \
  --project=univere-geo-demo
```

**注意**: Gmail APIには専用のIAMロールがないため、サービスアカウントがGmail APIを使用できるようにするには、以下のいずれかが必要です：

1. **サービスアカウントがCloud Runで使用されている場合**: Cloud Runのサービスアカウント設定で自動的に認証されます
2. **OAuth 2.0認証**: サービスアカウントでGmail送信を行う場合、OAuth 2.0認証またはドメイン全体の委任が必要な場合があります

#### 方法B: Google Cloud Consoleで実行

1. [IAM & Admin > Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=univere-geo-demo)を開く
2. Cloud Runで使用しているサービスアカウントを選択
3. **権限**タブを開く
4. **権限を付与**をクリック
5. **新しいプリンシパル**にサービスアカウントのメールアドレスを入力
6. **ロールを選択**で以下を検索・選択：
   - `Service Account User` (`roles/iam.serviceAccountUser`)
7. **保存**をクリック

### ステップ3: Gmail APIのOAuth 2.0認証設定（必要に応じて）

サービスアカウントでGmail送信を行う場合、OAuth 2.0認証の設定が必要な場合があります。

#### OAuth同意画面の設定

1. [APIとサービス > OAuth同意画面](https://console.cloud.google.com/apis/credentials/consent?project=univere-geo-demo)を開く
2. **ユーザータイプ**を選択（外部または内部）
3. アプリ情報を入力
4. **スコープ**で `https://www.googleapis.com/auth/gmail.send` を追加
5. **保存して次へ**をクリック

#### OAuth 2.0認証情報の作成

1. [APIとサービス > 認証情報](https://console.cloud.google.com/apis/credentials?project=univere-geo-demo)を開く
2. **+ 認証情報を作成** > **OAuth クライアント ID**を選択
3. **アプリケーションの種類**: **ウェブアプリケーション**を選択
4. **名前**: `Gmail API Client` など
5. **承認済みのリダイレクト URI**: 必要に応じて設定
6. **作成**をクリック

**注意**: サービスアカウントを使用する場合、OAuth 2.0認証情報は不要な場合があります。まずはサービスアカウントの権限設定のみで試してください。

### ステップ4: 動作確認

1. **バックエンドを再デプロイ**
   - GitHub Actionsで自動デプロイされるか、手動でデプロイ

2. **パスワードリセット申請をテスト**
   - ログイン画面で「パスワードを忘れた場合」をクリック
   - メールアドレスを入力して申請

3. **バックエンドのログを確認**
   ```bash
   gcloud run services logs read universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --limit 50
   ```

   成功時のログ：
   ```
   ✅ Gmail API経由でメールを送信しました: [メールアドレス]
   ```

   エラー時のログ：
   ```
   ❌ Gmail API経由のメール送信に失敗しました: [エラー内容]
   ```

### ステップ5: エラーが発生した場合の対処

#### エラー: "Permission denied" または "403 Forbidden"

- サービスアカウントに適切な権限が付与されているか確認
- Gmail APIが有効化されているか確認
- OAuth 2.0認証の設定が必要な場合があります

#### エラー: "User not found" または "Invalid credentials"

- サービスアカウントの認証情報が正しく設定されているか確認
- Cloud Runのサービスアカウント設定を確認

#### エラー: "Insufficient permissions"

- サービスアカウントに `gmail.send` スコープが付与されているか確認
- OAuth 2.0認証の設定が必要な場合があります

## 📝 注意事項

Gmail APIを使用する場合、以下の点に注意してください：

1. **サービスアカウントでのGmail送信**: サービスアカウントでGmail送信を行う場合、OAuth 2.0認証またはドメイン全体の委任が必要な場合があります
2. **送信元メールアドレス**: サービスアカウントのメールアドレスから送信されるため、受信者に正しく表示されない場合があります
3. **代替案**: より簡単な設定で確実に動作するSendGridの使用も検討してください

## 🚀 次のステップ

サービスアカウントに権限を付与した後、バックエンドを再デプロイして動作確認を行ってください。

