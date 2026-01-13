# user_requestsテーブル - 既存フィールドを保持したスキーマ更新

## 🔍 問題

既存のテーブルに`request_id`と`desired_role`フィールドが存在するため、これらのフィールドを削除することはできません。

## 🛠️ 解決方法

既存のフィールドを保持しつつ、新しいフィールド（`user_id`と`requested_role`）を追加します。

### 方法1: 既存フィールドを保持して新しいフィールドを追加（推奨）

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 現在のスキーマを確認
echo "📋 現在のスキーマ:"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}"

# 既存フィールドを保持しつつ、新しいフィールドを追加
cat > user_requests_schema.json << 'EOF'
[
  {"name": "user_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "request_id", "type": "STRING", "mode": "NULLABLE"},
  {"name": "name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "email", "type": "STRING", "mode": "NULLABLE"},
  {"name": "password_hash", "type": "STRING", "mode": "NULLABLE"},
  {"name": "requested_role", "type": "STRING", "mode": "NULLABLE"},
  {"name": "desired_role", "type": "STRING", "mode": "NULLABLE"},
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

# 更新後のスキーマを確認
echo "✅ 更新後のスキーマ:"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
```

### 方法2: コードを修正して既存フィールド名を使用（非推奨）

既存の`request_id`と`desired_role`を使用するようにコードを修正することもできますが、コードベース全体で`user_id`と`requested_role`を使用しているため、この方法は推奨しません。

---

## 📋 フィールド名の対応

| コード（送信） | 既存スキーマ | 新しいスキーマ（両方保持） |
|--------------|------------|----------------------|
| `user_id` | `request_id` ❌ | `user_id` ✅ + `request_id` (互換性のため保持) |
| `requested_role` | `desired_role` ❌ | `requested_role` ✅ + `desired_role` (互換性のため保持) |

---

## 🔄 データ移行（オプション）

既存データがある場合、古いフィールド名から新しいフィールド名にデータを移行できます：

```sql
-- 既存のrequest_idとdesired_roleのデータを新しいフィールドにコピー
UPDATE `univere-geo-demo.universegeo_dataset.user_requests`
SET 
  user_id = COALESCE(user_id, request_id),
  requested_role = COALESCE(requested_role, desired_role)
WHERE request_id IS NOT NULL OR desired_role IS NOT NULL
```

---

## ✅ 動作確認

1. **スキーマを更新**（上記の方法1を実行）
2. **ブラウザのキャッシュをクリア**
3. **ユーザー登録申請を再試行**
4. **エラーが解消されたか確認**

---

## ⚠️ 注意事項

1. **既存データの保持**: 既存の`request_id`と`desired_role`のデータは保持されます
2. **コードの動作**: コードは`user_id`と`requested_role`を送信しますが、スキーマに両方のフィールドがあるため動作します
3. **将来的な整理**: データ移行後、古いフィールド（`request_id`, `desired_role`）は使用されなくなりますが、スキーマから削除することはできません

