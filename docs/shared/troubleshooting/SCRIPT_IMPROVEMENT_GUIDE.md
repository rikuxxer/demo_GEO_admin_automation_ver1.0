# スクリプト改善ガイド

## 🔍 問題点

### 1. `2>/dev/null` でエラーを捨てない

**問題:**
```bash
# ❌ 悪い例
bq mk --table ... 2>/dev/null && echo "✅" || echo "⚠️"
```

この方法では、`NotFound` エラーも「既に存在」と誤認してしまいます。

**改善:**
```bash
# ✅ 良い例
TABLE_CREATE_OUTPUT=$(bq mk --table ... 2>&1)
TABLE_CREATE_EXIT_CODE=$?
if [ ${TABLE_CREATE_EXIT_CODE} -eq 0 ]; then
  echo "    ✅ テーブル作成成功"
else
  if echo "${TABLE_CREATE_OUTPUT}" | grep -q "Already Exists"; then
    echo "    ⚠️  テーブルが既に存在します"
  else
    echo "    ❌ テーブル作成に失敗しました"
    echo "    📋 エラー詳細: ${TABLE_CREATE_OUTPUT}"
  fi
fi
```

### 2. データセット存在チェックは `bq show -d` を使用

**問題:**
```bash
# ❌ 悪い例
if bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" &> /dev/null; then
```

`bq ls` はリスト表示のため、存在確認には不適切です。

**改善:**
```bash
# ✅ 良い例
DATASET_CHECK_OUTPUT=$(bq show --dataset --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1)
DATASET_CHECK_EXIT_CODE=$?

if [ ${DATASET_CHECK_EXIT_CODE} -eq 0 ]; then
  echo "  ✅ データセットが存在します"
  echo "  📊 データセット情報:"
  echo "${DATASET_CHECK_OUTPUT}" | head -n 5
else
  echo "  ⚠️  データセットが存在しません"
  # エラーメッセージを確認
  if echo "${DATASET_CHECK_OUTPUT}" | grep -q "Not found"; then
    echo "  📋 データセットが見つかりません。作成します..."
  else
    echo "  ❌ 予期しないエラー: ${DATASET_CHECK_OUTPUT}"
  fi
fi
```

---

## 📋 改善されたスクリプトの特徴

### 1. エラーメッセージの表示

- すべてのエラーを表示して、問題を特定しやすくする
- `2>/dev/null` を使用しない

### 2. 適切な存在確認

- データセット: `bq show --dataset` を使用
- テーブル: `bq show --table` または作成時のエラーを確認

### 3. エラーの分類

- `Already Exists` → 既に存在する（警告）
- `Not found` → 存在しない（作成が必要）
- その他のエラー → 詳細を表示

---

## 🛠️ 実装例

### データセットの存在確認と作成

```bash
# データセットの存在確認
DATASET_CHECK_OUTPUT=$(bq show --dataset --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1)
DATASET_CHECK_EXIT_CODE=$?

if [ ${DATASET_CHECK_EXIT_CODE} -eq 0 ]; then
  echo "  ✅ データセット '${DATASET_ID}' が既に存在します"
  echo "  📊 データセット情報:"
  echo "${DATASET_CHECK_OUTPUT}" | head -n 5
else
  echo "  ⚠️  データセット '${DATASET_ID}' が存在しません"
  echo "  📋 データセットを作成中..."
  
  DATASET_CREATE_OUTPUT=$(bq mk --dataset \
    --project_id="${PROJECT_ID}" \
    --location="${LOCATION}" \
    --description="UNIVERSEGEO データセット" \
    "${DATASET_ID}" 2>&1)
  DATASET_CREATE_EXIT_CODE=$?
  
  if [ ${DATASET_CREATE_EXIT_CODE} -eq 0 ]; then
    echo "  ✅ データセットを作成しました"
  else
    echo "  ❌ データセットの作成に失敗しました"
    echo "  📋 エラー詳細:"
    echo "${DATASET_CREATE_OUTPUT}"
    exit 1
  fi
fi
```

### テーブルの作成

```bash
TABLE_CREATE_OUTPUT=$(bq mk --table \
  --project_id="${PROJECT_ID}" \
  --schema /tmp/table_schema.json \
  "${DATASET_ID}.table_name" 2>&1)
TABLE_CREATE_EXIT_CODE=$?

if [ ${TABLE_CREATE_EXIT_CODE} -eq 0 ]; then
  echo "    ✅ table_name"
else
  if echo "${TABLE_CREATE_OUTPUT}" | grep -q "Already Exists"; then
    echo "    ⚠️  table_name (既に存在します)"
  else
    echo "    ❌ table_name の作成に失敗しました"
    echo "    📋 エラー詳細: ${TABLE_CREATE_OUTPUT}"
  fi
fi
```

---

## ✅ チェックリスト

スクリプトを作成・修正する際は、以下を確認：

- [ ] `2>/dev/null` を使用していない
- [ ] データセットの存在確認に `bq show --dataset` を使用している
- [ ] エラーメッセージを適切に表示している
- [ ] エラーの種類（Already Exists, Not found など）を分類している
- [ ] エラー発生時に適切な終了コードを返している

---

## 📚 参考

- [BigQuery CLI リファレンス](https://cloud.google.com/bigquery/docs/reference/bq-cli-reference)
- [シェルスクリプトのエラーハンドリング](https://www.gnu.org/software/bash/manual/html_node/Exit-Status.html)

