# UNIVERSEGEO テーブル定義書

**バージョン:** 1.0  
**最終更新日:** 2024年12月  
**作成者:** 開発チーム

---

## 📋 目次

1. [概要](#概要)
2. [テーブル一覧](#テーブル一覧)
3. [テーブル詳細定義](#テーブル詳細定義)
4. [リレーションシップ](#リレーションシップ)
5. [インデックス定義](#インデックス定義)
6. [選択肢マスタ](#選択肢マスタ)
7. [ビジネスルール](#ビジネスルール)

---

## 概要

UNIVERSEGEOシステムで使用する全テーブルの詳細定義。

### データベース情報
- **データベース種別**: Google BigQuery（想定）
- **文字コード**: UTF-8
- **タイムゾーン**: UTC（アプリケーション層でJSTに変換）

---

## テーブル一覧

| テーブル名 | 論理名 | 説明 | 主キー | 関連テーブル |
|-----------|--------|------|--------|-------------|
| User | ユーザー | システム利用者の情報 | id | Project（担当者） |
| Project | 案件 | 広告主からの案件情報 | project_id | User, Segment |
| Segment | セグメント | 配信設定の単位 | project_id + segment_id | Project, PoiInfo |
| PoiInfo | 地点情報 | 配信対象地点の詳細 | project_id + segment_id + poi_id | Project, Segment |

---

## テーブル詳細定義

### 1. User（ユーザー）

**説明**: システム利用者の情報を管理

**主キー**: `id`

| カラム名 | 論理名 | データ型 | 桁数 | NULL | PK | FK | デフォルト | 説明 |
|---------|--------|---------|------|------|----|----|----------|------|
| id | ユーザーID | STRING | 50 | NO | ⭐ | | | 一意識別子（例: user-admin） |
| name | ユーザー名 | STRING | 100 | NO | | | | 氏名（例: 管理太郎） |
| email | メールアドレス | STRING | 200 | NO | UK | | | ログイン用メール（一意） |
| role | ロール | STRING | 20 | NO | | | sales | 権限ロール（admin / sales） |
| department | 部署 | STRING | 100 | YES | | | | 所属部署（例: 営業部） |
| avatar | アバター画像URL | STRING | 500 | YES | | | | プロフィール画像URL |

**インデックス**:
```sql
CREATE INDEX idx_user_email ON User(email);
CREATE INDEX idx_user_role ON User(role);
```

**制約**:
- `email` はユニークキー（重複不可）
- `role` は 'admin' または 'sales' のみ

---

### 2. Project（案件）

**説明**: 広告主からの案件情報を管理

**主キー**: `project_id`

| カラム名 | 論理名 | データ型 | 桁数 | NULL | PK | FK | デフォルト | 説明 |
|---------|--------|---------|------|------|----|----|----------|------|
| project_id | 案件ID | STRING | 50 | NO | ⭐ | | | 一意識別子（PRJ-timestamp） |
| _register_datetime | 登録日時 | TIMESTAMP | - | NO | | | | 自動設定 |
| advertiser_name | 広告主法人名 | STRING | 100 | NO | | | | 広告主名（必須） |
| agency_name | 代理店名 | STRING | 100 | YES | | | | 代理店名（任意） |
| appeal_point | 訴求内容 | STRING | 200 | NO | | | | キャンペーン内容（必須） |
| universe_service_id | UNIVERSEサービスID | STRING | 50 | YES | | | | サービス識別子 |
| universe_service_name | UNIVERSEサービス名 | STRING | 100 | YES | | | | サービス名称 |
| delivery_start_date | 配信開始日 | DATE | 10 | NO | | | | 配信開始日（必須） |
| delivery_end_date | 配信終了日 | DATE | 10 | NO | | | | 配信終了日（必須） |
| person_in_charge | 主担当者 | STRING | 50 | NO | | FK | | User.id参照 |
| sub_person_in_charge | 副担当者 | STRING | 50 | YES | | FK | | User.id参照（任意） |
| remarks | 備考 | STRING | 500 | YES | | | | 自由記述 |
| project_status | 案件ステータス | STRING | 20 | YES | | | draft | 進行状況 |

**外部キー**:
```sql
FOREIGN KEY (person_in_charge) REFERENCES User(id);
FOREIGN KEY (sub_person_in_charge) REFERENCES User(id);
```

**インデックス**:
```sql
CREATE INDEX idx_project_id ON Project(project_id);
CREATE INDEX idx_person_in_charge ON Project(person_in_charge);
CREATE INDEX idx_project_status ON Project(project_status);
CREATE INDEX idx_delivery_period ON Project(delivery_start_date, delivery_end_date);
```

**制約**:
- `delivery_end_date` >= `delivery_start_date`
- `project_status` は draft / in_progress / pending / completed / cancelled のいずれか

---

### 3. Segment（セグメント）

**説明**: 配信設定の単位。1案件に複数のセグメントを設定可能

**主キー**: `project_id` + `segment_id`（複合キー）

#### 基本情報

| カラム名 | 論理名 | データ型 | 桁数 | NULL | PK | FK | デフォルト | 説明 |
|---------|--------|---------|------|------|----|----|----------|------|
| project_id | 案件ID | STRING | 50 | NO | ⭐ | FK | | Project.project_id参照 |
| segment_id | セグメントID | STRING | 50 | NO | ⭐ | | | 一意識別子（SEG-timestamp-index） |
| segment_name | セグメント名 | STRING | 100 | YES | | | | セグメント名称（任意） |
| segment_registered_at | セグメント登録日時 | TIMESTAMP | - | NO | | | | 自動設定 |
| media_id | 配信媒体ID | STRING | 100 | NO | | | | 配信媒体（配列形式） |

**配信媒体の選択肢**:
- `universe`: UNIVERSE
- `tver_sp`: TVer(SP)
- `tver_ctv`: TVer(CTV)

**重要な制約**:
- `tver_ctv` は他の媒体と同一案件内で併用不可
- 配列形式で複数選択可能だが、上記制約あり

#### ステータス管理

| カラム名 | 論理名 | データ型 | 桁数 | NULL | PK | FK | デフォルト | 説明 |
|---------|--------|---------|------|------|----|----|----------|------|
| location_request_status | 地点依頼ステータス | STRING | 20 | NO | | | not_requested | 地点格納依頼状況 |
| request_confirmed | 連携依頼フラグ | BOOLEAN | - | YES | | | false | 営業の入力確定フラグ |
| data_link_status | データ連携ステータス | STRING | 20 | NO | | | before_request | 連携依頼状況 |
| data_link_scheduled_date | 連携予定日 | DATE | 10 | YES | | | | 連携予定日 |
| data_link_request_date | データ連携依頼日 | TIMESTAMP | - | YES | | | | 依頼日時（自動設定） |

**地点依頼ステータスの選択肢**:
- `not_requested`: 未依頼
- `storing`: 格納対応中
- `completed`: 格納完了

**データ連携ステータスの選択肢**:
- `before_request`: 連携依頼前（アカウントID記載済み）
- `requested`: 連携依頼済（連携対応中）
- `linked`: 連携済

#### 連携情報

| カラム名 | 論理名 | データ型 | 桁数 | NULL | PK | FK | デフォルト | 説明 |
|---------|--------|---------|------|------|----|----|----------|------|
| ads_account_id | AdsアカウントID | STRING | 50 | YES | | | | 広告配信先アカウント |
| provider_segment_id | プロバイダセグメントID | STRING | 50 | YES | | | | プロバイダのセグメントID |
| poi_id | 地点グループID | STRING | 50 | YES | | | | 地点グループ識別子 |
| segment_expire_date | セグメント有効期限日 | DATE | 10 | YES | | | | 有効期限（連携完了+6ヶ月） |

#### セグメント共通条件

**重要**: このセグメントに属する全地点に適用される条件

| カラム名 | 論理名 | データ型 | 桁数 | NULL | PK | FK | デフォルト | 説明 |
|---------|--------|---------|------|------|----|----|----------|------|
| designated_radius | 指定半径 | STRING | 10 | YES | | | | 配信範囲（例: 500m） |
| extraction_period | 抽出期間 | STRING | 20 | YES | | | | プリセット期間（例: 1month） |
| extraction_period_type | 抽出期間タイプ | STRING | 10 | YES | | | preset | preset / custom |
| extraction_start_date | 抽出開始日 | DATE | 10 | YES | | | | 期間指定時の開始日 |
| extraction_end_date | 抽出終了日 | DATE | 10 | YES | | | | 期間指定時の終了日 |
| attribute | 属性 | STRING | 10 | YES | | | detector | detector / resident / worker |
| detection_count | 検知回数 | INTEGER | - | YES | | | 1 | 〇回以上 |
| detection_time_start | 検知時間開始 | STRING | 5 | YES | | | | HH:MM形式 |
| detection_time_end | 検知時間終了 | STRING | 5 | YES | | | | HH:MM形式 |
| stay_time | 滞在時間 | STRING | 10 | YES | | | | 例: 30min |

**指定半径の選択肢**:
50m, 100m, 150m, 200m, 250m, 300m, 350m, 400m, 450m, 500m, 550m, 600m, 650m, 700m, 750m, 800m, 850m, 900m, 950m, 1000m, 1500m, 2000m, 2500m, 3000m, 3500m, 4000m, 4500m, 5000m, 6000m, 7000m, 8000m, 9000m, 10000m

**抽出期間の選択肢（プリセット）**:
- `1month`: 直近1ヶ月
- `2month`: 直近2ヶ月
- `3month`: 直近3ヶ月
- `4month`: 直近4ヶ月
- `5month`: 直近5ヶ月
- `6month`: 直近6ヶ月

**属性の選択肢**:
- `detector`: 検知者（地点を通過・訪問した人）
- `resident`: 居住者（その地点周辺に居住している人）※期間は3ヶ月固定
- `worker`: 勤務者（その地点周辺に勤務している人）※期間は3ヶ月固定

**滞在時間の選択肢**:
5min, 10min, 15min, 30min, 45min, 1hour, 2hour, 3hour

**外部キー**:
```sql
FOREIGN KEY (project_id) REFERENCES Project(project_id);
```

**インデックス**:
```sql
CREATE INDEX idx_segment_project ON Segment(project_id, segment_id);
CREATE INDEX idx_location_status ON Segment(location_request_status);
CREATE INDEX idx_data_link_status ON Segment(data_link_status);
```

**制約**:
- `extraction_end_date` >= `extraction_start_date`（期間指定時）
- `detection_time_end` > `detection_time_start`（時間指定時）
- `attribute` が resident または worker の場合、`extraction_period` は 3month 固定

---

### 4. PoiInfo（地点情報）

**説明**: 配信対象となる地点の詳細情報

**主キー**: `project_id` + `segment_id` + `poi_id`（複合キー）

#### 基本情報

| カラム名 | 論理名 | データ型 | 桁数 | NULL | PK | FK | デフォルト | 説明 |
|---------|--------|---------|------|------|----|----|----------|------|
| project_id | 案件ID | STRING | 50 | NO | ⭐ | FK | | Project.project_id参照 |
| segment_id | セグメントID | STRING | 50 | NO | ⭐ | FK | | Segment.segment_id参照 |
| poi_id | 地点ID | STRING | 50 | NO | ⭐ | | | 一意識別子（POI-timestamp-index） |
| poi_type | 地点タイプ | STRING | 20 | YES | | | manual | 登録方法 |
| poi_name | 地点名 | STRING | 100 | NO | | | | 地点名称（必須） |

**地点タイプの選択肢**:
- `manual`: 任意地点指定（住所または緯度経度で指定）
- `prefecture`: 都道府県・市区町村指定
- `pkg`: PKG指定（カテゴリ選択）

#### 地点指定方法別フィールド

##### 任意地点指定（poi_type = 'manual'）

| カラム名 | 論理名 | データ型 | 桁数 | NULL | 説明 |
|---------|--------|---------|------|------|------|
| address | 住所 | STRING | 200 | YES | 地点の住所 |
| latitude | 緯度 | FLOAT | - | YES | -90〜90 |
| longitude | 経度 | FLOAT | - | YES | -180〜180 |

**制約**: 住所または緯度経度のどちらかは必須

##### 都道府県・市区町村指定（poi_type = 'prefecture'）

| カラム名 | 論理名 | データ型 | 桁数 | NULL | 説明 |
|---------|--------|---------|------|------|------|
| prefectures | 都道府県リスト | STRING | 500 | YES | 配列形式（JSON） |
| cities | 市区町村リスト | STRING | 2000 | YES | 配列形式（JSON） |

**例**:
```json
prefectures: ["東京都", "神奈川県"]
cities: ["新宿区", "渋谷区", "横浜市"]
```

##### PKG指定（poi_type = 'pkg'）

| カラム名 | 論理名 | データ型 | 桁数 | NULL | 説明 |
|---------|--------|---------|------|------|------|
| pkg_category | PKGカテゴリ | STRING | 50 | YES | カテゴリ識別子 |

**PKGカテゴリの選択肢**:
- `convenience_store`: コンビニエンスストア
- `supermarket`: スーパーマーケット
- `department_store`: デパート
- `drug_store`: ドラッグストア
- `home_center`: ホームセンター
- `restaurant`: 飲食店
- `cafe`: カフェ
- `gym`: フィットネス・ジム
- `hospital`: 病院
- `school`: 学校
- `station`: 駅
- `airport`: 空港
- `hotel`: ホテル
- `theater`: 映画館
- `park`: 公園

#### 抽出条件（セグメント共通条件から継承）

**注意**: 以下のフィールドは後方互換性のために残していますが、新規登録時はSegmentの共通条件が適用されます。

| カラム名 | 論理名 | データ型 | 桁数 | NULL | 説明 |
|---------|--------|---------|------|------|------|
| designated_radius | 指定半径 | STRING | 10 | YES | セグメントから継承 |
| extraction_period | 抽出期間 | STRING | 20 | YES | セグメントから継承 |
| extraction_period_type | 抽出期間タイプ | STRING | 10 | YES | セグメントから継承 |
| extraction_start_date | 抽出開始日 | DATE | 10 | YES | セグメントから継承 |
| extraction_end_date | 抽出終了日 | DATE | 10 | YES | セグメントから継承 |
| attribute | 属性 | STRING | 10 | YES | セグメントから継承 |
| detection_time_start | 検知時間開始 | STRING | 5 | YES | セグメントから継承 |
| detection_time_end | 検知時間終了 | STRING | 5 | YES | セグメントから継承 |
| detection_count | 検知回数 | INTEGER | - | YES | セグメントから継承 |
| stay_time | 滞在時間 | STRING | 10 | YES | セグメントから継承 |

#### その他

| カラム名 | 論理名 | データ型 | 桁数 | NULL | 説明 |
|---------|--------|---------|------|------|------|
| category_id | カテゴリID | STRING | 50 | YES | 半径変換ID（内部使用） |
| setting_flag | 設定フラグ | STRING | 10 | YES | 設定状態フラグ（内部使用） |
| created | 地点登録日 | TIMESTAMP | - | YES | 登録日時（自動設定） |
| detail_specification_flag | 詳細指定フラグ | STRING | 10 | YES | 詳細設定フラグ（内部使用） |

**外部キー**:
```sql
FOREIGN KEY (project_id) REFERENCES Project(project_id);
FOREIGN KEY (segment_id) REFERENCES Segment(segment_id);
```

**インデックス**:
```sql
CREATE INDEX idx_poi_segment ON PoiInfo(segment_id);
CREATE INDEX idx_poi_type ON PoiInfo(poi_type);
CREATE SPATIAL INDEX idx_poi_location ON PoiInfo(latitude, longitude);
```

---

## リレーションシップ

### ER図（簡易版）

```
User (1) ──担当する──> (N) Project
                          │
                          │ (1)
                          │
                          ↓
                       (N) Segment
                          │
                          │ (1)
                          │
                          ↓
                       (N) PoiInfo
```

### リレーション詳細

| 親テーブル | 子テーブル | カーディナリティ | 外部キー | 説明 |
|-----------|-----------|----------------|---------|------|
| User | Project | 1 : N | person_in_charge | 1人のユーザーが複数案件の主担当 |
| User | Project | 1 : N | sub_person_in_charge | 1人のユーザーが複数案件の副担当 |
| Project | Segment | 1 : N | project_id | 1案件に複数セグメント |
| Segment | PoiInfo | 1 : N | segment_id | 1セグメントに複数地点 |

### カスケード削除

**推奨設定**:
```sql
-- 案件削除時にセグメントも削除
ON DELETE CASCADE: Project → Segment

-- セグメント削除時に地点も削除
ON DELETE CASCADE: Segment → PoiInfo

-- ユーザー削除時は案件は削除しない（担当者をNULLまたは別ユーザーに変更）
ON DELETE SET NULL: User → Project
```

---

## インデックス定義

### パフォーマンス最適化のための推奨インデックス

#### User テーブル
```sql
CREATE INDEX idx_user_email ON User(email);
CREATE INDEX idx_user_role ON User(role);
```

#### Project テーブル
```sql
CREATE INDEX idx_project_id ON Project(project_id);
CREATE INDEX idx_person_in_charge ON Project(person_in_charge);
CREATE INDEX idx_project_status ON Project(project_status);
CREATE INDEX idx_delivery_period ON Project(delivery_start_date, delivery_end_date);
CREATE INDEX idx_advertiser_name ON Project(advertiser_name);
```

#### Segment テーブル
```sql
CREATE INDEX idx_segment_project ON Segment(project_id, segment_id);
CREATE INDEX idx_location_status ON Segment(location_request_status);
CREATE INDEX idx_data_link_status ON Segment(data_link_status);
CREATE INDEX idx_media_id ON Segment(media_id);
```

#### PoiInfo テーブル
```sql
CREATE INDEX idx_poi_segment ON PoiInfo(segment_id);
CREATE INDEX idx_poi_type ON PoiInfo(poi_type);
CREATE SPATIAL INDEX idx_poi_location ON PoiInfo(latitude, longitude);
CREATE INDEX idx_poi_created ON PoiInfo(created);
```

---

## 選択肢マスタ

### 案件ステータス（project_status）

| 値 | 表示名 | 説明 |
|----|--------|------|
| draft | 準備中 | 案件作成直後の初期状態 |
| in_progress | 進行中 | 配信準備・実施中 |
| pending | 保留 | 一時的に保留 |
| completed | 完了 | 配信完了 |
| cancelled | キャンセル | 案件キャンセル |

### 地点依頼ステータス（location_request_status）

| 値 | 表示名 | 説明 | 管理者 |
|----|--------|------|--------|
| not_requested | 未依頼 | 地点登録作業中 | 営業 |
| storing | 格納対応中 | 管理部が格納作業中 | 営業→管理部 |
| completed | 格納完了 | 格納作業完了 | 管理部 |

### データ連携ステータス（data_link_status）

| 値 | 表示名 | 説明 | 管理者 |
|----|--------|------|--------|
| before_request | 連携依頼前 | AdsアカウントID記載済み | 営業 |
| requested | 連携依頼済 | 連携対応中 | 営業→管理部 |
| linked | 連携済 | 連携完了 | 管理部 |

### 配信媒体（media_id）

| 値 | 表示名 | 併用制限 |
|----|--------|---------|
| universe | UNIVERSE | - |
| tver_sp | TVer(SP) | TVer(CTV)と併用不可 |
| tver_ctv | TVer(CTV) | 他の媒体と併用不可 |

### 地点タイプ（poi_type）

| 値 | 表示名 | 使用フィールド |
|----|--------|--------------|
| manual | 任意地点指定 | poi_name, address, latitude, longitude |
| prefecture | 都道府県・市区町村指定 | poi_name, prefectures, cities |
| pkg | PKG指定 | poi_name, pkg_category |

### 属性（attribute）

| 値 | 表示名 | 抽出期間制限 |
|----|--------|------------|
| detector | 検知者 | なし（1〜6ヶ月） |
| resident | 居住者 | 3ヶ月固定 |
| worker | 勤務者 | 3ヶ月固定 |

### ユーザーロール（role）

| 値 | 表示名 | 権限 |
|----|--------|------|
| admin | 管理者 | 全権限 |
| sales | 営業 | 案件登録・編集のみ |

---

## ビジネスルール

### 必須チェック

1. **案件の必須項目**
   - advertiser_name（広告主法人名）
   - appeal_point（訴求内容）
   - delivery_start_date（配信開始日）
   - delivery_end_date（配信終了日）
   - person_in_charge（主担当者）

2. **セグメントの必須項目**
   - media_id（配信媒体）
   - designated_radius（指定半径）
   - extraction_period または extraction_start_date & extraction_end_date（抽出期間）
   - attribute（属性）

3. **地点の必須項目**
   - poi_name（地点名）
   - address または (latitude & longitude)（住所または緯度経度）

### 日付の妥当性

```sql
-- 配信期間
delivery_end_date >= delivery_start_date

-- 抽出期間（期間指定時）
extraction_end_date >= extraction_start_date
```

### 配信媒体の排他制御

**ルール**: 1つの案件（Project）内で、TVer(CTV)は他の媒体と併用不可

```sql
-- 例: あるセグメントでtver_ctvを選択した場合
-- 同一project_idの他のセグメントでtver_ctvは選択不可

SELECT COUNT(*) 
FROM Segment 
WHERE project_id = 'PRJ-XXX' 
  AND media_id LIKE '%tver_ctv%'
-- この結果が1より大きい場合はエラー
```

### セグメント共通条件の統一

**ルール**: 1つのセグメントに属する全地点は、同じ条件（半径、期間、属性など）を共有

- 新規地点登録時は、Segmentの共通条件を自動的に継承
- PoiInfoテーブルの抽出条件フィールドは後方互換性のため保持

### 属性による期間固定

**ルール**: 属性が「居住者」または「勤務者」の場合、抽出期間は3ヶ月固定

```sql
-- 属性が resident または worker の場合
IF attribute IN ('resident', 'worker') THEN
  extraction_period = '3month'
  extraction_period_type = 'preset'
END IF
```

### 編集制限

**ルール**: 地点格納依頼後は地点データの修正を不可に

```sql
-- location_request_status が storing 以上の場合
-- PoiInfo の編集を制限（ads_account_id と連携依頼のみ編集可）

IF location_request_status IN ('storing', 'completed') THEN
  -- 地点情報の編集を不可に
  -- ただし、以下は編集可能:
  -- - ads_account_id
  -- - data_link_status（管理部のみ）
  -- - provider_segment_id（管理部のみ）
END IF
```

### セグメント有効期限

**ルール**: データ連携完了から6ヶ月後が自動的に有効期限

```sql
-- data_link_status が 'linked' になった時点で
segment_expire_date = data_link_completion_date + 6 MONTHS
```

---

## データサイズ見積もり

### 想定ボリューム（年間）

| テーブル | レコード数/年 | 平均レコードサイズ | 年間データ量 |
|---------|-------------|-----------------|-----------|
| User | 100 | 500 bytes | 50 KB |
| Project | 1,000 | 800 bytes | 800 KB |
| Segment | 5,000 | 1 KB | 5 MB |
| PoiInfo | 500,000 | 600 bytes | 300 MB |

**合計**: 約 306 MB/年

---

## 変更履歴

| バージョン | 日付 | 変更内容 | 変更者 |
|-----------|------|---------|--------|
| 1.0 | 2024-12 | 初版作成 | 開発チーム |

---

**END OF DOCUMENT**
