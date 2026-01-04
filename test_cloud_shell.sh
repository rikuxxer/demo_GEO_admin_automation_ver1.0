#!/bin/bash
# Cloud Shell動作確認テストスクリプト
# このスクリプトでCloud Shellが正しく動作するか確認できます

echo "=========================================="
echo "🧪 Cloud Shell動作確認テスト"
echo "=========================================="
echo ""

# テスト1: 基本的なコマンド
echo "📋 テスト1: 基本的なコマンドの確認"
echo "----------------------------------------"
echo "現在のディレクトリ: $(pwd)"
echo "ユーザー: $(whoami)"
echo "ホスト名: $(hostname)"
echo "✅ テスト1完了"
echo ""

# テスト2: gcloudコマンド
echo "📋 テスト2: gcloudコマンドの確認"
echo "----------------------------------------"
if command -v gcloud &> /dev/null; then
  echo "✅ gcloudコマンドが利用可能です"
  echo "   バージョン: $(gcloud --version | head -1)"
  echo "   現在のプロジェクト: $(gcloud config get-value project 2>/dev/null || echo '未設定')"
else
  echo "❌ gcloudコマンドが見つかりません"
fi
echo ""

# テスト3: bqコマンド
echo "📋 テスト3: bqコマンドの確認"
echo "----------------------------------------"
if command -v bq &> /dev/null; then
  echo "✅ bqコマンドが利用可能です"
  echo "   バージョン: $(bq version 2>&1 | head -1)"
else
  echo "❌ bqコマンドが見つかりません"
  echo "   gcloud components install bq でインストールしてください"
fi
echo ""

# テスト4: プロジェクトIDとデータセットIDの確認
echo "📋 テスト4: BigQuery設定の確認"
echo "----------------------------------------"
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "プロジェクトID: ${PROJECT_ID}"
echo "データセットID: ${DATASET_ID}"
echo ""

# プロジェクトが存在するか確認
echo "プロジェクトの存在確認中..."
if gcloud projects describe "${PROJECT_ID}" &> /dev/null; then
  echo "✅ プロジェクト '${PROJECT_ID}' が存在します"
else
  echo "❌ プロジェクト '${PROJECT_ID}' が見つかりません"
  echo "   プロジェクトIDが正しいか確認してください"
fi
echo ""

# データセットが存在するか確認
echo "データセットの存在確認中..."
if bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" &> /dev/null; then
  echo "✅ データセット '${DATASET_ID}' が存在します"
  
  # テーブル一覧を取得
  echo ""
  echo "テーブル一覧:"
  bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1 | tail -n +3 || echo "  テーブルが見つかりません"
else
  echo "❌ データセット '${DATASET_ID}' が見つかりません"
  echo "   データセットIDが正しいか確認してください"
fi
echo ""

# テスト5: ファイル作成テスト
echo "📋 テスト5: ファイル作成テスト"
echo "----------------------------------------"
TEST_FILE="test_file_$(date +%s).txt"
echo "テストファイルを作成: ${TEST_FILE}"
echo "これはテストファイルです" > "${TEST_FILE}"

if [ -f "${TEST_FILE}" ]; then
  echo "✅ ファイル作成成功"
  echo "   ファイル内容: $(cat ${TEST_FILE})"
  rm "${TEST_FILE}"
  echo "✅ ファイル削除成功"
else
  echo "❌ ファイル作成失敗"
fi
echo ""

# テスト6: スキーマファイル作成テスト
echo "📋 テスト6: スキーマJSONファイル作成テスト"
echo "----------------------------------------"
TEST_SCHEMA="test_schema.json"
cat > "${TEST_SCHEMA}" << 'EOF'
[
  {"name": "test_field", "type": "STRING", "mode": "NULLABLE"}
]
EOF

if [ -f "${TEST_SCHEMA}" ]; then
  echo "✅ スキーマファイル作成成功"
  echo "   ファイル内容:"
  cat "${TEST_SCHEMA}"
  rm "${TEST_SCHEMA}"
  echo "✅ スキーマファイル削除成功"
else
  echo "❌ スキーマファイル作成失敗"
fi
echo ""

# テスト7: 権限確認
echo "📋 テスト7: BigQuery権限確認"
echo "----------------------------------------"
if bq query --project_id="${PROJECT_ID}" --use_legacy_sql=false "SELECT 1" &> /dev/null; then
  echo "✅ BigQueryへのクエリ権限があります"
else
  echo "⚠️ BigQueryへのクエリ権限を確認できませんでした"
  echo "   実際のスキーマ更新時にエラーが出る可能性があります"
fi
echo ""

# 結果サマリ
echo "=========================================="
echo "📊 テスト結果サマリ"
echo "=========================================="
echo ""
echo "✅ すべてのテストが完了しました"
echo ""
echo "次のステップ:"
echo "  1. エラーが出た場合は、該当する項目を確認してください"
echo "  2. すべて正常な場合は、update_all_schemas_complete.shを実行できます"
echo ""
echo "スキーマ更新スクリプトの実行:"
echo "  ./update_all_schemas_complete.sh"
echo ""

