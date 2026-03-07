# 教訓ログ

## BigQuery パラメータ型指定の不備

**日付**: 2026-03-02
**対象**: `backend/src/bigquery/segment.ts` の `updateSegment`

### 何が起きたか

セグメント更新で `Error: Invalid time string ""` が発生。原因は2つあり、**1回目の修正で片方しか直していなかった**。

- 1回目コミット (`1b4397e7`): 空文字列 → `null` 変換を追加（`formatDateForBigQuery` / `formatTimeForBigQuery` 呼び出し）
- 2回目コミット (`8210787f`): `paramTypes` に `'DATE'` / `'TIME'` 型指定を追加

### なぜ不十分だったか

`formatTimeForBigQuery("")` は正しく `null` を返す。しかし `@google-cloud/bigquery` クライアントは、`paramTypes` に型指定のない `null` 値を DATE/TIME カラムへ渡す際に `""` として解釈し `Invalid time string ""` エラーを出す。
コードベース内に `Invalid time string` の文字列は存在しない（ライブラリ内部のエラー）。

### 正しい修正の全体像

```typescript
// 1. 空文字列 → null 変換
for (const field of dateFields) {
  if (field in processedUpdates) {
    processedUpdates[field] = formatDateForBigQuery(processedUpdates[field]);
  }
}

// 2. paramTypes に型指定（null を渡すために必須）
for (const field of dateFields) {
  if (field in allParams) paramTypes[field] = 'DATE';
}
for (const field of timeFields) {
  if (field in allParams) paramTypes[field] = 'TIME';
}
```

### 今後のルール

- BigQuery の DATE/TIME 型パラメータを扱う際は、`null` を渡す場合でも `paramTypes` に明示的な型を指定する
- `formatDateForBigQuery` / `formatTimeForBigQuery` の呼び出しと `paramTypes` への型指定はセットで行う
- 修正前に「クライアントライブラリのシリアライズ挙動」まで確認してから1コミットで完結させる

## BigQuery v7 の string+types:'TIMESTAMP' バグと wrapper オブジェクト必須ルール

**日付**: 2026-03-04
**対象**: 全 CREATE/UPDATE 関数（message.ts, project.ts, segment.ts, poi.ts, user.ts）

### 何が起きたか

`POST /api/feature-requests` で `Required field requested_at cannot be null` (500) が発生。
クライアントは `requested_at: new Date().toISOString()` (有効な ISO 文字列) を送っていたのに、BigQuery が null 扱いした。

### 根本原因

`@google-cloud/bigquery` v7 のバグ:
- `string + types:'TIMESTAMP'` → `parameterValue: {}` (空) → BigQuery は null として扱う ❌
- `Date + types:'TIMESTAMP'` → `parameterValue: { value: '...' }` ✅
- `BigQueryDate + types:'DATE'` → 正常 ✅
- `BigQueryTime + types:'TIME'` → 正常 ✅
- `null + types:'TIMESTAMP'` → `parameterValue: { value: null }` ✅（null 型指定は引き続き必要）

### 正しい修正パターン

`utils.ts` に `bqTimestamp`/`bqDate`/`bqTime` ヘルパーを追加:
- `bqTimestamp(value)` → `Date | null`（BigQuery TIMESTAMP パラメータに使用）
- `bqDate(value)` → `BigQueryDate | null`（BigQuery DATE パラメータに使用）
- `bqTime(value)` → `BigQueryTime | null`（BigQuery TIME パラメータに使用）

クエリパラメータには必ずこれらを使用し、`formatTimestampForBigQuery` 等の文字列変換は **レスポンス整形専用**。

### 今後のルール

- BigQuery DML パラメータの TIMESTAMP/DATE/TIME 値は必ず `bqTimestamp`/`bqDate`/`bqTime` を使う
- `formatTimestampForBigQuery()`（文字列を返す）はクエリパラメータに使わない（Streaming Insert のみ可）
- `types` ブロックは引き続き必要（null の型を BigQuery に伝えるため）

## `import.meta.env.MODE !== 'production'` による本番環境での機能消失

**日付**: 2026-03-05
**対象**: `src/components/AdminDashboard.tsx`（および今後追加するすべてのコンポーネント）

### 何が起きたか

`SheetExportHistory`（再エクスポートボタン含む）を実装してコミット・デプロイしたにもかかわらず、
本番環境で機能が一切表示されなかった。

```tsx
// AdminDashboard.tsx:212, 238
{import.meta.env.MODE !== 'production' && ...}
```

この条件が本番ビルドで `false` になるため、コンポーネントごと消える。

### なぜ発生したか

`package.json` の `"build"` コマンドがデフォルトで prod config を使う:
```
"build": "vite build --config config/prod/vite.config.prod.ts"
```

`config/prod/vite.config.prod.ts` 内で `import.meta.env.MODE` を `'production'` に固定しているため、
本番ビルド（= `npm run build`）では `MODE !== 'production'` は**常に `false`** になる。

つまり **「コードを書いてデプロイした」≠「本番で動いている」** という状況が生まれる。

### CI/CD の構造（正常動作している）

