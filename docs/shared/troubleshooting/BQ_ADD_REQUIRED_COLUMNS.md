# BigQuery に追加が必要な項目（一覧）

**最終更新:** 2026年2月7日  
**前提:** 現在の BQ テーブルが定義書より古いスキーマで作成されている場合に、定義書・バックエンドと揃えるために追加すべき項目をまとめています。

- **列追加を SQL で実行する:** [BQ_ALTER_ADD_COLUMNS.sql](BQ_ALTER_ADD_COLUMNS.sql) に ALTER TABLE ADD COLUMN をまとめています。実行前に `your_project_id` を置換してください。
- **新規データの追加方法:** [BQ_DATA_INSERT_GUIDE.md](BQ_DATA_INSERT_GUIDE.md) を参照してください。
- **手順（bq コマンド等）:** 各項目の「対応方法」で [UPDATE_BIGQUERY_SCHEMA.md](UPDATE_BIGQUERY_SCHEMA.md) の該当セクションを参照してください。

---

## 今回追加した内容を反映するための方法

### 反映の全体像

| 対象 | 反映方法 | 参照 |
|------|----------|------|
| **アプリ・コード** | リポジトリの変更を取得し、ビルド・デプロイする | 通常の git pull / デプロイ手順 |
| **BigQuery スキーマ** | 不足している列を BQ に追加する | 下記「BQ スキーマの反映」 |
| **新規データの入れ方** | アプリ API または DML/load で投入 | [BQ_DATA_INSERT_GUIDE.md](BQ_DATA_INSERT_GUIDE.md) |

### BQ スキーマの反映（定義書に合わせて列を足す）

1. **現在のスキーマを確認する**  
   追加したいテーブルについて、既に列があるか確認する。

   ```bash
   bq show --schema --format=prettyjson "PROJECT_ID:DATASET_ID.projects" | jq ".[].name"
   ```

   （`PROJECT_ID` / `DATASET_ID` を実際の値に置換。jq が無い場合は `bq show --schema` の出力を目視で確認。）

2. **列追加用 SQL を実行する**  
   - [BQ_ALTER_ADD_COLUMNS.sql](BQ_ALTER_ADD_COLUMNS.sql) を開く。  
   - ファイル内の **`your_project_id`** を実際の GCP プロジェクト ID に一括置換する。  
   - **実行方法（どちらか）:**  
     - **A. コンソール:** Cloud Console → BigQuery → 「クエリを入力」を開き、テーブルごとの ALTER ブロックをコピーして貼り付け、実行。複数テーブルある場合はブロックごとに繰り返す。  
     - **B. bq コマンド:** 実行したい ALTER 文を 1 文ずつ `bq query --use_legacy_sql=false "ALTER TABLE ..."` で実行。  
   - 既に存在する列に対する `ADD COLUMN` はエラーになる。その文はスキップして次を実行する。

3. **segments の delivery_media / media_id が STRING のとき**  
   ALTER では型を ARRAY に変更できない。  
   → [UPDATE_BIGQUERY_SCHEMA.md](UPDATE_BIGQUERY_SCHEMA.md) の「方法2-3」と [SEGMENTS_BQ_MIGRATION.sql](SEGMENTS_BQ_MIGRATION.sql) で新規テーブル作成＋データ移行を行う。

4. **反映の確認**  
   再度 `bq show --schema` で列が増えているか確認する。アプリから該当テーブルに書き込んで、エラーにならないか確認する。

### アプリ・コードの反映

- 今回のチャットで変更したファイル（例: `SegmentForm.tsx` のプリセットデフォルト、`bigquery-client.ts` の projects の allowedFields、各種ドキュメント）は、リポジトリにコミット・プッシュ済みであれば、通常の手順で取得・デプロイする。  
  - `git pull` → ビルド → デプロイ  
- バックエンドを再起動し、BQ に送る列（例: projects の 3 列）が送信されることを確認する。

---

## 一覧サマリ

