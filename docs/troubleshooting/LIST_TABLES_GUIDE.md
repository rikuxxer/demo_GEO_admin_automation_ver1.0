# テーブル一覧取得ガイド

## 🎯 問題点

`bq ls`コマンドには以下の問題があります：

1. **タイムアウト**: 途中で固まる/遅い（以前の`bq show`タイムアウトと同系統）
2. **出力形式の違い**: `tail -n +3`でヘッダを落としているが、環境により出力形式が異なる
3. **コマンドの破損**: 貼り付けが崩れてコマンドが途中で壊れる

## ✅ 推奨方法: REST APIを使用

**最も確実な方法**は、REST APIでテーブル一覧を取得することです。

### REST APIでテーブル一覧を取得

```bash
bash list_tables_via_api.sh
```

または、直接実行：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TOKEN="$(gcloud auth print-access-token)"

# REST APIでテーブル一覧を取得
timeout 20s curl -sS \
  -H "Authorization: Bearer ${TOKEN}" \
  "https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/datasets/${DATASET_ID}/tables" \
  | python3 -m json.tool | grep -E '"tableId"|"totalItems"'
```

**メリット:**
- タイムアウト問題を回避
- 出力形式が統一されている（JSON）
- `totalItems`で件数を正確に取得可能

---

## 🔧 bq lsを使用する場合（安全版）

`bq ls`を使いたい場合は、以下の安全版スクリプトを使用：

```bash
bash list_tables_safe_bq.sh
```

**改善点:**
- `timeout`コマンドでタイムアウトを設定（30秒）
- ヘッダー行の処理を柔軟に対応
- エラーハンドリングを強化
- タイムアウト時はREST APIの使用を推奨

---

## 📋 期待されるテーブル一覧

以下の10個のテーブルが作成されている必要があります：

1. `projects`
2. `segments`
3. `pois`
4. `users`
5. `user_requests`
6. `messages`
7. `change_history`
8. `edit_requests`
9. `feature_requests`
10. `visit_measurement_groups`

---

## 🔍 確認方法の比較

### 方法1: REST API（推奨）

```bash
bash list_tables_via_api.sh
```

**メリット:**
- ✅ タイムアウト問題を回避
- ✅ 正確な件数取得（`totalItems`）
- ✅ 出力形式が統一（JSON）

### 方法2: bq ls（安全版）

```bash
bash list_tables_safe_bq.sh
```

**メリット:**
- ✅ タイムアウト設定
- ✅ エラーハンドリング強化

**デメリット:**
- ⚠️ 環境によって出力形式が異なる可能性
- ⚠️ タイムアウトが発生する可能性

### 方法3: bq ls（従来版 - 非推奨）

```bash
bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" | tail -n +3
```

**問題点:**
- ❌ タイムアウトが発生する可能性
- ❌ 出力形式が環境により異なる
- ❌ エラーハンドリングが不十分

---

## 💡 ベストプラクティス

1. **REST APIを優先**: 最も確実で高速
2. **タイムアウトを設定**: `bq`コマンドを使用する場合は必ず`timeout`を設定
3. **エラーハンドリング**: エラー時は適切なメッセージを表示
4. **出力形式の柔軟性**: 環境によって出力形式が異なることを考慮

---

## 📊 確認済み

既にREST APIで`totalItems=10`を確認できているため、すべてのテーブルが正常に作成されています。

