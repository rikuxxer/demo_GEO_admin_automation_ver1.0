# テスト環境URL一覧

## 現在のサービスURL

### バックエンド（API）
- **サービス名**: `universegeo-backend`
- **最新URL**: `https://universegeo-backend-223225164238.asia-northeast1.run.app`
- **旧URL**: `https://universegeo-backend-i5xw76aisq-an.a.run.app`（非推奨）
- **リージョン**: `asia-northeast1`
- **プロジェクト**: `univere-geo-demo`

### フロントエンド（Webアプリ）
- **サービス名**: `universegeo`
- **URL**: `https://universegeo-i5xw76aisq-an.a.run.app`
- **リージョン**: `asia-northeast1`
- **プロジェクト**: `univere-geo-demo`

## 環境設定の確認

### GitHub Environment Secrets

**環境名**: `Environment secrets`
- **設定ページ**: https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments/Environment%20secrets

### 設定されているSecrets（想定）

| Secret名 | 説明 | 値の例 |
|---------|------|--------|
| `GCP_SA_KEY` | GCPサービスアカウントキー（JSON） | （機密情報） |
| `GCP_PROJECT_ID` | GCPプロジェクトID | `univere-geo-demo` |
| `BQ_DATASET` | BigQueryデータセット名 | `universegeo_dataset` |
| `GOOGLE_SPREADSHEET_ID` | Google Sheets スプレッドシートID | （スプレッドシートID） |
| `GOOGLE_SHEETS_API_KEY` | Google Sheets API キー | （APIキー） |
| `GOOGLE_SHEET_NAME` | Google Sheets シート名 | `シート1` |
| `FRONTEND_URL` | フロントエンドURL | `https://universegeo-i5xw76aisq-an.a.run.app` |
| `BACKEND_URL` | バックエンドURL | `https://universegeo-backend-223225164238.asia-northeast1.run.app` |

## 本番環境との違い

### 現在の状況

**問題点**: テスト環境と本番環境が同じ`Environment secrets`を使用しているため、環境が分離されていません。

### 確認が必要な項目

1. **GCP_PROJECT_ID**
   - テスト環境と本番環境で同じプロジェクトを使用しているか確認
   - 異なるプロジェクトを使用する場合は、別のEnvironmentを作成

2. **BQ_DATASET**
   - テスト環境と本番環境で同じデータセットを使用しているか確認
   - 異なるデータセットを使用する場合は、別のEnvironmentを作成

3. **GOOGLE_SPREADSHEET_ID**
   - テスト環境と本番環境で同じスプレッドシートを使用しているか確認
   - 異なるスプレッドシートを使用する場合は、別のEnvironmentを作成

4. **FRONTEND_URL / BACKEND_URL**
   - テスト環境と本番環境で異なるURLを使用しているか確認

## テスト環境として使用する場合

### 現在の設定をテスト環境として使用

現在の`Environment secrets`をテスト環境として使用する場合：

1. **GitHub Environmentsで確認**
   - https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments/Environment%20secrets
   - 設定されているSecretsを確認

2. **Cloud Runサービスの確認**
   - バックエンド: https://console.cloud.google.com/run/detail/asia-northeast1/universegeo-backend
   - フロントエンド: https://console.cloud.google.com/run/detail/asia-northeast1/universegeo

3. **環境変数の確認**
   - Cloud Runコンソールで各サービスの環境変数を確認
   - テスト環境用の設定になっているか確認

## 本番環境との分離が必要な場合

テスト環境と本番環境を分離する場合：

1. **新しいEnvironmentを作成**
   - テスト環境用: `staging` または `test`
   - 本番環境用: `production`

2. **各Environmentに適切なSecretsを設定**
   - テスト環境: テスト用のGCPプロジェクト、データセット、スプレッドシート
   - 本番環境: 本番用のGCPプロジェクト、データセット、スプレッドシート

3. **ワークフローを修正**
   - テスト環境用のワークフロー: `environment: name: staging`
   - 本番環境用のワークフロー: `environment: name: production`

## 直接アクセス

### バックエンドAPI
- **ヘルスチェック**: https://universegeo-backend-223225164238.asia-northeast1.run.app/health
- **プロジェクト一覧**: https://universegeo-backend-223225164238.asia-northeast1.run.app/api/projects

### フロントエンド
- **アプリケーション**: https://universegeo-i5xw76aisq-an.a.run.app

