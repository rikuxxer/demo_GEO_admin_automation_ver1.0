# スプレッドシート書き出し処理のロジック

## 📋 概要

地点登録データをGoogleスプレッドシートに自動出力する機能の実装ロジックを説明します。

## データフロー

```
[フロントエンド] → [バックエンドAPI] → [Google Sheets API] → [Googleスプレッドシート]
```

## 主要ファイル

### フロントエンド

1. **`src/utils/googleSheets.ts`**
   - スプレッドシート出力の主要ロジック
   - POIデータをスプレッドシート行に変換
   - バックエンドAPIまたは直接Google Sheets APIを呼び出し

2. **`src/components/ProjectDetail.tsx`**
   - 地点登録依頼時に自動出力（営業ユーザーの場合）
   - TG地点のみを出力（来店計測地点は出力しない）

3. **`src/components/BulkImport.tsx`**
   - 一括登録時に自動出力

4. **`src/components/AdminDashboard.tsx`**
   - 手動エクスポート（エクスポートキューから）

### バックエンド

1. **`backend/src/index.ts`**
   - `/api/sheets/export` エンドポイント
   - POSTリクエストで`rows`配列を受け取る

2. **`backend/src/bigquery-client.ts`**
   - `exportToGoogleSheets` 関数
   - Google Sheets API v4を使用
   - サービスアカウント認証で書き込み

## 処理の流れ

### 1. 地点登録時の自動出力（営業ユーザー）

#### トリガー
- `ProjectDetail.tsx`で地点登録依頼が完了した時
- 営業ユーザー（`user?.role === 'sales'`）の場合のみ

#### 処理ステップ

```typescript
// 1. TG地点のみをフィルタリング
const tgPois = segmentPois.filter(poi => 
  poi.poi_category === 'tg' || !poi.poi_category
);

// 2. スプレッドシートに出力
const sheetResult = await exportPoisToSheet(
  tgPois,
  project,
  segments
);
```

#### 詳細ロジック

**`exportPoisToSheet`関数**（`src/utils/googleSheets.ts`）:

1. **ヘッダー行の確認・追加**
   ```typescript
   await ensureHeaderRow();
   ```
   - スプレッドシートにヘッダー行が存在するか確認
   - 存在しない場合は追加

2. **POIデータをスプレッドシート行に変換**
   ```typescript
   const rows = pois.map(poi => {
     const segment = segments.find(s => s.segment_id === poi.segment_id);
     return convertPoiToSheetRow(poi, project, segment);
   });
   ```
   - 各POIを`SheetRow`形式に変換
   - 都道府県・市区町村を住所から抽出
   - 半径、地点名、緯度経度などを設定

3. **バックエンドAPI経由で出力**
   ```typescript
   if (USE_BACKEND_API) {
     const response = await fetch(`${API_BASE_URL}/api/sheets/export`, {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ rows }),
     });
   }
   ```

### 2. バックエンドAPI処理

#### エンドポイント
```
POST /api/sheets/export
```

#### リクエストボディ
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
    }
  ]
}
```

#### 処理ステップ

**`exportToGoogleSheets`関数**（`backend/src/bigquery-client.ts`）:

1. **環境変数の確認**
   ```typescript
   const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
   const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'シート1';
   ```

2. **データを2次元配列に変換**
   ```typescript
   const values = rows.map(row => [
     row.半径 || row.designated_radius || '',
     row.brand_name || '',
     row.poi_id || '',
     row.poi_name || '',
     row.latitude || '',
     row.longitude || '',
     row.prefecture || '',
     row.city || '',
     row.setting_flag || '1',
     row.created || new Date().toISOString().split('T')[0],
   ]);
   ```

3. **サービスアカウント認証**
   ```typescript
   const { google } = require('googleapis');
   const auth = new google.auth.GoogleAuth({
     scopes: ['https://www.googleapis.com/auth/spreadsheets'],
   });
   ```
   - Cloud Runのサービスアカウントを使用
   - ADC（Application Default Credentials）で自動認証

4. **Google Sheets API v4で書き込み**
   ```typescript
   const sheets = google.sheets({ version: 'v4', auth });
   
   const response = await sheets.spreadsheets.values.append({
     spreadsheetId: SPREADSHEET_ID,
     range: `${SHEET_NAME}!A:J`,
     valueInputOption: 'USER_ENTERED',
     insertDataOption: 'INSERT_ROWS',
     resource: { values },
   });
   ```

5. **エラーハンドリング**
   - 権限エラー（403）: サービスアカウントがスプレッドシートに共有されていない
   - スプレッドシートが見つからない（404）: スプレッドシートIDが間違っている
   - 認証エラー（401）: サービスアカウントの権限が不足

### 3. 一括登録時の自動出力

#### トリガー
- `BulkImport.tsx`で一括登録が完了した時
- 営業ユーザーの場合のみ

#### 処理ステップ

```typescript
// 1. 全ての地点をスプレッドシート行に変換
const spreadsheetRows = [];
for (const createdPoi of createdPois) {
  const spreadsheetRow = convertPoiToSpreadsheetRow(
    createdPoi,
    createdProject,
    segment
  );
  spreadsheetRows.push(spreadsheetRow);
}

