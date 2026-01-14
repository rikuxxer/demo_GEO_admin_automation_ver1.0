<!-- ⚠️ 削除候補: このファイルは一時的なトラブルシューティングガイドです。問題が解決されたら削除可能です。 -->

# ユーザー登録申請承認エラーの修正

## 🚨 エラー

```
Parameter types must be provided for null values via the 'types' field in query options.
```

## 🔍 原因

BigQueryのクエリパラメータでNULL値を扱う場合、`types`フィールドで型を明示的に指定する必要があります。

`approveUserRequest`メソッドで、`review_comment`が`undefined`の場合に`null`を設定していましたが、型を指定していなかったためエラーが発生していました。

## 🛠️ 修正内容

### 修正前

```typescript
await initializeBigQueryClient().query({
  query,
  params: {
    user_id: requestId,
    reviewed_by: reviewedBy,
    review_comment: comment || null
  },
  location: BQ_LOCATION,
});
```

### 修正後

```typescript
await initializeBigQueryClient().query({
  query,
  params: {
    user_id: requestId,
    reviewed_by: reviewedBy,
    review_comment: comment || null
  },
  types: {
    user_id: 'STRING',
    reviewed_by: 'STRING',
    review_comment: 'STRING'  // NULL値でも型を指定する必要がある
  },
  location: BQ_LOCATION,
});
```

## 📋 修正箇所

1. **`approveUserRequest`メソッド** (`backend/src/bigquery-client.ts` 1361-1369行目)
   - `types`フィールドを追加

2. **`rejectUserRequest`メソッド** (`backend/src/bigquery-client.ts` 1401-1409行目)
   - 一貫性のために`types`フィールドを追加（`comment`は必須なのでNULLにはならないが、型を明示）

## ✅ 確認方法

1. バックエンドを再デプロイ
2. ユーザー登録申請を承認
3. エラーが解消されたか確認

## 💡 補足

BigQuery Node.js クライアントライブラリでは、NULL値を含むパラメータには必ず型を指定する必要があります。これは、BigQueryがNULL値の型を推論できないためです。

