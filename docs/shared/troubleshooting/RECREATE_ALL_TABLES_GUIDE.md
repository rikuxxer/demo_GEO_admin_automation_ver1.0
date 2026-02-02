# 全テーブル再作成ガイド

## 🎯 概要

リリース前に、すべてのテーブルを削除してコードベースのリクエスト内容に合わせて正しいスキーマで再作成します。

## 🚀 クイック実行

### 方法1: スクリプトを使用（推奨）

Cloud Shellで以下のコマンドを実行：

```bash
# スクリプトを作成
cat > recreate_all_tables.sh << 'SCRIPT_EOF'
#!/bin/bash
set -e

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "⚠️  警告: すべてのテーブルとデータを削除します"
read -p "続行しますか？ (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ キャンセルしました"
  exit 1
fi

# （ここにrecreate_all_tables.shの内容を貼り付け）
SCRIPT_EOF

chmod +x recreate_all_tables.sh
./recreate_all_tables.sh
```

### 方法2: 個別に実行

各テーブルを個別に削除・再作成することもできます。

---

## 📋 作成されるテーブルとスキーマ

### 1. projectsテーブル

```json
[
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "advertiser_name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "agency_name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "appeal_point", "type": "STRING", "mode": "NULLABLE"},
  {"name": "delivery_start_date", "type": "DATE", "mode": "NULLABLE"},
  {"name": "delivery_end_date", "type": "DATE", "mode": "NULLABLE"},
  {"name": "person_in_charge", "type": "STRING", "mode": "NULLABLE"},
  {"name": "project_status", "type": "STRING", "mode": "NULLABLE"},
  {"name": "remarks", "type": "STRING", "mode": "NULLABLE"},
  {"name": "project_registration_started_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "_register_datetime", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "created_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "updated_at", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
```

### 2. segmentsテーブル

```json
[
  {"name": "segment_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "segment_name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "segment_registered_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "delivery_media", "type": "STRING", "mode": "REPEATED"},
  {"name": "media_id", "type": "STRING", "mode": "REPEATED"},
  {"name": "attribute", "type": "STRING", "mode": "NULLABLE"},
  {"name": "extraction_period", "type": "STRING", "mode": "NULLABLE"},
  {"name": "extraction_start_date", "type": "DATE", "mode": "NULLABLE"},
  {"name": "extraction_end_date", "type": "DATE", "mode": "NULLABLE"},
  {"name": "detection_count", "type": "INTEGER", "mode": "NULLABLE"},
  {"name": "detection_time_start", "type": "TIME", "mode": "NULLABLE"},
  {"name": "detection_time_end", "type": "TIME", "mode": "NULLABLE"},
  {"name": "stay_time", "type": "STRING", "mode": "NULLABLE"},
  {"name": "designated_radius", "type": "STRING", "mode": "NULLABLE"},
  {"name": "location_request_status", "type": "STRING", "mode": "NULLABLE"},
  {"name": "data_coordination_date", "type": "DATE", "mode": "NULLABLE"},
  {"name": "delivery_confirmed", "type": "BOOL", "mode": "NULLABLE"},
  {"name": "created_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "updated_at", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
```

### 3. poisテーブル

```json
[
  {"name": "poi_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "segment_id", "type": "STRING", "mode": "NULLABLE"},
  {"name": "location_id", "type": "STRING", "mode": "NULLABLE"},
  {"name": "poi_name", "type": "STRING", "mode": "REQUIRED"},
  {"name": "address", "type": "STRING", "mode": "NULLABLE"},
  {"name": "latitude", "type": "FLOAT64", "mode": "NULLABLE"},
  {"name": "longitude", "type": "FLOAT64", "mode": "NULLABLE"},
  {"name": "prefectures", "type": "STRING", "mode": "REPEATED"},
  {"name": "cities", "type": "STRING", "mode": "REPEATED"},
  {"name": "poi_type", "type": "STRING", "mode": "NULLABLE"},
  {"name": "poi_category", "type": "STRING", "mode": "NULLABLE"},
  {"name": "designated_radius", "type": "STRING", "mode": "NULLABLE"},
  {"name": "setting_flag", "type": "STRING", "mode": "NULLABLE"},
  {"name": "visit_measurement_group_id", "type": "STRING", "mode": "NULLABLE"},
  {"name": "created_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "updated_at", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
```

### 4. usersテーブル

```json
[
  {"name": "user_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "name", "type": "STRING", "mode": "REQUIRED"},
  {"name": "email", "type": "STRING", "mode": "REQUIRED"},
  {"name": "password_hash", "type": "STRING", "mode": "REQUIRED"},
  {"name": "role", "type": "STRING", "mode": "REQUIRED"},
  {"name": "department", "type": "STRING", "mode": "NULLABLE"},
  {"name": "is_active", "type": "BOOL", "mode": "NULLABLE"},
  {"name": "last_login", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "created_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "updated_at", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
```

### 5. user_requestsテーブル

```json
[
  {"name": "user_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "email", "type": "STRING", "mode": "NULLABLE"},
  {"name": "password_hash", "type": "STRING", "mode": "NULLABLE"},
  {"name": "requested_role", "type": "STRING", "mode": "NULLABLE"},
  {"name": "department", "type": "STRING", "mode": "NULLABLE"},
  {"name": "reason", "type": "STRING", "mode": "NULLABLE"},
  {"name": "status", "type": "STRING", "mode": "NULLABLE"},
  {"name": "requested_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "reviewed_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "reviewed_by", "type": "STRING", "mode": "NULLABLE"},
  {"name": "review_comment", "type": "STRING", "mode": "NULLABLE"}
]
```

### 6. messagesテーブル

```json
[
  {"name": "message_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "sender_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "sender_name", "type": "STRING", "mode": "REQUIRED"},
  {"name": "sender_role", "type": "STRING", "mode": "REQUIRED"},
  {"name": "content", "type": "STRING", "mode": "REQUIRED"},
  {"name": "message_type", "type": "STRING", "mode": "NULLABLE"},
  {"name": "is_read", "type": "BOOL", "mode": "NULLABLE"},
  {"name": "timestamp", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
```

---

## ✅ 確認コマンド

すべてのテーブルが正しく作成されたか確認：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# テーブル一覧を確認
bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}"

# 各テーブルのスキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.projects"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.segments"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.pois"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.users"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.messages"
```

---

## ⚠️ 注意事項

1. **既存データの削除**: すべての既存データが削除されます
2. **リリース前のみ**: 本番環境では使用しないでください
3. **バックアップ**: 必要に応じて、実行前にデータをエクスポートしてください

---

## 📋 次のステップ

1. スクリプトを実行して全テーブルを再作成
2. スキーマを確認
3. ブラウザのキャッシュをクリア
4. アプリケーションをテスト
5. エラーが解消されたか確認

