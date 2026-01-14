# Google Sheets API 認証設定ガイド

## 🔍 問題

Google Sheets API v4は**APIキーをサポートしていません**。OAuth2またはサービスアカウント認証が必要です。

エラーメッセージ:
```
API keys are not supported by this API. Expected OAuth2 access token or other authentication credentials that assert a principal.
```

## 解決方法

バックエンドの実装を修正し、**サービスアカウント認証**を使用するように変更しました。

### 変更内容

1. **APIキー認証からサービスアカウント認証に変更**
   - `googleapis`ライブラリを使用
   - Cloud Runのサービスアカウントが自動的に認証に使用される

2. **環境変数の変更**
   - `GOOGLE_SHEETS_API_KEY` は**不要**になりました
   - `GOOGLE_SPREADSHEET_ID` のみ必要です

## 必要な設定

### 1. スプレッドシートへの共有権限を付与

**重要**: Cloud Runのサービスアカウントにスプレッドシートへのアクセス権限を付与する必要があります。

#### ステップ1: Cloud Runのサービスアカウントを確認

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.serviceAccountName)'
```

または、デフォルトのCompute Engineサービスアカウントが使用されている場合：
```
PROJECT_NUMBER-compute@developer.gserviceaccount.com
```

#### ステップ2: スプレッドシートにサービスアカウントを共有

1. Googleスプレッドシートを開く
2. **共有**ボタンをクリック
3. サービスアカウントのメールアドレスを入力
   - 例: `universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`
   - または: `223225164238-compute@developer.gserviceaccount.com`
4. **編集者**権限を付与
5. **送信**をクリック

### 2. 環境変数の確認

GitHub Environment Secretsに以下が設定されていることを確認：

- `GOOGLE_SPREADSHEET_ID`: スプレッドシートのID
- `GOOGLE_SHEET_NAME`: シート名（オプション、デフォルト: `シート1`）
- `GOOGLE_SHEETS_API_KEY`: **不要**（削除可能）

### 3. バックエンドの再デプロイ

変更を反映するため、バックエンドを再デプロイ：

```bash
# GitHub Actionsで自動デプロイ
# または手動でデプロイ
cd backend
gcloud run deploy universegeo-backend \
  --source . \
  --region asia-northeast1 \
  --project univere-geo-demo
```

## 🧪 テスト

デプロイ完了後、`test-spreadsheet-export.html`でテストを実行：

1. バックエンドURLを入力
2. 「サンプルデータ生成」をクリック
3. 「テスト実行」をクリック
4. 結果を確認

### 期待される結果

**成功時:**
```json
{
  "success": true,
  "message": "1件のデータをスプレッドシートに追加しました",
  "rowsAdded": 1
}
```

**エラー時:**

1. **権限エラー（403）**
   - サービスアカウントにスプレッドシートへの共有権限を付与してください

2. **スプレッドシートが見つからない（404）**
   - `GOOGLE_SPREADSHEET_ID`が正しいか確認してください

3. **認証エラー（401）**
   - サービスアカウントの権限を確認してください

## まとめ

1. バックエンドの実装を修正（サービスアカウント認証に変更）
2. スプレッドシートにサービスアカウントを共有（編集者権限）
3. バックエンドを再デプロイ
4. テストを実行

完了後、スプレッドシート書き出し機能が正常に動作します。

