# ユーザー登録申請エラーのデバッグガイド

## エラーの確認方法

### 方法1: ブラウザのDevToolsで確認（最も簡単）

1. ブラウザのDevToolsを開く（F12キー）
2. **Network**タブを開く
3. ユーザー登録申請を再試行
4. `POST /api/user-requests`のリクエストをクリック
5. **Response**タブでエラーレスポンスを確認

**エラーレスポンスの例:**
```json
{
  "error": "ユーザー登録申請に失敗しました",
  "type": "BigQueryError",
  "missingColumns": ["requested_at", "reviewed_at"],
  "hint": "以下の列がBigQueryスキーマに存在しません: requested_at, reviewed_at。UPDATE_BIGQUERY_SCHEMA.mdのaddfieldコマンドで追加してください。",
  "errors": [
    {
      "message": "...",
      "reason": "...",
      "location": "requested_at"
    }
  ]
}
```

**`missingColumns`配列に表示されている列名が、BigQueryスキーマに欠けている列です。**

### 方法2: Cloud Runのログを確認

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. **Cloud Run** > **universegeo-backend**を開く
3. **ログ**タブを開く
4. `[BQ insert user_requests] error[0]:`を検索
5. `location`フィールドを確認

**ログの例:**
```
[BQ insert user_requests] error[0]: {
  message: "...",
  reason: "...",
  location: "requested_at",  // ←欠けている列名がここに出る
  debugInfo: "..."
}
```

## スキーマを更新する方法

### ステップ1: 現在のスキーマを確認

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# スキーマを確認
cat schema.json
```

### ステップ2: 欠けている列を追加

`missingColumns`に表示されている列名を`addfield`コマンドで追加します。

**例: `requested_at`が欠けている場合**

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"
TABLE="user_requests"

# 現在のスキーマを取得
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}" > schema.json

# 欠けている列を追加
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"requested_at","type":"TIMESTAMP","mode":"NULLABLE"})
' schema.json > schema_new.json

# 更新後のスキーマを確認
cat schema_new.json

# スキーマを更新
bq update -t \
  --project_id="${PROJECT_ID}" \
  --schema schema_new.json \
  "${DATASET_ID}.${TABLE}"
```

### ステップ3: 複数の列が欠けている場合

複数の列が欠けている場合は、`addfield`を複数回呼び出します。

**例: `requested_at`と`reviewed_at`が欠けている場合**

```bash
jq '
  def addfield($f):
    if (map(.name) | index($f.name)) then . else . + [$f] end;
  addfield({"name":"requested_at","type":"TIMESTAMP","mode":"NULLABLE"}) |
  addfield({"name":"reviewed_at","type":"TIMESTAMP","mode":"NULLABLE"})
' schema.json > schema_new.json
```

## 完全なスキーマ更新コマンド

すべての必須フィールドを含む完全なスキーマ更新コマンドは、`UPDATE_BIGQUERY_SCHEMA.md`の「user_requestsテーブル」セクションを参照してください。

## よくあるエラーと解決方法

### エラー1: "Project :.univere-geo-demo is not found"

**原因:** `PROJECT_ID`変数が正しく設定されていない

**解決方法:**
```bash
# 変数を明示的に設定
export PROJECT_ID="univere-geo-demo"
export DATASET_ID="universegeo_dataset"

# または、--project_idフラグを使用
bq update -t \
  --project_id="univere-geo-demo" \
  --schema schema_new.json \
  "universegeo_dataset.user_requests"
```

### エラー2: "Table not found"

**原因:** テーブルが存在しない

**解決方法:**
```bash
# テーブルが存在するか確認
bq ls "${DATASET_ID}"

# テーブルが存在しない場合は作成
bq mk --table "${PROJECT_ID}:${DATASET_ID}.${TABLE}" schema_new.json
```

### エラー3: "Schema update is not allowed"

**原因:** 既存のデータと互換性のないスキーマ変更

**解決方法:**
- `REQUIRED`フィールドを追加する場合は、既存のデータに値が存在する必要があります
- まず`NULLABLE`で追加し、データを更新してから`REQUIRED`に変更してください

## トラブルシューティング

### スキーマ更新後もエラーが続く場合

1. **スキーマが正しく更新されたか確認:**
   ```bash
   bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.${TABLE}"
   ```

2. **バックエンドを再デプロイ:**
   - GitHub Actionsでバックエンドを再デプロイ
   - または、手動でCloud Runを再デプロイ

3. **キャッシュをクリア:**
   - ブラウザのキャッシュをクリア
   - または、シークレットモードで再試行

### ログが表示されない場合

1. **Cloud Runのログレベルを確認:**
   - Cloud Runのログ設定で`INFO`レベル以上が有効になっているか確認

2. **ログの検索期間を拡大:**
   - ログの検索期間を過去1時間、24時間などに拡大

3. **直接ログを確認:**
   ```bash
   gcloud run services logs read universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --limit 100
   ```

