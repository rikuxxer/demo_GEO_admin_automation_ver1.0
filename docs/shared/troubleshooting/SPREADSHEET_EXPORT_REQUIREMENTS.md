# スプレッドシート出力要件まとめ

## 📋 概要

スプレッドシートへの出力ロジックの詳細を整理し、データ連携予定日のロジックを優先して実装します。

## 🎯 優先事項

**データ連携予定日のロジックを優先** - `calculateDataCoordinationDate`を使用して`created`を計算します。

## 📊 スプレッドシートの運用方法

### 取り込みタイミング

- **毎日22:00**にBigQuery側に取り込み
- **`created`が当日**になっているものを処理対象とする
- 初回処理（翌日の処理）においては、**記入日から180日前まで遡ってログが生成**される

### 取り込み方式

- **差分のみを追加**（洗い替えではない）
- 既に追加されたマスタについては削除しても構わない
- 管理用に残しておきたい場合は残しても構わない

### 注意事項

- **1行目はヘッダー**と判定して取込み対象には含まない（編集禁止）
- 不要な行は削除
- 列は定義より増減させない

## 🔢 setting_flagの種類と必須フィールド

### setting_flag=1: 既存のPOIマスタに存在する

**必須フィールド:**
- `brand_name` (ブランド名)
- `poi_name` (施設名)
- `prefecture` (都道府県)
- `setting_flag` (設定区分)
- `created` (記入日)

**任意フィールド:**
- `category_id` (業態カテゴリ) - 値一覧から選択
- `brand_id` (ブランドID) - 空でも可
- `poi_id` (施設ID)

### setting_flag=2: 弊社のPOIマスタに存在しない（緯度経度を入力）

**必須フィールド:**
- `poi_name` (施設名)
- `latitude` (緯度)
- `longitude` (経度)
- `prefecture` (都道府県)
- `setting_flag` (設定区分)
- `created` (記入日)

**任意フィールド:**
- `category_id` (業態カテゴリ)
- `brand_id` (ブランドID)
- `brand_name` (ブランド名)
- `poi_id` (施設ID)
- `city` (市区)

### setting_flag=3: （未定義）

現在の仕様では未定義のため、実装時に対応方法を確認が必要。

### setting_flag=4: 任意半径で指定（緯度経度、半径を入力）

**必須フィールド:**
- `poi_name` (施設名)
- `latitude` (緯度)
- `longitude` (経度)
- `radius` (半径) - 最小単位1、最大10000
- `setting_flag` (設定区分)
- `created` (記入日)

**任意フィールド:**
- `category_id` (業態カテゴリ)
- `brand_id` (ブランドID)
- `brand_name` (ブランド名)
- `poi_id` (施設ID)
- `prefecture` (都道府県)
- `city` (市区)

### setting_flag=5: ポリゴン指定

**必須フィールド:**
- `poi_name` (施設名)
- `latitude` (緯度) - 半角カンマ区切り
- `longitude` (経度) - 半角カンマ区切り
- `polygon` (ポリゴン) - `st_geogfromtext('polygon(<ここに入る形式>)')`形式
- `setting_flag` (設定区分)
- `created` (記入日)

**任意フィールド:**
- `category_id` (業態カテゴリ)
- `brand_id` (ブランドID)
- `brand_name` (ブランド名)
- `poi_id` (施設ID)
- `prefecture` (都道府県)
- `city` (市区)

### setting_flag=6: 市区町村リストから指定

**必須フィールド:**
- `poi_name` (施設名)
- `prefecture` (都道府県) - "市区町村リスト"シート一覧から選択
- `setting_flag` (設定区分)
- `created` (記入日)

**条件付き必須:**
- `city` (市区) - "市区町村リスト"シート一覧から選択（無記入の場合は都道府県単位での抽出）

**任意フィールド:**
- `category_id` (業態カテゴリ)
- `brand_id` (ブランドID)
- `brand_name` (ブランド名)
- `poi_id` (施設ID)

### setting_flag=7: 指定した緯度経度半径の居住者を抽出

**必須フィールド:**
- `poi_name` (施設名)
- `latitude` (緯度)
- `longitude` (経度)
- `radius` (半径)
- `setting_flag` (設定区分)
- `created` (記入日)

**任意フィールド:**
- `category_id` (業態カテゴリ)
- `brand_id` (ブランドID)
- `brand_name` (ブランド名)
- `poi_id` (施設ID)
- `prefecture` (都道府県)
- `city` (市区)

### setting_flag=8: 指定した緯度経度半径の勤務者を抽出

**必須フィールド:**
- `poi_name` (施設名)
- `latitude` (緯度)
- `longitude` (経度)
- `radius` (半径)
- `setting_flag` (設定区分)
- `created` (記入日)

