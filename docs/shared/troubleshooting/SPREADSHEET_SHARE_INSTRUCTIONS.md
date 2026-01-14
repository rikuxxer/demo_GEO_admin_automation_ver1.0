# スプレッドシート共有設定手順

## 📋 サービスアカウント情報

以下のサービスアカウントが確認されました：

1. `universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`
2. `universegeo-backend-sa@univere-geo-demo.iam.gserviceaccount.com`

## 🔍 Cloud Runで使用しているサービスアカウントを確認

まず、実際にCloud Runで使用しているサービスアカウントを確認してください：

### 方法1: Google Cloud Consoleで確認

1. [Google Cloud Console](https://console.cloud.google.com/)を開く
2. **Cloud Run** > **universegeo-backend** を選択
3. **編集と新しいリビジョンのデプロイ** をクリック
4. **セキュリティ** タブを開く
5. **サービスアカウント** の値を確認

### 方法2: gcloudコマンドで確認（Cloud Shell）

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.serviceAccountName)'
```

## 📝 スプレッドシートへの共有手順

### ステップ1: Googleスプレッドシートを開く

1. スプレッドシートを開く
2. 右上の **共有** ボタンをクリック

### ステップ2: サービスアカウントを追加

1. **ユーザーやグループを追加** の欄に、以下のいずれかのサービスアカウントのメールアドレスを入力：

   **推奨（Cloud Runで使用している可能性が高い）:**
   ```
   universegeo-backend-sa@univere-geo-demo.iam.gserviceaccount.com
   ```

   **または:**
   ```
   universegeo-backend@univere-geo-demo.iam.gserviceaccount.com
   ```

2. **権限** を **編集者** に設定
3. **通知を送信しない** にチェック（サービスアカウントには通知不要）
4. **送信** をクリック

### ステップ3: 確認

共有が完了すると、サービスアカウントがスプレッドシートの共有ユーザー一覧に表示されます。

## ⚠️ 注意事項

- サービスアカウントのメールアドレスは正確に入力してください
- 権限は **編集者** 以上が必要です（閲覧者のみでは書き込みできません）
- 共有後、数秒待ってからテストを実行してください

## 🧪 テスト

共有設定完了後：

1. バックエンドを再デプロイ（既に完了している場合）
2. `test-spreadsheet-export.html` でテストを実行
3. スプレッドシートにデータが追加されているか確認

## 🔍 トラブルシューティング

### エラー: "PERMISSION_DENIED" または "403"

- サービスアカウントが正しく共有されているか確認
- 権限が **編集者** 以上であることを確認
- サービスアカウントのメールアドレスが正確か確認

### エラー: "NOT_FOUND" または "404"

- `GOOGLE_SPREADSHEET_ID` が正しいか確認
- スプレッドシートが削除されていないか確認

### どちらのサービスアカウントを使用すべきか

Cloud Runの設定を確認して、実際に使用しているサービスアカウントを特定してください。
両方のサービスアカウントに共有しても問題ありません（安全です）。

