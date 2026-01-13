# user_requestsテーブルのスキーマ不一致エラーの修正方法

## 🔍 エラー分析

エラーメッセージ:
```
Missing required fields: Msg_0_CLOUD_QUERY_TABLE.desired_role, Msg_0_CLOUD_QUERY_TABLE.request_id.
```

### 問題の原因

**BigQueryスキーマとコードの不一致**:
- **スキーマ（現在）**: `desired_role` (REQUIRED), `request_id` (REQUIRED)
- **コード（送信）**: `requested_role`, `user_id`

テーブルは存在しますが、フィールド名が一致していません。

---

## 🛠️ 解決方法

### 方法1: スキーマをコードに合わせて更新（推奨）

コードが正しい定義（`requested_role`, `user_id`）を使用しているため、スキーマを更新します。

#### ステップ1: 現在のスキーマを確認

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 現在のスキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

#### ステップ2: スキーマを更新

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 正しいスキーマで上書き
cat > user_requests_schema.json << 'EOF'
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
EOF

# スキーマを更新
bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema user_requests_schema.json \
  "${DATASET_ID}.${TABLE}"
```

**注意**: 既存のデータがある場合、`desired_role`と`request_id`のデータは失われます。必要に応じてデータ移行を行ってください。

---

### 方法2: 既存データを保持しながらスキーマを更新

既存データを保持したい場合、以下の手順で段階的に更新します。

#### ステップ1: 古いフィールド名をリネーム（できない場合は新しいフィールドを追加）

BigQueryではフィールド名の直接リネームはできないため、以下の手順で対応します：

1. **新しいフィールド名を追加**（NULLABLE）
2. **既存データを移行**（SQLでUPDATE）
3. **古いフィールドを削除**（できないため、無視する）

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema_current.json

# 新しいフィールドを追加（既存フィールドは保持）
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  # 古いフィールド名を新しい名前にマッピング（既存は保持）
  map(if .name == "desired_role" then .name = "requested_role" elif .name == "request_id" then .name = "user_id" else . end) |
  # 新しいフィールドを追加（既に存在する場合はスキップ）
  addfield({"name":"requested_role","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"user_id","type":"STRING","mode":"REQUIRED"}) |
  addfield({"name":"name","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"email","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"password_hash","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"department","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"reason","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"status","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"requested_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"reviewed_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"reviewed_by","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"review_comment","type":"STRING","mode":"NULLABLE"})
' schema_current.json > schema_new.json

# スキーマを更新
bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema schema_new.json \
  "${DATASET_ID}.${TABLE}"
```

#### ステップ2: 既存データを移行（必要に応じて）

既存データがある場合、SQLでデータを移行します：

```sql
-- 既存のdesired_roleとrequest_idのデータを新しいフィールドにコピー
UPDATE `univere-geo-demo.universegeo_dataset.user_requests`
SET 
  requested_role = COALESCE(requested_role, desired_role),
  user_id = COALESCE(user_id, request_id)
WHERE desired_role IS NOT NULL OR request_id IS NOT NULL
```

---

### 方法3: テーブルを再作成（既存データが不要な場合）

既存データが不要な場合、テーブルを再作成します。

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 既存のテーブルを削除（注意: データが失われます）
bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.${TABLE}"

# 新しいスキーマでテーブルを作成
cat > user_requests_schema.json << 'EOF'
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
EOF

# テーブルを作成
bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema user_requests_schema.json \
  "${DATASET_ID}.${TABLE}"
```

---

## ✅ 推奨手順（最も簡単）

既存データが不要、または新規テーブルの場合：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 1. 現在のスキーマを確認
echo "📋 現在のスキーマ:"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}"

# 2. 正しいスキーマで更新
cat > user_requests_schema.json << 'EOF'
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
EOF

# 3. スキーマを更新
bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema user_requests_schema.json \
  "${DATASET_ID}.${TABLE}"

# 4. 更新後のスキーマを確認
echo "✅ 更新後のスキーマ:"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

---

## 🔍 スキーマ不一致の確認方法

### 現在のスキーマを確認

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# スキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

**確認ポイント**:
- `desired_role`フィールドが存在するか
- `request_id`フィールドが存在するか
- `requested_role`フィールドが存在するか
- `user_id`フィールドが存在するか

---

## ⚠️ 注意事項

1. **既存データの保持**: `bq update`コマンドは既存のデータを保持しますが、フィールド名が変更されるため、古いフィールド名のデータは新しいフィールド名では参照できません。

2. **REQUIREDフィールド**: 既存のテーブルにREQUIREDフィールドを追加することはできません。まずNULLABLEで追加し、データを移行してからREQUIREDに変更する必要があります。

3. **フィールド名の変更**: BigQueryではフィールド名の直接変更はできません。新しいフィールドを追加してデータを移行する必要があります。

4. **データ移行**: 既存データがある場合、SQLでデータを移行する必要があります。

---

## 📋 フィールド名の対応表

| コード（送信） | スキーマ（現在） | 正しいスキーマ |
|--------------|----------------|--------------|
| `user_id` | `request_id` ❌ | `user_id` ✅ |
| `requested_role` | `desired_role` ❌ | `requested_role` ✅ |

---

## 🚀 クイック修正（コピー&ペーストで実行可能）

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 正しいスキーマで更新
cat > user_requests_schema.json << 'EOF'
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
EOF

bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema user_requests_schema.json \
  "${DATASET_ID}.${TABLE}"
```

---

## ✅ 動作確認

1. **スキーマを更新**
2. **ブラウザのキャッシュをクリア**
3. **ユーザー登録申請を再試行**
4. **エラーが解消されたか確認**

