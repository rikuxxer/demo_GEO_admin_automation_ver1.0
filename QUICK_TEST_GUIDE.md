# スプレッドシート書き出しテスト - クイックガイド

## 🚀 デプロイ完了後のテスト手順

### ステップ1: バックエンドURLの確認

GitHub ActionsのデプロイログからバックエンドURLを確認するか、以下で確認：

```bash
# Cloud Shellで実行
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(status.url)'
```

または、GitHub Actionsのデプロイログで「Backend deployed to:」の後のURLを確認

### ステップ2: HTMLファイルでテスト

1. `test-spreadsheet-export.html` をブラウザで開く（`file://`でOK - CORS修正済み）
2. バックエンドURLを入力
3. 「サンプルデータ生成」をクリック
4. 「テスト実行」をクリック
5. 結果を確認

### ステップ3: Preflightテスト（オプション）

PowerShellで実行：

```powershell
.\test-cors-preflight.ps1 -BackendUrl "YOUR_BACKEND_URL"
```

## ✅ 期待される結果

### 成功時
```json
{
  "success": true,
  "message": "1件のデータをスプレッドシートに追加しました",
  "rowsAdded": 1
}
```

### エラー時
- 環境変数が設定されていない場合: `"Google Sheets API が設定されていません"`
- スプレッドシートIDが間違っている場合: `"Google Sheets API error: 400"`
- APIキーに権限がない場合: `"Google Sheets API error: 403"`

## 🔍 トラブルシューティング

### CORSエラーが続く場合

1. バックエンドが再デプロイされているか確認
2. ブラウザのキャッシュをクリア
3. 開発者ツール（F12）のNetworkタブでリクエストを確認

### 環境変数エラーが表示される場合

GitHub Environment Secretsに以下が設定されているか確認：
- `GOOGLE_SPREADSHEET_ID`
- `GOOGLE_SHEETS_API_KEY`
- `GOOGLE_SHEET_NAME`（オプション）

