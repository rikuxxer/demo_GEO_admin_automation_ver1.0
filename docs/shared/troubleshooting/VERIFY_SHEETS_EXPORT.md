# スプレッドシートエクスポート機能の確認手順

## 📋 確認項目

### 1. バックエンドの環境変数確認（Cloud Run）

バックエンドサービスに以下の環境変数が設定されているか確認してください：

```bash
# Cloud Runサービスの環境変数を確認
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --format="value(spec.template.spec.containers[0].env)" \
  --project YOUR_PROJECT_ID
```

**必要な環境変数：**
- ✅ `GOOGLE_SPREADSHEET_ID` - Google Sheets スプレッドシートID
- ✅ `GOOGLE_SHEETS_API_KEY` - Google Sheets API キー
- ✅ `GOOGLE_SHEET_NAME` - シート名（デフォルト: `シート1`）

### 2. GitHub Secretsの確認

**Environment secrets** に以下が設定されているか確認：

1. GitHubリポジトリの **Settings > Environments > Environment secrets** を開く
2. 以下のシークレットが存在するか確認：
   - `GOOGLE_SPREADSHEET_ID`
   - `GOOGLE_SHEETS_API_KEY`
   - `GOOGLE_SHEET_NAME`（オプション、デフォルト: `シート1`）

### 3. フロントエンドの環境変数確認（ビルド時）

フロントエンドのビルド時に以下の環境変数が設定されているか確認：

**GitHub Secrets（Environment secrets）:**
- `VITE_GOOGLE_SPREADSHEET_ID`（バックエンド未使用時のみ）
- `VITE_GOOGLE_SHEETS_API_KEY`（バックエンド未使用時のみ）

**注意:** 現在の実装では、フロントエンドはバックエンドAPI経由でスプレッドシートにエクスポートするため、これらの環境変数は通常不要です。

## 🧪 動作確認方法

### 方法1: フロントエンドから直接テスト

1. **フロントエンドアプリケーションにアクセス**
   - デプロイされたフロントエンドURLを開く

2. **プロジェクト詳細ページで地点を格納**
   - プロジェクトを選択
   - セグメントに地点（POI）を追加
   - 「地点格納依頼」を実行
   - **営業ユーザー（`role: 'sales'`）でログインしている必要があります**

3. **コンソールログを確認**
   - ブラウザの開発者ツール（F12）を開く
   - Consoleタブで以下のログを確認：
     ```
     📊 スプレッドシートに出力中...
     📤 バックエンドAPI経由でスプレッドシートに送信: {...}
     ✅ スプレッドシートに追加成功: {...}
     ```

4. **スプレッドシートを確認**
   - Google Sheetsを開く
   - 新しい行が追加されているか確認

### 方法2: バックエンドAPIを直接テスト

```bash
# バックエンドURLを取得
BACKEND_URL="https://universegeo-backend-i5xw76aisq-an.a.run.app"

# テストデータを送信
curl -X POST "${BACKEND_URL}/api/sheets/export" \
  -H "Content-Type: application/json" \
  -d '{
    "rows": [
      {
        "半径": "500",
        "brand_name": "テストブランド",
        "poi_id": "TEST-001",
        "poi_name": "テスト地点",
        "latitude": 35.6812,
        "longitude": 139.7671,
        "prefecture": "東京都",
        "city": "千代田区",
        "setting_flag": "1",
        "created": "2024-12-18"
      }
    ]
  }'
```

**期待される応答：**
```json
{
  "success": true,
  "message": "1件のデータをスプレッドシートに追加しました",
  "rowsAdded": 1
}
```

### 方法3: ブラウザの開発者ツールで確認

1. **フロントエンドアプリケーションを開く**
2. **開発者ツール（F12）を開く**
3. **Networkタブを開く**
4. **地点格納依頼を実行**
5. **`/api/sheets/export` リクエストを確認**
   - ステータスコード: `200 OK`
   - レスポンス: `{"success": true, ...}`

## ❌ エラーが発生した場合

### エラー1: "Google Sheets API が設定されていません"

**原因:** バックエンドの環境変数が設定されていない

**解決方法:**
1. GitHub Secrets（Environment secrets）に以下を設定：
   - `GOOGLE_SPREADSHEET_ID`
   - `GOOGLE_SHEETS_API_KEY`
   - `GOOGLE_SHEET_NAME`（オプション）

2. バックエンドを再デプロイ：
   ```bash
   # GitHub Actionsで「Deploy Backend」ワークフローを実行
   ```

### エラー2: "API Error: 403 Forbidden"

**原因:** Google Sheets API キーの権限が不足している

**解決方法:**
1. Google Cloud ConsoleでAPIキーを確認
2. Google Sheets APIが有効になっているか確認
3. APIキーの制限を確認（IPアドレス制限など）

### エラー3: "API Error: 404 Not Found"

**原因:** スプレッドシートIDまたはシート名が間違っている

**解決方法:**
1. スプレッドシートIDを確認
2. シート名が正しいか確認（デフォルト: `シート1`）
3. スプレッドシートが存在するか確認

### エラー4: "rows must be an array"

**原因:** リクエストボディの形式が間違っている

**解決方法:**
- リクエストボディが `{"rows": [...]}` の形式であることを確認

## ✅ 成功の確認

以下の条件が満たされていれば成功です：

1. ✅ バックエンドAPIが `200 OK` を返す
2. ✅ レスポンスに `"success": true` が含まれる
3. ✅ スプレッドシートに新しい行が追加される
4. ✅ コンソールログに `✅ スプレッドシートに追加成功` が表示される

## 📝 データ形式

スプレッドシートに追加されるデータの形式：

| 列名 | 説明 | 例 |
|------|------|-----|
| 半径 | 指定半径 | `500` |
| brand_name | ブランド名 | `テストブランド` |
| poi_id | 地点ID | `POI-001` |
| poi_name | 地点名 | `テスト地点` |
| latitude | 緯度 | `35.6812` |
| longitude | 経度 | `139.7671` |
| prefecture | 都道府県 | `東京都` |
| city | 市区町村 | `千代田区` |
| setting_flag | 設定フラグ | `1` |
| created | 作成日 | `2024-12-18` |

## 🔍 トラブルシューティング

### ログの確認方法

**バックエンドログ（Cloud Run）:**
```bash
gcloud run services logs read universegeo-backend \
  --region asia-northeast1 \
  --limit 50 \
  --project YOUR_PROJECT_ID
```

**フロントエンドログ（ブラウザ）:**
- 開発者ツール（F12）> Consoleタブ
- エラーメッセージを確認

### よくある問題

1. **環境変数が設定されていない**
   - GitHub Secretsを確認
   - バックエンドを再デプロイ

2. **APIキーの権限不足**
   - Google Cloud ConsoleでAPIキーを確認
   - Google Sheets APIが有効になっているか確認

3. **スプレッドシートが見つからない**
   - スプレッドシートIDを確認
   - シート名が正しいか確認

4. **CORSエラー**
   - バックエンドのCORS設定を確認
   - フロントエンドURLが正しく設定されているか確認







