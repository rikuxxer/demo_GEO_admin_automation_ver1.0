# スプレッドシートへの書き出しルール実装まとめ

**最終更新日:** 2026年2月7日  
**対象:** スプレッドシートへの自動書き出し機能の実装ルール

**変更履歴:**
- 2026年2月7日: 来店計測地点・ポリゴン地点も書き出し対象に追加、setting_flagの決定ロジックを拡張（2,4,5,6,7,8）、ポリゴン座標のフォーマットルールを追加

---

## 📋 目次

1. [書き出しのトリガー](#書き出しのトリガー)
2. [書き出し対象のフィルタリングルール](#書き出し対象のフィルタリングルール)
3. [データ変換ルール](#データ変換ルール)
4. [半径の扱いルール](#半径の扱いルール)
5. [日付の計算ルール](#日付の計算ルール)
6. [書き出し方法](#書き出し方法)
7. [エラーハンドリング](#エラーハンドリング)

---

## 書き出しのトリガー

### 1. 地点登録依頼時の自動書き出し

**トリガー条件:**
- `ProjectDetail.tsx`で地点登録依頼が完了した時
- **営業ユーザー（`user?.role === 'sales'`）の場合のみ**
- セグメントの`location_request_status`が`'storing'`に変更された時

**実装箇所:** `src/components/ProjectDetail.tsx` (行794-838)

```typescript
// スプレッドシートに自動出力（営業ユーザーの場合）
if (user?.role === 'sales') {
  // TG地点のみをフィルタリング
  const tgPois = segmentPois.filter(poi => 
    (poi.poi_category === 'tg' || !poi.poi_category) &&
    poi.poi_type !== 'polygon' &&
    !(poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0)
  );
  
  if (tgPois.length > 0) {
    await exportPoisToSheet(tgPois, project, segments, {
      useAccumulation: true,
      segmentId: segment.segment_id,
      exportedBy: user?.email || user?.user_id || 'system',
      exportedByName: user?.name || 'システム',
    });
  }
}
```

### 2. 一括登録時の自動書き出し

**トリガー条件:**
- `BulkImport.tsx`で一括登録が完了した時
- **営業ユーザーの場合のみ**

**実装箇所:** `src/components/BulkImport.tsx`

---

## 書き出し対象のフィルタリングルール

### 必須条件

1. **ユーザーロール**: 営業ユーザー（`role === 'sales'`）のみ

### 書き出し対象の地点

- ✅ TG地点（`poi_category === 'tg'` または `poi_category`が未設定）
- ✅ 来店計測地点（`poi_category === 'visit_measurement'`）
- ✅ ポリゴン地点（`poi_type === 'polygon'` またはポリゴン座標が存在する地点）

**注意**: 全地点が書き出し対象となります（フィルタリングなし）

---

## データ変換ルール

### スプレッドシートの列構成（13列）

| 列 | フィールド名 | データ型 | 説明 | 変換ルール |
|----|------------|---------|------|-----------|
| A | `category_id` | STRING | カテゴリID | 半径の値に応じて設定（後述） |
| B | `brand_id` | STRING | ブランドID | 常に空文字列 |
| C | `brand_name` | STRING | ブランド名 | `project.advertiser_name` |
| D | `poi_id` | STRING | 地点ID | TG地点: `segment_id`、来店計測: `visit_measurement_group_id` |
| E | `poi_name` | STRING | 地点名 | `poi.poi_name` |
| F | `latitude` | STRING | 緯度 | `poi.latitude`（数値→文字列変換） |
| G | `longitude` | STRING | 経度 | `poi.longitude`（数値→文字列変換） |
| H | `prefecture` | STRING | 都道府県 | `poi.prefectures[0]` または住所から抽出 |
| I | `city` | STRING | 市区町村 | `poi.cities[0]` または住所から抽出 |
| J | `radius` | STRING | 半径（m単位） | 選択可能な値の場合のみ設定 |
| K | `polygon` | STRING | ポリゴン座標 | ポリゴン地点の場合のみ設定（後述） |
| L | `setting_flag` | STRING | 設定フラグ | 地点タイプと属性に応じて設定（後述） |
| M | `created` | STRING | 作成日 | YYYY/MM/DD形式（後述） |

### 都道府県・市区町村の抽出ルール

1. **優先順位1**: `poi.prefectures`配列が存在する場合 → `prefectures[0]`を使用
2. **優先順位2**: `poi.address`から正規表現で抽出
   - 都道府県: `/^(北海道|.{2,3}[都道府県])/`
   - 市区町村: 都道府県の後の部分から `/^(.+?[市区町村])/` で抽出
3. **優先順位3**: `poi.cities`配列が存在する場合 → `cities[0]`を使用
4. **デフォルト**: 空文字列

---

## setting_flagの決定ルール

### 優先順位

1. **ポリゴン地点** (`poi_type === 'polygon'` またはポリゴン座標が存在)
   - `setting_flag`: `'5'`
   - `category_id`: 空文字列
   - `radius`: 空文字列
   - `polygon`: ポリゴン座標（後述の形式）

2. **都道府県・市区町村指定** (`poi_type === 'prefecture'` または `prefectures`配列が存在)
   - `setting_flag`: `'6'`
   - `category_id`: 空文字列
   - `radius`: 空文字列
   - `polygon`: 空文字列
   - `prefecture`: 都道府県名（必須）
   - `city`: 市区町村名（任意、空でも可）

3. **緯度半径ベースでの居住者** (`attribute === 'resident'` かつ半径あり かつ緯度経度あり)
   - `setting_flag`: `'7'`
   - `category_id`: 空文字列
   - `radius`: 半径の値（文字列）
   - `polygon`: 空文字列
   - `latitude`, `longitude`: 必須

4. **緯度半径ベースでの勤務者** (`attribute === 'worker'` かつ半径あり かつ緯度経度あり)
   - `setting_flag`: `'8'`
   - `category_id`: 空文字列
   - `radius`: 半径の値（文字列）
   - `polygon`: 空文字列
   - `latitude`, `longitude`: 必須

5. **その他の場合**（半径の値に応じて決定）

### 半径の値の取得

```typescript
const radiusValue = parseRadius(poi.designated_radius || segment?.designated_radius);
// "50m" → 50（数値に変換）
```

### 半径の値に応じた設定（上記1-4に該当しない場合）

#### 1. 半径が0（未設定）の場合

- `category_id`: 空文字列
- `radius`: 空文字列
- `setting_flag`: `poi.setting_flag` または `'2'`

#### 2. 自由入力範囲（1-999m）の場合

- `category_id`: `9900XXXX`（XXXXは半径の値、4桁で0埋め）
  - 例: 50m → `99000050`
  - 例: 500m → `99000500`
  - 例: 1000m → `99001000`
- `radius`: 空文字列
- `setting_flag`: `'2'`

#### 3. 選択可能な値（1000m以上）の場合

**選択可能な値リスト:**
```
[1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000]
```

- `category_id`: 空文字列
- `radius`: 選択した値（文字列）
  - 例: `"1000"`, `"5000"`
- `setting_flag`: `'4'`

#### 4. その他の値（1000m超で選択可能な値以外）の場合

- 選択可能な値に最も近い値に丸める
- `category_id`: 空文字列
- `radius`: 丸めた値（文字列）
- `setting_flag`: `'4'`
- ⚠️ 警告ログを出力

---

## ポリゴン座標のフォーマットルール

### ポリゴン座標の形式

**入力形式:** `poi.polygon` は `[[lat, lng], [lat, lng], ...]` の配列形式

**出力形式:** `"lng lat, lng lat, ..."` の文字列形式

**例:**
```typescript
// 入力: [[35.688454337707114, 139.7537102539063], [35.68489895772092, 139.74581383056645], ...]
// 出力: "139.7537102539063 35.688454337707114, 139.74581383056645 35.68489895772092, ..."
```

### 変換ロジック

```typescript
if (poi.polygon && Array.isArray(poi.polygon) && poi.polygon.length > 0) {
  polygonString = poi.polygon.map((coord: number[]) => {
    if (coord.length >= 2) {
      const lat = coord[0]; // 緯度
      const lng = coord[1]; // 経度
      return `${lng} ${lat}`; // lng lat の順で出力
    }
    return '';
  }).filter(s => s !== '').join(', ');
}
```

**注意:** ポリゴン座標が存在する場合、`setting_flag`は自動的に`'5'`に設定されます。

---

## 日付の計算ルール

### `created`フィールドの計算

**使用する関数:** `calculateDataCoordinationDate()`（`src/utils/dataCoordinationDate.ts`）

#### 基本ルール

1. **データ連携予定日の計算**
   - `poi.created`が存在する場合はそれを使用
   - 存在しない場合は現在日時を使用
   - `calculateDataCoordinationDate()`でデータ連携予定日を計算

2. **日付形式の変換**
   - 計算結果（YYYY-MM-DD形式）をYYYY/MM/DD形式に変換
   - 例: `2025-01-13` → `2025/01/13`

#### データ連携予定日の計算ロジック

**ルール:**
- **20:00以降の依頼**: 翌日扱い
- **月・水・金に依頼（20:00まで）**: 当日の月・水・金
- **その他の曜日または20:00以降**: 次の月・水・金

**実装:**
```typescript
// データ連携予定日を計算（YYYY-MM-DD形式）
const coordinationDate = calculateDataCoordinationDate(requestDateTime);

// YYYY-MM-DD形式をYYYY/MM/DD形式に変換
const createdDateFormatted = formatDateToYYYYMMDD(coordinationDate);
```

---

## 書き出し方法

### 1. バックエンドAPI経由（推奨・本番環境）

**条件:** `VITE_API_BASE_URL`が設定されている場合

**エンドポイント:**
- **基本エクスポート**: `POST /api/sheets/export`
- **テーブル蓄積付き**: `POST /api/sheets/export-with-accumulation`

**処理フロー:**
```
フロントエンド → バックエンドAPI → Google Sheets API v4 → スプレッドシート
```

**認証:**
- Cloud Runのサービスアカウントを使用
- ADC（Application Default Credentials）で自動認証

### 2. 直接Google Sheets API（開発環境）

**条件:** `VITE_API_BASE_URL`が未設定の場合

**必要な環境変数:**
- `VITE_GOOGLE_SPREADSHEET_ID`
- `VITE_GOOGLE_SHEETS_API_KEY`

**処理フロー:**
```
フロントエンド → Google Sheets API v4（APIキー認証） → スプレッドシート
```

---

## エラーハンドリング

### エラー時の動作

1. **スプレッドシート書き出し失敗時**
   - 地点登録依頼自体は成功として扱う
   - エラーログを出力
   - ユーザーには警告メッセージを表示

2. **エラーの種類と対処**

| エラーコード | エラーメッセージ | 原因 | 対処方法 |
|------------|----------------|------|---------|
| 403 | PERMISSION_DENIED | サービスアカウントがスプレッドシートに共有されていない | スプレッドシートにサービスアカウントを共有（編集者権限） |
| 404 | NOT_FOUND | スプレッドシートIDが間違っている | `GOOGLE_SPREADSHEET_ID`を確認 |
| 401 | UNAUTHENTICATED | 認証に失敗 | サービスアカウントの権限を確認 |

### バリデーション

**実装箇所:** `src/utils/spreadsheetValidation.ts`

**バリデーション項目:**
- `poi_name`: 必須
- `brand_name`: 必須（setting_flag=1の場合）
- `latitude`, `longitude`: 必須（setting_flag=2の場合）
- `prefecture`: 必須
- `created`: 必須（YYYY/MM/DD形式）

---

## テーブル蓄積機能

### テーブル蓄積付きエクスポート

**使用条件:**
- `useAccumulation: true`が指定された場合
- `VITE_API_BASE_URL`が設定されている場合

**処理ステップ:**

1. **エクスポート履歴を保存**（`sheet_exports`テーブル）
   - `export_id`: 自動生成（`EXP-{YYYYMMDD}-{連番}`）
   - `project_id`, `segment_id`, `exported_by`, `exported_by_name`
   - `export_status`: `'pending'` → `'completed'` / `'failed'`

2. **エクスポートデータを保存**（`sheet_export_data`テーブル）
   - 各行のデータを個別に保存
   - `export_data_id`: `{export_id}-{連番}`

3. **スプレッドシートに書き出し**
   - Google Sheets API v4で追加

**注意:** `sheet_exports`と`sheet_export_data`テーブルが存在しない場合、エラーになります。

---

## 実装ファイル一覧

### フロントエンド

- `src/utils/googleSheets.ts` - スプレッドシート出力の主要ロジック
- `src/utils/dataCoordinationDate.ts` - データ連携予定日の計算
- `src/utils/spreadsheetValidation.ts` - バリデーション
- `src/components/ProjectDetail.tsx` - 地点登録依頼時の自動出力
- `src/components/BulkImport.tsx` - 一括登録時の自動出力

### バックエンド

- `backend/src/index.ts` - APIエンドポイント（`/api/sheets/export`, `/api/sheets/export-with-accumulation`）
- `backend/src/bigquery-client.ts` - Google Sheets API呼び出しとテーブル蓄積

---

## 設定要件

### 環境変数（バックエンド）

- `GOOGLE_SPREADSHEET_ID`: スプレッドシートID（必須）
- `GOOGLE_SHEET_NAME`: シート名（デフォルト: `シート1`）

### 環境変数（フロントエンド・開発環境のみ）

- `VITE_GOOGLE_SPREADSHEET_ID`: スプレッドシートID
- `VITE_GOOGLE_SHEETS_API_KEY`: Google Sheets APIキー

### スプレッドシートの共有設定

**サービスアカウントを共有する必要があります:**
- サービスアカウントのメールアドレス: `223225164238-compute@developer.gserviceaccount.com`
- 権限: **編集者**
- 共有方法: スプレッドシートの「共有」ボタンから追加

---

## 参考ドキュメント

- [スプレッドシート書き出し処理のロジック](./SPREADSHEET_EXPORT_LOGIC.md)
- [スプレッドシート出力要件まとめ](./SPREADSHEET_EXPORT_REQUIREMENTS.md)
- [データ連携予定日の実装](./DATA_COORDINATION_DATE_IMPLEMENTATION.md)
