# 環境設定の現状確認

## 現在の環境設定状況

### GitHub Environments

現在、すべてのワークフローで以下の環境を使用しています：

- **環境名**: `Environment secrets`
- **使用ワークフロー**:
  - `deploy-backend.yml`
  - `deploy-all.yml`
  - `deploy-frontend.yml`

### ⚠️ 問題点

1. **テスト環境と本番環境が分離されていない**
   - すべてのワークフローが同じ`Environment secrets`環境を使用
   - `deploy-backend.yml`には`staging`と`production`の選択肢があるが、実際には使用されていない

2. **環境の分離が必要**
   - テスト環境用の別のEnvironmentが必要
   - 本番環境用のEnvironmentが必要

## 確認手順

### ステップ1: GitHub Environmentsの確認

以下のリンクで現在のEnvironment設定を確認してください：

**https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments**

### ステップ2: 現在のEnvironment一覧を確認

1. Settings > Environments を開く
2. 表示されているEnvironment名を確認
3. 各Environmentに設定されているSecretsを確認

### ステップ3: 本番環境とテスト環境の違いを確認

以下の項目を確認してください：

| 項目 | 本番環境 | テスト環境 |
|------|---------|-----------|
| GCP_PROJECT_ID | `univere-geo-demo` | 別プロジェクトまたは同じ |
| BQ_DATASET | `universegeo_dataset` | 別データセットまたは同じ |
| GOOGLE_SPREADSHEET_ID | 本番用スプレッドシート | テスト用スプレッドシート |
| FRONTEND_URL | 本番URL | テストURL |
| BACKEND_URL | 本番URL | テストURL |

## 推奨される環境分離

### オプション1: 環境名を分離（推奨）

1. **本番環境**: `production`
2. **テスト環境**: `staging` または `test`

### オプション2: 現在の設定を維持

現在の`Environment secrets`を本番環境として使用し、テスト環境用に新しいEnvironmentを作成

## 現在のCloud Runサービス

### バックエンド
- **サービス名**: `universegeo-backend`
- **リージョン**: `asia-northeast1`
- **プロジェクト**: `univere-geo-demo`（推測）

### フロントエンド
- **サービス名**: `universegeo`
- **リージョン**: `asia-northeast1`
- **プロジェクト**: `univere-geo-demo`（推測）

## 確認コマンド

### Cloud Runサービスの確認

```bash
# バックエンドサービスの確認
gcloud run services list --region asia-northeast1 --project univere-geo-demo

# フロントエンドサービスの確認
gcloud run services list --region asia-northeast1 --project univere-geo-demo

# 環境変数の確認（バックエンド）
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format='value(spec.template.spec.containers[0].env)'
```

### GitHub Environmentsの確認

ブラウザで以下を開いて確認：
- https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments

## 注意事項

1. **現在はテスト環境と本番環境が同じEnvironmentを使用**
2. **環境変数の違いを確認する必要がある**
3. **テスト環境用の別Environmentの作成を推奨**

