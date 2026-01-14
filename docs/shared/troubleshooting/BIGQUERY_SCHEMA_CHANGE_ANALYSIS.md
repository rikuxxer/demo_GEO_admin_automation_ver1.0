# BigQueryスキーマ変更の必要性分析

## 結論

**BigQueryのスキーマ変更は不要です。**

## 現在のスキーマ

### poisテーブル
```json
{"name": "designated_radius", "type": "STRING", "mode": "NULLABLE"}
```

### segmentsテーブル
```json
{"name": "designated_radius", "type": "STRING", "mode": "NULLABLE"}
```

## 変更が不要な理由

### 1. **データ型の互換性**

- `designated_radius`は既に`STRING`型で定義されている
- 0-10000の範囲の数値も文字列として保存可能（例: `"500"`, `"1000"`, `"5000"`など）
- 既存のデータ（例: `"50m"`, `"500m"`など）との互換性も保たれる

### 2. **現在の実装**

#### フロントエンド
- `designated_radius`は文字列型として扱われている
- 数値入力フィールドから取得した値も文字列として保存される

#### バックエンド
- BigQueryへの保存時も文字列型のまま保存される
- スプレッドシート出力時は`parseRadius`関数で数値に変換して使用

```typescript
// src/utils/googleSheets.ts
function parseRadius(radius: string | undefined): number {
  if (!radius) return 0;
  // "50m" -> 50, "500" -> 500
  const match = radius.match(/^(\d+)m?$/);
  return match ? parseInt(match[1], 10) : 0;
}
```

### 3. **データ形式の一貫性**

- 既存データ: `"50m"`, `"500m"`などの形式
- 新規データ: `"500"`, `"1000"`などの数値文字列
- どちらも`STRING`型で保存可能で、`parseRadius`関数で正しく処理される

### 4. **スプレッドシート出力時の処理**

スプレッドシート出力時は、文字列から数値に変換して使用：

```typescript
// 半径を数値に変換
const radiusValue = parseRadius(poi.designated_radius || segment?.designated_radius);

// category_id: 99000000（00には指定半径の広さ）
const categoryId = `9900${String(radiusValue).padStart(4, '0')}`;

// radiusフィールドには数値文字列として保存
radius: radiusValue > 0 ? String(radiusValue) : '',
```

## もしINTEGER型に変更した場合の問題点

### 1. **既存データとの互換性**

- 既存データ（`"50m"`, `"500m"`など）が数値に変換できない
- データ移行が必要になる
- 既存のクエリや処理ロジックに影響が出る可能性

### 2. **柔軟性の低下**

- 文字列型の方が、将来的に単位（`m`）を含む形式や、その他の形式にも対応しやすい
- 数値型に変更すると、形式の変更が困難になる

### 3. **変換処理の複雑化**

- 現在は`parseRadius`関数で柔軟に処理できる
- 数値型に変更すると、保存時に変換処理が必要になり、エラーハンドリングが複雑になる

## データフロー

```
[フロントエンド入力]
  ↓
"500" (文字列) または "500m" (文字列)
  ↓
[BigQuery保存]
  ↓
designated_radius: "500" (STRING型)
  ↓
[スプレッドシート出力時]
  ↓
parseRadius("500") → 500 (数値)
  ↓
category_id: "99000500"
radius: "500"
```

## まとめ

1. **現在のスキーマ（STRING型）で十分対応可能**
2. **既存データとの互換性が保たれる**
3. **柔軟なデータ形式に対応できる**
4. **スプレッドシート出力時の処理も問題なく動作する**

**結論**: BigQueryのスキーマ変更は不要です。現在の`STRING`型のまま使用できます。

