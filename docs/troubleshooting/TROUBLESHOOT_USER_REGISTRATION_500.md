# ユーザー登録申請500エラーのトラブルシューティング

## 🔍 エラーの確認方法

### 方法1: ブラウザのDevToolsで確認（推奨）

1. ブラウザのDevToolsを開く（F12キー）
2. **Network**タブを開く
3. ユーザー登録申請を再試行
4. `POST /api/user-requests`のリクエストをクリック
5. **Response**タブでエラーレスポンスを確認

**エラーレスポンスの例:**
```json
{
  "error": "ユーザー登録申請の作成に失敗しました",
  "type": "BigQueryError",
  "code": "...",
  "errors": [
    {
      "message": "...",
      "reason": "...",
      "location": "requested_at"
    }
  ],
  "missingColumns": ["requested_at", "reviewed_at"],
  "hint": "以下の列がBigQueryスキーマに存在しません: requested_at, reviewed_at。UPDATE_BIGQUERY_SCHEMA.mdのaddfieldコマンドで追加してください。"
}
```

### 方法2: Cloud Runのログを確認

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. **Cloud Run** > **universegeo-backend**を開く
3. **ログ**タブを開く
4. 以下のキーワードで検索:
   - `[BQ insert user_requests] error`
   - `POST /api/user-requests`
   - `severity: ERROR`

**ログの例:**
```json
{
  "severity": "ERROR",
  "request_id": "...",
  "route": "/api/user-requests",
  "method": "POST",
  "status": 500,
  "error_name": "BigQueryError",
  "error_message": "ユーザー登録申請の作成に失敗しました",
  "bq": {
    "code": "...",
    "errors": [...],
    "missingColumns": ["requested_at", "reviewed_at"]
  }
}
```

---

## 🛠️ よくある原因と解決方法

### 原因1: BigQueryスキーマに必要な列が欠けている

**症状**:
- エラーレスポンスに`missingColumns`が含まれる
- `location`フィールドに列名が表示される

**解決方法**:

1. **欠けている列を確認**:
   - エラーレスポンスの`missingColumns`配列を確認
   - または、ログの`bq.missingColumns`を確認

2. **スキーマを更新**:
   ```bash
   PROJECT_ID="univere-geo-demo"
   DATASET_ID="universegeo_dataset"
   TABLE="user_requests"
   
   # 現在のスキーマを取得
   bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json
   
   # 欠けている列を追加（例: requested_at）
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

3. **バックエンドを再デプロイ**:
   - GitHub Actionsでバックエンドを再デプロイ
   - または、手動でCloud Runを再デプロイ

### 原因2: 環境変数が設定されていない

**症状**:
- エラーメッセージに`GCP_PROJECT_ID`や`BQ_DATASET`が含まれる
- エラーレスポンスに`configuration`が含まれる

**解決方法**:

1. **Cloud Runの環境変数を確認**:
   ```bash
   gcloud run services describe universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --format='value(spec.template.spec.containers[0].env)'
   ```

2. **環境変数を設定**:
   ```bash
   gcloud run services update universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --set-env-vars GCP_PROJECT_ID=univere-geo-demo \
     --set-env-vars BQ_DATASET=universegeo_dataset
   ```

### 原因3: BigQueryへの接続エラー

**症状**:
- エラーメッセージに`Permission denied`や`Not found`が含まれる
- エラーコードが`403`や`404`

**解決方法**:

1. **サービスアカウントの権限を確認**:
   ```bash
   gcloud projects get-iam-policy univere-geo-demo \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:*"
   ```

2. **必要な権限を付与**:
   ```bash
   SERVICE_ACCOUNT="universegeo-backend-sa@univere-geo-demo.iam.gserviceaccount.com"
   
   # BigQueryデータ編集者権限
   gcloud projects add-iam-policy-binding univere-geo-demo \
     --member="serviceAccount:${SERVICE_ACCOUNT}" \
     --role="roles/bigquery.dataEditor"
   
   # BigQueryジョブユーザー権限
   gcloud projects add-iam-policy-binding univere-geo-demo \
     --member="serviceAccount:${SERVICE_ACCOUNT}" \
     --role="roles/bigquery.jobUser"
   ```

### 原因4: テーブルが存在しない

**症状**:
- エラーメッセージに`Table not found`が含まれる
- エラーコードが`404`

**解決方法**:

1. **テーブルの存在を確認**:
   ```bash
   bq ls univere-geo-demo:universegeo_dataset
   ```

2. **テーブルが存在しない場合は作成**:
   - `UPDATE_BIGQUERY_SCHEMA.md`の「user_requestsテーブル」セクションを参照
   - または、`CHECK_BIGQUERY_TABLE.md`を参照

---

## 📋 完全なスキーマ更新コマンド

`user_requests`テーブルの完全なスキーマ更新コマンド:

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# 完全なスキーマを作成
cat > schema_new.json << 'EOF'
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
  --schema schema_new.json \
  "${DATASET_ID}.${TABLE}"
```

---

## 🔄 トラブルシューティング手順

### ステップ1: エラーの詳細を確認

1. ブラウザのDevToolsでエラーレスポンスを確認
2. `missingColumns`、`errors`、`hint`を確認
3. Cloud Runのログで詳細なエラー情報を確認

### ステップ2: 原因を特定

- `missingColumns`がある → スキーマの問題
- `GCP_PROJECT_ID`エラー → 環境変数の問題
- `Permission denied` → 権限の問題
- `Table not found` → テーブルの問題

### ステップ3: 解決方法を実行

上記の「よくある原因と解決方法」を参照

### ステップ4: 動作確認

1. ブラウザのキャッシュをクリア
2. ユーザー登録申請を再試行
3. エラーが解消されたか確認

---

## 📞 サポート

問題が解決しない場合:

1. **エラーログを収集**:
   - ブラウザのDevToolsのNetworkタブのスクリーンショット
   - Cloud Runのログのエクスポート

2. **環境情報を確認**:
   - GCP_PROJECT_ID
   - BQ_DATASET
   - サービスアカウントの権限

3. **関連ドキュメントを確認**:
   - `DEBUG_USER_REGISTRATION_ERROR.md`
   - `UPDATE_BIGQUERY_SCHEMA.md`
   - `CHECK_BIGQUERY_TABLE.md`

