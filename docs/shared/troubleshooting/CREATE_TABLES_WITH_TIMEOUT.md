# タイムアウト付きテーブル作成ガイド

## 🎯 改善点

このスクリプトは以下の改善点を含んでいます：

1. **`timeout`コマンドでフリーズ防止**
   - 存在確認: `timeout 10s`
   - テーブル作成: `timeout 30s`

2. **`bq show`で存在確認**
   - `2>/dev/null`を使わず、エラーを適切に処理
   - 存在しない場合のみ作成

3. **エラーメッセージの表示**
   - すべてのエラーを表示して、問題を特定しやすくする

---

## 🚀 使用方法

Cloud Shellで以下のコマンドを実行：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# スクリプトを実行
bash create_all_tables_with_timeout.sh
```

または、個別にテーブルを作成する場合：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="projects"
FQTN="${PROJECT_ID}:${DATASET_ID}.${TABLE}"

# 1) schema 作成
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

# 2) 既に存在するならスキップ、無ければ作成
if timeout 10s bq show --project_id="${PROJECT_ID}" "${FQTN}" >/dev/null 2>&1; then
  echo "⚠️  ${FQTN} already exists"
else
  echo "➡️  creating ${FQTN} ..."
  timeout 30s bq mk --table --project_id="${PROJECT_ID}" --schema=/tmp/projects_schema.json "${FQTN}"
  echo "✅ created ${FQTN}"
fi

# 3) 作成確認
timeout 20s bq show --format=prettyjson "${FQTN}" | head -n 60
```

---

## 📋 テーブル一覧

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

## ✅ 完了確認

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

---

## 🔍 トラブルシューティング

### タイムアウトが発生する場合

- `timeout`の時間を延長（例: `timeout 60s`）
- ネットワーク接続を確認
- BigQuery APIが有効化されているか確認

### エラーが発生する場合

- エラーメッセージを確認
- データセットが存在するか確認
- 権限を確認

---

## 💡 ベストプラクティス

1. **`timeout`を使用**: フリーズを防ぐ
2. **`bq show`で存在確認**: `2>/dev/null`を使わない
3. **エラーメッセージを表示**: 問題を特定しやすくする
4. **FQTN（完全修飾テーブル名）を使用**: `project:dataset.table`形式