- `deploy-all.yml`: `main` ブランチへの `src/**` / `backend/**` push で自動トリガー → 本番へ自動デプロイ
- `deploy-backend.yml`: `main` ブランチへの `backend/**` push でバックエンドのみ自動デプロイ
- フロントエンドは `deploy-all.yml` がカバーしており、自動デプロイは正常に機能している
- **CI/CDの構造自体は問題ではない**

### 今後のルール

1. **`import.meta.env.MODE !== 'production'` を UI の表示条件に使わない**
   - 機能を本番で出したくない場合は、ユーザーロール（`isAdmin` 等）で制御する
   - `MODE` チェックは「開発ツール・デバッグ機能」にのみ使用を限定する

2. **新しい機能を追加したら「本番デプロイ後に動くか」を確認してからタスク完了とする**
   - `npm run build` が通ることはデプロイ成功の証明にならない
   - コミット・プッシュ後に GitHub Actions の `deploy-all.yml` の実行結果を確認する
   - デプロイ完了後、実際の本番 URL にアクセスして機能が表示・動作することを確認する
   - `MODE !== 'production'` のような条件が付いていないかレビューする

3. **既存の `MODE !== 'production'` ガードは削除する**
   - `AdminDashboard.tsx:212,238` の条件はロールベース制御に置き換える

## BigQuery types ブロックには null になりうる全パラメータの型を指定する

**日付**: 2026-03-08
**対象**: `backend/src/bigquery/message.ts` の `createEditRequest`

### 何が起きたか

修正依頼の作成時に `Parameter types must be provided for null values via the 'types' field in query options.` エラーが発生。`types` に TIMESTAMP 型のみ指定し、null になりうる STRING 型パラメータ（`segment_id`, `reviewed_by`, `review_comment`, `changes`）の型を指定していなかった。

### 既存の教訓との関係

「BigQuery パラメータ型指定の不備」(2026-03-02) は DATE/TIME 型について記録していたが、STRING 型でも null を渡す場合は同じ問題が起きる。型に関係なく **null になりうるパラメータはすべて `types` に指定が必要**。

### 今後のルール

- BigQuery DML の `types` ブロックには、TIMESTAMP/DATE/TIME だけでなく **null になりうる全パラメータ** の型を指定する
- 新しい INSERT/UPDATE 関数を書く際は、パラメータを1つずつ確認し、null の可能性があるものを `types` に漏れなく追加する
- レビュー時のチェックポイント: `params` のキーと `types` のキーを突き合わせ、null 可能なフィールドが `types` に含まれているか確認する

## DML INSERT 後の SELECT 再取得は不要

**日付**: 2026-03-03
**対象**: `backend/src/bigquery/project.ts`, `routes/projects.ts`, `routes/pois.ts`, `routes/segments.ts`

### 何が起きたか

案件登録（createProject）が DB に保存されないように見えた。原因は、DML INSERT の前後に余分な SELECT（existence check）があったため。

- INSERT 前: `getProjectById` で重複チェック → 条件次第でエラー
- INSERT 後: `getProjectById` でレコード取得 → null を返すと `'Failed to retrieve created project'` エラー → 500 応答

ユーザーにはエラートーストが表示され「登録失敗」と見えたが、実際には INSERT は成功していた。

### 正しい修正

- `createProject` が `cleanedProject` を return するよう変更（`Promise<void>` → `Promise<any>`）
- `routes/projects.ts` で INSERT 後の `getProjectById` を廃止し、`createProject` の戻り値を直接レスポンスに使用
- `routes/pois.ts`, `routes/segments.ts` の事前存在チェックも同様に削除

### 今後のルール

- DML INSERT 後に「確認のため SELECT」を追加しない（BigQuery DML は即座に反映される）
- INSERT の戻り値（cleanedRow）をそのままレスポンスに使う設計にする
- 存在チェックが必要な場合は INSERT 前ではなく、BigQuery の制約（PRIMARY KEY 相当）で対処する

## デプロイをタスク完了条件に含める

**日付**: 2026-03-08
**対象**: 全タスク（新機能追加・バグ修正問わず）

### 何が起きたか

計測レポート依頼機能の実装後、ビルド検証（`tsc --noEmit` + `npm run build:prod`）は成功したが、デプロイを実施せずにタスクを完了扱いにした。ユーザーから「デプロイは？」と指摘されて初めて気づいた。過去にも同じ指摘を受けている。

### なぜ繰り返したか

- lessons.md の行121-125 に「本番デプロイ後に動くか確認してからタスク完了とする」と既に記録していたが、タスク完了の判断時にこの教訓を参照していなかった
- ビルド成功 = タスク完了と無意識に判断してしまった
- CLAUDE.md の「完了前」チェックリストにデプロイが含まれていなかった（今回追記済み）

### 今後のルール

- **コード変更があるタスクは、デプロイまで実施して初めて完了**
- CLAUDE.md の「完了前」チェックリストにデプロイを追加済み → 必ず確認する
- デプロイ手順: push → `gh workflow run` でワークフロートリガー → 完了確認
- `gh` CLI が使えない場合は GitHub Actions の URL を提示してユーザーに手動トリガーを依頼する
