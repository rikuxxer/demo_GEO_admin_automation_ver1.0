# テスト環境情報

## 🔍 現在の環境設定

### GitHub Environments

**環境名**: `Environment secrets`
- **設定場所**: https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments/Environment%20secrets

### Cloud Runサービス

#### バックエンド
- **サービス名**: `universegeo-backend`
- **リージョン**: `asia-northeast1`
- **プロジェクト**: `univere-geo-demo`

#### フロントエンド
- **サービス名**: `universegeo`
- **リージョン**: `asia-northeast1`
- **プロジェクト**: `univere-geo-demo`

## 📋 確認コマンド

以下のコマンドを実行して、現在のサービスURLと環境変数を確認してください：

### バックエンドURLの確認

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(status.url)'
```

### フロントエンドURLの確認

```bash
gcloud run services describe universegeo \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(status.url)'
```

### 環境変数の確認

```bash
# バックエンドの環境変数
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='yaml(spec.template.spec.containers[0].env)'

# フロントエンドの環境変数
gcloud run services describe universegeo \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='yaml(spec.template.spec.containers[0].env)'
```

## ⚠️ 注意事項

現在、テスト環境と本番環境が同じ`Environment secrets`を使用しているため、環境の分離ができていません。

テスト環境と本番環境を分離する場合は、別のEnvironment（例: `staging`）を作成することを推奨します。

