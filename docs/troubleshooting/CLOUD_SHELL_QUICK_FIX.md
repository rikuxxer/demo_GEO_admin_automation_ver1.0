# Cloud Shellでのuser_requestsテーブルスキーマ修正（クイックガイド）

## 🚀 クイック修正（コピー&ペーストで実行）

Cloud Shellで以下のコマンドを**順番に**実行してください：

### ステップ1: 修正スクリプトを作成

```bash
cat > fix_user_requests_schema.sh << 'SCRIPT_EOF'
#!/bin/bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

echo "現在のスキーマを確認中..."
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > current_schema.json

# request_idがREQUIREDかどうかを確認
if grep -q '"name": "request_id".*"mode": "REQUIRED"' current_schema.json; then
  REQUEST_ID_MODE="REQUIRED"
  echo "⚠️  request_idはREQUIREDです"
else
  REQUEST_ID_MODE="NULLABLE"
  echo "✅ request_idはNULLABLEです"
fi

echo "スキーマファイルを作成中..."
cat > user_requests_schema.json << EOF
[
  {"name": "user_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "request_id", "type": "STRING", "mode": "${REQUEST_ID_MODE}"},
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

echo "スキーマを更新中..."
bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema user_requests_schema.json \
  "${DATASET_ID}.${TABLE}"

echo "✅ 完了！"
SCRIPT_EOF

chmod +x fix_user_requests_schema.sh
```

### ステップ2: スクリプトを実行

```bash
./fix_user_requests_schema.sh
```

---

## 🔧 手動で修正する場合

### ステップ1: 現在のスキーマを確認

```bash
bq show --schema --format=prettyjson "univere-geo-demo:universegeo_dataset.user_requests"
```

### ステップ2: request_idがREQUIREDかどうかを確認

出力結果で`"name": "request_id"`の行を探し、`"mode": "REQUIRED"`かどうかを確認します。

### ステップ3: スキーマファイルを作成

**request_idがREQUIREDの場合:**

```bash
cat > user_requests_schema.json << 'EOF'
[
  {"name": "user_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "request_id", "type": "STRING", "mode": "REQUIRED"},
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
```

**request_idがNULLABLEの場合:**

```bash
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
```

### ステップ4: スキーマを更新

```bash
bq update -t \
  --project_id="univere-geo-demo" \
  --schema user_requests_schema.json \
  "universegeo_dataset.user_requests"
```

---

## ✅ 確認コマンド

更新後、スキーマが正しく更新されたか確認：

```bash
bq show --schema --format=prettyjson "univere-geo-demo:universegeo_dataset.user_requests"
```

---

## 🚨 エラーが続く場合

### エラー: "Field request_id is missing in new schema"

**原因**: 既存の`request_id`フィールドがREQUIREDとして定義されているため、新しいスキーマに含める必要があります。

**解決方法**: 上記のスクリプトを使用するか、手動で`request_id`をREQUIREDとして含めてください。

### エラー: "Cannot change field mode from REQUIRED to NULLABLE"

**原因**: 既存のREQUIREDフィールドをNULLABLEに変更することはできません。

**解決方法**: `request_id`をREQUIREDのまま保持してください。

---

## 📋 完全なワンライナー（最も簡単）

Cloud Shellで以下をコピー&ペーストして実行：

```bash
PROJECT_ID="univere-geo-demo" && DATASET_ID="universegeo_dataset" && TABLE="user_requests" && bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > /tmp/current.json && if grep -q '"name": "request_id".*"mode": "REQUIRED"' /tmp/current.json; then REQ_MODE="REQUIRED"; else REQ_MODE="NULLABLE"; fi && cat > /tmp/schema.json << EOF && bq update -t --project_id="${PROJECT_ID}" --schema /tmp/schema.json "${DATASET_ID}.${TABLE}" && echo "✅ 完了！"
[
  {"name": "user_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "request_id", "type": "STRING", "mode": "${REQ_MODE}"},
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
```

