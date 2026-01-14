# クイックテーブル作成ガイド

## 📊 現在の状況確認

まず、現在のテーブル作成状況を確認してください：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "テーブル一覧:"
bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1 | tail -n +3
```

---

## 方法1: スクリプトファイルを使用（推奨）

### ステップ1: スクリプトを作成

Cloud Shellで以下のコマンドを実行：

```bash
# スクリプトファイルをアップロードするか、以下で作成
cat > create_tables_step_by_step.sh << 'SCRIPT_EOF'
# （create_tables_step_by_step.shの内容をここに貼り付け）
SCRIPT_EOF

chmod +x create_tables_step_by_step.sh
```

### ステップ2: スクリプトを実行

```bash
./create_tables_step_by_step.sh
```

---

## 方法2: 個別にテーブルを作成

コマンドが長すぎる場合は、各テーブルを個別に作成できます。

### 1. projectsテーブル

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

cat > /tmp/projects_schema.json << 'EOF'
[
  {"name": "project_id", "type": "STRING", "mode": "REQUIRED"},
  {"name": "advertiser_name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "agency_name", "type": "STRING", "mode": "NULLABLE"},
  {"name": "appeal_point", "type": "STRING", "mode": "NULLABLE"},
  {"name": "delivery_start_date", "type": "DATE", "mode": "NULLABLE"},
  {"name": "delivery_end_date", "type": "DATE", "mode": "NULLABLE"},
  {"name": "person_in_charge", "type": "STRING", "mode": "NULLABLE"},
  {"name": "project_status", "type": "STRING", "mode": "NULLABLE"},
  {"name": "remarks", "type": "STRING", "mode": "NULLABLE"},
  {"name": "project_registration_started_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "_register_datetime", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "created_at", "type": "TIMESTAMP", "mode": "NULLABLE"},
  {"name": "updated_at", "type": "TIMESTAMP", "mode": "NULLABLE"}
]
EOF

bq mk --table --project_id="${PROJECT_ID}" --schema /tmp/projects_schema.json "${DATASET_ID}.projects"
echo "projects作成完了"
```

### 2. 残りのテーブル

同様に、他のテーブルも個別に作成できます。`CREATE_TABLES_ONLY.md`を参照してください。

---

## 作成状況の確認

テーブル作成状況を確認：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "作成済みテーブル:"
bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1 | tail -n +3

echo ""
echo "期待されるテーブル数: 10個"
echo "作成済みテーブル数: $(bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1 | tail -n +3 | wc -l)個"
```

---

## エラーが発生した場合

### エラー: "Table already exists"

テーブルが既に存在する場合は、スキップして次のテーブルに進みます。

### エラー: "Dataset not found"

データセットが存在しない場合は、先にデータセットを作成してください：

```bash
bq mk --dataset \
  --project_id="univere-geo-demo" \
  --location="asia-northeast1" \
  --description="UNIVERSEGEO データセット" \
  "universegeo_dataset"
```

---

## 完了確認

すべてのテーブルが作成されたか確認：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# 期待されるテーブル
EXPECTED=("projects" "segments" "pois" "users" "user_requests" "messages" "change_history" "edit_requests" "feature_requests" "visit_measurement_groups")

# 実際のテーブル一覧
EXISTING=$(bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1 | tail -n +3 | awk '{print $1}')

echo "テーブル作成状況:"
for table in "${EXPECTED[@]}"; do
  if echo "$EXISTING" | grep -q "^${table}$"; then
    echo "  ${table}"
  else
    echo "  ${table} (未作成)"
  fi
done
```

---

## 次のステップ

1. すべてのテーブルが作成されたことを確認
2. ブラウザのキャッシュをクリア
3. ユーザー登録申請を再試行
4. エラーが解消されたか確認

