# テスト環境と本番環境の比較

## 現在の環境設定

### GitHub Environment

**環境名**: `Environment secrets`
- **設定ページ**: https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments/Environment%20secrets

### サービスURL

#### バックエンド
- **URL**: `https://universegeo-backend-223225164238.asia-northeast1.run.app`
- **サービス名**: `universegeo-backend`
- **リージョン**: `asia-northeast1`
- **プロジェクト**: `univere-geo-demo`

#### フロントエンド
- **URL**: `https://universegeo-i5xw76aisq-an.a.run.app`
- **サービス名**: `universegeo`
- **リージョン**: `asia-northeast1`
- **プロジェクト**: `univere-geo-demo`

## 重要な確認事項

### 1. テスト環境と本番環境が同じ設定を使用している

現在、すべてのワークフローが同じ`Environment secrets`を使用しているため、**テスト環境と本番環境が分離されていません**。

### 2. 確認が必要な項目

以下の項目について、テスト環境と本番環境で異なる設定が必要かどうか確認してください：

| 項目 | テスト環境 | 本番環境 | 確認方法 |
|------|----------|---------|---------|
| **GCP_PROJECT_ID** | `univere-geo-demo` | `univere-geo-demo` | GitHub Environment secrets |
| **BQ_DATASET** | `universegeo_dataset` | `universegeo_dataset` | GitHub Environment secrets |
| **GOOGLE_SPREADSHEET_ID** | （確認必要） | （確認必要） | GitHub Environment secrets |
| **GOOGLE_SHEETS_API_KEY** | （確認必要） | （確認必要） | GitHub Environment secrets |
| **FRONTEND_URL** | `https://universegeo-i5xw76aisq-an.a.run.app` | （確認必要） | GitHub Environment secrets |
| **BACKEND_URL** | `https://universegeo-backend-223225164238.asia-northeast1.run.app` | （確認必要） | GitHub Environment secrets |

## 確認手順

### ステップ1: GitHub Environment Secretsの確認

1. 以下のリンクを開く：
   https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments/Environment%20secrets

2. 設定されているSecretsを確認：
   - `GCP_PROJECT_ID`
   - `BQ_DATASET`
   - `GOOGLE_SPREADSHEET_ID`
   - `GOOGLE_SHEETS_API_KEY`
   - `FRONTEND_URL`
   - `BACKEND_URL`

### ステップ2: Cloud Runサービスの環境変数を確認

#### バックエンド
1. https://console.cloud.google.com/run/detail/asia-northeast1/universegeo-backend を開く
2. 「変数とシークレット」タブで環境変数を確認

#### フロントエンド
1. https://console.cloud.google.com/run/detail/asia-northeast1/universegeo を開く
2. 「変数とシークレット」タブで環境変数を確認

### ステップ3: 本番環境との違いを確認

以下の項目について、テスト環境と本番環境で異なる設定が必要かどうか判断してください：

1. **GCP_PROJECT_ID**: 同じプロジェクトを使用するか、別プロジェクトを使用するか
2. **BQ_DATASET**: 同じデータセットを使用するか、別データセットを使用するか
3. **GOOGLE_SPREADSHEET_ID**: 同じスプレッドシートを使用するか、別スプレッドシートを使用するか
4. **FRONTEND_URL / BACKEND_URL**: 異なるURLを使用するか

## テスト環境として使用する場合

現在の設定をテスト環境として使用する場合、以下の点を確認してください：

1. ✅ **GitHub Environment Secretsが正しく設定されている**
2. ✅ **Cloud Runサービスの環境変数が正しく設定されている**
3. ✅ **テスト用のデータセットやスプレッドシートを使用している**
4. ✅ **本番環境のデータに影響を与えない設定になっている**

## 本番環境との分離が必要な場合

テスト環境と本番環境を分離する場合：

1. **新しいEnvironmentを作成**
   - テスト環境用: `staging` または `test`
   - 本番環境用: `production`

2. **各Environmentに適切なSecretsを設定**
   - テスト環境: テスト用の設定
   - 本番環境: 本番用の設定

3. **ワークフローを修正**
   - テスト環境用のワークフロー: `environment: name: staging`
   - 本番環境用のワークフロー: `environment: name: production`

