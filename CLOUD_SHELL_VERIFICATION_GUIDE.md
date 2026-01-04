# Cloud Shell動作確認ガイド

## 🧪 動作確認の手順

### ステップ1: テストスクリプトを実行

Cloud Shellで以下のコマンドを実行して、動作確認テストを実行します：

```bash
# テストスクリプトを作成
cat > test_cloud_shell.sh << 'TEST_EOF'
#!/bin/bash
# Cloud Shell動作確認テストスクリプト
echo "=========================================="
echo "🧪 Cloud Shell動作確認テスト"
echo "=========================================="
echo ""

# テスト1: 基本的なコマンド
echo "📋 テスト1: 基本的なコマンドの確認"
echo "現在のディレクトリ: $(pwd)"
echo "ユーザー: $(whoami)"
echo "✅ テスト1完了"
echo ""

# テスト2: gcloudコマンド
echo "📋 テスト2: gcloudコマンドの確認"
if command -v gcloud &> /dev/null; then
  echo "✅ gcloudコマンドが利用可能です"
  echo "   現在のプロジェクト: $(gcloud config get-value project 2>/dev/null || echo '未設定')"
else
  echo "❌ gcloudコマンドが見つかりません"
fi
echo ""

# テスト3: bqコマンド
echo "📋 テスト3: bqコマンドの確認"
if command -v bq &> /dev/null; then
  echo "✅ bqコマンドが利用可能です"
else
  echo "❌ bqコマンドが見つかりません"
fi
echo ""

# テスト4: プロジェクトとデータセットの確認
echo "📋 テスト4: BigQuery設定の確認"
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "プロジェクトID: ${PROJECT_ID}"
if gcloud projects describe "${PROJECT_ID}" &> /dev/null; then
  echo "✅ プロジェクトが存在します"
else
  echo "❌ プロジェクトが見つかりません"
fi

if bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}" &> /dev/null; then
  echo "✅ データセットが存在します"
else
  echo "❌ データセットが見つかりません"
fi
echo ""

echo "✅ すべてのテストが完了しました"
TEST_EOF

# 実行権限を付与
chmod +x test_cloud_shell.sh

# テストスクリプトを実行
./test_cloud_shell.sh
```

### ステップ2: 個別コマンドで確認

各コマンドを個別に実行して確認することもできます：

#### 1. gcloudコマンドの確認

```bash
# gcloudのバージョン確認
gcloud --version

# 現在のプロジェクト確認
gcloud config get-value project

# プロジェクトの存在確認
gcloud projects describe univere-geo-demo
```

#### 2. bqコマンドの確認

```bash
# bqのバージョン確認
bq version

# データセットの存在確認
bq ls -d --project_id=univere-geo-demo universegeo_dataset

# テーブル一覧の確認
bq ls --project_id=univere-geo-demo universegeo_dataset
```

#### 3. ファイル作成テスト

```bash
# テストファイルを作成
echo "テスト" > test.txt

# ファイルが作成されたか確認
cat test.txt

# ファイルを削除
rm test.txt
```

#### 4. スキーマファイル作成テスト

```bash
# テストスキーマファイルを作成
cat > test_schema.json << 'EOF'
[
  {"name": "test_field", "type": "STRING", "mode": "NULLABLE"}
]
EOF

# ファイルが作成されたか確認
cat test_schema.json

# ファイルを削除
rm test_schema.json
```

### ステップ3: 実際のスキーマ確認（安全）

実際のテーブルスキーマを確認して、更新前に現在の状態を把握します：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# user_requestsテーブルの現在のスキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests"
```

---

## ✅ 確認チェックリスト

以下の項目がすべて✅であれば、スキーマ更新スクリプトを実行できます：

- [ ] gcloudコマンドが利用可能
- [ ] bqコマンドが利用可能
- [ ] プロジェクトIDが正しい（univere-geo-demo）
- [ ] データセットIDが正しい（universegeo_dataset）
- [ ] プロジェクトが存在する
- [ ] データセットが存在する
- [ ] ファイル作成が可能
- [ ] スキーマJSONファイル作成が可能

---

## 🚨 よくある問題と解決方法

### 問題1: "bq: command not found"

**原因**: bqコマンドがインストールされていない

**解決方法**:
```bash
gcloud components install bq
```

### 問題2: "Permission denied"

**原因**: BigQueryへの権限がない

**解決方法**:
- Cloud Shellで実行している場合、通常は権限があります
- プロジェクトのIAM設定を確認してください

### 問題3: "Project not found"

**原因**: プロジェクトIDが間違っている

**解決方法**:
```bash
# 正しいプロジェクトIDを確認
gcloud projects list

# プロジェクトを設定
gcloud config set project univere-geo-demo
```

### 問題4: "Dataset not found"

**原因**: データセットIDが間違っている

**解決方法**:
```bash
# データセット一覧を確認
bq ls --project_id=univere-geo-demo

# 正しいデータセットIDを確認
```

---

## 📋 安全な実行手順

### 1. テストスクリプトを実行

```bash
./test_cloud_shell.sh
```

### 2. 現在のスキーマを確認（バックアップ）

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# 各テーブルのスキーマをファイルに保存
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests" > user_requests_schema_backup.json
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.projects" > projects_schema_backup.json
# ... 他のテーブルも同様に
```

### 3. スキーマ更新スクリプトを実行

```bash
./update_all_schemas_complete.sh
```

### 4. 更新後のスキーマを確認

```bash
# 更新後のスキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests"
```

---

## 🎯 クイック確認コマンド（コピー&ペースト）

Cloud Shellで以下を実行して、すべて正常か確認：

```bash
echo "=== Cloud Shell動作確認 ===" && \
echo "1. gcloud: $(gcloud --version | head -1)" && \
echo "2. bq: $(bq version 2>&1 | head -1)" && \
echo "3. プロジェクト: $(gcloud config get-value project)" && \
echo "4. データセット存在: $(bq ls -d --project_id=univere-geo-demo universegeo_dataset &> /dev/null && echo '✅' || echo '❌')" && \
echo "=== 確認完了 ==="
```

すべて✅が表示されれば、スキーマ更新スクリプトを実行できます。

