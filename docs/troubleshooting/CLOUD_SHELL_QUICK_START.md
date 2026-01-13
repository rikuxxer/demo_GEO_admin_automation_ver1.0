# Cloud Shellでのスキーマ更新クイックスタート

## 🚀 クイックスタート（3ステップ）

### ステップ1: スクリプトをダウンロードまたは作成

Cloud Shellで以下のコマンドを実行して、スクリプトを作成します：

```bash
# スクリプトファイルを作成
cat > update_all_schemas_complete.sh << 'SCRIPT_EOF'
```

その後、`update_all_schemas_complete.sh`の内容をコピー&ペーストして、最後に以下を追加：

```bash
SCRIPT_EOF
```

### ステップ2: 実行権限を付与

```bash
chmod +x update_all_schemas_complete.sh
```

### ステップ3: スクリプトを実行

```bash
./update_all_schemas_complete.sh
```

---

## 📋 個別テーブル更新（user_requestsテーブルのみ）

`user_requests`テーブルのみを更新する場合：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

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

---

## 🔍 スキーマ確認コマンド

更新後、各テーブルのスキーマを確認：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# 各テーブルのスキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.projects"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.segments"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.pois"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.users"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests"
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.messages"
```

---

## ⚠️ トラブルシューティング

### エラー: "Field request_id is missing in new schema"

**原因**: 既存の`request_id`フィールドがREQUIREDとして定義されているため、新しいスキーマに含める必要があります。

**解決方法**: 上記の`user_requests_schema.json`には`request_id`が含まれているため、このエラーは発生しません。

### エラー: "Permission denied"

**原因**: BigQueryへの書き込み権限がありません。

**解決方法**: Cloud Shellで実行している場合、通常は権限があります。プロジェクトの権限設定を確認してください。

### エラー: "Table not found"

**原因**: テーブルが存在しません。

**解決方法**: テーブルが存在するか確認してください：
```bash
bq ls "${DATASET_ID}"
```

---

## ✅ 更新後の確認

1. **スキーマ更新を実行**
2. **各テーブルのスキーマを確認**（上記のコマンド）
3. **ブラウザのキャッシュをクリア**
4. **ユーザー登録申請を再試行**
5. **エラーが解消されたか確認**

---

## 📝 注意事項

- 既存のデータは保持されます
- 新しいフィールドはNULLABLEとして追加されます
- 既存のREQUIREDフィールドは削除できません（`user_requests`テーブルの`request_id`など）
- コードは`user_id`と`requested_role`を送信しますが、スキーマに両方のフィールドがあるため動作します

