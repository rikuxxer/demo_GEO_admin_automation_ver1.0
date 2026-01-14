# リリース前のスキーマ準備ガイド

## 🎯 リリース前の対応方針

リリース前の状態であれば、**テーブルを再作成して正しいスキーマで開始する**方が適切です。

### 推奨される対応

1. **既存データがない、または少ない場合**: テーブルを再作成
2. **既存データが多い場合**: データ移行を検討

---

## 🚀 方法1: テーブルを再作成（推奨・リリース前）

### 前提条件

- 既存データがない、または少ない
- 既存データを削除しても問題ない

### 実行手順

#### ステップ1: 再作成スクリプトを作成

```bash
cat > recreate_user_requests_table.sh << 'SCRIPT_EOF'
#!/bin/bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

echo "⚠️  警告: 既存のデータを削除します"
read -p "続行しますか？ (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo "❌ キャンセルしました"
  exit 1
fi

# 既存テーブルを削除
bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.${TABLE}"

# 正しいスキーマでテーブルを作成
cat > /tmp/user_requests_schema.json << 'EOF'
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

bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/user_requests_schema.json \
  "${DATASET_ID}.${TABLE}"

echo "✅ 完了！"
SCRIPT_EOF

chmod +x recreate_user_requests_table.sh
```

#### ステップ2: スクリプトを実行

```bash
./recreate_user_requests_table.sh
```

---

## 🔧 方法2: 既存テーブルを更新（既存データが多い場合）

既存データが多い場合は、テーブルを更新する方法を使用します。

### 実行手順

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 現在のスキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > /tmp/current.json

# request_idのモードを確認
if grep -q '"name": "request_id".*"mode": "REQUIRED"' /tmp/current.json; then
  REQ_MODE="REQUIRED"
else
  REQ_MODE="NULLABLE"
fi

# スキーマファイルを作成（user_idはNULLABLEとして追加）
cat > /tmp/user_requests_schema.json << EOF
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

# スキーマを更新
bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/user_requests_schema.json \
  "${DATASET_ID}.${TABLE}"
```

---

## 📋 比較表

| 方法 | メリット | デメリット | 適用ケース |
|------|---------|-----------|-----------|
| **テーブル再作成** | ✅ 正しいスキーマ（user_id: REQUIRED）<br>✅ 不要なフィールドを削除可能<br>✅ クリーンな状態 | ❌ 既存データが削除される | リリース前、既存データがない/少ない |
| **テーブル更新** | ✅ 既存データを保持<br>✅ ダウンタイムなし | ❌ user_idがNULLABLEになる<br>❌ 不要なフィールドが残る | 既存データが多い、本番環境 |

---

## ✅ リリース前の推奨対応

### 推奨: テーブルを再作成

リリース前であれば、以下の理由で**テーブルを再作成する**ことを推奨します：

1. ✅ **正しいスキーマ**: `user_id`をREQUIREDとして定義できる
2. ✅ **クリーンな状態**: 不要なフィールド（`request_id`, `desired_role`）を削除できる
3. ✅ **コードとの一致**: コードで使用しているフィールド名と完全に一致
4. ✅ **将来の拡張性**: 正しいスキーマで開始できる

### 実行コマンド（ワンライナー）

```bash
PROJECT_ID="univere-geo-demo" && DATASET_ID="universegeo_dataset" && TABLE="user_requests" && bq rm -f -t "${PROJECT_ID}:${DATASET_ID}.${TABLE}" && cat > /tmp/schema.json << 'EOF' && bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/schema.json "${DATASET_ID}.${TABLE}" && echo "✅ 完了！"
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
```

---

## 🔍 確認コマンド

更新後、スキーマを確認：

```bash
bq show --schema --format=prettyjson "univere-geo-demo:universegeo_dataset.user_requests"
```

期待される結果：
- ✅ `user_id`: REQUIRED
- ✅ `requested_role`: NULLABLE
- ❌ `request_id`: 存在しない（削除）
- ❌ `desired_role`: 存在しない（削除）

---

## 📝 まとめ

**リリース前の状態であれば、テーブルを再作成する方が適切です。**

- ✅ 正しいスキーマで開始できる
- ✅ コードと完全に一致する
- ✅ 不要なフィールドを削除できる
- ✅ 将来の拡張性が高い

