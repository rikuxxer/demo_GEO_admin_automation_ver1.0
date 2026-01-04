# スプレッドシート書き出し機能のテスト手順

## 📋 前提条件

### 必要な環境変数

バックエンド（Cloud Run）に以下の環境変数が設定されている必要があります：

1. **`GOOGLE_SPREADSHEET_ID`**: GoogleスプレッドシートのID
   - スプレッドシートのURLから取得: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
   - 例: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

2. **`GOOGLE_SHEETS_API_KEY`**: Google Sheets APIキー
   - [Google Cloud Console](https://console.cloud.google.com/)で作成
   - APIとサービス > 認証情報 > APIキーを作成
   - Google Sheets APIを有効化

3. **`GOOGLE_SHEET_NAME`** (オプション): シート名
   - デフォルト: `シート1`
   - 複数のシートがある場合は、対象のシート名を指定

### 環境変数の確認方法

```bash
# Cloud Runの環境変数を確認
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.containers[0].env)'
```

または、バックエンドのログで起動時に確認：
```bash
gcloud run services logs read universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --limit 20
```

以下のログが表示されることを確認：
```
GOOGLE_SPREADSHEET_ID: ✅ SET
GOOGLE_SHEETS_API_KEY: ✅ SET
```

## 🧪 テスト方法

### 方法1: フロントエンドからテスト（推奨）

#### ステップ1: プロジェクトとPOIデータの準備

1. アプリケーションにログイン
2. プロジェクトを作成または既存のプロジェクトを開く
3. セグメントを作成
4. POI（地点）を追加
   - **重要**: 営業ユーザー（`role: 'sales'`）でログインしている必要があります
   - TG地点（`poi_category === 'tg'`）のみがスプレッドシートに出力されます

#### ステップ2: 格納依頼を実行

1. プロジェクト詳細画面で「格納依頼」をクリック
2. 営業ユーザーの場合、自動的にスプレッドシートに出力されます
3. コンソールログを確認：
   - `✅ スプレッドシート出力成功: X件のデータをスプレッドシートに追加しました`
   - または、エラーメッセージ

#### ステップ3: スプレッドシートを確認

1. Googleスプレッドシートを開く
2. 指定したシート（デフォルト: `シート1`）を確認
3. データが追加されていることを確認

### 方法2: バックエンドAPIを直接テスト

#### ステップ1: テスト用のデータを準備

```json
{
  "rows": [
    {
      "半径": "500",
      "brand_name": "テストブランド",
      "poi_id": "TEST-001",
      "poi_name": "テスト地点1",
      "latitude": "35.6812",
      "longitude": "139.7671",
      "prefecture": "東京都",
      "city": "千代田区",
      "setting_flag": "1",
      "created": "2024-01-01"
    },
    {
      "半径": "300",
      "brand_name": "テストブランド",
      "poi_id": "TEST-002",
      "poi_name": "テスト地点2",
      "latitude": "35.6896",
      "longitude": "139.6917",
      "prefecture": "東京都",
      "city": "新宿区",
      "setting_flag": "1",
      "created": "2024-01-01"
    }
  ]
}
```

#### ステップ2: APIリクエストを送信

```bash
# バックエンドのURLを取得
BACKEND_URL=$(gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(status.url)')

# APIリクエストを送信
curl -X POST "${BACKEND_URL}/api/sheets/export" \
  -H "Content-Type: application/json" \
  -d '{
    "rows": [
      {
        "半径": "500",
        "brand_name": "テストブランド",
        "poi_id": "TEST-001",
        "poi_name": "テスト地点1",
        "latitude": "35.6812",
        "longitude": "139.7671",
        "prefecture": "東京都",
        "city": "千代田区",
        "setting_flag": "1",
        "created": "2024-01-01"
      }
    ]
  }'
```

#### ステップ3: レスポンスを確認

成功時のレスポンス：
```json
{
  "success": true,
  "message": "1件のデータをスプレッドシートに追加しました",
  "rowsAdded": 1
}
```

エラー時のレスポンス：
```json
{
  "success": false,
  "message": "エラーメッセージ"
}
```

### 方法3: ブラウザの開発者ツールからテスト

1. ブラウザの開発者ツール（F12）を開く
2. **Console**タブを開く
3. 以下のコードを実行：

```javascript
// テスト用のデータ
const testRows = [
  {
    半径: "500",
    brand_name: "テストブランド",
    poi_id: "TEST-001",
    poi_name: "テスト地点1",
    latitude: "35.6812",
    longitude: "139.7671",
    prefecture: "東京都",
    city: "千代田区",
    setting_flag: "1",
    created: new Date().toISOString().split('T')[0]
  }
];

// APIリクエストを送信
fetch('https://your-backend-url/api/sheets/export', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ rows: testRows }),
})
  .then(response => response.json())
  .then(data => {
    console.log('✅ 結果:', data);
  })
  .catch(error => {
    console.error('❌ エラー:', error);
  });
```

## 🔍 トラブルシューティング

### エラー: "Google Sheets API が設定されていません"

**原因**: 環境変数が設定されていない

**対処法**:
1. GitHub Environment Secretsに以下を設定：
   - `GOOGLE_SPREADSHEET_ID`
   - `GOOGLE_SHEETS_API_KEY`
   - `GOOGLE_SHEET_NAME`（オプション）
2. バックエンドを再デプロイ

### エラー: "Google Sheets API error: 403"

**原因**: APIキーに権限がない、またはスプレッドシートへのアクセス権限がない

**対処法**:
1. Google Sheets APIが有効化されているか確認
2. APIキーに適切な権限が付与されているか確認
3. スプレッドシートの共有設定を確認（APIキーでアクセス可能にする）

### エラー: "Google Sheets API error: 400"

**原因**: スプレッドシートIDが間違っている、またはシート名が存在しない

**対処法**:
1. スプレッドシートIDが正しいか確認
2. シート名が存在するか確認（デフォルト: `シート1`）

### データが追加されない

**確認事項**:
1. バックエンドのログを確認：
   ```bash
   gcloud run services logs read universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --limit 50
   ```
2. スプレッドシートの共有設定を確認
3. APIキーの制限を確認（IPアドレス制限など）

### 営業ユーザーでログインしているのに出力されない

**確認事項**:
1. ユーザーのロールが`sales`であることを確認
2. POIの`poi_category`が`tg`であることを確認（TG地点のみが出力されます）
3. コンソールログでエラーメッセージを確認

## 📝 テストチェックリスト

- [ ] 環境変数が設定されている（`GOOGLE_SPREADSHEET_ID`、`GOOGLE_SHEETS_API_KEY`）
- [ ] バックエンドが再デプロイされている
- [ ] スプレッドシートが存在し、アクセス可能
- [ ] 営業ユーザーでログインしている
- [ ] POIデータが存在する（TG地点）
- [ ] 格納依頼を実行
- [ ] スプレッドシートにデータが追加されていることを確認

## 🎯 次のステップ

テストが成功したら：
1. 本番環境での動作確認
2. エラーハンドリングの確認
3. 大量データでのパフォーマンステスト

