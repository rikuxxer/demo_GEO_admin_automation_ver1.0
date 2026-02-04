# テストの実行方法

このドキュメントでは、UNIVERSEGEO プロジェクトで用意しているテストと、推奨するテストの流れを説明します。

---

## 本番環境での確認を最優先に

**重要なのは本番環境でAPIが正しく動いているかです。** ローカルは開発・デバッグ用です。

- 本番バックエンドURLの取得: Cloud Run のサービスURL、または `gcloud run services describe ... --format='value(status.url)'`
- **接続テスト（本番・GETのみ）**: `node scripts/test-api-endpoints.js https://本番の実際のURL`
- **書き込みテスト（本番・POSTの500検知）**: `node scripts/test-api-write-endpoints.js https://本番の実際のURL`
- **全カラム確認（本番）**: `node scripts/validate-api-columns.js https://本番の実際のURL`

詳細は [PRODUCTION_API_CONNECTION_STATUS.md](./PRODUCTION_API_CONNECTION_STATUS.md) の「本番環境での確認」を参照してください。

---

## 1. ユーティリティテスト（いつでも実行可能）

データ連携目途の計算ロジックなど、フロントのユーティリティのテストです。**バックエンド不要**で実行できます。

```bash
npm run test
```

- 実行内容: `src/utils/dataCoordinationDate.test.ts`（データ連携目途の計算）
- 成功時: 6ケースすべて「✓ OK」と表示され、終了コード 0 で終了
- 失敗時: 「✗ NG」が表示され、終了コードが 0 以外

---

## 2. API接続テスト（バックエンド起動後）

**全GETエンドポイント**にHTTPでアクセスし、応答があるかを確認するテストです。**バックエンドが起動している必要**があります。

### ローカルでバックエンドを起動してから実行

```bash
# ターミナル1: バックエンドを起動
cd backend
npm run dev
# または: npm run build && npm start

# ターミナル2: プロジェクトルートでAPIテスト実行
npm run test:api
```

`npm run test:api` はデフォルトで `http://localhost:8080` にアクセスします。

### リモート（本番・ステージング）のバックエンドに対して実行

**URLを引数で指定（Windows / Mac / Linux 共通）:**

```bash
node scripts/test-api-endpoints.js https://your-backend.run.app
```

**レスポンス形式（配列・必須キー）までチェックする場合:**

```bash
node scripts/test-api-endpoints.js http://localhost:8080 --validate
```

**環境変数で指定する場合:**

| 環境 | コマンド例 |
|------|------------|
| Mac / Linux (Bash) | `BASE_URL=https://your-backend.run.app node scripts/test-api-endpoints.js` |
| Windows PowerShell | `$env:BASE_URL="https://your-backend.run.app"; node scripts/test-api-endpoints.js` |

### 接続テストで確認している範囲

| 確認内容 | 説明 |
|----------|------|
| **接続** | 各エンドポイントへ GET し、200 または 404 が返ること |
| **対象** | health, projects, segments, pois, users, user-requests, messages, edit-requests, visit-measurement-groups, feature-requests, change-history, sheets/exports の全GET（ID不要 or ダミーIDで呼べるもの） |
| **レスポンス形式（任意）** | `--validate` を付けると、JSON が配列であることなどを簡易チェック |

**重要**: 上記は **GET のみ** のテストです。**POST /api/segments の 500 など、書き込み（POST/PUT）のエラーは検知できません。** 書き込みエラーを検知するには下記「API 書き込みテスト」を実行してください。

### API 書き込みテスト（POST の 500 等を検知）

`scripts/test-api-write-endpoints.js` で、セグメント作成・変更履歴登録を実際に POST し、201 以外（500/4xx）を検出します。

```bash
node scripts/test-api-write-endpoints.js https://universegeo-backend-i5xw76aisq-an.a.run.app
```

- 案件が1件以上ある場合: テスト用セグメントを 1 件作成し、直後に削除してクリーンアップします。
- `POST /api/segments` が 500 の場合は「✗ 500 エラーメッセージ」と表示され、終了コード 1 で終了します。
- 本番で実行する場合は、一時的にテスト用セグメントが作成・削除されます。

