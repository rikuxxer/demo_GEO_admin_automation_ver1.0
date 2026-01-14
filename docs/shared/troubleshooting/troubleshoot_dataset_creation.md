# データセット作成のトラブルシューティング

## 🔍 現在の状態を確認

タイムアウトが発生しても、実際にはデータセットが作成されている可能性があります。まず確認してください。

### ステップ1: データセットの存在確認

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "📋 データセットの存在確認..."
bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1
```

**結果の見方：**
- データセットが表示される → ✅ **既に作成済み！** 次のステップ（テーブル作成）へ進めます
- `Not found` エラー → ⚠️ データセットが存在しない（下記の対処法を参照）

---

## 🛠️ 対処法

### 方法1: Cloud Shellセッションの再起動（推奨）

PCの再起動ではなく、**Cloud Shellセッションの再起動**が効果的です：

1. Cloud Shellの右上の「⋮」（三点メニュー）をクリック
2. 「Restart Cloud Shell」を選択
3. セッションが再起動したら、再度データセット作成を試行

### 方法2: シンプルなコマンドで再試行

Cloud Shellセッションを再起動後、以下を実行：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# まず存在確認
echo "📋 データセットの存在確認..."
bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1

# 存在しない場合のみ作成
if [ $? -ne 0 ]; then
  echo ""
  echo "📋 データセットを作成中..."
  bq mk --dataset \
    --project_id="${PROJECT_ID}" \
    --location="asia-northeast1" \
    --description="UNIVERSEGEO データセット" \
    "${DATASET_ID}"
  
  echo ""
  echo "✅ 作成完了！確認中..."
  bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1
fi
```

### 方法3: BigQueryコンソールで直接確認・作成

1. [BigQueryコンソール](https://console.cloud.google.com/bigquery?project=univere-geo-demo)を開く
2. 左側のナビゲーションパネルで確認
3. データセットが存在しない場合：
   - 「+ データセットを作成」をクリック
   - データセットID: `universegeo_dataset`
   - ロケーション: `asia-northeast1 (Tokyo)`
   - 「データセットを作成」をクリック

---

## ⚡ クイック診断スクリプト

以下を実行して、現在の状態を完全に確認：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "=========================================="
echo "📋 データセット診断"
echo "=========================================="
echo ""

# 1. プロジェクトの確認
echo "1. プロジェクトの確認..."
gcloud config get-value project 2>&1
echo ""

# 2. BigQuery APIの有効化確認
echo "2. BigQuery APIの状態確認..."
gcloud services list --enabled --filter="name:bigquery.googleapis.com" 2>&1
echo ""

# 3. データセットの存在確認
echo "3. データセットの存在確認..."
if bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" &> /dev/null; then
  echo "  ✅ データセット '${DATASET_ID}' が存在します"
  echo ""
  echo "  📊 データセット情報:"
  bq show --dataset --project_id="${PROJECT_ID}" "${DATASET_ID}"
  echo ""
  echo "  🎉 次のステップ: 全テーブルを作成してください"
else
  echo "  ⚠️  データセット '${DATASET_ID}' が存在しません"
  echo ""
  echo "  📋 データセットを作成しますか？ (y/n)"
  read -r answer
  if [ "$answer" = "y" ] || [ "$answer" = "Y" ]; then
    echo ""
    echo "  📋 データセットを作成中..."
    bq mk --dataset \
      --project_id="${PROJECT_ID}" \
      --location="asia-northeast1" \
      --description="UNIVERSEGEO データセット" \
      "${DATASET_ID}" 2>&1
    
    if [ $? -eq 0 ]; then
      echo ""
      echo "  ✅ データセットを作成しました"
      echo ""
      echo "  📊 データセット情報:"
      bq show --dataset --project_id="${PROJECT_ID}" "${DATASET_ID}"
    else
      echo ""
      echo "  ❌ データセットの作成に失敗しました"
      echo "  エラーメッセージを確認してください"
    fi
  else
    echo "  データセットの作成をスキップしました"
  fi
fi

echo ""
echo "=========================================="
```

---

## 📋 推奨手順

1. **まず、データセットの存在確認**（上記のステップ1）
2. **既に存在する場合** → テーブル作成に進む
3. **存在しない場合**:
   - Cloud Shellセッションを再起動
   - シンプルなコマンドで再試行（方法2）
   - それでも失敗する場合は、BigQueryコンソールで直接作成（方法3）

---

## 💡 補足

- **PCの再起動**: Cloud Shellはブラウザベースなので、PC再起動の影響はほぼありません
- **Cloud Shellセッションの再起動**: ネットワーク接続やセッション状態の問題を解決できる可能性があります
- **タイムアウト**: タイムアウトしても実際には作成されている可能性があるため、必ず存在確認を行ってください

