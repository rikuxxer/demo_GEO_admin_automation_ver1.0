# バックエンド500エラー修正ガイド

## 問題
`/api/projects`が500エラーを返し、「GCP_PROJECT_ID環境変数が設定されていません」というエラーメッセージが表示されています。

## 原因
Cloud Runの実行中リビジョンに`GCP_PROJECT_ID`環境変数が設定されていない、または古いリビジョンにトラフィックがルーティングされている可能性があります。

## 解決方法

### 方法1: スクリプトを実行（推奨）

Cloud Shellまたはローカル環境で以下のコマンドを実行：

```bash
chmod +x FIX_BACKEND_ENV_VARS.sh
./FIX_BACKEND_ENV_VARS.sh
```

### 方法2: 手動でコマンドを実行

#### 1) 500を返しているリビジョンを特定

```bash
PROJECT_ID="univere-geo-demo"
REGION="asia-northeast1"
SERVICE="universegeo-backend"

gcloud logging read \
  'resource.type="cloud_run_revision"
   AND resource.labels.service_name="universegeo-backend"
   AND httpRequest.requestUrl:"/api/projects"
   AND httpRequest.status=500' \
  --project "$PROJECT_ID" \
  --freshness=2h \
  --limit 20 \
  --format='table(timestamp, resource.labels.revision_name, httpRequest.status, trace)'
```

#### 2) そのリビジョンの環境変数を確認

上で取得した`REVISION_NAME`を使用：

```bash
REVISION_NAME="（上で取得したリビジョン名）"

gcloud run revisions describe "$REVISION_NAME" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --format='yaml(spec.containers[0].env)'
```

#### 3) 環境変数を修正

```bash
# 必須環境変数を設定
gcloud run services update "$SERVICE" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --update-env-vars GCP_PROJECT_ID="univere-geo-demo",BQ_DATASET="universegeo_dataset"

# FRONTEND_URLも設定（必要に応じて）
gcloud run services update "$SERVICE" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --update-env-vars FRONTEND_URL="https://universegeo-i5xw76aisq-an.a.run.app"
```

#### 4) トラフィックを最新リビジョンに100%固定

```bash
gcloud run services update-traffic "$SERVICE" \
  --region "$REGION" \
  --project "$PROJECT_ID" \
  --to-latest
```

#### 5) 動作確認

```bash
# /api/projects の確認
curl -i "https://universegeo-backend-i5xw76aisq-an.a.run.app/api/projects"

# /health の確認
curl -i "https://universegeo-backend-i5xw76aisq-an.a.run.app/health"
```

## 再発防止

GitHub Actionsワークフローを修正しました：
- `--set-env-vars`を`--update-env-vars`に変更（既存の環境変数を保持）
- デプロイ後にトラフィックを最新リビジョンに100%固定するステップを追加

次回のデプロイから、この問題は自動的に解決されます。