**「全てのカラム（項目）の接続」を確認する**には、次のいずれかを実行します。

- **カラム検証スクリプト（推奨）**  
  各APIのレスポンスに、スキーマで期待する必須カラムが含まれているかを検証します。データが1件以上あるエンドポイントについて、先頭1件のキーをチェックします。
  ```bash
  node scripts/validate-api-columns.js http://localhost:8080
  ```
  または: `npm run test:api:columns`（デフォルトは localhost:8080）

- **接続テストの `--validate`**  
  `node scripts/test-api-endpoints.js <URL> --validate` で、レスポンスが配列であることなどを簡易チェックします。

- **手動確認**  
  フロントからデータを作成・表示し、一覧・詳細で全項目が表示・永続化されるかを確認します。

バックエンドの全ルートは `backend/src/index.ts`、期待カラムは `src/types/schema.ts` および `docs/shared/BIGQUERY_TABLE_DEFINITIONS.md` を参照してください。

### 成功時の出力例

```
=== API接続テスト ===
BASE_URL: http://localhost:8080

✓ ヘルスチェック /health -> 200
✓ プロジェクト一覧 /api/projects -> 200
✓ セグメント一覧 /api/segments -> 200
...
全 15 エンドポイントが応答しました（200/404等）。
```

### 失敗時（バックエンド未起動など）

```
✗ ヘルスチェック /health -> fetch failed
...
N 件のエンドポイントが接続できませんでした（バックエンドの起動・URLを確認してください）。
```

→ バックエンドの起動、URL、ファイアウォール／ネットワークを確認してください。

---

## 3. ビルド確認

コード変更後に、フロント・バックエンドが正しくビルドできるか確認します。

### フロントエンド

```bash
npm run build
```

- 成功: `build/`（または設定に応じた出力先）に成果物が出力される
- 失敗: TypeScript／Vite のエラーが表示される

### バックエンド

```bash
cd backend
npm run build
```

- 成功: `dist/` に JavaScript が出力される
- 失敗: TypeScript のエラーが表示される

---

## 4. 手動での動作確認（フロント ＋ バックエンド）

実際の画面操作で「API経由でデータが読める・書ける」ことを確認する手順です。

1. **バックエンドを起動**
   - ローカル: `cd backend && npm run dev`
   - 本番: デプロイ済みURLを利用

2. **フロントを起動（API向けビルドの場合）**
   - 本番用ビルドでプレビュー: `npm run build` のあと `npm run preview`
   - 開発用: `npm run dev`（`.env` や `config` で `VITE_API_BASE_URL` をバックエンドURLに設定）

3. **ブラウザで確認**
   - ログイン／案件一覧・詳細・セグメント・POI・変更履歴など、主要画面を開く
   - 開発者ツール（F12）の「ネットワーク」で、`/api/` へのリクエストが 200 などで返っているか確認

4. **データの永続化確認**
   - 案件やセグメントを1件作成・更新したあと、画面をリロードして同じデータが表示されるか確認

---

## 推奨するテストの流れ

| タイミング | 実施するテスト |
|------------|----------------|
| コード変更のたび | `npm run test`（ユーティリティテスト） |
| プルリク前・マージ前 | `npm run test` ＋ フロント `npm run build` ＋ バックエンド `cd backend && npm run build` |
| バックエンドを起動したあと | `npm run test:api`（GET）、`npm run test:api:write`（POST の 500 検知） |
| 全カラムの接続確認 | `npm run test:api:columns` または `node scripts/validate-api-columns.js <URL>` |
| デプロイ後 | `test-api-endpoints.js` ＋ **`test-api-write-endpoints.js`** ＋ ブラウザでの手動確認 |

---

## 参照

- API接続状況: [PRODUCTION_API_CONNECTION_STATUS.md](./PRODUCTION_API_CONNECTION_STATUS.md)
- APIエンドポイントの詳細テスト: [docs/dev/troubleshooting/TEST_API_ENDPOINTS.md](../../dev/troubleshooting/TEST_API_ENDPOINTS.md)
- スプレッドシート書き出しのテスト: [QUICK_TEST_GUIDE.md](../../dev/troubleshooting/QUICK_TEST_GUIDE.md) など
