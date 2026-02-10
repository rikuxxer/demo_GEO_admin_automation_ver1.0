# BQ 側に実装が足りていない箇所（チェックリスト）

**最終更新:** 2026年2月7日  
**目的:** 定義書・バックエンドと揃えるために、BigQuery 側で「まだ足りていない可能性がある」列・型を一覧にしたものです。  
**前提:** 実際の BQ スキーマは `bq show --schema PROJECT_ID:DATASET.TABLE` で確認し、一覧と照らして不足しているものだけ追加・変更してください。

---

## サマリ：BQ で不足しやすい箇所

| テーブル | 不足しやすい内容 | 種別 | 対応 |
|----------|------------------|------|------|
| **projects** | 7列 | 列追加 | [BQ_ALTER_ADD_COLUMNS.sql](../BQ_ALTER_ADD_COLUMNS.sql) の projects ブロック |
| **segments** | 多数の列 ＋ delivery_media/media_id が STRING のまま | 列追加 or 型変更 | 列は ALTER、型は方法2-3で移行 |
| **pois** | 多数の列 | 列追加 | BQ_ALTER_ADD_COLUMNS.sql の pois ブロック |
| **users** | 4列 | 列追加 | BQ_ALTER_ADD_COLUMNS.sql の users ブロック |
| **user_requests** | テーブル未作成 or 列不足 | 作成 or 列追加 | CREATE または ALTER |
| **messages** | 3列 | 列追加 | BQ_ALTER_ADD_COLUMNS.sql の messages ブロック |
| **change_history** | 3列 | 列追加 | BQ_ALTER_ADD_COLUMNS.sql の change_history ブロック |
| **edit_requests** | 4列 | 列追加 | BQ_ALTER_ADD_COLUMNS.sql の edit_requests ブロック |
| **feature_requests** | 4列 | 列追加 | BQ_ALTER_ADD_COLUMNS.sql の feature_requests ブロック |
| **visit_measurement_groups** | 1列 (created) | 列追加 | BQ_ALTER_ADD_COLUMNS.sql の visit_measurement_groups ブロック |

---

## 1. projects（案件）

**BQ に無いと不足している列（定義書・バックエンド送信済み）**

- `agency_name` (STRING)
- `remarks` (STRING)
- `project_status` (STRING)
- `project_registration_started_at` (TIMESTAMP)
- `universe_service_id` (STRING)
- `universe_service_name` (STRING)
- `sub_person_in_charge` (STRING)

**確認例:**  
`bq show --schema PROJECT_ID:universegeo_dataset.projects` の出力に上記が含まれるか確認。

---

## 2. segments（セグメント）

### 2a. 列の不足

**BQ に無いと不足している列（一部）**

- `segment_name`, `segment_registered_at`, `poi_category`, `poi_type`, `attribute`
- `extraction_period`, `extraction_period_type`, `extraction_start_date`, `extraction_end_date`, `extraction_dates` (ARRAY&lt;STRING&gt;)
- `detection_count` (INT64), `detection_time_start`, `detection_time_end`, `stay_time`, `designated_radius`
- `location_request_status`, `data_coordination_date`, `delivery_confirmed`, `registerd_provider_segment`
- `data_link_status`, `data_link_request_date`, `data_link_scheduled_date`, `ads_account_id`, `provider_segment_id`, `segment_expire_date`
- `created_at`, `updated_at`

### 2b. 型の不足（実装が足りない箇所）

- **`delivery_media` が STRING のまま**  
  → 定義書は ARRAY&lt;STRING&gt;。ALTER では型変更不可。**方法2-3（新規テーブル＋データ移行）** が必要。
- **`media_id` が STRING のまま**  
  → 同上。方法2-3で ARRAY&lt;STRING&gt; に移行。
- **`detection_count` が STRING のまま**  
  → 定義書は INT64。方法2-3の移行 SQL 内で `SAFE_CAST(detection_count AS INT64)` で変換。

**確認例:**  
`bq show --schema PROJECT_ID:universegeo_dataset.segments` で各列の `type` を確認。

---

## 3. pois（地点情報）

**BQ に無いと不足している列**

- `segment_id`, `location_id`, `address`, `latitude`, `longitude`
- `prefectures` (ARRAY&lt;STRING&gt;), `cities` (ARRAY&lt;STRING&gt;)
- `poi_type`, `poi_category`, `designated_radius`, `setting_flag`, `visit_measurement_group_id`, `polygon`
- `created_at`, `updated_at`

---

## 4. users（ユーザー）

**BQ に無いと不足している列**

- `department` (STRING)
- `is_active` (BOOL)
- `last_login` (TIMESTAMP)
- `created_at`, `updated_at` (TIMESTAMP)

---

## 5. user_requests（ユーザー登録申請）

- **テーブル自体が無い** → 定義書の CREATE でテーブル作成。
- **テーブルはあるが列が足りない** → `department`, `reason`, `reviewed_at`, `reviewed_by`, `review_comment` などが無ければ追加。

---

## 6. messages（メッセージ）

**BQ に無いと不足している列**

- `message_type` (STRING)
- `is_read` (BOOL)
- `timestamp` (TIMESTAMP)

---

## 7. change_history（変更履歴）

**BQ に無いと不足している列**

- `segment_id` (STRING)
- `changes` (STRING)
- `deleted_data` (STRING)

---

## 8. edit_requests（編集依頼）

**BQ に無いと不足している列**

- `segment_id`, `changes`, `reviewed_by`, `reviewed_at`, `review_comment`

---

## 9. feature_requests（機能リクエスト）

**BQ に無いと不足している列**

- `reviewed_by`, `reviewed_at`, `review_comment`, `implemented_at`

---

## 10. visit_measurement_groups（来店計測地点グループ）

**BQ に無いと不足している列**

- `created` (TIMESTAMP)

---

## 確認の流れ（推奨）

1. **データセット・テーブル一覧を確認**  
   `bq ls PROJECT_ID:universegeo_dataset` で上記テーブルが存在するか確認。
2. **テーブルごとにスキーマ取得**  
   `bq show --schema --format=prettyjson "PROJECT_ID:universegeo_dataset.テーブル名" | jq ".[].name"` で列名一覧を取得。
3. **定義書と突き合わせ**  
   [BIGQUERY_TABLE_DEFINITIONS.md](../BIGQUERY_TABLE_DEFINITIONS.md) の各テーブルの CREATE 文・フィールド定義と比較し、無い列・型の違いをメモ。
4. **不足分だけ追加**  
   [BQ_ALTER_ADD_COLUMNS.sql](../BQ_ALTER_ADD_COLUMNS.sql) の該当ブロックを実行（`your_project_id` を置換）。segments の delivery_media/media_id が STRING の場合は [UPDATE_BIGQUERY_SCHEMA.md](UPDATE_BIGQUERY_SCHEMA.md) の方法2-3を実施。

---

## 参照

- 列追加の一覧・反映方法: [BQ_ADD_REQUIRED_COLUMNS.md](BQ_ADD_REQUIRED_COLUMNS.md)
- 列追加用 SQL: [BQ_ALTER_ADD_COLUMNS.sql](BQ_ALTER_ADD_COLUMNS.sql)（同フォルダ） / プロジェクトルートの `BQ_ALTER_ADD_COLUMNS.sql`
- スキーマ更新の詳細手順: [UPDATE_BIGQUERY_SCHEMA.md](UPDATE_BIGQUERY_SCHEMA.md)
- 定義書: [BIGQUERY_TABLE_DEFINITIONS.md](../BIGQUERY_TABLE_DEFINITIONS.md)
