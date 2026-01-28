# ReplaceService ERROR の確認方法

## ログ情報

- **日時**: 2026-01-28 15:15:39.322 JST (06:15:39 UTC)
- **logName**: `cloudaudit.googleapis.com/activity`
- **severity**: **ERROR**
- **methodName**: `google.cloud.run.v1.Services.ReplaceService`
- **resourceName**: `namespaces/univere-geo-demo/services/universegeo`
- **principal**: `id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com`

## protoPayload の中身を確認する方法

### 方法1: GCP コンソール（ログエクスプローラー）

1. **ログエクスプローラー**を開く
   - ナビゲーション: ログ → ログエクスプローラー（または Logging → Logs Explorer）

2. **フィルタを設定**
   ```
   logName="projects/univere-geo-demo/logs/cloudaudit.googleapis.com%2Factivity"
   AND severity=ERROR
   AND timestamp="2026-01-28T06:15:39.322362Z"
   AND protoPayload.methodName="google.cloud.run.v1.Services.ReplaceService"
   ```

3. **該当ログをクリック**して詳細を開く

4. **protoPayload** を展開し、以下を確認:
   - **status** → `code` と `message`（エラーコードとメッセージ）
   - **request** → デプロイしようとした内容（イメージ URL、環境変数など）

### 方法2: gcloud CLI

```bash
gcloud logging read '
  logName="projects/univere-geo-demo/logs/cloudaudit.googleapis.com%2Factivity"
  AND severity=ERROR
  AND timestamp="2026-01-28T06:15:39.322362Z"
  AND protoPayload.methodName="google.cloud.run.v1.Services.ReplaceService"
' \
  --project=univere-geo-demo \
  --format=json \
  --limit=1 \
  | jq '.[0].protoPayload | {
      methodName: .methodName,
      status: .status,
      resourceName: .resourceName,
      request: .request
    }'
```

出力例:
```json
{
  "methodName": "google.cloud.run.v1.Services.ReplaceService",
  "status": {
    "code": 7,
    "message": "Permission denied"
  },
  "resourceName": "namespaces/univere-geo-demo/services/universegeo",
  "request": {
    "apiVersion": "serving.knative.dev/v1",
    "kind": "Service",
    "spec": {
      "template": {
        "spec": {
          "containers": [{
            "image": "asia-northeast1-docker.pkg.dev/..."
          }]
        }
      }
    }
  }
}
```

## よくあるエラーパターンと対応

| status.code | status.message | 原因 | 対応 |
|-------------|----------------|------|------|
| **10** | `Conflict for resource 'universegeo': version '...' was specified but current version is '...'` | **バージョン競合**: デプロイ要求が古いリソースバージョン基準で送られ、その間に別の更新が入った | 同時デプロイを避ける（concurrency）、デプロイ失敗時にリトライ（数秒待って再実行） |
| **7** | `Permission denied` | IAM 権限不足 | サービスアカウント `id-universegeo-backend@...` に `roles/run.admin` または `roles/run.developer` を付与 |
| **3** | `Invalid argument` | リクエストパラメータ不正 | `request` の中身（イメージ URL、環境変数など）を確認 |
| **8** | `Resource exhausted` | リソース制限（メモリ、CPU、リビジョン数など） | Cloud Run のクォータを確認、不要リビジョンを削除 |
| **2** | `Unknown` | その他のエラー | `status.message` の詳細を確認、Cloud Run のリビジョン作成ログも確認 |
| **14** | `UNAVAILABLE` | サービス一時的に利用不可 | しばらく待って再試行 |

### code 10 (Conflict) の詳細

- **意味**: デプロイ時に「指定したリソースのバージョン」と「現在のバージョン」が一致しない。  
  例: ジョブAがサービスを読んだ直後にジョブBがデプロイしてしまい、ジョブAがデプロイしようとした時点ではすでに別バージョンになっている。
- **よくある原因**: フロント用とバックエンド用など、**複数のワークフローがほぼ同時に同じサービスを更新した**、または **同一ワークフローの別ジョブが先に更新した**。
- **対応**:
  1. **concurrency** で同一サービスのデプロイを1本にまとめる（推奨）。
  2. デプロイステップで **失敗時に数秒待ってリトライ**（2〜3回）する。

**注意**: 2026-01-28 15:15 の失敗したデプロイは、イメージ `395e8dc057f6db4d852f1860d2904e539b5e3420`（コミット 395e8dc）をデプロイしようとしていました。  
このコミットは**リトライ処理や favicon 修正を含むコミット（7db80239, 8327971c）より古い**ため、競合がなくても古いコードがデプロイされていた可能性があります。  
最新のコミットがデプロイされるよう、ワークフローが最新の main をチェックアウトしていることを確認してください。

## 追加で確認すべきログ

ReplaceService が ERROR の場合、**Cloud Run のリビジョン作成ログ**も確認すると原因が分かりやすいです。

```bash
gcloud logging read '
  resource.type="cloud_run_revision"
  AND resource.labels.service_name="universegeo"
  AND timestamp>="2026-01-28T06:15:00Z"
  AND timestamp<="2026-01-28T06:16:00Z"
  AND severity>=ERROR
' \
  --project=univere-geo-demo \
  --format=json \
  --limit=10
```

または、GCP コンソールで:
- **Cloud Run** → **universegeo** サービス → **ログ**タブ
- 時刻フィルタ: 2026-01-28 15:15 前後
- severity: ERROR 以上

## 次のアクション

1. **protoPayload.status** の **code** と **message** を確認
2. 上記の表に基づいて対応（権限付与、リクエストパラメータ修正など）
3. 修正後、再度デプロイを実行
4. 新しい ReplaceService ログが **ERROR でない**（または severity が INFO/正常）ことを確認

**protoPayload.status.code と status.message を共有してもらえれば、より具体的な対応方法を提案できます。**