// 2. 一括でスプレッドシートに送信
if (user?.role === 'sales' && spreadsheetRows.length > 0) {
  const result = await exportToGoogleSheets(spreadsheetRows);
  // 失敗した場合はキューに保存
  if (!result.success) {
    spreadsheetRows.forEach(row => saveToExportQueue(row));
  }
}
```

### 4. 手動エクスポート（エクスポートキュー）

#### トリガー
- `AdminDashboard.tsx`の「地点登録データをエクスポート」ボタン

#### 処理ステップ

```typescript
// 1. エクスポートキューからデータを取得
const queue = getExportQueue();

// 2. Google Sheetsに自動入力
const result = await exportQueueToGoogleSheets();

// 3. 成功した場合はキューをクリア
if (result.success) {
  clearExportQueue();
} else {
  // 失敗した場合はCSVダウンロードにフォールバック
  exportQueueToCSV();
}
```

## 認証と権限

### サービスアカウント認証

- **Cloud Runのサービスアカウント**を使用
- GitHub Environment Secretsの`BACKEND_SERVICE_ACCOUNT`で設定可能
- デフォルト: `223225164238-compute@developer.gserviceaccount.com`

### スプレッドシートへの共有

**必須**: サービスアカウントをスプレッドシートに共有する必要があります。

1. スプレッドシートを開く
2. 「共有」ボタンをクリック
3. サービスアカウントのメールアドレスを入力
4. 権限を「編集者」に設定
5. 「送信」をクリック

## データ形式

### スプレッドシート行の形式

| 列 | フィールド名 | 説明 | 例 |
|---|---|---|---|
| A | 半径 | 指定半径（m） | `500` |
| B | brand_name | 案件名（広告主名） | `テストブランド` |
| C | poi_id | セグメントID | `TEST-001` |
| D | poi_name | 地点名 | `テスト地点1` |
| E | latitude | 緯度 | `35.6812` |
| F | longitude | 経度 | `139.7671` |
| G | prefecture | 都道府県 | `東京都` |
| H | city | 市区町村 | `千代田区` |
| I | setting_flag | 設定フラグ | `1` |
| J | created | 作成日（YYYY-MM-DD） | `2024-01-01` |

### データ変換ロジック

#### 半径の変換
```typescript
// category_id: 99000000（00には指定半径の広さ）
// 例: 半径50m -> 99000050, 半径100m -> 99000100
const categoryId = `9900${String(radius).padStart(4, '0')}`;
```

#### 都道府県・市区町村の抽出
```typescript
// 住所から都道府県を抽出
const prefMatch = poi.address.match(/^(北海道|.{2,3}[都道府県])/);
if (prefMatch) {
  prefecture = prefMatch[1];
  // 市区町村を抽出（都道府県の後の部分）
  const afterPref = poi.address.substring(prefecture.length);
  const cityMatch = afterPref.match(/^(.+?[市区町村])/);
  if (cityMatch) {
    city = cityMatch[1];
  }
}
```

## 環境変数

### フロントエンド

- `VITE_API_BASE_URL`: バックエンドAPIのベースURL
  - 設定されている場合: バックエンドAPI経由で出力
  - 未設定の場合: 直接Google Sheets APIを使用（開発環境用）

### バックエンド

- `GOOGLE_SPREADSHEET_ID`: スプレッドシートID（必須）
- `GOOGLE_SHEET_NAME`: シート名（デフォルト: `シート1`）
- `BACKEND_SERVICE_ACCOUNT`: Cloud Runのサービスアカウント（オプション）

## エラーハンドリング

### フロントエンド

- **バックエンドAPIエラー**: エラーメッセージを表示
- **スプレッドシート出力失敗**: エクスポートキューに保存（後で手動エクスポート可能）

### バックエンド

- **権限エラー（403）**: サービスアカウントがスプレッドシートに共有されていない
- **スプレッドシートが見つからない（404）**: スプレッドシートIDが間違っている
- **認証エラー（401）**: サービスアカウントの権限が不足

詳細なエラー情報はログに出力されます：

```typescript
console.error('Google API エラー詳細 (response.data):', 
  JSON.stringify(error.response.data, null, 2));
```

## まとめ

1. **フロントエンド**: POIデータをスプレッドシート行に変換し、バックエンドAPIに送信
2. **バックエンド**: サービスアカウント認証でGoogle Sheets API v4を使用して書き込み
3. **認証**: Cloud Runのサービスアカウントを使用（ADCで自動認証）
4. **権限**: サービスアカウントをスプレッドシートに共有（編集者権限）する必要がある

## トラブルシューティング

### エラー: "The caller does not have permission"

**原因**: サービスアカウントがスプレッドシートに共有されていない

**対処法**:
1. バックエンドのログでサービスアカウントのメールアドレスを確認
2. そのメールアドレスをスプレッドシートに共有（編集者権限）

### エラー: "NOT_FOUND" または "404"

**原因**: スプレッドシートIDが間違っている

**対処法**:
1. `GOOGLE_SPREADSHEET_ID`が正しいか確認
2. スプレッドシートが存在するか確認

### エラー詳細の確認

バックエンドのログで詳細なエラー情報を確認：

```bash
gcloud run services logs read universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --limit 100 | grep -i "Google API エラー詳細\|response.data"
```

