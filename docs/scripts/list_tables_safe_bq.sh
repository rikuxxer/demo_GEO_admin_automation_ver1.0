#!/bin/bash
# bq lsを安全に実行するスクリプト（タイムアウト付き、エラーハンドリング強化）

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "=========================================="
echo "📋 テーブル一覧（bq ls - 安全版）"
echo "=========================================="
echo ""

# タイムアウト付きでbq lsを実行
echo "📋 テーブル一覧を取得中（タイムアウト: 30秒）..."
OUTPUT_FILE="/tmp/bq_ls_output.txt"

# タイムアウト付きで実行し、出力をファイルに保存
if timeout 30s bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" > "${OUTPUT_FILE}" 2>&1; then
  EXIT_CODE=$?
  
  # タイムアウトで終了した場合
  if [ ${EXIT_CODE} -eq 124 ]; then
    echo "  ⚠️  タイムアウトが発生しました（30秒）"
    echo "  💡 REST APIを使用することを推奨します: bash list_tables_via_api.sh"
    exit 1
  fi
  
  # 出力を確認
  if [ ! -s "${OUTPUT_FILE}" ]; then
    echo "  ⚠️  出力が空です"
    exit 1
  fi
  
  # 出力を表示（最初の数行を確認してから全体を表示）
  echo ""
  echo "📊 作成済みテーブル一覧:"
  echo ""
  
  # ヘッダー行をスキップ（環境によって異なる可能性があるため、柔軟に処理）
  # bq lsの出力形式:
  # - 1行目: ヘッダー（"tableId"など）
  # - 2行目: 区切り線（"------"など）
  # - 3行目以降: テーブル一覧
  
  # テーブル名の列を抽出（通常は1列目）
  LINE_NUM=0
  while IFS= read -r line; do
    LINE_NUM=$((LINE_NUM + 1))
    
    # 空行をスキップ
    if [ -z "${line}" ]; then
      continue
    fi
    
    # ヘッダー行をスキップ（"tableId"を含む行）
    if echo "${line}" | grep -qi "tableId\|TABLE_ID"; then
      continue
    fi
    
    # 区切り線をスキップ（"-"のみの行）
    if echo "${line}" | grep -qE "^-+$"; then
      continue
    fi
    
    # テーブル名を抽出（最初の単語）
    TABLE_NAME=$(echo "${line}" | awk '{print $1}')
    
    # テーブル名が有効か確認（空でない、特殊文字を含まない）
    if [ -n "${TABLE_NAME}" ] && echo "${TABLE_NAME}" | grep -qE "^[a-zA-Z0-9_]+$"; then
      echo "  ✅ ${TABLE_NAME}"
    fi
  done < "${OUTPUT_FILE}"
  
  # テーブル数をカウント
  TABLE_COUNT=$(grep -vE "^$|tableId|TABLE_ID|^-+$" "${OUTPUT_FILE}" | grep -cE "^[a-zA-Z0-9_]+" || echo "0")
  
  echo ""
  echo "期待されるテーブル数: 10個"
  echo "作成済みテーブル数: ${TABLE_COUNT}個"
  echo ""
  
  if [ "${TABLE_COUNT}" -eq 10 ]; then
    echo "✅ すべてのテーブルが存在します"
  else
    echo "⚠️  テーブル数が期待値と異なります"
    echo ""
    echo "📋 完全な出力:"
    cat "${OUTPUT_FILE}"
  fi
  
else
  EXIT_CODE=$?
  echo "  ❌ bq lsの実行に失敗しました (exit code: ${EXIT_CODE})"
  echo ""
  echo "  📋 エラー詳細:"
  if [ -f "${OUTPUT_FILE}" ]; then
    cat "${OUTPUT_FILE}"
  fi
  echo ""
  echo "  💡 REST APIを使用することを推奨します: bash list_tables_via_api.sh"
  exit 1
fi

echo "=========================================="