| No | テーブル | 種別 | 追加・変更する項目 | 対応方法 |
|----|----------|------|--------------------|----------|
| 1 | projects | 列追加 | 7列（下記） | 方法3: projects |
| 2 | segments | 列追加 | 複数列（下記） | 方法2 / 方法2-2 / 方法3: segments |
| 2b | segments | 型変更 | delivery_media, media_id (STRING→ARRAY) | 方法2-3（新規テーブル＋移行） |
| 3 | pois | 列追加 | 複数列（下記） | 方法3: pois |
| 4 | users | 列追加 | 4列 | 方法3: users |
| 5 | user_requests | 列追加 | 全列（テーブル未作成時） | 方法3: user_requests |
| 6 | messages | 列追加 | 3列 | 方法3: messages |
| 7 | change_history | 列追加 | 3列 | 方法3: change_history |
| 8 | edit_requests | 列追加 | 4列 | 方法3: edit_requests |
| 9 | feature_requests | 列追加 | 4列 | 方法3: feature_requests |
| 10 | visit_measurement_groups | 列追加 | 1列 | 方法3: visit_measurement_groups |

---

## 1. projects（案件）

**追加が必要な列（定義書にあり・バックエンド送信済み。無い場合のみ追加）**

| カラム名 | 型 | 備考 |
|----------|-----|------|
| `agency_name` | STRING, NULLABLE | 代理店名 |
| `remarks` | STRING, NULLABLE | 備考 |
| `project_status` | STRING, NULLABLE | 案件ステータス |
| `project_registration_started_at` | TIMESTAMP, NULLABLE | 案件登録開始時点 |
| `universe_service_id` | STRING, NULLABLE | UNIVERSEサービスID |
| `universe_service_name` | STRING, NULLABLE | UNIVERSEサービス名 |
| `sub_person_in_charge` | STRING, NULLABLE | 副担当者 |

**対応方法:** [UPDATE_BIGQUERY_SCHEMA.md](UPDATE_BIGQUERY_SCHEMA.md) の「方法3: スキーマを更新」→ **projectsテーブル**（bq show → jq で addfield → bq update）。

---

## 2. segments（セグメント）

### 2a. 列の追加（ALTER または方法3の jq で追加可能なもの）

**追加が必要な列（無い場合のみ）**

| カラム名 | 型 | 備考 |
|----------|-----|------|
| `poi_category` | STRING, NULLABLE | 方法2 で ADD COLUMN あり |
| `registerd_provider_segment` | BOOL, NULLABLE | 方法2-2 で ADD COLUMN あり |
| `poi_type` | STRING, NULLABLE | 地点タイプ |
| `extraction_period_type` | STRING, NULLABLE | 抽出期間タイプ |
| `extraction_dates` | ARRAY&lt;STRING&gt; (REPEATED) | 特定日付指定時 |
| `data_link_status` | STRING, NULLABLE | データ連携ステータス |
| `data_link_request_date` | DATE, NULLABLE | データ連携依頼日 |
| `data_link_scheduled_date` | DATE, NULLABLE | 連携予定日 |
| `ads_account_id` | STRING, NULLABLE | AdsアカウントID |
| `provider_segment_id` | STRING, NULLABLE | プロバイダセグメントID |
| `segment_expire_date` | DATE, NULLABLE | セグメント有効期限 |

その他、方法3の「segmentsテーブル」jq に含まれる列（segment_name, segment_registered_at, delivery_media, media_id, attribute, extraction_period, extraction_start_date, extraction_end_date, detection_count, detection_time_start/end, stay_time, designated_radius, location_request_status, data_coordination_date, delivery_confirmed, created_at, updated_at）も、存在しなければ追加する。

**対応方法:**
- 単一列だけ追加する場合: **方法2**（poi_category）、**方法2-2**（registerd_provider_segment）の `ADD COLUMN IF NOT EXISTS` を参照。
- まとめて追加する場合: **方法3: segmentsテーブル**（jq で addfield 一覧に上記をすべて含めたスクリプトを使用）。  
  → 本ドキュメント作成時に、方法3の segments 用 jq に `poi_category`, `poi_type`, `registerd_provider_segment`, `extraction_period_type`, `extraction_dates`, `data_link_status`, `data_link_request_date`, `data_link_scheduled_date`, `ads_account_id`, `provider_segment_id`, `segment_expire_date` を反映済み。

### 2b. 型の変更（列追加では不可）

**対象:** `delivery_media`, `media_id` が現在 **STRING** のままのテーブル。

