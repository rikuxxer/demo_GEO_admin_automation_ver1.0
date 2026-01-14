# REST API経由でテーブル作成（bqコマンドのタイムアウト問題を回避）

## 🎯 問題点

`bq mk --table`コマンドがタイムアウト（exit code 124）する問題が発生しています。

## 解決方法

BigQuery REST APIを直接使用してテーブルを作成します。

---

## 使用方法

### 方法1: スクリプトを実行

```bash
bash create_all_tables_via_api.sh
```

### 方法2: 個別にテーブルを作成

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="projects"
TOKEN="$(gcloud auth print-access-token)"

# 1) スキーマファイルを作成
cat > /tmp/projects_schema.json <<'EOF'
[
  {"name":"project_id","type":"STRING","mode":"REQUIRED"},
  {"name":"advertiser_name","type":"STRING","mode":"NULLABLE"},
  {"name":"agency_name","type":"STRING","mode":"NULLABLE"},
  {"name":"appeal_point","type":"STRING","mode":"NULLABLE"},
  {"name":"delivery_start_date","type":"DATE","mode":"NULLABLE"},
  {"name":"delivery_end_date","type":"DATE","mode":"NULLABLE"},
  {"name":"person_in_charge","type":"STRING","mode":"NULLABLE"},
  {"name":"project_status","type":"STRING","mode":"NULLABLE"},
  {"name":"remarks","type":"STRING","mode":"NULLABLE"},
  {"name":"project_registration_started_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"_register_datetime","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"created_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"updated_at","type":"TIMESTAMP","mode":"NULLABLE"}
]
EOF

# 2) 既に存在するか確認
timeout 10s curl -sS -w "http_code=%{http_code}\n" \
  -H "Authorization: Bearer ${TOKEN}" \
  "https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/datasets/${DATASET_ID}/tables/${TABLE}" \
  > /tmp/get_${TABLE}.json

if grep -q "http_code=200" /tmp/get_${TABLE}.json; then
  echo "${TABLE} は既に存在します"
else
  # 3) JSONリクエストボディを作成
  export PROJECT_ID DATASET_ID
  python3 - <<'PY'
import json, os
schema = json.load(open("/tmp/projects_schema.json", "r", encoding="utf-8"))
body = {
  "tableReference": {
    "projectId": os.environ["PROJECT_ID"],
    "datasetId": os.environ["DATASET_ID"],
    "tableId": "projects"
  },
  "schema": {"fields": schema}
}
with open("/tmp/create_projects.json", "w", encoding="utf-8") as f:
  json.dump(body, f, ensure_ascii=False)
print("リクエストボディを作成しました")
PY

  # 4) REST APIでテーブルを作成
  echo "${TABLE} を作成中..."
  timeout 30s curl -sS -o /tmp/create_${TABLE}_resp.json -w "http_code=%{http_code}\n" \
    -X POST \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    --data-binary @/tmp/create_projects.json \
    "https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/datasets/${DATASET_ID}/tables"

  # 5) 結果確認
  if grep -q "http_code=200" /tmp/create_${TABLE}_resp.json; then
    echo "${TABLE} を作成しました"
  else
    echo "${TABLE} の作成に失敗しました"
    head -c 500 /tmp/create_${TABLE}_resp.json
  fi
fi
```

---

## テーブル一覧

作成されるテーブル：

1. `projects` - プロジェクト情報
2. `segments` - セグメント情報
3. `pois` - POI（地点）情報
4. `users` - ユーザー情報
5. `user_requests` - ユーザー登録申請
6. `messages` - メッセージ
7. `change_history` - 変更履歴
8. `edit_requests` - 編集申請
9. `feature_requests` - 機能要望
10. `visit_measurement_groups` - 訪問測定グループ

---

## 完了確認

すべてのテーブルが作成されたか確認：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "作成済みテーブル一覧:"
bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1 | tail -n +3

echo ""
echo "期待されるテーブル数: 10個"
echo "作成済みテーブル数: $(bq ls --project_id=\"${PROJECT_ID}\" \"${DATASET_ID}\" 2>&1 | tail -n +3 | wc -l)個"
```

または、REST APIで確認：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TOKEN="$(gcloud auth print-access-token)"

for table in projects segments pois users user_requests messages change_history edit_requests feature_requests visit_measurement_groups; do
  HTTP_CODE=$(timeout 10s curl -sS -w "%{http_code}" -o /dev/null \
    -H "Authorization: Bearer ${TOKEN}" \
    "https://bigquery.googleapis.com/bigquery/v2/projects/${PROJECT_ID}/datasets/${DATASET_ID}/tables/${table}")
  if [ "${HTTP_CODE}" = "200" ]; then
    echo "${table}"
  else
    echo "${table} (HTTP ${HTTP_CODE})"
  fi
done
```

---

## トラブルシューティング

### トークンの取得に失敗する場合

```bash
gcloud auth login
gcloud auth application-default login
```

### REST APIでエラーが発生する場合

- エラーレスポンスを確認（`/tmp/create_*_resp.json`）
- スキーマJSONの形式を確認
- 権限を確認

---

## メリット

1. **タイムアウト問題を回避**: `bq`コマンドのタイムアウト問題を回避
2. **高速**: REST APIは直接呼び出しで高速
3. **エラーメッセージが明確**: HTTPステータスコードとエラーレスポンスで問題を特定しやすい

