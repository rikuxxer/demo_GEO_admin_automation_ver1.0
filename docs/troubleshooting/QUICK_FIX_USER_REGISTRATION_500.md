# ユーザー登録申請500エラーのクイック修正ガイド

## 🔍 エラーの確認方法

### ステップ1: ブラウザのDevToolsでエラーレスポンスを確認

1. **ブラウザのDevToolsを開く**（F12キー）
2. **Networkタブ**を開く
3. **ユーザー登録申請を再試行**
4. **`POST /api/user-requests`**のリクエストをクリック
5. **Responseタブ**でエラーレスポンスを確認

**確認ポイント**:
- `missingColumns`配列があるか
- `errors`配列の内容
- `hint`メッセージの内容

### ステップ2: コンソールログを確認

DevToolsの**Consoleタブ**で以下のログを確認:
- `❌ BigQueryスキーマに欠けている列:`
- `💡 ヒント:`
- `📋 エラー詳細:`

---

## 🛠️ 最も一般的な原因と解決方法

### 原因: BigQueryスキーマに必要な列が欠けている

**症状**:
- エラーレスポンスに`missingColumns`が含まれる
- コンソールに「BigQueryスキーマに欠けている列」が表示される

**解決方法**:

#### 1. 欠けている列を確認

エラーレスポンスまたはコンソールログから`missingColumns`を確認します。

**よく欠けている列**:
- `requested_at` (TIMESTAMP)
- `reviewed_at` (TIMESTAMP)
- `reviewed_by` (STRING)
- `review_comment` (STRING)

#### 2. スキーマを更新（コピー&ペーストで実行可能）

```bash
# プロジェクトIDとデータセットIDを設定
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# 欠けている列を追加（jqコマンドを使用）
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"requested_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"reviewed_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"reviewed_by","type":"STRING","mode":"NULLABLE"}) |
  addfield({"name":"review_comment","type":"STRING","mode":"NULLABLE"})
' schema.json > schema_new.json

# スキーマを更新
bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema schema_new.json \
  "${DATASET_ID}.${TABLE}"
```

#### 3. jqコマンドがない場合の代替方法

jqコマンドがない場合は、手動でスキーマファイルを編集:

```bash
# スキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# schema.jsonを編集して、以下のフィールドを追加:
# {"name":"requested_at","type":"TIMESTAMP","mode":"NULLABLE"}
# {"name":"reviewed_at","type":"TIMESTAMP","mode":"NULLABLE"}
# {"name":"reviewed_by","type":"STRING","mode":"NULLABLE"}
# {"name":"review_comment","type":"STRING","mode":"NULLABLE"}

# スキーマを更新
bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema schema.json \
  "${DATASET_ID}.${TABLE}"
```

#### 4. 完全なスキーマで上書き（最も確実）

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 完全なスキーマを作成
cat > schema_complete.json << 'EOF'
[
  {"name":"user_id","type":"STRING","mode":"REQUIRED"},
  {"name":"name","type":"STRING","mode":"REQUIRED"},
  {"name":"email","type":"STRING","mode":"REQUIRED"},
  {"name":"password_hash","type":"STRING","mode":"REQUIRED"},
  {"name":"requested_role","type":"STRING","mode":"REQUIRED"},
  {"name":"department","type":"STRING","mode":"NULLABLE"},
  {"name":"reason","type":"STRING","mode":"NULLABLE"},
  {"name":"status","type":"STRING","mode":"REQUIRED"},
  {"name":"requested_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"reviewed_at","type":"TIMESTAMP","mode":"NULLABLE"},
  {"name":"reviewed_by","type":"STRING","mode":"NULLABLE"},
  {"name":"review_comment","type":"STRING","mode":"NULLABLE"}
]
EOF

# スキーマを更新
bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema schema_complete.json \
  "${DATASET_ID}.${TABLE}"
```

---

## ✅ 動作確認

1. **ブラウザのキャッシュをクリア**（Ctrl+Shift+Delete または Cmd+Shift+Delete）
2. **ユーザー登録申請を再試行**
3. **エラーが解消されたか確認**

---

## 🔄 バックエンドの再デプロイが必要な場合

スキーマを更新してもエラーが続く場合、バックエンドを再デプロイしてください:

```bash
# GitHub Actionsで再デプロイ
# または、手動でCloud Runを再デプロイ

cd backend
gcloud run deploy universegeo-backend \
  --source . \
  --region asia-northeast1 \
  --project univere-geo-demo
```

---

## 📞 それでも解決しない場合

1. **エラーログを収集**:
   - DevToolsのNetworkタブのスクリーンショット
   - Consoleタブのエラーログ

2. **Cloud Runのログを確認**:
   ```bash
   gcloud run services logs read universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --limit 50
   ```

3. **関連ドキュメントを確認**:
   - `TROUBLESHOOT_USER_REGISTRATION_500.md`
   - `DEBUG_USER_REGISTRATION_ERROR.md`
   - `UPDATE_BIGQUERY_SCHEMA.md`

