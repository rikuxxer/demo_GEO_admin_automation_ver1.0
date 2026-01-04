# データセット作成フリーズ問題の診断と解決

## 🔍 考えられる原因

1. **権限問題** - BigQuery Admin権限がない
2. **API未有効化** - BigQuery APIが有効化されていない
3. **認証問題** - 認証情報が正しく設定されていない
4. **ネットワーク問題** - Cloud Shellの接続問題
5. **プロジェクト設定問題** - プロジェクトIDの不一致

---

## 🛠️ 診断スクリプトの実行

Cloud Shellで以下を実行して、問題を特定してください：

```bash
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
  echo "   ⚠️  プロジェクトが一致しません"
  gcloud config set project "${PROJECT_ID}"
  echo "   ✅ プロジェクトを設定しました"
fi
echo ""

# 2. BigQuery APIの有効化確認
echo "2. BigQuery APIの状態確認..."
BQ_API_STATUS=$(gcloud services list --enabled --filter="name:bigquery.googleapis.com" --format="value(name)" 2>&1)
if [ -n "${BQ_API_STATUS}" ]; then
  echo "   ✅ BigQuery APIは有効化されています"
else
  echo "   ❌ BigQuery APIが有効化されていません"
  echo "   BigQuery APIを有効化中..."
  gcloud services enable bigquery.googleapis.com --project="${PROJECT_ID}" 2>&1
  if [ $? -eq 0 ]; then
    echo "   ✅ BigQuery APIを有効化しました"
  else
    echo "   ❌ BigQuery APIの有効化に失敗しました"
    echo "   権限を確認してください"
  fi
fi
echo ""

# 3. 認証情報の確認
echo "3. 認証情報の確認..."
ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n 1)
if [ -n "${ACTIVE_ACCOUNT}" ]; then
  echo "   ✅ アクティブなアカウント: ${ACTIVE_ACCOUNT}"
else
  echo "   ❌ アクティブな認証情報がありません"
  echo "   gcloud auth login を実行してください"
fi
echo ""

# 4. BigQuery権限の確認
echo "4. BigQuery権限の確認..."
MY_EMAIL=$(gcloud config get-value account 2>&1)
if [ -n "${MY_EMAIL}" ]; then
  echo "   ユーザー: ${MY_EMAIL}"
  echo "   権限確認中..."
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
fi

echo ""
echo "=========================================="
```

---

## 🔧 解決方法

### 方法1: BigQuery APIの有効化

```bash
PROJECT_ID="univere-geo-demo"

echo "BigQuery APIを有効化中..."
gcloud services enable bigquery.googleapis.com --project="${PROJECT_ID}"

echo "✅ 完了！数秒待ってから再度データセット作成を試してください"
```

### 方法2: 権限の確認と付与

必要な権限：
- `roles/bigquery.admin` または
- `roles/bigquery.dataEditor` + `roles/bigquery.datasets.create`

権限がない場合、プロジェクト管理者に依頼して付与してもらう必要があります。

### 方法3: BigQueryコンソールで直接作成（推奨）

コマンドラインでフリーズする場合は、**BigQueryコンソールから直接作成**することを推奨します：

1. [BigQueryコンソール](https://console.cloud.google.com/bigquery?project=univere-geo-demo)を開く
2. 左側のナビゲーションパネルで、プロジェクト名（`univere-geo-demo`）を右クリック
3. 「データセットを作成」を選択
4. 以下の情報を入力：
   - **データセットID**: `universegeo_dataset`
   - **データのロケーション**: `asia-northeast1 (Tokyo)`
   - **説明**: `UNIVERSEGEO データセット`
5. 「データセットを作成」をクリック

これで確実に作成できます。

---

## ⚡ クイックチェック（最小限の確認）

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# プロジェクト設定
gcloud config set project "${PROJECT_ID}"

# BigQuery API有効化
gcloud services enable bigquery.googleapis.com --project="${PROJECT_ID}"

# データセットの存在確認
bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1
```

---

## 📋 推奨手順

1. **まず診断スクリプトを実行**して問題を特定
2. **BigQuery APIが無効の場合** → 有効化（方法1）
3. **権限がない場合** → プロジェクト管理者に依頼
4. **それでもフリーズする場合** → BigQueryコンソールで直接作成（方法3）

---

## 💡 補足

- **フリーズの原因**: 多くの場合、API未有効化や権限不足が原因です
- **コンソールでの作成**: コマンドラインで問題がある場合、コンソールUIはより安定しています
- **タイムアウト**: フリーズした場合は、Ctrl+Cで中断してから診断スクリプトを実行してください

