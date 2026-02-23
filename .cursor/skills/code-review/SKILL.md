---
name: code-review
description: UNIVERSEGEO プロジェクトのコードレビューを実施する。プルリクエストのレビュー、コード変更の確認、品質チェックを依頼された際に使用する。React + TypeScript フロントエンドと Express + BigQuery バックエンドの両方に対応。
---

# コードレビュー

## レビュー観点

### 1. 型安全性（TypeScript）

- `any` 型の不要な使用がないか
- `import type { ... }` で型のみのインポートが正しく使われているか
- `src/types/schema.ts` の既存型定義と整合しているか
- strict モードのルールに違反していないか

### 2. BigQuery 操作（バックエンド）

- パラメータ化クエリ（`@param`）を使用しているか（SQLインジェクション防止）
- `BQ_LOCATION` を指定しているか
- 日付は `formatDateForBigQuery()`、タイムスタンプは `formatTimestampForBigQuery()` を通しているか
- 配列フィールドは `formatMediaIdArrayForBigQuery()` / `formatDeliveryMediaForBigQuery()` を使用しているか
- `ignoreUnknownValues: true` をinsert時に指定しているか
- エラーハンドリングが構造化されているか（`error`, `type`, `request_id`）

### 3. API エンドポイント（バックエンド）

- `asyncWrapper` でラップされているか
- エラーレスポンスが統一フォーマットに従っているか
- CORS 設定が適切か
- 入力値のバリデーションが行われているか

### 4. React コンポーネント（フロントエンド）

- コンポーネントのサイズが適切か（大きすぎる場合は分割を提案）
- shadcn/ui コンポーネント (`src/components/ui/`) を活用しているか
- React Hook Form のパターンに従っているか
- 不要な re-render を避けているか（useMemo, useCallback の適切な使用）
- toast 通知に Sonner を使用しているか

### 5. セキュリティ

- 環境変数でシークレットを管理しているか（ハードコード禁止）
- BigQuery クエリでパラメータバインディングを使用しているか
- ユーザー入力のサニタイズが行われているか
- CORS オリジンが適切に制限されているか

### 6. 命名規則

- コンポーネント: PascalCase (`ProjectForm.tsx`)
- ユーティリティ: camelCase (`bigquery.ts`)
- 関数: camelCase (`getProjects`)
- 定数: UPPER_SNAKE_CASE (`BQ_LOCATION`)
- 型/インターフェース: PascalCase (`Project`, `Segment`)

## フィードバック形式

レビュー結果は以下の形式で記述する：

- **Critical**: マージ前に必ず修正が必要
- **Warning**: 改善を推奨
- **Info**: 任意の改善提案

## チェックリスト

```
- [ ] TypeScript strict モードに準拠
- [ ] BigQuery クエリがパラメータ化されている
- [ ] エラーハンドリングが適切
- [ ] 命名規則に従っている
- [ ] セキュリティ上の問題がない
- [ ] 不要な依存関係を追加していない
- [ ] 既存の UI コンポーネントを再利用している
```
