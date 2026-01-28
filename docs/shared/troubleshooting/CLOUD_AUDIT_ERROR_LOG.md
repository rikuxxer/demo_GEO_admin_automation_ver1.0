# Cloud Audit ERROR ログの確認方法

## ログの種類

- **logName**: `cloudaudit.googleapis.com/activity` → **Cloud Audit の「管理者アクティビティ」ログ**
- **severity**: ERROR
- **timestamp**: 2026-01-28T06:15:39Z
- **payload**: protoPayload（中身を開かないと原因は分からない）

## 何が起きているか

このログは「誰かが GCP の API を呼んだ結果、エラーになった」という**監査イベント**です。  
POST /api/projects の 500 と同時刻なら、そのリクエストに紐づいている可能性があります。

## 確認すべきこと（protoPayload の中身）

GCP コンソールでこのログを開き、**protoPayload** を展開して次を確認してください。

| 項目 | 見方 |
|------|------|
| **methodName** | どの API が呼ばれたか（例: `RunJob`, `Insert`, `google.cloud.bigquery.v2.JobService.InsertJob` など） |
| **status** | エラーコードとメッセージ（例: `code: 7, message: "Permission denied"`） |
| **resourceName** | 対象リソース（例: `projects/univere-geo-demo/...`） |
| **authenticationInfo.principalEmail** | どのサービスアカウント／ユーザーが呼んだか |
| **request** / **requestMetadata** | リクエストの詳細（あれば） |

## よくある原因

1. **IAM の権限不足**  
   - status に `Permission denied` や `403`  
   - BigQuery のデータセット／テーブルへの書き込み権限がない、など

2. **BigQuery API のエラー**  
   - `InsertJob` や `Insert` が失敗  
   - status に `already exists` や `duplicate`、または 409 / 500 など

3. **Cloud Run の実行時エラー**  
   - Run のリビジョンが API を呼んだ結果のエラーが、監査ログに ERROR で出ている場合

## コンソールでの見方

1. **ログエクスプローラー**を開く  
   - ナビゲーション: ログ → ログエクスプローラー（または Logging → Logs Explorer）
2. 該当のログ行をクリックして詳細を開く
3. **protoPayload** を展開し、上記の **methodName** と **status** を確認する

## gcloud で同じログを詳しく見る

```bash
# 直近の Cloud Audit ERROR を JSON で取得（asia-northeast1）
gcloud logging read '
  logName="projects/univere-geo-demo/logs/cloudaudit.googleapis.com%2Factivity"
  AND severity=ERROR
  AND timestamp>="2026-01-28T06:15:00Z"
  AND timestamp<="2026-01-28T06:16:00Z"
' \
  --project=univere-geo-demo \
  --format=json \
  --limit=5
```

出力の各エントリで `protoPayload.methodName` と `protoPayload.status` を確認してください。

## 次のアクション

- **methodName** が BigQuery 関連（例: `InsertJob`）で **status** が権限エラー → バックエンド用サービスアカウントに BigQuery の権限を付与
- **status** が `already exists` や重複系 → バックエンドのリトライ／採番ロジックの確認（VERIFY_DEPLOYED_IMAGE_AND_RETRY.md を参照）
- **methodName** が Cloud Run 関連でエラー → その API の権限またはリソース設定を確認

**protoPayload の methodName と status（code / message）をコピーして共有してもらえれば、原因をさらに絞り込めます。**
