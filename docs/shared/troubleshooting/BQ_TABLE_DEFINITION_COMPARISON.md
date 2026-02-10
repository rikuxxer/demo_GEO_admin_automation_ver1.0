# BigQuery テーブル定義 と バックエンド実装の照合結果

**作成日:** 2026年2月7日  
**参照:** [BIGQUERY_TABLE_DEFINITIONS.md](../BIGQUERY_TABLE_DEFINITIONS.md)（定義書 v2.4）、`backend/src/bigquery-client.ts`

定義書の「最新テーブル（CREATE文・フィールド定義）」と、バックエンドの insert / allowedFields が一致しているかを確認した結果です。実際の本番 BQ が定義書どおりに作成されている前提で、**コードが定義と一致しているか**を記載しています。

---

## 照合サマリ

| テーブル | 一致 | 差分メモ |
|---------|------|----------|
| projects | ✅ | 3列を allowedFields に追加済み。BQに列が無ければ [UPDATE_BIGQUERY_SCHEMA](UPDATE_BIGQUERY_SCHEMA.md) で追加推奨 |
| segments | ✅ | 6列を定義書に追記済み（実装・定義書一致） |
| pois | ✅ | 一致 |
| users | ✅ | 一致 |
| user_requests | ✅ | 一致 |
| messages | ✅ | 一致 |
| change_history | ✅ | 一致 |
| edit_requests | ✅ | 一致 |
| feature_requests | ✅ | 一致 |
| visit_measurement_groups | ✅ | 一致（detection_count は INTEGER で送信） |
| sheet_exports | ✅ | 一致 |
| sheet_export_data | ✅ | 一致 |
| report_requests | ✅ | 一致 |

---

## 1. projects

**定義書（CREATE）:**  
`project_id`, `_register_datetime`, `project_registration_started_at`, `advertiser_name`, `agency_name`, `appeal_point`, `universe_service_id`, `universe_service_name`, `delivery_start_date`, `delivery_end_date`, `person_in_charge`, `sub_person_in_charge`, `remarks`, `project_status`, `created_at`, `updated_at`

**バックエンドが送る列:**  
`project_id`, `advertiser_name`, `agency_name`, `appeal_point`, `delivery_start_date`, `delivery_end_date`, `person_in_charge`, `project_status`, `remarks`, `project_registration_started_at`, `universe_service_id`, `universe_service_name`, `sub_person_in_charge`, `_register_datetime`, `created_at`, `updated_at`

**対応:** 上記3列を allowedFields に追加済み。BQ に列が無い場合は [UPDATE_BIGQUERY_SCHEMA](UPDATE_BIGQUERY_SCHEMA.md) の「方法3: projects」で列追加を推奨。

---

## 2. segments

**定義書（CREATE・正スキーマ）:**  
`segment_id`, `project_id`, `segment_name`, `segment_registered_at`, `delivery_media` (ARRAY<STRING>), `media_id` (ARRAY<STRING>), `poi_category`, `poi_type`, `attribute`, `extraction_period`, `extraction_period_type`, `extraction_start_date`, `extraction_end_date`, `extraction_dates` (ARRAY<STRING>), `detection_count` (INT64), `detection_time_start`, `detection_time_end`, `stay_time`, `designated_radius`, `location_request_status`, `data_coordination_date`, `delivery_confirmed`, `registerd_provider_segment`, `created_at`, `updated_at`

**バックエンドが送る列:**  
定義書の全列（上記 CREATE に含む `data_link_status`, `data_link_request_date`, `data_link_scheduled_date`, `ads_account_id`, `provider_segment_id`, `segment_expire_date`）を送信している。

**型の扱い（一致）:**  
`delivery_media`/`media_id` は ARRAY<STRING>、`detection_count` は INT64、DATE/TIME/TIMESTAMP/BOOL はフォーマット関数で変換済み。

**対応:** 6列を定義書（CREATE・フィールド定義）に追記済み。実装と定義書は一致。

---

## 3. pois

**定義書（CREATE）:**  
`poi_id`, `project_id`, `segment_id`, `location_id`, `poi_name`, `address`, `latitude`, `longitude`, `prefectures` (ARRAY<STRING>), `cities` (ARRAY<STRING>), `poi_type`, `poi_category`, `designated_radius`, `setting_flag`, `visit_measurement_group_id`, `polygon` (STRING/JSON), `created_at`, `updated_at`

**バックエンド:** allowedFields と上記一致。`prefectures`/`cities` は配列、`polygon` は JSON 文字列化して送信。**一致 ✅**

---

## 4. users

**定義書（CREATE）:**  
`user_id`, `name`, `email`, `password_hash`, `role`, `department`, `is_active`, `created_at`, `updated_at`, `last_login`

**バックエンド:** 上記をすべて送信。**一致 ✅**

---

## 5. user_requests

**定義書（CREATE）:**  
`user_id`, `name`, `email`, `password_hash`, `requested_role`, `status`, `requested_at`, `department`, `reason`, `reviewed_at`, `reviewed_by`, `review_comment`

**バックエンド:** DML INSERT で上記と同じ列をパラメータで送信。**一致 ✅**

---

## 6. messages

**定義書（CREATE）:**  
`message_id`, `project_id`, `sender_id`, `sender_name`, `sender_role`, `content`, `message_type`, `is_read`, `timestamp`

**バックエンド:** allowedFields と上記一致。**一致 ✅**

---

## 7. change_history

