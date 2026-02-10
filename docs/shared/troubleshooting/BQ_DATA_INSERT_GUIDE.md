# BigQuery 新規データ追加の方法

**最終更新:** 2026年2月7日  
定義書のテーブルに対して、新規行を追加する主な方法をまとめています。

---

## 1. アプリケーション経由で追加する（推奨）

通常の運用では、**フロントエンド → バックエンド API → BigQuery** の流れでデータを追加します。バックエンドが型変換・必須チェック・allowedFields によるスキーマ整合をはかります。

| データ種別 | HTTP メソッド | エンドポイント例 | バックエンド処理 |
|------------|----------------|------------------|------------------|
| 案件 | POST | `/api/projects` | `bigquery-client.createProject()` → `table.insert()` |
| セグメント | POST | `/api/segments` | `createSegment()` → `table.insert()` |
| 地点（POI） | POST | `/api/pois` または一括 `/api/pois/bulk` | `createPoi()` / `createPoisBulk()` |
| ユーザー | POST | `/api/users` | `createUser()` |
| ユーザー登録申請 | POST | `/api/user-requests` | DML INSERT |
| メッセージ | POST | `/api/messages` | `createMessage()` |
| 編集依頼 | POST | `/api/edit-requests` | `createEditRequest()` |
| 機能リクエスト | POST | `/api/feature-requests` | `createFeatureRequest()` |
| 来店計測グループ | POST | `/api/visit-measurement-groups` | `createVisitMeasurementGroup()` |
| 変更履歴 | POST | `/api/change-history`（実装による） | `insertChangeHistory()` |
| スプレッドシートエクスポート | アプリ内処理 | - | `createSheetExport()` / `createSheetExportDataBulk()` |

**特徴**
- 日付・時刻・BOOL・ARRAY などはバックエンドで定義書どおりの型に変換されてから挿入される。
- 未知のカラムは `ignoreUnknownValues: true` で無視される。
- 本番で API 未接続のリソース（セグメント・POI 等）は、現状は localStorage のみで BQ には書き込まれません（[PRODUCTION_API_CONNECTION_STATUS](PRODUCTION_API_CONNECTION_STATUS.md) 参照）。

---

## 2. BigQuery に直接追加する

### 2.1 DML INSERT（コンソール・bq コマンド・クライアント）

BigQuery の「クエリを実行」や `bq query` で、次のように INSERT します。

```sql
-- 例: projects に1件追加
INSERT INTO `your_project_id.universegeo_dataset.projects` (
  project_id,
  _register_datetime,
  advertiser_name,
  appeal_point,
  delivery_start_date,
  delivery_end_date,
  person_in_charge,
  created_at,
  updated_at
) VALUES (
  'PRJ-001',
  CURRENT_TIMESTAMP(),
  '株式会社サンプル',
  '訴求内容',
  DATE('2025-02-01'),
  DATE('2025-03-31'),
  'user-sales-001',
  CURRENT_TIMESTAMP(),
  CURRENT_TIMESTAMP()
);
```

**ポイント**
- 定義書の「CREATE文」「フィールド定義」に合わせて列名・型を指定する。
- DATE は `DATE('YYYY-MM-DD')`、TIMESTAMP は `CURRENT_TIMESTAMP()` や `TIMESTAMP('2025-01-13 10:00:00')`、ARRAY は `['a','b']`、BOOL は `TRUE`/`FALSE`。
- パーティション付きテーブルでは、パーティションキー列（例: `_register_datetime`, `segment_registered_at`）に NULL を入れないようにする。

### 2.2 ストリーミング挿入（API / クライアントライブラリ）

Node.js などから `table.insert(rows, { ignoreUnknownValues: true })` で行を送る方法です。バックエンドの `bigquery-client` がこの方式を使っています。

- **メリット**: 挿入が即時反映され、DML のように「確定待ち」がない。
- **注意**: ストリーミングバッファの都合で、直後の読み取りで見えないことがある。`user_requests` のように「すぐ UPDATE したい」場合は、バックエンドでは DML INSERT を使っている。

### 2.3 バルクロード（bq load）

CSV / JSON / AVRO などをテーブルに一括投入する方法です。

```bash
bq load --source_format=CSV \
  your_project_id:universegeo_dataset.projects \
  gs://your-bucket/projects.csv \
  project_id:STRING,advertiser_name:STRING,...
```

- 新規テーブルを作る場合と、既存テーブルに追加する場合の両方で利用可能。
- スキーマはファイルの列順・型と一致させる必要がある。定義書の列順・型に合わせて CSV/JSON を用意する。

### 2.4 コンソールの「行を挿入」

BigQuery コンソールでテーブルを開き、「行を挿入」から 1 行ずつ入力する方法です。手軽だが、大量件数には向きません。

---

## 3. データ追加時の注意

1. **主キー・一意**: `project_id`, `segment_id`, `poi_id`, `user_id` などは重複しない値を入れる。
2. **外部キー**: `project_id`, `segment_id` などは、参照先テーブルに存在する ID を指定する（BQ は制約を張らないが、アプリ側で整合性を保つ）。
3. **日付・時刻**: 定義書では UTC。アプリでは JST で表示する場合は変換してから保存するか、保存は UTC で統一する。
4. **ARRAY 列**: `delivery_media`, `media_id`, `extraction_dates`, `prefectures`, `cities` は配列型。DML では `['universe','tver_sp']` のように書く。
5. **JSON 文字列**: `polygon`, `changes`, `deleted_data` は JSON 文字列。`JSON.stringify()` した形で挿入する。

---

## 4. 関連ドキュメント

- テーブル定義: [BIGQUERY_TABLE_DEFINITIONS.md](../BIGQUERY_TABLE_DEFINITIONS.md)
- 列追加（定義書に合わせる）: [BQ_ALTER_ADD_COLUMNS.sql](BQ_ALTER_ADD_COLUMNS.sql) / [BQ_ADD_REQUIRED_COLUMNS.md](BQ_ADD_REQUIRED_COLUMNS.md)
- スキーマ更新手順: [UPDATE_BIGQUERY_SCHEMA.md](UPDATE_BIGQUERY_SCHEMA.md)
