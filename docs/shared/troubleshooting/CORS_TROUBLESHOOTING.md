# CORSエラーのトラブルシューティング

## "Failed to fetch" エラーの原因

ローカルのHTMLファイル（`file://`）から直接APIを呼び出すと、CORSエラーが発生する可能性があります。

## 解決方法

### 方法1: ローカルサーバーでHTMLファイルを提供（推奨）

#### Pythonを使用する場合

```bash
# Python 3の場合
python -m http.server 8000

# ブラウザで開く
# http://localhost:8000/test-spreadsheet-export.html
```

#### Node.jsを使用する場合

```bash
# http-serverをインストール
npm install -g http-server

# サーバーを起動
http-server -p 8000

# ブラウザで開く
# http://localhost:8000/test-spreadsheet-export.html
```

#### VS CodeのLive Server拡張機能を使用

1. VS Codeで `test-spreadsheet-export.html` を開く
2. 右クリック > **Open with Live Server**
3. ブラウザで自動的に開かれます

### 方法2: バックエンドのCORS設定を一時的に緩和（開発環境のみ）

**⚠️ 注意**: 本番環境では使用しないでください。

バックエンドの環境変数に以下を追加：

```bash
ALLOW_ALL_ORIGINS=true
NODE_ENV=development
```

または、Cloud Runの環境変数として設定：

```bash
gcloud run services update universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --update-env-vars ALLOW_ALL_ORIGINS=true,NODE_ENV=development
```

### 方法3: ブラウザの開発者ツールから直接実行

1. アプリケーション（フロントエンド）を開く
2. 開発者ツール（F12）を開く
3. Consoleタブで以下を実行：

```javascript
// バックエンドURLを設定
const backendUrl = 'https://universegeo-backend-xxx-xx.a.run.app';

// テストデータ
const testData = {
  rows: [
    {
      半径: "500",
      brand_name: "テストブランド",
      poi_id: "TEST-" + Date.now(),
      poi_name: "テスト地点",
      latitude: "35.6812",
      longitude: "139.7671",
      prefecture: "東京都",
      city: "千代田区",
      setting_flag: "1",
      created: new Date().toISOString().split('T')[0]
    }
  ]
};

// APIリクエストを送信
fetch(`${backendUrl}/api/sheets/export`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testData),
})
  .then(response => {
    console.log('Response status:', response.status);
    return response.json();
  })
  .then(data => {
    console.log('✅ 結果:', data);
    if (data.success) {
      alert('成功！スプレッドシートを確認してください。\n' + data.message);
    } else {
      alert('エラー: ' + data.message);
    }
  })
  .catch(error => {
    console.error('❌ エラー:', error);
    alert('エラー: ' + error.message);
  });
```

### 方法4: curlコマンドでテスト（CORSエラーなし）

```bash
# バックエンドURLを設定
BACKEND_URL="https://universegeo-backend-xxx-xx.a.run.app"

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

## エラーの詳細確認方法

### ブラウザの開発者ツールで確認

1. 開発者ツール（F12）を開く
2. **Network**タブを開く
3. リクエストを送信
4. 失敗したリクエストをクリック
5. **Headers**タブで以下を確認：
   - **Request URL**: 正しいURLか
   - **Request Method**: POSTか
   - **Status Code**: エラーコード（403, 404, 500など）
   - **Response Headers**: `Access-Control-Allow-Origin`が含まれているか

### バックエンドのログを確認

```bash
# Cloud Runのログを確認
gcloud run services logs read universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --limit 50
```

CORSエラーの場合、以下のようなログが表示されます：
```
⚠️ CORS blocked origin: file://
   Allowed origins: [ 'http://localhost:5173', ... ]
```

## 推奨されるテスト手順

1. **ローカルサーバーでHTMLファイルを提供**（方法1）
2. または、**ブラウザの開発者ツールから直接実行**（方法3）
3. または、**curlコマンドでテスト**（方法4）

## 本番環境での注意事項

- `ALLOW_ALL_ORIGINS=true` は本番環境では**絶対に使用しないでください**
- CORS設定は適切に制限し、許可されたoriginのみを許可してください
- テスト用の設定は、テスト完了後に必ず削除してください

