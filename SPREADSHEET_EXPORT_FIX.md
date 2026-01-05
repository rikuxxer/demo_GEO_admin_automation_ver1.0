# スプレッドシート書き出し機能の権限エラー解決ガイド

## 🔍 エラー: "The caller does not have permission"

このエラーは、Google Sheets APIへのアクセス権限がないことを示しています。

## ✅ 重要なポイント

**現在の実装では、APIキーは使用されていません。**
- ❌ `GOOGLE_SHEETS_API_KEY` は**不要**です（設定されていても使用されません）
- ✅ **サービスアカウント認証**を使用しています
- ✅ スプレッドシートに**サービスアカウントを共有**する必要があります

## 📋 必要な設定

### 1. 環境変数（GitHub Environment Secrets）

以下の環境変数が設定されている必要があります：

- ✅ `GOOGLE_SPREADSHEET_ID`: スプレッドシートのID（必須）
- ✅ `GOOGLE_SHEET_NAME`: シート名（オプション、デフォルト: `シート1`）
- ❌ `GOOGLE_SHEETS_API_KEY`: **不要**（削除可能）

### 2. スプレッドシートへの共有設定（重要）

**これが最も重要です。** スプレッドシートにサービスアカウントを共有する必要があります。

#### ステップ1: Cloud Runで使用しているサービスアカウントを確認

Cloud Shellで実行：

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.serviceAccountName)'
```

出力例：
- `universegeo-backend-sa@univere-geo-demo.iam.gserviceaccount.com`
- `universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`
- または、デフォルトサービスアカウント: `223225164238-compute@developer.gserviceaccount.com`

#### ステップ2: バックエンドのログでサービスアカウントを確認

バックエンドが再デプロイされた後、ログを確認：

```bash
gcloud run services logs read universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --limit 50
```

ログに以下のような出力が表示されます：
```
🔐 Google Sheets API認証情報: {
  projectId: 'univere-geo-demo',
  serviceAccountEmail: 'universegeo-backend-sa@univere-geo-demo.iam.gserviceaccount.com',
  spreadsheetId: '...',
  sheetName: 'シート1'
}
```

#### ステップ3: スプレッドシートにサービスアカウントを共有

1. Googleスプレッドシートを開く
2. 右上の**「共有」**ボタンをクリック
3. **「ユーザーやグループを追加」**の欄に、ステップ1またはステップ2で確認したサービスアカウントのメールアドレスを入力
   - 例: `universegeo-backend-sa@univere-geo-demo.iam.gserviceaccount.com`
4. **権限**を**「編集者」**に設定
5. **「通知を送信しない」**にチェック（サービスアカウントには通知不要）
6. **「送信」**をクリック

### 3. 両方のサービスアカウントに共有（推奨）

どちらのサービスアカウントが使用されているか不明な場合は、両方に共有しても問題ありません：

1. `universegeo-backend-sa@univere-geo-demo.iam.gserviceaccount.com`
2. `universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`

## 🧪 テスト手順

1. バックエンドが再デプロイされていることを確認
2. スプレッドシートにサービスアカウントを共有（編集者権限）
3. 数秒待つ（共有設定が反映されるまで）
4. `test-spreadsheet-export.html`でテストを実行
5. バックエンドのログでサービスアカウントのメールアドレスを確認

## 🔍 トラブルシューティング

### エラー: "The caller does not have permission"

**原因**: スプレッドシートにサービスアカウントが共有されていない、または権限が不足している

**対処法**:
1. バックエンドのログでサービスアカウントのメールアドレスを確認
2. そのメールアドレスをスプレッドシートに共有（編集者権限）
3. 共有後、数秒待ってから再度テスト

### エラー: "NOT_FOUND" または "404"

**原因**: スプレッドシートIDが間違っている、またはスプレッドシートが削除されている

**対処法**:
1. `GOOGLE_SPREADSHEET_ID`が正しいか確認
2. スプレッドシートが存在するか確認

### APIキーについて

**重要**: 現在の実装では、APIキーは使用されていません。
- `GOOGLE_SHEETS_API_KEY`は設定不要です
- サービスアカウント認証を使用しています
- スプレッドシートへの共有設定が必須です

## 📝 チェックリスト

- [ ] `GOOGLE_SPREADSHEET_ID`が設定されている
- [ ] `GOOGLE_SHEET_NAME`が設定されている（オプション）
- [ ] Cloud Runで使用しているサービスアカウントを確認
- [ ] スプレッドシートにサービスアカウントを共有（編集者権限）
- [ ] バックエンドが再デプロイされている
- [ ] バックエンドのログでサービスアカウントのメールアドレスを確認
- [ ] テストを実行

## 🎯 まとめ

1. **APIキーは不要** - サービスアカウント認証を使用
2. **スプレッドシートへの共有が必須** - サービスアカウントに編集者権限を付与
3. **バックエンドのログで確認** - 実際に使用しているサービスアカウントのメールアドレスを確認

