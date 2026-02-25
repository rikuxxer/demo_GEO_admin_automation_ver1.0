# Google Sheets API 連携セットアップガイド

地点格納依頼時にスプレッドシートへ自動出力する機能のセットアップ手順です。

## 1. Google Cloud Project の作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. プロジェクト名: 例）`UNIVERSEGEO-Sheets`

## 2. Google Sheets API の有効化

1. Google Cloud Console で「APIとサービス」→「ライブラリ」を選択
2. 「Google Sheets API」を検索
3. 「有効にする」をクリック

## 3. API キーの作成

1. 「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「APIキー」をクリック
3. 作成された API キーをコピー
4. **重要**: 「キーを制限」をクリックして以下を設定：
   - **アプリケーションの制限**: HTTPリファラー（推奨）
   - **APIの制限**: Google Sheets API のみに制限
   - 許可するリファラー: あなたのアプリのURL（例: `https://yourdomain.com/*`）

## 4. スプレッドシートの準備

1. [Google Sheets](https://sheets.google.com/) で新しいスプレッドシートを作成
2. シート名を「**シート1**」にする（重要！）
3. 最初の行（A1～J1）に以下のヘッダーを入力（自動で追加されるため省略も可）:
   ```
   半径 | brand_name | poi_id | poi_name | latitude | longitude | prefecture | city | setting_flag | created
   ```
4. スプレッドシートのURLから **スプレッドシートID** をコピー
   ```
   https://docs.google.com/spreadsheets/d/【ここがスプレッドシートID】/edit
   ```
5. **共有設定**:
   - 「共有」ボタンをクリック
   - 「リンクを知っている全員が閲覧可能」に設定
   - または、サービスアカウントを作成して共有

## 5. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下を記述：

```env
# Google Sheets API 設定
VITE_GOOGLE_SPREADSHEET_ID=あなたのスプレッドシートID
VITE_GOOGLE_SHEETS_API_KEY=あなたのAPIキー
```

**例**:
```env
VITE_GOOGLE_SPREADSHEET_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890
VITE_GOOGLE_SHEETS_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q
```

## 6. アプリの再起動

```bash
# 開発サーバーを再起動
npm run dev
```

## 7. 動作確認

1. アプリにログイン（営業アカウント）
2. 案件を選択 → セグメント管理 → 地点を登録
3. 「地点格納依頼」ボタンをクリック
4. ジオコーディング完了後、スプレッドシートを確認
5. 地点情報が追加されていれば成功！

**注意**: スプレッドシートには **TG地点のみ** が出力されます。来店計測地点は出力されません。

## 出力されるデータ

| カラム | 説明 | 例 |
|--------|------|-----|
| 半径 | 指定半径 | 500m |
| brand_name | 広告主名 | ○○株式会社 |
| poi_id | 地点ID（location_id） | 1 |
| poi_name | 地点名 | 東京駅 |
| latitude | 緯度 | 35.681236 |
| longitude | 経度 | 139.767125 |
| prefecture | 都道府県 | 東京都 |
| city | 市区町村 | 千代田区 |
| setting_flag | 設定フラグ（`2`=カテゴリ選択, `4`=自由入力半径, `5`=ポリゴン, `6`=都道府県(検知者), `7`=都道府県/半径(居住者), `8`=都道府県/半径(勤務者)） | 2 |
| created | 依頼日 | 2024-01-15 |

## トラブルシューティング

### 環境変数が設定されていない
**症状**: コンソールに「Google Sheets API が設定されていません」と表示される

**確認方法**:
1. プロジェクトルートに `.env` ファイルが存在するか確認
2. `.env` ファイルに以下が記載されているか確認:
   ```env
   VITE_GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
   VITE_GOOGLE_SHEETS_API_KEY=your_api_key
   ```
3. 開発サーバーを再起動（環境変数の変更後は必須）
   ```bash
   # Ctrl+C で停止後
   npm run dev
   ```

### API エラー: 403 Forbidden
**症状**: スプレッドシートへのアクセスが拒否される

**対処法**:
- API キーの制限設定を確認
- スプレッドシートの共有設定を「リンクを知っている全員」に変更
- APIキーでGoogle Sheets APIが有効になっているか確認

### API エラー: 404 Not Found
**症状**: スプレッドシートが見つからない

**対処法**:
- スプレッドシートIDが正しいか確認
- スプレッドシートが削除されていないか確認
- シート名が「シート1」になっているか確認

### データが出力されない
**確認手順**:
1. ブラウザのコンソール（F12）でエラーを確認
2. コンソールに `スプレッドシートに出力中...` というログが表示されるか確認
3. 「TG地点が存在しないため、スプレッドシート出力をスキップします」と表示されていないか確認
4. `.env` ファイルの環境変数名が正しいか確認（`VITE_` プレフィックスが必要）
5. 開発サーバーを再起動

### ヘッダー行が重複する
- スプレッドシートの1行目を手動で削除
- `ensureHeaderRow` 関数が自動で再作成します

### デバッグ方法
1. ブラウザの開発者ツール（F12）を開く
2. Console タブを表示
3. 地点格納依頼を実行
4. 以下のログを確認:
   - `スプレッドシートに出力中...`
   - `出力対象: TG地点=X件`
   - `スプレッドシートに送信:`
   - `Google Sheets に追加成功:` または `Google Sheets API エラー:`

## セキュリティ注意事項

**重要**: `.env` ファイルは Git にコミットしないでください！

`.gitignore` に以下が含まれていることを確認：
```
.env
.env.local
.env.*.local
```

## Cloud Run デプロイ時

Cloud Run にデプロイする場合は、環境変数をコンテナに設定：

```bash
gcloud run deploy universegeo \
  --set-env-vars="VITE_GOOGLE_SPREADSHEET_ID=your_id,VITE_GOOGLE_SHEETS_API_KEY=your_key"
```

または、Cloud Run コンソールから「環境変数」タブで設定。

---

## 定期バッチエクスポート仕様

### 概要

フロントエンドでのセグメント保存時に即時 Sheets 送信するのではなく、BigQuery にキューとして保存し、Cloud Scheduler が定期的に一括送信する方式。

```
フロントエンド（セグメント保存）
  → POST /api/sheets/export-with-accumulation (deferExport: true)
  → sheet_exports に pending レコード登録
  → sheet_export_data に行データ登録

Cloud Scheduler（月・水・金 21:30 JST）
  → POST /api/sheets/run-scheduled-export
  → pending レコードを全件取得
  → Sheets API に書き込み（50件/チャンク、チャンク間 200ms）
  → ステータスを completed / failed に更新
```

### 出力列（13列固定）

| 順序 | カラム名 | 説明 |
|------|----------|------|
| 1 | `category_id` | カテゴリID |
| 2 | `brand_id` | ブランドID |
| 3 | `brand_name` | ブランド名（広告主名） |
| 4 | `poi_id` | 地点ID |
| 5 | `poi_name` | 地点名 |
| 6 | `latitude` | 緯度 |
| 7 | `longitude` | 経度 |
| 8 | `prefecture` | 都道府県 |
| 9 | `city` | 市区町村 |
| 10 | `radius` | 半径 |
| 11 | `polygon` | ポリゴン（JSON文字列） |
| 12 | `setting_flag` | 設定フラグ（`2`=カテゴリ選択, `4`=自由入力半径, `5`=ポリゴン, `6`=都道府県(検知者), `7`=都道府県/半径(居住者), `8`=都道府県/半径(勤務者)） |
| 13 | `created` | 作成日（YYYY/MM/DD形式） |

### APIエンドポイント

#### キュー登録（フロントエンドから呼び出し）

```
POST /api/sheets/export-with-accumulation
Content-Type: application/json

{
  "rows": [...],
  "projectId": "PRJ-1",
  "segmentId": "seg-uni-001",
  "exportedBy": "user@example.com",
  "exportedByName": "担当者名",
  "deferExport": true
}
```

レスポンス:
```json
{
  "success": true,
  "message": "エクスポートをキューに登録しました（エクスポートID: EXP-20260224-1234）",
  "exportId": "EXP-20260224-1234",
  "rowsAdded": 0
}
```

#### バッチ実行（Cloud Scheduler から呼び出し）

```
POST /api/sheets/run-scheduled-export
Content-Type: application/json
X-Scheduler-Token: <SCHEDULER_SECRET>

{}
```

レスポンス:
```json
{
  "success": true,
  "totalProcessed": 3,
  "succeeded": 3,
  "failed": 0,
  "results": [
    { "exportId": "EXP-20260224-1234", "success": true, "rowsAdded": 50 }
  ]
}
```

認証失敗時は `401 Unauthorized` を返す。

### Cloud Scheduler 設定

| 項目 | 値 |
|------|----|
| ジョブ名 | `universegeo-sheet-export` |
| スケジュール | `30 12 * * 1,3,5`（月・水・金 12:30 UTC = 21:30 JST） |
| タイムゾーン | UTC |
| エンドポイント | `https://<BACKEND_URL>/api/sheets/run-scheduled-export` |
| HTTPメソッド | POST |
| 認証ヘッダー | `X-Scheduler-Token: <SCHEDULER_SECRET>` |
| タイムアウト | 600秒 |

Cloud Scheduler の作成・更新は GitHub Actions の `setup-cloud-scheduler.yml` ワークフロー（`workflow_dispatch`）で実行する。

### 書き込み先

| 項目 | 値 |
|------|----|
| スプレッドシート | https://docs.google.com/spreadsheets/d/17Y9KHOaHjoW5dzrIENPRCDa-HQywScJctgzcSOiX10s/edit |
| タブ | `シート1` |
| 書き込み範囲 | `A:M`（A〜M列、末尾に追記） |

### 環境変数

バックエンド（Cloud Run）に以下の環境変数が必要：

| 変数名 | 説明 | 設定場所 |
|--------|------|----------|
| `GOOGLE_SPREADSHEET_ID` | 書き込み先スプレッドシートID | GitHub Environment secrets |
| `GOOGLE_SHEET_NAME` | 書き込み先シート名（デフォルト: `シート1`） | GitHub Environment secrets |
| `SCHEDULER_SECRET` | バッチエンドポイントの認証トークン | GitHub Environment secrets |

### BigQuery テーブル

| テーブル | 用途 |
|----------|------|
| `sheet_exports` | エクスポートキューと実行履歴（`export_status`: `pending` / `completed` / `failed`） |
| `sheet_export_data` | エクスポート対象の行データ（バッチ実行時に参照） |

詳細スキーマは [BIGQUERY_TABLE_DEFINITIONS.md](./BIGQUERY_TABLE_DEFINITIONS.md) の §11・§12 を参照。

### BigQuery 制約事項

- **ストリーミングバッファ制限**: INSERT 直後（約90分以内）のレコードは DML UPDATE 不可
- `deferExport=false`（即時エクスポート）の場合は Sheets 書き込み後に最終ステータスで INSERT するため UPDATE は発生しない
- `deferExport=true`（キュー登録）の場合は `pending` で INSERT し、バッチ実行時（数時間〜数日後）に UPDATE するためバッファ制限の影響を受けない

### テスト方法

```bash
# テスト1〜4（SCHEDULER_SECRETなし）
node scripts/test-spreadsheet-export.js https://<BACKEND_URL>

# テスト1〜5（バッチ実行含む）
SCHEDULER_SECRET=<値> node scripts/test-spreadsheet-export.js https://<BACKEND_URL>
```

| テスト | 内容 |
|--------|------|
| テスト1 | 即時Sheets書き込み（`/api/sheets/export`） |
| テスト2 | 蓄積付き即時エクスポート（`deferExport: false`） |
| テスト3 | エクスポート履歴取得 |
| テスト4 | キュー登録（`deferExport: true`） |
| テスト5 | バッチ実行（`/api/sheets/run-scheduled-export`） |

