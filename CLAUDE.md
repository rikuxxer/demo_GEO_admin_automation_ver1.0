# UNIVERSEGEO プロジェクト

## 概要

位置情報ベースの広告配信管理システム。プロジェクト・セグメント・POI（地点情報）の管理、Google BigQuery によるデータ永続化、Google Sheets へのエクスポート機能を提供する。

## 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui (Radix UI)
- **バックエンド**: Express + TypeScript + Google BigQuery
- **デプロイ**: Google Cloud Run + GitHub Actions
- **リージョン**: asia-northeast1 (東京)

## ディレクトリ構成

```
src/                          # フロントエンド (React)
├── components/               # コンポーネント (PascalCase.tsx)
│   └── ui/                   # shadcn/ui 共通UI
├── contexts/                 # React Context
├── types/schema.ts           # 型定義の集約ファイル
└── utils/                    # ユーティリティ (camelCase.ts)

backend/src/                  # バックエンド (Express)
├── index.ts                  # サーバー & 全APIルート
├── bigquery-client.ts        # BigQuery サービス層 (全DB操作)
└── middleware/               # Express ミドルウェア

config/                       # 環境別設定 (dev / prod)
.github/workflows/            # CI/CD
```

## コマンド

```bash
# フロントエンド開発
npm run dev

# バックエンド開発
cd backend && npm run dev

# ビルド
npm run build:dev     # 開発ビルド
npm run build:prod    # 本番ビルド
```

## コーディング規約

### 命名規則

- コンポーネントファイル: PascalCase (`ProjectForm.tsx`)
- ユーティリティ: camelCase (`geocoding.ts`)
- 関数: camelCase (`getProjects`)
- 定数: UPPER_SNAKE_CASE (`BQ_LOCATION`)
- 型/インターフェース: PascalCase (`Project`, `Segment`)

### TypeScript

- strict モード有効
- 型のみのインポートは `import type { ... }` を使用
- パスエイリアス `@/*` → `src/*`
- `any` の使用は最小限に

### フロントエンド

- UIコンポーネントは `src/components/ui/` の shadcn/ui を優先使用
- 新しい型は `src/types/schema.ts` に集約
- アイコン: Lucide React
- トースト通知: Sonner
- フォーム: React Hook Form

### バックエンド

- 全ハンドラーを `asyncWrapper` でラップ
- BigQuery 操作は `bigquery-client.ts` に集約（`index.ts` にクエリを直書きしない）
- パラメータ化クエリ必須（`@param` を使用、SQLインジェクション防止）
- 日付/タイムスタンプは `formatDateForBigQuery()` / `formatTimestampForBigQuery()` で正規化
- エラーレスポンスは `{ error, type, request_id }` の統一形式

## BigQuery 主要テーブル

| テーブル | 主キー | 用途 |
|---------|--------|------|
| projects | project_id | プロジェクト管理 |
| segments | segment_id | セグメント (配信設定) |
| pois | poi_id | POI (地点情報) |
| id_counters | name | 連番ID生成 |
| user_requests | request_id | ユーザー登録申請 |
| messages | message_id | メッセージ |

## 禁止事項

- シークレットのハードコード禁止（環境変数を使用）
- `src/components/ui/` に既存のUIコンポーネントがあれば自作しない
- ESLint / Prettier は未導入のため設定ファイルを追加しない
- BigQuery クエリに文字列結合でユーザー入力を埋め込まない

## 実装時に気をつけること

### 着手前

- **スコープを決める**: 1コミットでやることを「1機能・1バグ」に絞る。大きい場合はタスクを分割する。
- **既存コードを確認する**: 同じことをしている箇所がないか検索する。あればそこに合わせるか、共通化する。
- **型・API契約を確認する**: 変更対象の型は `src/types/schema.ts`、APIは `backend/src/index.ts` と `src/utils/bigquery.ts` の両方を見る。フロントとバックで食い違えないようにする。

### 実装中

- **ファイルサイズ**: 編集するファイルが500行を超えている場合、今回の変更でさらに増えるなら「まず分割する」を検討する。
- **重複を作らない**: 日付フォーマット・エラーハンドリング・同じUIパターンは、既存の関数・コンポーネントを再利用する。新規の関数・コンポーネントは「既に同じものがないか」を確認してから作る。
- **デバッグログ**: 一時的に `console.log` を仕込むのは可。コミット前に削除する。
- **React の挙動**: フォームのフリーズ・不要な再レンダリングが出たら、原因を特定してから直す（場当たり的な `useEffect` や state の追加を繰り返さない）。

### 完了前（PR・コミット前）

- **ビルド**: `npm run build:prod` が通ることを確認する。
- **型**: `tsc --noEmit` で型エラーがないことを確認する。
- **変更範囲**: 意図しないファイル（設定・ドキュメントの大量追加など）が含まれていないか確認する。
- **新規ファイル**: 本当に必要か見直す。既存の `.md` や `.sql` に追記で済むなら、新規ファイルは作らない。

