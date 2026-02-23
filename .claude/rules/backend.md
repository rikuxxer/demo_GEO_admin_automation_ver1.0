---
description: バックエンド (Express + BigQuery) のコード変更時に適用
globs: backend/**/*.ts
---

# バックエンドルール

## API エンドポイント追加

- `backend/src/index.ts` にルートを追加
- 全ハンドラーを `asyncWrapper` でラップ
- レスポンスは JSON 形式で統一

## BigQuery 操作

- 全てのDB操作は `backend/src/bigquery-client.ts` に集約
- パラメータ化クエリ必須: `WHERE col = @param`
- `location: BQ_LOCATION` を常に指定
- データ挿入前に正規化関数を適用:
  - `formatDateForBigQuery()` (DATE型)
  - `formatTimestampForBigQuery()` (TIMESTAMP型)
  - `formatMediaIdArrayForBigQuery()` (ARRAY<STRING>型)
- insert 時は `{ ignoreUnknownValues: true }` を指定

## エラーハンドリング

```typescript
{
  error: "メッセージ",
  type: "ErrorType",
  request_id: "correlation-id"
}
```

## 環境変数

- `GCP_PROJECT_ID`: 必須
- `BQ_DATASET`: デフォルト `universegeo_dataset`
- `BQ_LOCATION`: デフォルト `asia-northeast1`