**定義書（CREATE）:**  
`history_id`, `entity_type`, `entity_id`, `project_id`, `segment_id`, `action`, `changed_by`, `changed_at`, `changes`, `deleted_data`

**バックエンド:** 上記をすべて送信（changes/deleted_data は JSON 文字列）。**一致 ✅**

---

## 8. edit_requests

**定義書（CREATE）:**  
`request_id`, `request_type`, `target_id`, `project_id`, `segment_id`, `requested_by`, `requested_at`, `request_reason`, `status`, `changes`, `reviewed_by`, `reviewed_at`, `review_comment`

**バックエンド:** 上記をすべて送信。**一致 ✅**

---

## 9. feature_requests

**定義書（CREATE）:**  
`request_id`, `requested_by`, `requested_by_name`, `requested_at`, `title`, `description`, `category`, `priority`, `status`, `reviewed_by`, `reviewed_at`, `review_comment`, `implemented_at`

**バックエンド:** 上記をすべて送信。**一致 ✅**

---

## 10. visit_measurement_groups

**定義書（CREATE）:**  
`project_id`, `group_id`, `group_name`, `attribute`, `extraction_period`, `extraction_period_type`, `extraction_start_date`, `extraction_end_date`, `extraction_dates` (ARRAY<STRING>), `detection_count` (INTEGER), `detection_time_start`, `detection_time_end`, `stay_time`, `designated_radius`, `created`, `updated_at`

**バックエンド:** 上記をすべて送信。`detection_count` は数値（parseInt）で送信。**一致 ✅**

---

## 11. sheet_exports

**定義書（CREATE）:**  
`export_id`, `project_id`, `segment_id`, `exported_by`, `exported_by_name`, `export_status`, `spreadsheet_id`, `sheet_name`, `row_count`, `exported_at`, `completed_at`, `error_message`, `created_at`, `updated_at`

**バックエンド:** allowedFields と上記一致。**一致 ✅**

---

## 12. sheet_export_data

**定義書（CREATE）:**  
`export_data_id`, `export_id`, `project_id`, `segment_id`, `poi_id`, `category_id`, `brand_id`, `brand_name`, `poi_name`, `latitude`, `longitude`, `prefecture`, `city`, `radius`, `polygon`, `setting_flag`, `created` (STRING), `row_index`, `created_at`

**バックエンド:** 上記を送信。`created` は STRING、`created_at` は TIMESTAMP で追加。**一致 ✅**

---

## 13. report_requests

**定義書（CREATE）:**  
`request_id`, `requested_by`, `requested_by_name`, `requested_at`, `project_id`, `report_type`, `report_title`, `description`, `start_date`, `end_date`, `segment_ids` (STRING), `status`, `reviewed_by`, `reviewed_at`, `review_comment`, `report_url`, `completed_at`, `error_message`, `created_at`, `updated_at`

**バックエンド:** 上記を送信。`segment_ids` は JSON.stringify した STRING。**一致 ✅**

---

## 結論

- **定義書と完全に一致しているテーブル:** pois, users, user_requests, messages, change_history, edit_requests, feature_requests, visit_measurement_groups, sheet_exports, sheet_export_data, report_requests  
- **対応済み:**  
  - **projects:** バックエンドの allowedFields に3列を追加済み。BQ に列が無い場合は列追加を推奨（[UPDATE_BIGQUERY_SCHEMA](UPDATE_BIGQUERY_SCHEMA.md) 参照）。  
  - **segments:** バックエンドが送る6列を定義書に追記済み。

---

## 含める処理を追加するかどうかの判断

| 対象 | 追加するか | 理由 |
|------|-----------|------|
| **projects** の3列 | ✅ **追加した** | 定義書にあり、フロントから送られる可能性がある。含めておけば BQ に列があるときに欠落しない。列が無ければ無視されるだけなので安全。 |
| **segments** の6列 | ❌ **バックエンドは追加不要** | すでに allowedFields に含まれており送信している。「含める処理」は不要。定義書を実テーブル・実装に合わせて追記するかはドキュメント整備の判断。 |

---

## 1. projects の3列 — BQ にカラム追加するべきか

**推奨: 追加するべき（データを保存する場合）**

- 定義書の CREATE にはもともと `universe_service_id`, `universe_service_name`, `sub_person_in_charge` が含まれており、バックエンドもこれらを送信する。
- 本番 BQ の `projects` テーブルにこれらの列が**無い**場合、現状は `ignoreUnknownValues: true` により値は捨てられる。データを残したいなら、BQ に列を追加することを推奨する。
- 列追加手順は [UPDATE_BIGQUERY_SCHEMA.md](UPDATE_BIGQUERY_SCHEMA.md) の「方法3: projects テーブル」に記載（または同ガイドの projects 用 ALTER を参照）。

**追加しない選択**: これらの項目を永続化しない方針であれば、BQ には追加せず、定義書からも削除する運用にすること。

---

## 2. segments の6列 — 定義書に記載するべきか（今回のようなケース）

**推奨: 記載するべき**

- **理由**: バックエンドが実際に送信している列は、定義書に記載しておく方がよい。
  - 実装と BQ 仕様の一致が分かる
  - 新規テーブル作成・スキーマ更新時に漏れが防げる
  - 照合のたびに「定義書にない」と出さずに済む
- **今回のようなケース**（バックエンドが送っているが定義書にない列）では、**定義書に追記する**ことを推奨する。本ドキュメントでは segments の6列を定義書に追記済みとする。