### 日々の心がけ

- **1つの正解に寄せる**: 同じ目的の実装が複数できないようにする。既存のやり方か、1つにまとめた共通化のどちらかにする。
- **3回目で立ち止まる**: 同じ種別のバグを3回以上直しているなら、設計・原因の見直しをする。
- **規約は CLAUDE.md に反映する**: 実装中に「これは今後も守りたい」と判断したら、CLAUDE.md の該当セクション（禁止事項 or 過去の実装ミス）に1行でも追記する。

## 過去の実装ミスから学んだルール（必ず守ること）

### 1. ファイルを肥大化させない

過去に `backend/src/bigquery-client.ts`（3500行超）、`src/components/PoiForm.tsx`（3600行超）、`src/components/ProjectDetail.tsx`（2900行超）が巨大化して保守困難になった。
- 1ファイル500行を目安とする。超える場合は機能ごとに分割を検討する
- 新機能を追加する際、既存の巨大ファイルにさらにコードを追加しない。分割する方法を提案する

### 2. 日付フォーマットのロジックを各所に書かない

過去に `date.toISOString().split('T')[0]` のような直接実装が50箇所以上に散在した。
- DATE型: 必ず `formatDateForBigQuery()` を使用する
- TIMESTAMP型: 必ず `formatTimestampForBigQuery()` を使用する
- フロントエンドのコンポーネントに独自の formatDate 関数を作らない。共通ユーティリティを使う

### 3. console.log を大量に残さない

過去に `bigquery-client.ts` だけで100箇所以上の console.log/warn/error が残り、本番でもログが溢れた。
- デバッグ用ログは作業完了後に削除する
- 本番で残すべきログは `console.error` に限定し、構造化する
- 絵文字付きのログ（`✅`, `❌`, `📋` など）を量産しない

### 4. 同じ修正を何度もやり直さない

過去に「セグメントフォームのフリーズ修正」を10回以上のコミットで繰り返した（startTransition、uncontrolled input、requestAnimationFrame、blur handler 削除…）。
- 修正前に根本原因を特定する。場当たり的なパッチを繰り返さない
- React の再レンダリング問題には、まず React DevTools Profiler で原因を特定してから対処する
- 同一の問題に3回以上修正コミットが必要になった場合、一旦立ち止まって設計を見直す

### 5. トラブルシューティング文書を大量生成しない

過去に `docs/dev/troubleshooting/`、`docs/prod/troubleshooting/`、`docs/shared/troubleshooting/`、`docs/scripts/` に合計150以上のドキュメントとスクリプトが自動生成され、管理不能になった。
- .md ファイルや .sh/.sql スクリプトを自動的に新規作成しない
- 必要な情報は既存のドキュメント（`docs/dev/SETUP.md` 等）に追記する
- ワンオフのSQLやシェルスクリプトはドキュメント内のコードブロックに記載し、独立ファイルにしない

### 6. エラーハンドリングのコピペ禁止

過去に同じ try-catch パターンが `bigquery-client.ts` 内に何十箇所もコピーされた。
- 共通のエラーハンドリング関数を使う
- 各関数で個別に `console.error('❌ BigQuery error:', ...)` を書かない

### 7. フロントエンドとバックエンドの型・契約を合わせる

過去にフロントエンド (`src/utils/bigquery.ts`) とバックエンド (`backend/src/bigquery-client.ts`) で以下の不一致が発生した:
- 日付正規化ロジックの重複・差異
- エラーレスポンス形式の不一致
- `polygon` フィールドが型定義では `number[][]` だが BigQuery には JSON 文字列で保存
- `media_id` が型定義では `string | string[]` だが BigQuery では `ARRAY<STRING>`
- 変更時は必ずフロントエンドとバックエンドの両方を確認し整合性を保つ

### 8. 不要な代替案を並列で実装しない

過去にテーブル作成スクリプトが `create_all_tables.sql`、`create_all_tables_US.sql`、`create_all_tables_improved.sh`、`create_all_tables_only.sh`、`create_all_tables_prod.sql` など複数バージョン生成された。
- 1つの正しい方法を実装する。複数バリエーションを作らない
- 既存スクリプトがある場合はそれを修正する。新規ファイルを作らない

### 9. インポートパスを統一する

過去に相対パス (`../utils/bigquery`) と エイリアス (`@/utils/bigquery`) が混在した。
- フロントエンドは `@/` エイリアスで統一する
- バックエンドは相対パスで統一する（`@/` エイリアス未設定のため）

### 10. コメントで処理を逐一説明しない

過去に `bigquery-client.ts` で1つの関数に5行以上の説明コメントが付けられた。
- コードが自明な場合はコメントを書かない
- 「なぜ」そうしているかのみコメントする（「何を」しているかは書かない）

## 言語

- コードのコメント・変数名: 英語
- ユーザー向けUI・ドキュメント: 日本語
- AI への応答: 日本語
