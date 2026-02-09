# segments テーブル: 実装と BigQuery スキーマの比較

## 正スキーマ（定義書・BQ変更後）

- **定義書**: [BIGQUERY_TABLE_DEFINITIONS.md](../BIGQUERY_TABLE_DEFINITIONS.md) の「2. segments」が正スキーマ。
- **BQ を変更する場合**: `delivery_media` / `media_id` を ARRAY&lt;STRING&gt;、`detection_count` を INT64 に揃える。手順は [UPDATE_BIGQUERY_SCHEMA.md](UPDATE_BIGQUERY_SCHEMA.md) の「方法2-3」を参照。
- **BQ 変更後**: バックエンドは **配列のまま** delivery_media / media_id を送信し、detection_count は INT64 のまま送信する実装に戻す（現在は BQ が STRING のため一時的にカンマ区切り・INT 変換している）。

## 比較サマリ（BQ がまだ STRING のとき）

| 項目 | 実装（送信） | BQ 実スキーマ | 対応 |
|------|--------------|----------------|------|
| delivery_media | ARRAY&lt;STRING&gt; | **STRING** | 実装を STRING（カンマ区切り）に合わせる |
| media_id | ARRAY&lt;STRING&gt; | **STRING** | 実装を STRING（カンマ区切り）に合わせる |
| detection_count | STRING（そのまま） | **INTEGER** | 実装で INTEGER に変換して送信 |
| extraction_period_type | 送信あり | **列なし** | ignoreUnknownValues で無視 |
| data_link_* | 送信あり | **列なし** | ignoreUnknownValues で無視 |
| ads_account_id 等 | 送信あり | **列なし** | ignoreUnknownValues で無視 |

上記の型不一致が **POST /api/segments 500 の主因**になるため、BQ を変更するまでバックエンドで BQ の型に合わせて変換している。

---

## BQ 実スキーマ（本番）

| フィールド名 | 種類 | モード |
|-------------|------|--------|
| segment_id | STRING | REQUIRED |
| project_id | STRING | REQUIRED |
| segment_name | STRING | NULLABLE |
| segment_registered_at | TIMESTAMP | NULLABLE |
| delivery_media | STRING | NULLABLE |
| media_id | STRING | NULLABLE |
| attribute | STRING | NULLABLE |
| extraction_period | STRING | NULLABLE |
| extraction_start_date | DATE | NULLABLE |
| extraction_end_date | DATE | NULLABLE |
| detection_count | INTEGER | NULLABLE |
| detection_time_start | TIME | NULLABLE |
| detection_time_end | TIME | NULLABLE |
| stay_time | STRING | NULLABLE |
| designated_radius | STRING | NULLABLE |
| location_request_status | STRING | NULLABLE |
| data_coordination_date | DATE | NULLABLE |
| delivery_confirmed | BOOLEAN | NULLABLE |
| created_at | TIMESTAMP | NULLABLE |
| updated_at | TIMESTAMP | NULLABLE |
| extraction_dates | STRING | REPEATED |
| poi_category | STRING | NULLABLE |
| registerd_provider_segment | BOOLEAN | NULLABLE |
| poi_type | STRING | NULLABLE |

**BQ に存在しない列（送信すると ignoreUnknownValues で無視）**

- extraction_period_type
- data_link_status, data_link_request_date, data_link_scheduled_date
- ads_account_id, provider_segment_id, segment_expire_date

---

## 定義書（BIGQUERY_TABLE_DEFINITIONS.md）との差

- 定義書: `delivery_media` / `media_id` を **ARRAY&lt;STRING&gt;**、`detection_count` を **STRING** と記載。
- 本番 BQ: `delivery_media` / `media_id` は **STRING**、`detection_count` は **INTEGER**。
- 本番に合わせる場合、定義書は後から実スキーマに合わせて更新する。

## 読み出し（GET）時の扱い

- BQ からは `delivery_media` / `media_id` が STRING、`detection_count` が INTEGER で返る。
- フロントは `media_id` を `Array.isArray(segment.media_id) ? segment.media_id : (segment.media_id ? [segment.media_id] : [])` で配列化して利用しているため、STRING のまま返して問題ない。
- `detection_count` は BQ が INTEGER で返すため、そのまま数値として利用できる。
