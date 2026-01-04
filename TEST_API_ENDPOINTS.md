# APIエンドポイントのテスト方法

## `/api/projects`エンドポイントのテスト

### Cloud Shellで実行

```bash
# 基本的なリクエスト
curl https://universegeo-backend-223225164238.asia-northeast1.run.app/api/projects

# 詳細なレスポンス情報を表示
curl -v https://universegeo-backend-223225164238.asia-northeast1.run.app/api/projects

# JSON形式で整形して表示
curl https://universegeo-backend-223225164238.asia-northeast1.run.app/api/projects | jq .

# エラーの詳細を確認
curl -i https://universegeo-backend-223225164238.asia-northeast1.run.app/api/projects
```

### 期待される結果

#### 成功時（プロジェクトが存在する場合）
```json
[
  {
    "project_id": "...",
    "project_name": "...",
    ...
  }
]
```

#### 成功時（プロジェクトが存在しない場合）
```json
[]
```

#### エラー時
```json
{
  "error": "エラーメッセージ",
  "type": "ErrorType",
  "details": "詳細情報"
}
```

## その他のエンドポイント

### ヘルスチェック
```bash
curl https://universegeo-backend-223225164238.asia-northeast1.run.app/health
```

期待される結果：
```json
{
  "status": "ok",
  "timestamp": "2025-12-19T08:18:58.205Z",
  "environment": {
    "GCP_PROJECT_ID": "SET",
    "BQ_DATASET": "universegeo_dataset"
  }
}
```

## トラブルシューティング

### エラー: "GCP_PROJECT_ID環境変数が設定されていません"

**確認方法**:
```bash
# 環境変数を確認
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.containers[0].env[?name="GCP_PROJECT_ID"].value)'
```

**解決方法**:
環境変数が設定されていない場合は、再設定：
```bash
gcloud run services update universegeo-backend \
  --set-env-vars GCP_PROJECT_ID="univere-geo-demo" \
  --region asia-northeast1 \
  --project univere-geo-demo
```

### エラー: "Not found: Project"

**原因**: プロジェクトIDが正しくない、またはBigQueryの権限がない

**確認方法**:
1. プロジェクトIDが正しいか確認
2. サービスアカウントにBigQueryの権限があるか確認

### エラー: "Dataset not found"

**原因**: データセット`universegeo_dataset`が存在しない

**解決方法**:
```bash
# データセットを作成
bq mk --dataset --location=asia-northeast1 univere-geo-demo:universegeo_dataset
```

### エラー: "Table not found"

**原因**: `projects`テーブルが存在しない

**解決方法**:
テーブルを作成するか、既存のテーブル名を確認

## ログの確認

エラーが発生した場合、ログを確認：

```bash
# 最新のログを確認
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=universegeo-backend" \
  --limit 20 \
  --project univere-geo-demo \
  --format="table(timestamp,severity,textPayload,jsonPayload.message)"
```




