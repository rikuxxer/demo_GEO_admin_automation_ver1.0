# user_requestsテーブルスキーマ修正（v2）- 既存テーブル対応

## 🚨 問題

既存のテーブルに**REQUIREDフィールドを追加することはできません**。そのため、`user_id`をNULLABLEとして追加する必要があります。

## 🚀 クイック修正（コピー&ペーストで実行）

Cloud Shellで以下のコマンドを**順番に**実行してください：

### ステップ1: 修正スクリプトを作成

```bash
cat > fix_user_requests_schema_v2.sh << 'SCRIPT_EOF'
#!/bin/bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

echo "現在のスキーマを確認中..."
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > /tmp/current.json

# request_idがREQUIREDかどうかを確認
if grep -q '"name": "request_id".*"mode": "REQUIRED"' /tmp/current.json; then
  REQUEST_ID_MODE="REQUIRED"
  echo "⚠️  request_idはREQUIREDです"
else
  REQUEST_ID_MODE="NULLABLE"
  echo "✅ request_idはNULLABLEです"
fi

echo "スキーマファイルを作成中..."
# user_idはNULLABLEとして追加（既存テーブルにREQUIREDフィールドを追加できないため）
cat > /tmp/user_requests_schema.json << EOF
[
  {"name": "user_id", "type": "STRING", "mode": "NULLABLE"},
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
  --schema /tmp/user_requests_schema.json \
  "${DATASET_ID}.${TABLE}"

echo "✅ 完了！"
echo ""
echo "⚠️  注意: user_idはNULLABLEとして追加されました"
echo "   コードはuser_idを送信しますが、スキーマではNULLABLEのため動作します"
SCRIPT_EOF

chmod +x fix_user_requests_schema_v2.sh
```

### ステップ2: スクリプトを実行

```bash
./fix_user_requests_schema_v2.sh
```

---

## 🔧 手動で修正する場合

### ステップ1: 現在のスキーマを確認

```bash
bq show --schema --format=prettyjson "univere-geo-demo:universegeo_dataset.user_requests"
```

### ステップ2: スキーマファイルを作成

**重要**: `user_id`は**NULLABLE**として追加します（既存テーブルにREQUIREDフィールドを追加できないため）

```bash
cat > user_requests_schema.json << 'EOF'
[
  {"name": "user_id", "type": "STRING", "mode": "NULLABLE"},
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

### ステップ3: スキーマを更新

```bash
bq update -t \
  --project_id="univere-geo-demo" \
  --schema user_requests_schema.json \
  "universegeo_dataset.user_requests"
```

---

## ⚠️ 重要な注意事項

### user_idはNULLABLEとして追加されます

- **理由**: 既存のテーブルにREQUIREDフィールドを追加することはできません
- **影響**: コードは`user_id`を送信しますが、スキーマではNULLABLEのため動作します
- **将来的な対応**: `user_id`をREQUIREDにするには、テーブルを再作成する必要があります

### 動作について

- コードは`user_id`と`requested_role`を送信します
- スキーマには`user_id`（NULLABLE）と`requested_role`（NULLABLE）が存在します
- 既存の`request_id`（REQUIRED）と`desired_role`（NULLABLE）も保持されます
- これにより、エラーなく動作します

---

## ✅ 確認コマンド

更新後、スキーマが正しく更新されたか確認：

```bash
bq show --schema --format=prettyjson "univere-geo-demo:universegeo_dataset.user_requests"
```

`user_id`フィールドがNULLABLEとして追加されていることを確認してください。

---

## 🎯 完全なワンライナー（最も簡単）

Cloud Shellで以下をコピー&ペーストして実行：

```bash
PROJECT_ID="univere-geo-demo" && DATASET_ID="universegeo_dataset" && TABLE="user_requests" && bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > /tmp/current.json && if grep -q '"name": "request_id".*"mode": "REQUIRED"' /tmp/current.json; then REQ_MODE="REQUIRED"; else REQ_MODE="NULLABLE"; fi && cat > /tmp/schema.json << EOF && bq update -t --project_id="${PROJECT_ID}" --schema /tmp/schema.json "${DATASET_ID}.${TABLE}" && echo "✅ 完了！user_idはNULLABLEとして追加されました"
[
  {"name": "user_id", "type": "STRING", "mode": "NULLABLE"},
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

