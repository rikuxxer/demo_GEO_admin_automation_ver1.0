#!/bin/bash
# データセット作成問題の診断スクリプト

PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "=========================================="
echo "🔍 データセット作成問題の診断"
echo "=========================================="
echo ""

# 1. プロジェクトの確認
echo "1. 現在のプロジェクト:"
CURRENT_PROJECT=$(gcloud config get-value project 2>&1)
echo "   ${CURRENT_PROJECT}"
if [ "${CURRENT_PROJECT}" != "${PROJECT_ID}" ]; then
  echo "   ⚠️  プロジェクトが一致しません。設定を変更しますか？"
fi
echo ""

# 2. BigQuery APIの有効化確認
echo "2. BigQuery APIの状態確認..."
BQ_API_STATUS=$(gcloud services list --enabled --filter="name:bigquery.googleapis.com" --format="value(name)" 2>&1)
if [ -n "${BQ_API_STATUS}" ]; then
  echo "   ✅ BigQuery APIは有効化されています"
else
  echo "   ❌ BigQuery APIが有効化されていません"
  echo "   有効化しますか？ (y/n)"
  read -r answer
  if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    echo "   BigQuery APIを有効化中..."
    gcloud services enable bigquery.googleapis.com --project="${PROJECT_ID}" 2>&1
    echo "   ✅ BigQuery APIを有効化しました"
  fi
fi
echo ""

# 3. 認証情報の確認
echo "3. 認証情報の確認..."
if gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1 | grep -q .; then
  ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1)
  echo "   ✅ アクティブなアカウント: ${ACTIVE_ACCOUNT}"
else
  echo "   ❌ アクティブな認証情報がありません"
  echo "   gcloud auth login を実行してください"
fi
echo ""

# 4. BigQuery権限の確認
echo "4. BigQuery権限の確認..."
echo "   現在のユーザーの権限を確認中..."
MY_EMAIL=$(gcloud config get-value account 2>&1)
if [ -n "${MY_EMAIL}" ]; then
  echo "   ユーザー: ${MY_EMAIL}"
  echo "   権限確認中..."
  # プロジェクトのIAMポリシーを確認
  gcloud projects get-iam-policy "${PROJECT_ID}" \
    --flatten="bindings[].members" \
    --filter="bindings.members:${MY_EMAIL}" \
    --format="table(bindings.role)" 2>&1 | grep -i bigquery || echo "   ⚠️  BigQuery関連の権限が見つかりません"
else
  echo "   ⚠️  ユーザー情報を取得できませんでした"
fi
echo ""

# 5. データセットの存在確認
echo "5. データセットの存在確認..."
if bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" &> /dev/null; then
  echo "   ✅ データセット '${DATASET_ID}' が既に存在します"
  echo ""
  echo "   📊 データセット情報:"
  bq show --dataset --project_id="${PROJECT_ID}" "${DATASET_ID}"
  echo ""
  echo "   🎉 次のステップ: 全テーブルを作成してください"
else
  echo "   ⚠️  データセット '${DATASET_ID}' が存在しません"
  echo ""
  echo "   📋 データセットを作成しますか？ (y/n)"
  read -r answer
  if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    echo ""
    echo "   📋 データセットを作成中..."
    bq mk --dataset \
      --project_id="${PROJECT_ID}" \
      --location="asia-northeast1" \
      --description="UNIVERSEGEO データセット" \
      "${DATASET_ID}" 2>&1
    
    if [ $? -eq 0 ]; then
      echo ""
      echo "   ✅ データセットを作成しました"
      echo ""
      echo "   📊 データセット情報:"
      bq show --dataset --project_id="${PROJECT_ID}" "${DATASET_ID}"
    else
      echo ""
      echo "   ❌ データセットの作成に失敗しました"
      echo "   エラーメッセージを確認してください"
      echo ""
      echo "   💡 推奨: BigQueryコンソールから直接作成してください"
      echo "   https://console.cloud.google.com/bigquery?project=${PROJECT_ID}"
    fi
  else
    echo "   データセットの作成をスキップしました"
  fi
fi

echo ""
echo "=========================================="

