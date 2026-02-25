# BigQuery テーブル定義書

**バージョン:** 2.5
**最終更新日:** 2026年2月24日
**データベース:** Google BigQuery  
**データセット:** `universegeo_dataset`  
**備考:** 本定義書は `segments.poi_type` 追加後のテーブル定義を反映しています。本番環境におけるフロントエンドのAPI接続状況は [PRODUCTION_API_CONNECTION_STATUS.md](troubleshooting/PRODUCTION_API_CONNECTION_STATUS.md) を参照してください。

---

## 目次

1. [概要](#概要)
2. [本番環境におけるフロントエンドAPI接続状況](#本番環境におけるフロントエンドapi接続状況)
3. [テーブル一覧](#テーブル一覧)
4. [テーブル詳細定義](#テーブル詳細定義)
5. [リレーションシップ](#リレーションシップ)
6. [パーティション設定](#パーティション設定)
7. [データ型マッピング](#データ型マッピング)
8. [制約とビジネスルール](#制約とビジネスルール)

---

## 概要

UNIVERSEGEOシステムで使用するBigQueryテーブルの包括的な定義書です。

### データベース情報

- **データベース種別**: Google BigQuery
- **データセット名**: `universegeo_dataset`
- **リージョン**: `asia-northeast1` (東京)
- **文字コード**: UTF-8
- **タイムゾーン**: UTC（アプリケーション層でJSTに変換）

### 本番環境におけるフロントエンドAPI接続状況

本番環境（`VITE_API_BASE_URL` 設定時）において、フロントエンドからバックエンドAPI（BigQuery）へ接続されているリソースと、接続されずブラウザの localStorage のみを使用しているリソースがあります。

- **接続済み（本番で BigQuery を使用）**: プロジェクトの取得・作成、ユーザー一覧、ユーザー登録申請（取得・作成・承認・却下）、パスワードリセット、スプレッドシートエクスポート。
- **未接続（本番でも localStorage のみ）**: プロジェクトの更新・削除、セグメント全操作、地点（POI）全操作、メッセージ全操作、編集依頼、来店計測地点グループ、機能リクエスト、変更履歴、ユーザーの作成・更新・削除（管理画面）など。

詳細な一覧・メソッド単位の対応表は [PRODUCTION_API_CONNECTION_STATUS.md](troubleshooting/PRODUCTION_API_CONNECTION_STATUS.md) を参照してください。未接続のリソースは本番では端末ごとの localStorage にのみ保存され、BigQuery には保存・反映されません。

### 命名規則

- **テーブル名**: スネークケース（例: `visit_measurement_groups`）
- **カラム名**: スネークケース（例: `project_id`）
- **主キー**: テーブル名の単数形 + `_id`（例: `project_id`）

---

## テーブル一覧

| No | テーブル名 | 論理名 | 説明 | 主キー | パーティション | 関連テーブル |
|----|-----------|--------|------|--------|--------------|-------------|
| 1 | `projects` | 案件 | 広告主からの案件情報 | `project_id` | `_register_datetime` | `segments`, `pois`, `messages` |
| 2 | `segments` | セグメント | 配信設定の単位 | `segment_id` | `segment_registered_at` | `projects`, `pois` |
| 3 | `pois` | 地点情報 | 配信対象地点の詳細 | `poi_id` | `created_at` | `projects`, `segments`, `visit_measurement_groups` |
| 4 | `users` | ユーザー | システム利用者の情報 | `user_id` | - | `projects` |
| 5 | `user_requests` | ユーザー登録申請 | 新規ユーザー登録申請 | `user_id` | - | - |
| 6 | `messages` | メッセージ | プロジェクト内メッセージ | `message_id` | `timestamp` | `projects` |
| 7 | `change_history` | 変更履歴 | データ変更の履歴 | `history_id` | - | `projects`, `segments`, `pois` |
| 8 | `edit_requests` | 編集依頼 | 営業からの編集依頼 | `request_id` | - | `projects`, `segments`, `pois` |
| 9 | `feature_requests` | 機能リクエスト | 機能追加・改善リクエスト | `request_id` | - | - |
| 10 | `visit_measurement_groups` | 来店計測地点グループ | 来店計測地点のグループ | `group_id` | - | `projects`, `pois` |
| 11 | `sheet_exports` | スプレッドシートエクスポート履歴 | スプレッドシートへのエクスポート履歴 | `export_id` | `exported_at` | `projects`, `segments` |
| 12 | `sheet_export_data` | スプレッドシートエクスポートデータ | エクスポートされたデータの詳細 | `export_data_id` | `created_at` | `sheet_exports`, `projects`, `segments`, `pois` |
| 13 | `report_requests` | レポート作成依頼 | レポート作成依頼を管理するテーブル | `request_id` | `requested_at` | `projects` |

---

## テーブル詳細定義

### 1. projects（案件テーブル）

**説明**: 広告主からの案件情報を管理するテーブル

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.projects` (
  project_id STRING NOT NULL,
  _register_datetime TIMESTAMP,
  project_registration_started_at TIMESTAMP,
  advertiser_name STRING,
  agency_name STRING,
  appeal_point STRING,
  universe_service_id STRING,
  universe_service_name STRING,
  delivery_start_date DATE,
  delivery_end_date DATE,
  person_in_charge STRING,
  sub_person_in_charge STRING,
  remarks STRING,
  project_status STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(_register_datetime)
OPTIONS(
  description="案件情報"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `project_id` | STRING | NO | 案件ID（主キー） | `PRJ-1` |
| `_register_datetime` | TIMESTAMP | YES | 登録日時（パーティションキー） | `2025-01-13 10:00:00 UTC` |
| `project_registration_started_at` | TIMESTAMP | YES | 案件登録開始時点 | `2025-01-13 09:00:00 UTC` |
| `advertiser_name` | STRING | YES | 広告主法人名 | `株式会社サンプル` |
| `agency_name` | STRING | YES | 代理店名 | `広告代理店A` |
| `appeal_point` | STRING | YES | 訴求内容 | `新商品キャンペーン` |
| `universe_service_id` | STRING | YES | UNIVERSEサービスID | `12345` |
| `universe_service_name` | STRING | YES | UNIVERSEサービス名 | `UNIVERSE Basic` |
| `delivery_start_date` | DATE | YES | 配信開始日 | `2025-02-01` |
| `delivery_end_date` | DATE | YES | 配信終了日 | `2025-03-31` |
| `person_in_charge` | STRING | YES | 主担当者（user_id） | `user-sales-001` |
| `sub_person_in_charge` | STRING | YES | 副担当者（user_id） | `user-sales-002` |
| `remarks` | STRING | YES | 備考 | `特記事項なし` |
| `project_status` | STRING | YES | 案件ステータス | `draft`, `in_progress`, `completed` |
| `created_at` | TIMESTAMP | YES | 作成日時 | `2025-01-13 10:00:00 UTC` |
| `updated_at` | TIMESTAMP | YES | 更新日時 | `2025-01-13 10:00:00 UTC` |

**ビジネスルール**:
- `project_id`は自動採番（形式: `PRJ-{連番}`）
- `delivery_end_date`は`delivery_start_date`より後である必要がある
- `person_in_charge`は必須

---

### 2. segments（セグメントテーブル）

**説明**: 配信設定の単位を管理するテーブル

**正スキーマ（BQ変更後の目標）**: 本CREATE文が正とする。既存の BigQuery で `delivery_media` / `media_id` が STRING の場合は、[スキーマ更新ガイド](troubleshooting/UPDATE_BIGQUERY_SCHEMA.md) の「segments: delivery_media / media_id を ARRAY へ変更」を実行すること。

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.segments` (
  segment_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_name STRING,
  segment_registered_at TIMESTAMP,
  delivery_media ARRAY<STRING>,
  media_id ARRAY<STRING>,
  poi_category STRING,
  poi_type STRING,
  attribute STRING,
  extraction_period STRING,
  extraction_period_type STRING,
  extraction_start_date DATE,
  extraction_end_date DATE,
  extraction_dates ARRAY<STRING>,
  detection_count INT64,
  detection_time_start TIME,
  detection_time_end TIME,
  stay_time STRING,
  designated_radius STRING,
  location_request_status STRING,
  data_coordination_date DATE,
  delivery_confirmed BOOL,
  registerd_provider_segment BOOL DEFAULT FALSE,
  data_link_status STRING,
  data_link_request_date DATE,
  data_link_scheduled_date DATE,
  ads_account_id STRING,
  provider_segment_id STRING,
  segment_expire_date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(segment_registered_at)
OPTIONS(
  description="セグメント情報"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `segment_id` | STRING | NO | セグメントID（主キー）。バックエンドで採番する場合は `SEG-{連番}`。フロントエンドで採番する場合は配信媒体に応じ `seg-uni-{3桁}`（Universe）または `seg-ctv-{3桁}`（TVer CTV） | `SEG-1`, `seg-uni-001`, `seg-ctv-001` |
| `project_id` | STRING | NO | 案件ID（外部キー） | `PRJ-1` |
| `segment_name` | STRING | YES | セグメント名 | `セグメント1` |
| `segment_registered_at` | TIMESTAMP | YES | セグメント登録日時（パーティションキー） | `2025-01-13 10:00:00 UTC` |
| `delivery_media` | ARRAY&lt;STRING&gt; | YES | 配信媒体（複数可） | `['universe']`, `['tver_sp','tver_ctv']` |
| `media_id` | ARRAY&lt;STRING&gt; | YES | 配信媒体ID（複数可） | `['MEDIA-001']`, `['MEDIA-001','MEDIA-002']` |
| `poi_category` | STRING | YES | 地点カテゴリ（TG地点/来店計測地点） | `tg`, `visit_measurement` |
| `poi_type` | STRING | YES | 地点タイプ（当該セグメントに登録されたpoisのpoi_type、POI登録時に自動設定） | `manual`, `prefecture`, `polygon` |
| `attribute` | STRING | YES | 属性 | `detector`, `resident`, `worker` |
| `extraction_period` | STRING | YES | 抽出期間 | `1month`, `2month`, `3month` |
| `extraction_period_type` | STRING | YES | 抽出期間タイプ | `preset`, `custom`, `specific_dates` |
| `extraction_start_date` | DATE | YES | 抽出開始日 | `2025-01-01` |
| `extraction_end_date` | DATE | YES | 抽出終了日 | `2025-03-31` |
| `extraction_dates` | ARRAY<STRING> | YES | 抽出対象日付（特定日付指定時） | `['2025-01-01','2025-01-15']` |
| `detection_count` | INT64 | YES | 検知回数（数値。〇回以上の「〇」） | `1`, `2`, `3` |
| `detection_time_start` | TIME | YES | 検知時間開始 | `09:00:00` |
| `detection_time_end` | TIME | YES | 検知時間終了 | `18:00:00` |
| `stay_time` | STRING | YES | 滞在時間 | `3min`, `5min`, `10min` |
| `designated_radius` | STRING | YES | 指定半径 | `50m`, `100m`, `500m` |
| `location_request_status` | STRING | YES | 地点依頼ステータス | `not_requested`, `storing`, `completed` |
| `data_coordination_date` | DATE | YES | データ連携目途 | `2025-02-01` |
| `delivery_confirmed` | BOOL | YES | 配信確定フラグ | `true`, `false` |
| `registerd_provider_segment` | BOOL | YES | プロバイダセグメント取り込み済みフラグ | `true`, `false` |
| `data_link_status` | STRING | YES | データ連携ステータス（連携依頼前／依頼済／連携済） | `before_request`, `requested`, `linked` |
| `data_link_request_date` | DATE | YES | データ連携依頼日 | `2025-01-13` |
| `data_link_scheduled_date` | DATE | YES | 連携予定日 | `2025-02-01` |
| `ads_account_id` | STRING | YES | AdsアカウントID | `17890` |
| `provider_segment_id` | STRING | YES | プロバイダセグメントID（管理部入力） | - |
| `segment_expire_date` | DATE | YES | セグメント有効期限（データ連携完了から6ヶ月後等） | `2025-08-01` |
| `created_at` | TIMESTAMP | YES | 作成日時 | `2025-01-13 10:00:00 UTC` |
| `updated_at` | TIMESTAMP | YES | 更新日時 | `2025-01-13 10:00:00 UTC` |

**ビジネスルール**:
- `segment_id`は自動採番。バックエンドで採番する場合の形式は `SEG-{連番}`。現状のフロントエンド（本番含む）では配信媒体に応じ `seg-uni-{3桁}` または `seg-ctv-{3桁}` を採番する実装があり、本番ではセグメントがAPI未接続のため BigQuery には保存されない（[本番API接続状況](troubleshooting/PRODUCTION_API_CONNECTION_STATUS.md) 参照）。
- `project_id`は必須（`projects`テーブルに存在する必要がある）
- `poi_category`は自動設定（UIのタブ情報から判定、デフォルトは`'tg'`）
- `poi_type`はPOI登録時に自動設定（当該セグメントに属する地点のタイプ。同一セグメント内は1種類に限定）
- `extraction_end_date`は`extraction_start_date`より後である必要がある

---

### 3. pois（地点情報テーブル）

**説明**: 配信対象地点の詳細を管理するテーブル

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.pois` (
  poi_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_id STRING,
  location_id STRING,
  poi_name STRING NOT NULL,
  address STRING,
  latitude FLOAT64,
  longitude FLOAT64,
  prefectures ARRAY<STRING>,
  cities ARRAY<STRING>,
  poi_type STRING,
  poi_category STRING,
  designated_radius STRING,
  setting_flag STRING,
  visit_measurement_group_id STRING,
  polygon STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(created_at)
OPTIONS(
  description="POI（地点）情報"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `poi_id` | STRING | NO | 地点ID（主キー） | `POI-1` |
| `project_id` | STRING | NO | 案件ID（外部キー） | `PRJ-1` |
| `segment_id` | STRING | YES | セグメントID（外部キー） | `SEG-1` |
| `location_id` | STRING | YES | 地点ID（自動採番） | `TG-SEG-001-001`, `VM-001` |
| `poi_name` | STRING | NO | 地点名 | `東京駅` |
| `address` | STRING | YES | 住所 | `東京都千代田区丸の内1-1-1` |
| `latitude` | FLOAT64 | YES | 緯度 | `35.681236` |
| `longitude` | FLOAT64 | YES | 経度 | `139.767125` |
| `prefectures` | ARRAY<STRING> | YES | 都道府県リスト | `["東京都"]` |
| `cities` | ARRAY<STRING> | YES | 市区町村リスト | `["千代田区", "中央区"]` |
| `poi_type` | STRING | YES | 地点タイプ | `manual`, `prefecture`, `polygon` |
| `poi_category` | STRING | YES | 地点カテゴリ | `tg`, `visit_measurement` |
| `designated_radius` | STRING | YES | 指定半径 | `50m`, `100m` |
| `setting_flag` | STRING | YES | 設定フラグ（値は下表参照） | `2` |
| `visit_measurement_group_id` | STRING | YES | 来店計測地点グループID | `VMG-1` |
| `polygon` | STRING | YES | ポリゴン座標（JSON文字列） | `"[[35.681236, 139.767125], ...]"` |
| `created_at` | TIMESTAMP | YES | 作成日時 | `2025-01-13 10:00:00 UTC` |
| `updated_at` | TIMESTAMP | YES | 更新日時 | `2025-01-13 10:00:00 UTC` |

**setting_flag 値の定義**:

| 値 | 意味 | 格納形式 |
|----|------|----------|
| `2` | カテゴリ選択（1-999m） | `category_id` = `9900XXXX`、`radius` は空 |
| `4` | 自由入力半径（1000m以上） | `category_id` は空、`radius` に直接値 |
| `5` | ポリゴン指定 | `polygon` に座標データ |
| `6` | 都道府県・市区町村指定（検知者） | `prefecture` / `city` に値 |
| `7` | 都道府県・市区町村指定（居住者）または緯度半径ベース居住者 | - |
| `8` | 都道府県・市区町村指定（勤務者）または緯度半径ベース勤務者 | - |

**ビジネスルール**:
- `poi_id`は自動採番（形式: `POI-{連番}`）
- `location_id`は自動採番
  - TG地点: `TG-{segment_id}-{連番}`（セグメント単位で連番）
  - 来店計測地点: `VM-{連番}`（プロジェクト全体で連番）
- `poi_name`は必須
- `poi_type`が`polygon`の場合、`polygon`フィールドに座標データが必須
- `polygon`はJSON文字列形式で保存（`number[][]`をJSON.stringifyしたもの）
- `segment_id`はTG地点の場合は必須、来店計測地点（`poi_category = 'visit_measurement'`）の場合はNULL
- `visit_measurement_group_id`は来店計測地点（`poi_category = 'visit_measurement'`）の場合は必須、TG地点の場合はNULL

---

### 4. users（ユーザーテーブル）

**説明**: システム利用者の情報を管理するテーブル

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.users` (
  user_id STRING NOT NULL,
  name STRING NOT NULL,
  email STRING NOT NULL,
  password_hash STRING NOT NULL,
  role STRING NOT NULL,
  department STRING,
  is_active BOOL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  last_login TIMESTAMP
)
OPTIONS(
  description="ユーザー情報"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `user_id` | STRING | NO | ユーザーID（主キー） | `user-admin-001` |
| `name` | STRING | NO | ユーザー名 | `管理太郎` |
| `email` | STRING | NO | メールアドレス（ユニーク） | `admin@example.com` |
| `password_hash` | STRING | NO | パスワードハッシュ | `$2b$10$...` |
| `role` | STRING | NO | ロール | `admin`, `sales` |
| `department` | STRING | YES | 部署 | `営業部` |
| `is_active` | BOOL | YES | 有効フラグ | `true`, `false` |
| `created_at` | TIMESTAMP | YES | 作成日時 | `2025-01-13 10:00:00 UTC` |
| `updated_at` | TIMESTAMP | YES | 更新日時 | `2025-01-13 10:00:00 UTC` |
| `last_login` | TIMESTAMP | YES | 最終ログイン日時 | `2025-01-13 10:00:00 UTC` |

**ビジネスルール**:
- `email`はユニーク（重複不可）
- `role`は`admin`または`sales`のみ
- `password_hash`はbcryptでハッシュ化

---

### 5. user_requests（ユーザー登録申請テーブル）

**説明**: 新規ユーザー登録申請を管理するテーブル

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.user_requests` (
  user_id STRING NOT NULL,
  name STRING,
  email STRING,
  password_hash STRING,
  requested_role STRING,
  status STRING,
  requested_at TIMESTAMP,
  department STRING,
  reason STRING,
  reviewed_at TIMESTAMP,
  reviewed_by STRING,
  review_comment STRING
)
OPTIONS(
  description="ユーザー登録申請"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `user_id` | STRING | NO | ユーザーID（主キー） | `user-request-001` |
| `name` | STRING | YES | ユーザー名 | `申請太郎` |
| `email` | STRING | YES | メールアドレス | `request@example.com` |
| `password_hash` | STRING | YES | パスワードハッシュ | `$2b$10$...` |
| `requested_role` | STRING | YES | 申請ロール | `admin`, `sales` |
| `status` | STRING | YES | ステータス | `pending`, `approved`, `rejected` |
| `requested_at` | TIMESTAMP | YES | 申請日時 | `2025-01-13 10:00:00 UTC` |
| `department` | STRING | YES | 部署 | `営業部` |
| `reason` | STRING | YES | 申請理由 | `新規入社` |
| `reviewed_at` | TIMESTAMP | YES | レビュー日時 | `2025-01-13 11:00:00 UTC` |
| `reviewed_by` | STRING | YES | レビュー者（user_id） | `user-admin-001` |
| `review_comment` | STRING | YES | レビューコメント | `承認しました` |

**ビジネスルール**:
- `status`は`pending`, `approved`, `rejected`のみ
- 承認された場合、`users`テーブルに登録される

---

### 6. messages（メッセージテーブル）

**説明**: プロジェクト内メッセージ（管理部⇔営業の連絡）を管理するテーブル

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.messages` (
  message_id STRING NOT NULL,
  project_id STRING NOT NULL,
  sender_id STRING NOT NULL,
  sender_name STRING NOT NULL,
  sender_role STRING NOT NULL,
  content STRING NOT NULL,
  message_type STRING,
  is_read BOOL DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(timestamp)
OPTIONS(
  description="プロジェクトメッセージ"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `message_id` | STRING | NO | メッセージID（主キー） | `MSG-1` |
| `project_id` | STRING | NO | 案件ID（外部キー） | `PRJ-1` |
| `sender_id` | STRING | NO | 送信者ID（user_id） | `user-admin-001` |
| `sender_name` | STRING | NO | 送信者名 | `管理太郎` |
| `sender_role` | STRING | NO | 送信者ロール | `admin`, `sales` |
| `content` | STRING | NO | メッセージ本文 | `確認しました` |
| `message_type` | STRING | YES | メッセージタイプ | `inquiry`, `reply`, `system` |
| `is_read` | BOOL | YES | 既読フラグ | `true`, `false` |
| `timestamp` | TIMESTAMP | YES | 送信日時（パーティションキー） | `2025-01-13 10:00:00 UTC` |

**ビジネスルール**:
- `message_id`は自動採番
- `project_id`は必須（`projects`テーブルに存在する必要がある）

---

### 7. change_history（変更履歴テーブル）

**説明**: データ変更の履歴を管理するテーブル

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.change_history` (
  history_id STRING NOT NULL,
  entity_type STRING NOT NULL,
  entity_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_id STRING,
  action STRING NOT NULL,
  changed_by STRING NOT NULL,
  changed_at TIMESTAMP NOT NULL,
  changes STRING,
  deleted_data STRING
)
OPTIONS(
  description="変更履歴"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `history_id` | STRING | NO | 履歴ID（主キー） | `HIS-20250113-001` |
| `entity_type` | STRING | NO | エンティティ種別 | `project`, `segment`, `poi` |
| `entity_id` | STRING | NO | エンティティID | `PRJ-1`, `SEG-1`, `POI-1` |
| `project_id` | STRING | NO | 案件ID（検索用） | `PRJ-1` |
| `segment_id` | STRING | YES | セグメントID | `SEG-1` |
| `action` | STRING | NO | 操作種別 | `create`, `update`, `delete` |
| `changed_by` | STRING | NO | 変更者（user_id） | `user-admin-001` |
| `changed_at` | TIMESTAMP | NO | 変更日時 | `2025-01-13 10:00:00 UTC` |
| `changes` | STRING | YES | 変更内容（JSON文字列） | `{"field": {"before": "A", "after": "B"}}` |
| `deleted_data` | STRING | YES | 削除されたデータ（JSON文字列） | `{"poi_id": "POI-1", ...}` |

**ビジネスルール**:
- `history_id`は自動採番（形式: `HIS-{YYYYMMDD}-{連番}`）
- `entity_type`は`project`, `segment`, `poi`のみ
- `action`は`create`, `update`, `delete`のみ
- `changes`と`deleted_data`はJSON文字列形式で保存

---

### 8. edit_requests（編集依頼テーブル）

**説明**: 営業からの編集依頼を管理するテーブル

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.edit_requests` (
  request_id STRING NOT NULL,
  request_type STRING NOT NULL,
  target_id STRING NOT NULL,
  project_id STRING NOT NULL,
  segment_id STRING,
  requested_by STRING NOT NULL,
  requested_at TIMESTAMP NOT NULL,
  request_reason STRING NOT NULL,
  status STRING NOT NULL,
  changes STRING,
  reviewed_by STRING,
  reviewed_at TIMESTAMP,
  review_comment STRING
)
OPTIONS(
  description="編集依頼"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `request_id` | STRING | NO | 依頼ID（主キー） | `REQ-20250113-001` |
| `request_type` | STRING | NO | 依頼種別 | `project`, `segment`, `poi` |
| `target_id` | STRING | NO | 修正対象のID | `PRJ-1`, `SEG-1`, `POI-1` |
| `project_id` | STRING | NO | 案件ID（検索用） | `PRJ-1` |
| `segment_id` | STRING | YES | セグメントID | `SEG-1` |
| `requested_by` | STRING | NO | 依頼者（user_id） | `user-sales-001` |
| `requested_at` | TIMESTAMP | NO | 依頼日時 | `2025-01-13 10:00:00 UTC` |
| `request_reason` | STRING | NO | 修正理由 | `誤字修正` |
| `status` | STRING | NO | ステータス | `pending`, `approved`, `rejected`, `withdrawn` |
| `changes` | STRING | YES | 変更内容（JSON文字列） | `{"field": {"before": "A", "after": "B"}}` |
| `reviewed_by` | STRING | YES | 承認/却下した管理者（user_id） | `user-admin-001` |
| `reviewed_at` | TIMESTAMP | YES | 承認/却下日時 | `2025-01-13 11:00:00 UTC` |
| `review_comment` | STRING | YES | 承認/却下時のコメント | `承認しました` |

**ビジネスルール**:
- `request_id`は自動採番（形式: `REQ-{YYYYMMDD}-{連番}`）
- `request_type`は`project`, `segment`, `poi`のみ
- `status`は`pending`, `approved`, `rejected`, `withdrawn`のみ
- 承認された場合、該当テーブルが更新される

---

### 9. feature_requests（機能リクエストテーブル）

**説明**: 機能追加・改善リクエストを管理するテーブル

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.feature_requests` (
  request_id STRING NOT NULL,
  requested_by STRING NOT NULL,
  requested_by_name STRING NOT NULL,
  requested_at TIMESTAMP NOT NULL,
  title STRING NOT NULL,
  description STRING NOT NULL,
  category STRING NOT NULL,
  priority STRING NOT NULL,
  status STRING NOT NULL,
  reviewed_by STRING,
  reviewed_at TIMESTAMP,
  review_comment STRING,
  implemented_at TIMESTAMP
)
OPTIONS(
  description="機能リクエスト"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `request_id` | STRING | NO | リクエストID（主キー） | `FRQ-20250113-001` |
| `requested_by` | STRING | NO | 依頼者（user_id） | `user-sales-001` |
| `requested_by_name` | STRING | NO | 依頼者名 | `営業太郎` |
| `requested_at` | TIMESTAMP | NO | 依頼日時 | `2025-01-13 10:00:00 UTC` |
| `title` | STRING | NO | リクエストタイトル | `新機能追加` |
| `description` | STRING | NO | リクエスト詳細説明 | `詳細な説明...` |
| `category` | STRING | NO | カテゴリ | `new_feature`, `improvement`, `bug_fix`, `other` |
| `priority` | STRING | NO | 優先度 | `low`, `medium`, `high` |
| `status` | STRING | NO | ステータス | `pending`, `under_review`, `approved`, `rejected`, `implemented` |
| `reviewed_by` | STRING | YES | レビューした管理者（user_id） | `user-admin-001` |
| `reviewed_at` | TIMESTAMP | YES | レビュー日時 | `2025-01-13 11:00:00 UTC` |
| `review_comment` | STRING | YES | レビューコメント | `検討します` |
| `implemented_at` | TIMESTAMP | YES | 実装日時 | `2025-01-20 10:00:00 UTC` |

**ビジネスルール**:
- `request_id`は自動採番（形式: `FRQ-{YYYYMMDD}-{連番}`）
- `category`は`new_feature`, `improvement`, `bug_fix`, `other`のみ
- `priority`は`low`, `medium`, `high`のみ
- `status`は`pending`, `under_review`, `approved`, `rejected`, `implemented`のみ

---

### 10. visit_measurement_groups（来店計測地点グループテーブル）

**説明**: 来店計測地点のグループを管理するテーブル

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.visit_measurement_groups` (
  project_id STRING NOT NULL,
  group_id STRING NOT NULL,
  group_name STRING NOT NULL,
  attribute STRING,
  extraction_period STRING,
  extraction_period_type STRING,
  extraction_start_date DATE,
  extraction_end_date DATE,
  extraction_dates ARRAY<STRING>,
  detection_count INTEGER,
  detection_time_start TIME,
  detection_time_end TIME,
  stay_time STRING,
  designated_radius STRING,
  created TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
OPTIONS(
  description="来店計測地点グループ"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `project_id` | STRING | NO | 案件ID（外部キー） | `PRJ-1` |
| `group_id` | STRING | NO | グループID（主キー） | `VMG-1` |
| `group_name` | STRING | NO | グループ名 | `グループA` |
| `attribute` | STRING | YES | 属性 | `detector`, `resident`, `worker`, `resident_and_worker` |
| `extraction_period` | STRING | YES | 抽出期間 | `1month`, `2month`, `3month` |
| `extraction_period_type` | STRING | YES | 抽出期間タイプ | `preset`, `custom`, `specific_dates` |
| `extraction_start_date` | DATE | YES | 抽出開始日 | `2025-01-01` |
| `extraction_end_date` | DATE | YES | 抽出終了日 | `2025-03-31` |
| `extraction_dates` | ARRAY<STRING> | YES | 抽出対象日付（特定日付指定時） | `['2025-01-01','2025-01-15']` |
| `detection_count` | INTEGER | YES | 検知回数 | `1` |
| `detection_time_start` | TIME | YES | 検知時間開始 | `09:00:00` |
| `detection_time_end` | TIME | YES | 検知時間終了 | `18:00:00` |
| `stay_time` | STRING | YES | 滞在時間 | `3min`, `5min`, `10min` |
| `designated_radius` | STRING | YES | 指定半径 | `50m`, `100m`, `500m` |
| `created` | TIMESTAMP | YES | 作成日時 | `2025-01-13 10:00:00 UTC` |
| `updated_at` | TIMESTAMP | YES | 更新日時 | `2025-01-13 10:00:00 UTC` |

**ビジネスルール**:
- `group_id`は自動採番（形式: `VMG-{連番}`）
- `project_id`は必須（`projects`テーブルに存在する必要がある）
- 1つのプロジェクトに複数のグループを作成可能
- `designated_radius`は必須
- `extraction_end_date`は`extraction_start_date`より後である必要がある
- `attribute`が`resident`、`worker`、`resident_and_worker`の場合は、`extraction_period`は`3month`に固定

---

### 11. sheet_exports（スプレッドシートエクスポート履歴テーブル）

**説明**: スプレッドシートへのエクスポート履歴を管理するテーブル

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.sheet_exports` (
  export_id        STRING,
  project_id       STRING,
  segment_id       STRING,
  exported_by      STRING,
  exported_by_name STRING,
  export_status    STRING,
  spreadsheet_id   STRING,
  sheet_name       STRING,
  row_count        INT64,
  exported_at      TIMESTAMP,
  completed_at     TIMESTAMP,
  error_message    STRING,
  created_at       TIMESTAMP,
  updated_at       TIMESTAMP
)
OPTIONS(
  description="スプレッドシートエクスポート履歴"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `export_id` | STRING | NO | エクスポートID（主キー） | `EXP-20250113-001` |
| `project_id` | STRING | NO | 案件ID（外部キー） | `PRJ-1` |
| `segment_id` | STRING | YES | セグメントID（外部キー） | `SEG-1` |
| `exported_by` | STRING | NO | エクスポート実行者（user_id） | `user-sales-001` |
| `exported_by_name` | STRING | NO | エクスポート実行者名 | `営業太郎` |
| `export_status` | STRING | NO | エクスポートステータス | `pending`, `completed`, `failed` |
| `spreadsheet_id` | STRING | YES | スプレッドシートID | `1a2b3c4d5e6f7g8h` |
| `sheet_name` | STRING | YES | シート名 | `シート1` |
| `row_count` | INTEGER | YES | エクスポート行数 | `100` |
| `exported_at` | TIMESTAMP | NO | エクスポート開始日時（パーティションキー） | `2025-01-13 10:00:00 UTC` |
| `completed_at` | TIMESTAMP | YES | エクスポート完了日時 | `2025-01-13 10:01:00 UTC` |
| `error_message` | STRING | YES | エラーメッセージ | `API Error: 403` |
| `created_at` | TIMESTAMP | YES | 作成日時 | `2025-01-13 10:00:00 UTC` |
| `updated_at` | TIMESTAMP | YES | 更新日時 | `2025-01-13 10:01:00 UTC` |

**ビジネスルール**:
- `export_id`は自動採番（形式: `EXP-{YYYYMMDD}-{連番}`）
- `export_status`は`pending`, `completed`, `failed`のみ
- `project_id`は必須（`projects`テーブルに存在する必要がある）

---

### 12. sheet_export_data（スプレッドシートエクスポートデータテーブル）

**説明**: エクスポートされたデータの詳細を保存するテーブル

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.sheet_export_data` (
  export_data_id STRING,
  export_id      STRING,
  project_id     STRING,
  segment_id     STRING,
  poi_id         STRING,
  category_id    STRING,
  brand_id       STRING,
  brand_name     STRING,
  poi_name       STRING,
  latitude       FLOAT64,
  longitude      FLOAT64,
  prefecture     STRING,
  city           STRING,
  radius         STRING,
  polygon        STRING,
  setting_flag   STRING,
  created        STRING,
  row_index      INT64
)
OPTIONS(
  description="スプレッドシートエクスポートデータ"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `export_data_id` | STRING | NO | エクスポートデータID（主キー） | `EXPD-20250113-001-001` |
| `export_id` | STRING | NO | エクスポートID（外部キー） | `EXP-20250113-001` |
| `project_id` | STRING | NO | 案件ID（外部キー） | `PRJ-1` |
| `segment_id` | STRING | YES | セグメントID（外部キー） | `SEG-1` |
| `poi_id` | STRING | YES | 地点ID（外部キー） | `POI-1` |
| `category_id` | STRING | YES | カテゴリID | `99000050` |
| `brand_id` | STRING | YES | ブランドID | - |
| `brand_name` | STRING | YES | ブランド名 | `サンプルブランド` |
| `poi_name` | STRING | YES | 地点名 | `東京駅` |
| `latitude` | FLOAT64 | YES | 緯度 | `35.681236` |
| `longitude` | FLOAT64 | YES | 経度 | `139.767125` |
| `prefecture` | STRING | YES | 都道府県 | `東京都` |
| `city` | STRING | YES | 市区町村 | `千代田区` |
| `radius` | STRING | YES | 半径 | `50m` |
| `polygon` | STRING | YES | ポリゴン（JSON文字列） | `"[[35.681236, 139.767125], ...]"` |
| `setting_flag` | STRING | YES | 設定フラグ（値の定義は pois テーブルの setting_flag を参照） | `2` |
| `created` | STRING | YES | 作成日（YYYY/MM/DD形式） | `2025/01/13` |
| `row_index` | INT64 | YES | 行番号（スプレッドシート内） | `1` |

**ビジネスルール**:
- `export_data_id`は自動採番（形式: `EXPD-{export_id}-{連番}`）
- `export_id`は必須（`sheet_exports`テーブルに存在する必要がある）
- `row_index`は1から始まる連番

---

### 13. report_requests（レポート作成依頼テーブル）

**説明**: レポート作成依頼を管理するテーブル

**CREATE文**:
```sql
CREATE TABLE `universegeo_dataset.report_requests` (
  request_id STRING NOT NULL,
  requested_by STRING NOT NULL,
  requested_by_name STRING NOT NULL,
  requested_at TIMESTAMP NOT NULL,
  project_id STRING NOT NULL,
  report_type STRING NOT NULL,
  report_title STRING NOT NULL,
  description STRING,
  start_date DATE,
  end_date DATE,
  segment_ids STRING,
  status STRING NOT NULL,
  reviewed_by STRING,
  reviewed_at TIMESTAMP,
  review_comment STRING,
  report_url STRING,
  completed_at TIMESTAMP,
  error_message STRING,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP(),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(requested_at)
OPTIONS(
  description="レポート作成依頼"
);
```

**フィールド定義**:

| フィールド名 | データ型 | NULL | 説明 | 例 |
|------------|---------|------|------|-----|
| `request_id` | STRING | NO | リクエストID（主キー） | `RPT-20250113-001` |
| `requested_by` | STRING | NO | 依頼者（user_id） | `user-sales-001` |
| `requested_by_name` | STRING | NO | 依頼者名 | `営業太郎` |
| `requested_at` | TIMESTAMP | NO | 依頼日時（パーティションキー） | `2025-01-13 10:00:00 UTC` |
| `project_id` | STRING | NO | 案件ID（外部キー） | `PRJ-1` |
| `report_type` | STRING | NO | レポート種別 | `delivery_performance`, `effectiveness`, `custom` |
| `report_title` | STRING | NO | レポートタイトル | `2025年1月配信実績レポート` |
| `description` | STRING | YES | レポート説明 | `詳細な説明...` |
| `start_date` | DATE | YES | 期間開始日 | `2025-01-01` |
| `end_date` | DATE | YES | 期間終了日 | `2025-01-31` |
| `segment_ids` | STRING | YES | 対象セグメントID（JSON配列形式） | `["SEG-1", "SEG-2"]` |
| `status` | STRING | NO | ステータス | `pending`, `approved`, `rejected`, `in_progress`, `completed`, `failed` |
| `reviewed_by` | STRING | YES | レビューした管理者（user_id） | `user-admin-001` |
| `reviewed_at` | TIMESTAMP | YES | レビュー日時 | `2025-01-13 11:00:00 UTC` |
| `review_comment` | STRING | YES | レビューコメント | `承認しました` |
| `report_url` | STRING | YES | 生成されたレポートのURL | `https://storage.googleapis.com/...` |
| `completed_at` | TIMESTAMP | YES | レポート生成完了日時 | `2025-01-13 12:00:00 UTC` |
| `error_message` | STRING | YES | エラーメッセージ | `レポート生成に失敗しました` |
| `created_at` | TIMESTAMP | YES | 作成日時 | `2025-01-13 10:00:00 UTC` |
| `updated_at` | TIMESTAMP | YES | 更新日時 | `2025-01-13 12:00:00 UTC` |

**ビジネスルール**:
- `request_id`は自動採番（形式: `RPT-{YYYYMMDD}-{連番}`）
- `report_type`は`delivery_performance`, `effectiveness`, `custom`のみ
- `status`は`pending`, `approved`, `rejected`, `in_progress`, `completed`, `failed`のみ
- `project_id`は必須（`projects`テーブルに存在する必要がある）
- `end_date`は`start_date`より後である必要がある
- `segment_ids`はJSON配列形式の文字列として保存（例: `["SEG-1", "SEG-2"]`）

---

## リレーションシップ

### ER図（概念図）

```
projects (1) ──< (N) segments
projects (1) ──< (N) pois
projects (1) ──< (N) messages
segments (1) ──< (N) pois
projects (1) ──< (N) visit_measurement_groups
visit_measurement_groups (1) ──< (N) pois (visit_measurement_group_id)
projects (1) ──< (N) sheet_exports
segments (1) ──< (N) sheet_exports
sheet_exports (1) ──< (N) sheet_export_data
projects (1) ──< (N) sheet_export_data
segments (1) ──< (N) sheet_export_data
pois (1) ──< (N) sheet_export_data
users (1) ──< (N) projects (person_in_charge, sub_person_in_charge)
users (1) ──< (N) change_history (changed_by)
users (1) ──< (N) edit_requests (requested_by, reviewed_by)
users (1) ──< (N) feature_requests (requested_by, reviewed_by)
users (1) ──< (N) sheet_exports (exported_by)
projects (1) ──< (N) report_requests
users (1) ──< (N) report_requests (requested_by, reviewed_by)
```

### 外部キー制約

BigQueryでは外部キー制約はサポートされていませんが、アプリケーション層で整合性を保証する必要があります。

**主要なリレーションシップ**:

1. **projects → segments**: `segments.project_id` → `projects.project_id`
2. **projects → pois**: `pois.project_id` → `projects.project_id`
3. **segments → pois**: `pois.segment_id` → `segments.segment_id`
4. **projects → messages**: `messages.project_id` → `projects.project_id`
5. **projects → visit_measurement_groups**: `visit_measurement_groups.project_id` → `projects.project_id`
6. **visit_measurement_groups → pois**: `pois.visit_measurement_group_id` → `visit_measurement_groups.group_id`
7. **projects → sheet_exports**: `sheet_exports.project_id` → `projects.project_id`
8. **segments → sheet_exports**: `sheet_exports.segment_id` → `segments.segment_id`
9. **sheet_exports → sheet_export_data**: `sheet_export_data.export_id` → `sheet_exports.export_id`
10. **projects → sheet_export_data**: `sheet_export_data.project_id` → `projects.project_id`
11. **segments → sheet_export_data**: `sheet_export_data.segment_id` → `segments.segment_id`
12. **pois → sheet_export_data**: `sheet_export_data.poi_id` → `pois.poi_id`
13. **users → projects**: `projects.person_in_charge` → `users.user_id`, `projects.sub_person_in_charge` → `users.user_id`
14. **users → sheet_exports**: `sheet_exports.exported_by` → `users.user_id`
15. **projects → report_requests**: `report_requests.project_id` → `projects.project_id`
16. **users → report_requests**: `report_requests.requested_by` → `users.user_id`, `report_requests.reviewed_by` → `users.user_id`

---

## パーティション設定

### パーティション対象テーブル

| テーブル名 | パーティションキー | パーティションタイプ | 説明 |
|-----------|------------------|-------------------|------|
| `projects` | `_register_datetime` | DATE | 登録日でパーティション分割 |
| `segments` | `segment_registered_at` | DATE | 登録日でパーティション分割 |
| `pois` | `created_at` | DATE | 作成日でパーティション分割 |
| `messages` | `timestamp` | DATE | 送信日でパーティション分割 |
| `report_requests` | `requested_at` | DATE | 依頼日でパーティション分割 |

### パーティションの効果

- **クエリパフォーマンス向上**: 必要なパーティションのみスキャン
- **コスト削減**: スキャン量の削減（パーティションプルーニング）
- **データ管理**: 古いパーティションの削除が容易

### パーティション有効期限の設定（推奨）

```sql
-- POIテーブル: 3年で自動削除
ALTER TABLE `universegeo_dataset.pois`
SET OPTIONS(
  partition_expiration_days=1095
);

-- セグメントテーブル: 3年で自動削除
ALTER TABLE `universegeo_dataset.segments`
SET OPTIONS(
  partition_expiration_days=1095
);

-- プロジェクトテーブル: 5年で自動削除
ALTER TABLE `universegeo_dataset.projects`
SET OPTIONS(
  partition_expiration_days=1825
);
```

---

## データ型マッピング

### TypeScript → BigQuery

| TypeScript型 | BigQuery型 | 説明 |
|------------|-----------|------|
| `string` | `STRING` | 文字列 |
| `number` | `FLOAT64` | 浮動小数点数 |
| `number` | `INTEGER` | 整数（`detection_count`など） |
| `boolean` | `BOOL` | 真偽値 |
| `string[]` | `ARRAY<STRING>` | 文字列配列 |
| `number[][]` | `STRING` (JSON) | 2次元配列（`polygon`など） |
| `Date` | `DATE` | 日付 |
| `Date` | `TIMESTAMP` | 日時 |
| `Date` | `TIME` | 時刻 |

### 特殊なデータ型

- **`polygon`**: `number[][]`をJSON文字列として保存
  - 例: `"[[35.681236, 139.767125], [35.682236, 139.768125]]"`
- **`changes` / `deleted_data`**: `Record<string, any>`をJSON文字列として保存
  - 例: `"{\"field\": {\"before\": \"A\", \"after\": \"B\"}}"`
- **`sheet_export_data.polygon`**: エクスポート時のポリゴンデータ（JSON文字列）

---

## 制約とビジネスルール

### 主キー制約

すべてのテーブルで主キーが設定されています：
- `projects.project_id`
- `segments.segment_id`
- `pois.poi_id`
- `users.user_id`
- `user_requests.user_id`
- `messages.message_id`
- `change_history.history_id`
- `edit_requests.request_id`
- `feature_requests.request_id`
- `visit_measurement_groups.group_id`
- `sheet_exports.export_id`
- `sheet_export_data.export_data_id`

### ユニーク制約

- `users.email`: メールアドレスはユニーク

### チェック制約（アプリケーション層で実装）

1. **日付の整合性**:
   - `projects.delivery_end_date` > `projects.delivery_start_date`
   - `segments.extraction_end_date` > `segments.extraction_start_date`

2. **列挙値の制約**:
   - `users.role`: `admin`, `sales`のみ
   - `pois.poi_type`: `manual`, `prefecture`, `polygon`のみ
   - `pois.poi_category`: `tg`, `visit_measurement`のみ
   - `segments.poi_type`: `manual`, `prefecture`, `polygon`のみ（POI登録時に自動設定、未登録時はNULL）
- `edit_requests.status`: `pending`, `approved`, `rejected`, `withdrawn`のみ
- `feature_requests.status`: `pending`, `under_review`, `approved`, `rejected`, `implemented`のみ
- `sheet_exports.export_status`: `pending`, `completed`, `failed`のみ

3. **必須フィールド**:
   - `projects.person_in_charge`: 必須
   - `pois.poi_name`: 必須
   - `pois.polygon`: `poi_type`が`polygon`の場合、必須

4. **自動採番ルール**:
   - `location_id`:
     - TG地点: `TG-{segment_id}-{連番}`（セグメント単位で連番）
     - 来店計測地点: `VM-{連番}`（プロジェクト全体で連番）

---

## 定義書診断（2026-01-28・poi_type 追加後）

- **segments**: CREATE文・フィールド定義はバックエンド実装と一致（`delivery_media`・`media_id` を ARRAY&lt;STRING&gt;、`detection_count` を INT64、`poi_category`、**`poi_type`**（POI登録時に自動記録）、`registerd_provider_segment`、`extraction_dates` ARRAY&lt;STRING&gt; を反映済み）。本定義が正スキーマ。既存BQで delivery_media/media_id が STRING の場合は [UPDATE_BIGQUERY_SCHEMA](troubleshooting/UPDATE_BIGQUERY_SCHEMA.md) のマイグレーションを実行すること。
- **pois**: `prefectures`/`cities` ARRAY&lt;STRING&gt;、`polygon` STRING（JSON）は実装と一致。`location_id`の例をビジネスルール（TG-{segment_id}-{連番}）に合わせて `TG-SEG-001-001` に修正済み。
- **projects**: ドキュメントのCREATE文には `universe_service_id`、`universe_service_name`、`sub_person_in_charge` が含まれるが、バックエンドは「スキーマに存在しない」としてこれらを除外している。実際のBQテーブルにこれらの列がある場合は、バックエンドの `allowedFields` への追加を検討すること。
- **表記**: `registerd_provider_segment` は BQ 列名上の typo（正しくは registered）のため、既存テーブル・コードと合わせて表記を統一している。

---

## 更新履歴

- **2025-01-13**: 初版作成（全10テーブルの定義を追加）
- **2025-01-13**: `polygon`フィールドの説明を追加
- **2025-01-13**: `sheet_exports`と`sheet_export_data`テーブルを追加（全12テーブル）
- **2026-01-19**: `segments`テーブルに`extraction_dates`カラム（ARRAY<STRING>）を追加。`extraction_period_type`に`'specific_dates'`オプションを追加
- **2026-01-22**: `segments`テーブルに`poi_category`カラム（STRING）を追加。TG地点/来店計測地点の判定を可能に（UIのタブ情報から自動判定、デフォルトは`'tg'`）
- **2026-01-22**: `segments`テーブルに`registerd_provider_segment`カラム（BOOL）を追加。プロバイダセグメント取り込み済み状態の判定を可能に（デフォルトは`FALSE`）
- **2026-01-28**: `segments.delivery_media`をSTRINGからARRAY&lt;STRING&gt;に変更（配信媒体の複数指定に対応）。定義書診断セクションを追加。`pois.location_id`の例をビジネスルールに合わせて修正。バージョン2.2・最終更新日を更新
- **2026-01-28**: `segments.media_id`をSTRINGからARRAY&lt;STRING&gt;に変更（配信媒体IDの複数指定に対応）。バックエンドは配列として正規化・保存するよう変更
- **2026-01-28**: `segments`テーブルに`poi_type`カラム（STRING）を追加。POI登録・更新・削除時に当該セグメントの`poi_type`を自動記録またはクリア（`manual`/`prefecture`/`polygon`）。定義書を追加後のテーブル定義に更新（バージョン2.3）
- **2026-01-28**: 本番環境におけるフロントエンドAPI接続状況を概要に追加。`segment_id`の説明を拡張（`SEG-{連番}`に加え、フロント採番の`seg-uni-{3桁}`/`seg-ctv-{3桁}`を記載）。仕様書を本番環境の挙動に合わせて更新（バージョン2.4）。詳細は [PRODUCTION_API_CONNECTION_STATUS.md](troubleshooting/PRODUCTION_API_CONNECTION_STATUS.md) を参照。
- **2026-02-07**: `segments.detection_count` を STRING から INT64 に変更（アプリ・既存BQとの統一）。正スキーマを明示し、既存BQで delivery_media/media_id が STRING の場合のマイグレーション手順を [UPDATE_BIGQUERY_SCHEMA](troubleshooting/UPDATE_BIGQUERY_SCHEMA.md) に追加。
- **2026-02-07**: `segments` に `data_link_status`, `data_link_request_date`, `data_link_scheduled_date`, `ads_account_id`, `provider_segment_id`, `segment_expire_date` を追加（バックエンド送信列と定義書の一致）。同様のケースでは「バックエンドが送る列は定義書に記載する」方針で [BQ_TABLE_DEFINITION_COMPARISON](troubleshooting/BQ_TABLE_DEFINITION_COMPARISON.md) に記載。
- **2026-02-24**: `sheet_exports` と `sheet_export_data` を BigQuery に実際に作成（定期バッチエクスポート機能の実装に伴う）。PARTITION BY / CLUSTER BY なし・NOT NULL / DEFAULT 制約なしの最小定義で作成。CREATE 文・フィールド定義・パーティション設定表を実テーブルに合わせて更新（バージョン 2.5）。

**既存の segments テーブルに poi_type を追加する場合**:
```sql
ALTER TABLE `universegeo_dataset.segments`
ADD COLUMN IF NOT EXISTS poi_type STRING;
```

---

## 参考資料

- [BigQuery SETUPガイド](../BIGQUERY_SETUP.md)
- [スキーマ更新ガイド](./troubleshooting/UPDATE_BIGQUERY_SCHEMA.md)
- [コスト最適化ガイド](./troubleshooting/BIGQUERY_COST_OPTIMIZATION.md)
