# スプレッドシート出力の半径ロジック

## 概要

スプレッドシートへの出力時に、地点の半径の入力方法に応じて`category_id`、`radius`、`setting_flag`の値が変化します。

## 半径の入力方法

### 1. 自由入力（0-999m）

半径が0mより大きく999m以下の場合、自由入力として扱われます。

**注意**: 1000mは選択可能な値として扱われるため、自由入力範囲には含まれません。

**出力形式**:
- `category_id`: `99000XXX`（XXXは半径の値、4桁で0埋め）
- `radius`: 空文字列
- `setting_flag`: `2`

**例**:
- 半径50m → `category_id=99000050`, `radius=空`, `setting_flag=2`
- 半径100m → `category_id=99000100`, `radius=空`, `setting_flag=2`
- 半径999m → `category_id=99000999`, `radius=空`, `setting_flag=2`

### 2. 選択入力（1000m以上）

半径が1000m以上の場合、以下の選択可能な値から選択します：

- 1000m
- 1500m
- 2000m
- 2500m
- 3000m
- 3500m
- 4000m
- 4500m
- 5000m
- 6000m
- 7000m
- 8000m
- 9000m
- 10000m

**出力形式**:
- `category_id`: 空文字列
- `radius`: 選択した値（例: `1000`, `1500`, `2000`など）
- `setting_flag`: `4`

**例**:
- 半径1000m → `category_id=空`, `radius=1000`, `setting_flag=4`
- 半径1500m → `category_id=空`, `radius=1500`, `setting_flag=4`
- 半径10000m → `category_id=空`, `radius=10000`, `setting_flag=4`

### 3. 半径未設定

半径が設定されていない場合（0mまたは未設定）：

**出力形式**:
- `category_id`: 空文字列
- `radius`: 空文字列
- `setting_flag`: `2`（またはPOIの`setting_flag`値）

## 📊 出力例

### 例1: 自由入力（50m）

```
category_id: 99000050
brand_id: (空)
brand_name: 堅田漁業協同組合
poi_id: 01837
poi_name: しい茸園有馬富士
latitude: 34.9170725
longitude: 135.2295015
prefecture: (空)
city: (空)
radius: (空)
polygon: (空)
setting_flag: 2
created: 2023/09/26
```

### 例2: 選択入力（1000m）

```
category_id: (空)
brand_id: (空)
brand_name: 堅田漁業協同組合
poi_id: 01837
poi_name: しい茸園有馬富士
latitude: 34.9170725
longitude: 135.2295015
prefecture: (空)
city: (空)
radius: 1000
polygon: (空)
setting_flag: 4
created: 2023/09/26
```

### 例3: 選択入力（10m → 1000mに丸められる）

半径が10mの場合、自由入力範囲内なので`category_id=99000010`になります。

## 🔧 実装詳細

### 判定ロジック

```typescript
// 自由入力範囲（0-1000m）
function isFreeInputRadius(radius: number): boolean {
  return radius > 0 && radius <= 1000;
}

// 選択可能な値（1000m以上）
const SELECTABLE_RADIUS_VALUES = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 6000, 7000, 8000, 9000, 10000];

function isSelectableRadius(radius: number): boolean {
  return SELECTABLE_RADIUS_VALUES.includes(radius);
}
```

### 出力決定ロジック

```typescript
if (radiusValue === 0) {
  // 半径未設定
  categoryId = '';
  radius = '';
  settingFlag = '2';
} else if (isFreeInputRadius(radiusValue)) {
  // 自由入力（0-999m）
  categoryId = `9900${String(radiusValue).padStart(4, '0')}`;
  radius = '';
  settingFlag = '2';
} else if (isSelectableRadius(radiusValue)) {
  // 選択入力（1000m以上）
  categoryId = '';
  radius = String(radiusValue);
  settingFlag = '4';
} else {
  // その他の値（選択可能な値に最も近い値に丸める）
  const closestSelectable = SELECTABLE_RADIUS_VALUES.reduce((prev, curr) => {
    return Math.abs(curr - radiusValue) < Math.abs(prev - radiusValue) ? curr : prev;
  });
  categoryId = '';
  radius = String(closestSelectable);
  settingFlag = '4';
}
```

## ⚠️ 注意事項

### 1. 境界値の扱い

- **1000m**: 選択可能な値として扱われます（`category_id=空`, `radius=1000`, `setting_flag=4`）
- **999m**: 自由入力範囲の上限として扱われます（`category_id=99000999`, `radius=空`, `setting_flag=2`）

### 2. 選択可能な値以外の値

1000m超で選択可能な値以外の値が指定された場合、最も近い選択可能な値に丸められます。

例:
- 1200m → 1000mに丸められる
- 5500m → 5000mまたは6000mのうち近い方に丸められる

### 3. バリデーション

フロントエンドで半径を入力する際は、以下のバリデーションを推奨します：

- 0-1000m: 自由入力（整数のみ）
- 1000m以上: 選択可能な値から選択

## 📚 関連ファイル

- `src/utils/googleSheets.ts` - スプレッドシート出力ロジック
- `backend/src/bigquery-client.ts` - バックエンドのスプレッドシート出力処理