**任意フィールド:**
- `category_id` (業態カテゴリ)
- `brand_id` (ブランドID)
- `brand_name` (ブランド名)
- `poi_id` (施設ID)
- `prefecture` (都道府県)
- `city` (市区)

## 📝 フィールド定義

| # | 論理名 | 物理名 | データ型 | 備考 |
|---|--------|--------|----------|------|
| 1 | 業態カテゴリ | category_id | INTEGER | 値一覧から選択 |
| 2 | ブランドID | brand_id | STRING | 空でも可 |
| 3 | ブランド名 | brand_name | STRING | |
| 4 | 施設ID | poi_id | STRING | |
| 5 | 施設名 | poi_name | STRING | |
| 6 | 緯度 | latitude | FLOAT | |
| 7 | 経度 | longitude | FLOAT | |
| 8 | 都道府県 | prefecture | STRING | "市区町村リスト"シート一覧から選択 |
| 9 | 市区 | city | STRING | "市区町村リスト"シート一覧から選択 |
| 10 | 半径 | radius | INTEGER | 最小単位1、最大10000 |
| 11 | ポリゴン | polygon | STRING | `st_geogfromtext('polygon(<ここに入る形式>)')`形式 |
| 12 | 設定区分 | setting_flag | INTEGER | 1, 2, 4, 5, 6, 7, 8 |
| 13 | 記入日 | created | DATE | データ連携予定日を計算して設定 |

## 🔄 データ連携予定日のロジック（優先）

### 計算ルール

1. **20:00以降の依頼は翌日扱い**
2. **依頼日から次の月・水・金を探す**
3. **月・水・金に依頼した場合**: 次の月・水・金をそのまま返す
4. **その他の曜日（火・木・土・日）に依頼した場合**: 次の月・水・金 + 1営業日

### 実装

```typescript
import { calculateDataCoordinationDate } from './dataCoordinationDate';

// poi.createdが存在する場合はそれを使用、なければ現在日時を使用
let requestDateTime: string;
if (poi.created) {
  const createdDate = new Date(poi.created);
  if (isNaN(createdDate.getTime())) {
    requestDateTime = new Date().toISOString();
  } else {
    requestDateTime = poi.created;
  }
} else {
  requestDateTime = new Date().toISOString();
}

// データ連携予定日を計算（YYYY-MM-DD形式）
const coordinationDate = calculateDataCoordinationDate(requestDateTime);

// YYYY-MM-DD形式をYYYY/MM/DD形式に変換
const createdDateFormatted = formatDateToYYYYMMDD(coordinationDate);
```

### 日付形式

- **内部計算**: `YYYY-MM-DD`形式
- **スプレッドシート出力**: `YYYY/MM/DD`形式

## 🛠️ 実装時の考慮事項

### 1. setting_flagの判定

現在の実装では、地点登録時に`setting_flag`が設定されていない可能性があります。
- デフォルト値: `2`（弊社のPOIマスタに存在しない）
- 必要に応じて、地点登録時に`setting_flag`を適切に設定する必要があります

### 2. category_idの計算

現在の実装では、半径から`category_id`を計算しています：
```typescript
const categoryId = `9900${String(radiusValue).padStart(4, '0')}`;
```

ただし、仕様では`category_id`は「値一覧から選択」となっているため、実際の値一覧を確認する必要があります。

### 3. polygonフィールド

現在の実装では`polygon`は空文字列ですが、`setting_flag=5`の場合は`st_geogfromtext('polygon(<ここに入る形式>)')`形式で入力する必要があります。

### 4. radiusフィールド

- 最小単位: 1
- 最大: 10000
- `setting_flag=4, 7, 8`の場合は必須

### 5. 必須フィールドのバリデーション

各`setting_flag`に応じて、必須フィールドのバリデーションを実装する必要があります。

## 📋 実装チェックリスト

- [ ] `created`フィールドにデータ連携予定日を設定（`calculateDataCoordinationDate`を使用）
- [ ] 日付形式を`YYYY/MM/DD`に変換
- [ ] `setting_flag`に応じた必須フィールドのバリデーション
- [ ] `category_id`の値一覧を確認・実装
- [ ] `polygon`フィールドの実装（`setting_flag=5`の場合）
- [ ] `radius`フィールドのバリデーション（1-10000）
- [ ] ヘッダー行の実装（1行目は編集禁止）
- [ ] 列の順序と定義の確認

## 🔍 確認が必要な事項

1. **category_idの値一覧**: 具体的な値一覧を確認する必要があります
2. **setting_flag=3**: 仕様が未定義のため、対応方法を確認する必要があります
3. **市区町村リスト**: "市区町村リスト"シートの形式を確認する必要があります
4. **polygon形式**: `st_geogfromtext('polygon(<ここに入る形式>)')`の具体的な形式を確認する必要があります

