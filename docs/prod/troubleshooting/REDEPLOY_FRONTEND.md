# フロントエンド再デプロイガイド（データ管理機能削除の反映）

## 🎯 目的

本番環境からデータ管理機能を削除するため、フロントエンドを再デプロイします。

## 変更内容

以下のファイルが削除・変更されました：

1. `src/components/DataManagement.tsx` - 削除済み
2. `src/utils/clearData.ts` - 削除済み
3. `src/components/Sidebar.tsx` - データ管理メニューを削除済み
4. `src/App.tsx` - DataManagementコンポーネントの参照を削除済み

## 再デプロイ方法

### 方法1: GitHub Actionsで自動デプロイ（推奨）

変更をコミットしてプッシュすると、自動的にデプロイされます：

```bash
# 変更をコミット
git add .
git commit -m "データ管理機能を削除"

# mainブランチにプッシュ
git push origin main
```

GitHub Actionsが自動的に：
1. コードをチェックアウト
2. 依存関係をインストール
3. アプリケーションをビルド
4. Dockerイメージをビルド・プッシュ
5. Cloud Runにデプロイ

### 方法2: 手動でデプロイ

GitHub Actionsを使わずに手動でデプロイする場合：

#### フロントエンドのデプロイ

```bash
# プロジェクトルートで実行
PROJECT_ID="univere-geo-demo"
REGION="asia-northeast1"
SERVICE_NAME="universegeo-frontend"  # 実際のサービス名に合わせて変更

# Dockerイメージをビルド
docker build -t gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest .

# イメージをプッシュ
docker push gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest

# Cloud Runにデプロイ
gcloud run deploy ${SERVICE_NAME} \
  --image gcr.io/${PROJECT_ID}/${SERVICE_NAME}:latest \
  --region ${REGION} \
  --platform managed \
  --allow-unauthenticated \
  --project ${PROJECT_ID}
```

#### または、デプロイスクリプトを使用

```bash
# Windows
.\deploy.ps1

# Mac/Linux
chmod +x deploy.sh
./deploy.sh
```

## デプロイ後の確認

1. **Cloud RunのサービスURLにアクセス**
2. **サイドバーを確認**
   - 「データ管理」メニューが表示されないことを確認
3. **ブラウザのキャッシュをクリア**（必要に応じて）
   - ハードリロード: `Ctrl+Shift+R` (Windows) または `Cmd+Shift+R` (Mac)

## トラブルシューティング

### デプロイが失敗する場合

1. **ビルドエラーを確認**
   ```bash
   npm run build
   ```
   エラーがないか確認

2. **Dockerイメージのビルドを確認**
   ```bash
   docker build -t test-image .
   ```

3. **Cloud Runのログを確認**
   ```bash
   gcloud run services logs read ${SERVICE_NAME} \
     --region ${REGION} \
     --project ${PROJECT_ID}
   ```

### まだデータ管理機能が表示される場合

1. **ブラウザのキャッシュを完全にクリア**
2. **シークレットモードで確認**
3. **Cloud Runのサービスが更新されたか確認**
   ```bash
   gcloud run services describe ${SERVICE_NAME} \
     --region ${REGION} \
     --project ${PROJECT_ID} \
     --format 'value(status.latestReadyRevisionName)'
   ```

## チェックリスト

- [ ] 変更をコミット
- [ ] mainブランチにプッシュ（または手動デプロイ）
- [ ] GitHub Actionsのデプロイが成功（または手動デプロイが成功）
- [ ] 本番環境でサイドバーを確認
- [ ] 「データ管理」メニューが表示されないことを確認