- BigQuery は STRING → ARRAY の ALTER をサポートしていないため、**新規テーブル作成＋データ移行**が必要。
- **対応方法:** [UPDATE_BIGQUERY_SCHEMA.md](UPDATE_BIGQUERY_SCHEMA.md) の「方法2-3: segments の delivery_media / media_id を STRING から ARRAY へ変更」および [SEGMENTS_BQ_MIGRATION.sql](SEGMENTS_BQ_MIGRATION.sql) を参照。

`detection_count` が STRING の場合は、方法2-3の移行 SQL 内で `SAFE_CAST(detection_count AS INT64)` により INT64 に変換する。

---

## 3. pois（地点情報）

**追加が必要な列（無い場合のみ）**

方法3の pois 用 jq に含まれる列:  
`location_id`, `address`, `latitude`, `longitude`, `prefectures` (REPEATED), `cities` (REPEATED), `poi_type`, `poi_category`, `designated_radius`, `setting_flag`, `visit_measurement_group_id`, `polygon` (JSON文字列), `created_at`, `updated_at`

**対応方法:** [UPDATE_BIGQUERY_SCHEMA.md](UPDATE_BIGQUERY_SCHEMA.md) の「方法3: スキーマを更新」→ **poisテーブル**。

---

## 4. users（ユーザー）

**追加が必要な列（無い場合のみ）**

| カラム名 | 型 |
|----------|-----|
| `department` | STRING, NULLABLE |
| `is_active` | BOOL, NULLABLE |
| `last_login` | TIMESTAMP, NULLABLE |
| `created_at` / `updated_at` | TIMESTAMP, NULLABLE |

**対応方法:** 「方法3」→ **usersテーブル**。

---

## 5. user_requests（ユーザー登録申請）

テーブル未作成の場合は全列で作成。既存テーブルに列を足す場合は方法3の user_requests 用 jq を参照。

**対応方法:** 「方法3」→ **user_requestsテーブル**。

---

## 6. messages（メッセージ）

**追加が必要な列（無い場合のみ）**

| カラム名 | 型 |
|----------|-----|
| `message_type` | STRING, NULLABLE |
| `is_read` | BOOL, NULLABLE |
| `timestamp` | TIMESTAMP, NULLABLE |

**対応方法:** 「方法3」→ **messagesテーブル**。

---

## 7. change_history（変更履歴）

**追加が必要な列（無い場合のみ）**

| カラム名 | 型 |
|----------|-----|
| `segment_id` | STRING, NULLABLE |
| `changes` | STRING, NULLABLE |
| `deleted_data` | STRING, NULLABLE |

**対応方法:** 「方法3」→ **change_historyテーブル**。

---

## 8. edit_requests（編集依頼）

**追加が必要な列（無い場合のみ）**

| カラム名 | 型 |
|----------|-----|
| `segment_id` | STRING, NULLABLE |
| `changes` | STRING, NULLABLE |
| `reviewed_by` | STRING, NULLABLE |
| `reviewed_at` | TIMESTAMP, NULLABLE |
| `review_comment` | STRING, NULLABLE |

**対応方法:** 「方法3」→ **edit_requestsテーブル**。

---

## 9. feature_requests（機能リクエスト）

**追加が必要な列（無い場合のみ）**

| カラム名 | 型 |
|----------|-----|
| `reviewed_by` | STRING, NULLABLE |
| `reviewed_at` | TIMESTAMP, NULLABLE |
| `review_comment` | STRING, NULLABLE |
| `implemented_at` | TIMESTAMP, NULLABLE |

**対応方法:** 「方法3」→ **feature_requestsテーブル**。

---

## 10. visit_measurement_groups（来店計測地点グループ）

**追加が必要な列（無い場合のみ）**

| カラム名 | 型 |
|----------|-----|
| `created` | TIMESTAMP, NULLABLE |

**対応方法:** 「方法3」→ **visit_measurement_groupsテーブル**。

---

## 確認のしかた

現在の BQ に列が存在するかは、次のコマンドで確認できます。

```bash
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" | jq '.[].name'
```

定義書の列一覧は [BIGQUERY_TABLE_DEFINITIONS.md](../BIGQUERY_TABLE_DEFINITIONS.md) の各テーブルの「CREATE文」「フィールド定義」を参照してください。
