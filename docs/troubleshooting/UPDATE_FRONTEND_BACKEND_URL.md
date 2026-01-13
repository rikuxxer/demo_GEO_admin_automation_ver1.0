# フロントエンドのバックエンドURL更新ガイド

## 問題

フロントエンドが古いバックエンドURL（`https://universegeo-backend-i5xw76aisq-an.a.run.app`）を参照しているため、新しいバックエンド（`https://universegeo-backend-223225164238.asia-northeast1.run.app`）に接続できません。

## 解決方法

### 方法1: GitHub Secretsを更新してフロントエンドを再デプロイ（推奨）

1. **現在のバックエンドURLを確認**
   ```bash
   gcloud run services describe universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --format 'value(status.url)'
   ```

2. **GitHub Secrets（Environment secrets）を更新**
   - https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments/Environment%20secrets を開く
   - `BACKEND_URL`を更新（または新規作成）
   - 値: `https://universegeo-backend-223225164238.asia-northeast1.run.app`（最新のURLに置き換え）

3. **フロントエンドを再デプロイ**
   - GitHub Actionsでフロントエンドデプロイワークフローを手動実行
   - または、`src/`ディレクトリに変更を加えてプッシュ

### 方法2: ワークフロー実行時に手動でURLを指定

1. GitHub Actionsの「Deploy Frontend to Cloud Run」ワークフローを手動実行
2. `backend_url`入力欄に最新のバックエンドURLを入力:
   ```
   https://universegeo-backend-223225164238.asia-northeast1.run.app
   ```

### 方法3: 現在のバックエンドURLを確認して更新

```bash
# 現在のバックエンドURLを取得
PROJECT_ID="univere-geo-demo"
REGION="asia-northeast1"

CURRENT_BACKEND_URL=$(gcloud run services describe universegeo-backend \
  --region $REGION \
  --project $PROJECT_ID \
  --format 'value(status.url)')

echo "現在のバックエンドURL: $CURRENT_BACKEND_URL"

# このURLをGitHub SecretsのBACKEND_URLに設定してください
```

## 確認方法

フロントエンドを再デプロイ後、ブラウザの開発者ツールのNetworkタブで、APIリクエストが新しいバックエンドURLに送信されているか確認してください。

## 注意事項

- フロントエンドのビルド時に`VITE_API_BASE_URL`が埋め込まれるため、URLを変更するには再ビルドが必要です
- 古いフロントエンドイメージがキャッシュされている場合は、新しいイメージをプッシュして再デプロイしてください

