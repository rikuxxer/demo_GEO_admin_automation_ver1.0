# データセット作成の状態確認

## 🔍 現在の状態を確認

データセット作成に時間がかかっている場合、以下のコマンドで状態を確認してください。

### ステップ1: データセットの存在確認

Cloud Shellで以下のコマンドを実行：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "データセットの存在確認中..."
bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1
```

**結果の見方：**
- データセットが表示される → ✅ 既に作成済み（次のステップへ）
- `Not found` エラー → ⚠️ まだ作成されていない（下記の対処法を参照）
- その他のエラー → エラーメッセージを確認

### ステップ2: プロセスの確認

もしコマンドが実行中のまま止まっている場合：

1. **Ctrl+C** でコマンドを中断
2. 上記のステップ1でデータセットの存在を確認
3. データセットが存在しない場合は、再度作成を試行

---

## 🛠️ 対処法

### 方法1: コマンドを中断して再試行

1. **Ctrl+C** で現在のコマンドを中断
2. データセットの存在を確認（上記ステップ1）
3. 存在しない場合、以下のコマンドで再作成：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
LOCATION="asia-northeast1"

echo "データセットを作成中..."
bq mk --dataset \
  --project_id="${PROJECT_ID}" \
  --location="${LOCATION}" \
  --description="UNIVERSEGEO データセット" \
  "${DATASET_ID}"

echo "✅ データセットを作成しました"
```

### 方法2: タイムアウトを設定して再試行

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
LOCATION="asia-northeast1"

echo "データセットを作成中（タイムアウト: 30秒）..."
timeout 30 bq mk --dataset \
  --project_id="${PROJECT_ID}" \
  --location="${LOCATION}" \
  --description="UNIVERSEGEO データセット" \
  "${DATASET_ID}" 2>&1

if [ $? -eq 0 ]; then
  echo "✅ データセットを作成しました"
else
  echo "⚠️  タイムアウトまたはエラーが発生しました"
  echo "データセットの存在を確認中..."
  bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1
fi
```

### 方法3: BigQueryコンソールで確認

1. [BigQueryコンソール](https://console.cloud.google.com/bigquery?project=univere-geo-demo)を開く
2. 左側のナビゲーションパネルで `univere-geo-demo` プロジェクトを確認
3. `universegeo_dataset` が表示されているか確認

---

## ⚡ クイックチェック（推奨）

まず、以下を実行して現在の状態を確認してください：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "📋 データセットの存在確認..."
if bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" &> /dev/null; then
  echo "✅ データセット '${DATASET_ID}' が存在します"
  echo ""
  echo "📊 データセット情報:"
  bq show --dataset --project_id="${PROJECT_ID}" "${DATASET_ID}"
  echo ""
  echo "🎉 次のステップ: 全テーブルを作成してください"
else
  echo "⚠️  データセット '${DATASET_ID}' が存在しません"
  echo ""
  echo "📋 データセットを作成中..."
  bq mk --dataset \
    --project_id="${PROJECT_ID}" \
    --location="asia-northeast1" \
    --description="UNIVERSEGEO データセット" \
    "${DATASET_ID}" 2>&1
  
  if [ $? -eq 0 ]; then
    echo "✅ データセットを作成しました"
  else
    echo "❌ データセットの作成に失敗しました"
    echo "エラーメッセージを確認してください"
  fi
fi
```

---

## 📋 次のステップ

データセットが作成されたら、全テーブルを作成してください。

