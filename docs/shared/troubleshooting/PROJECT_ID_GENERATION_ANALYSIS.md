# 案件ID採番ロジックの分析

## 現在の実装

### フロントエンド (`src/utils/bigquery.ts`)
```typescript
const projectId = `PRJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

### バックエンド (`backend/src/index.ts`)
```typescript
const generatedProjectId = `PRJ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

## 問題点

### 1. 非推奨メソッドの使用
- `substr()` は非推奨メソッドです
- `substring()` または `slice()` を使用すべきです
- `substr(2, 9)` は `substring(2, 11)` または `slice(2, 11)` に置き換え可能

### 2. 重複チェックの欠如
- 生成されたIDが既存の案件IDと重複していないかのチェックがない
- タイムスタンプベースなので重複の可能性は低いが、同時リクエストで重複する可能性がある
- BigQueryの主キー制約でエラーになる可能性がある

### 3. 一貫性
- フロントエンドとバックエンドで同じ形式を使用している（良い点）
- フロントエンドで生成したIDをバックエンドに送信しているため、バックエンドでの自動生成は通常使われない

## 推奨される修正

1. `substr` を `substring` または `slice` に変更
2. 重複チェックの追加（オプション、ただしタイムスタンプベースなので重複の可能性は低い）
3. エラーハンドリングの改善（重複時のリトライロジック）

