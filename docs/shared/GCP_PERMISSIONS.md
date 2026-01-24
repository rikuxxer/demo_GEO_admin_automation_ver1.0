# GCP権限設定ガイド

このドキュメントでは、UNIVERSEGEO案件管理ツールに必要なGCP権限について説明します。

## 概要

このツールは以下のGCPサービスを使用します：

1. **BigQuery** - データベース（案件、セグメント、地点データの保存）
2. **Google Sheets API** - スプレッドシートへのデータエクスポート
3. **Google Maps Geocoding API** - 住所から緯度経度への変換（ジオコーディング）

## 必要な権限

### 1. BigQuery権限

サービスアカウントに以下のBigQuery権限が必要です：

#### 必須権限（推奨ロール）

- **BigQuery Data Editor** (`roles/bigquery.dataEditor`)
  - テーブルへのデータ読み書き
  - データの挿入、更新、削除
  - クエリの実行

- **BigQuery Job User** (`roles/bigquery.jobUser`)
  - クエリジョブの作成と実行
  - データの読み込み・エクスポート

#### オプション権限（管理用）

- **BigQuery Data Viewer** (`roles/bigquery.dataViewer`)
  - データの読み取り専用アクセス

- **BigQuery User** (`roles/bigquery.user`)
  - データセットとテーブルの作成・削除（初期セットアップ時のみ）

#### 最小権限（カスタムロール）

セキュリティを強化する場合は、以下の最小権限をカスタムロールとして作成：

```yaml
# カスタムロール: BigQuery Data Operator
permissions:
  - bigquery.datasets.get
  - bigquery.datasets.getIamPolicy
  - bigquery.jobs.create
  - bigquery.jobs.get
  - bigquery.tables.create
  - bigquery.tables.delete
  - bigquery.tables.get
  - bigquery.tables.getData
  - bigquery.tables.list
  - bigquery.tables.update
  - bigquery.tables.updateData
```

### 2. Google Sheets API権限

#### 必須権限

- **Google Sheets API** の有効化
- サービスアカウントにスプレッドシートへの**編集者**権限を付与

#### 設定手順

1. **Google Cloud ConsoleでAPIを有効化**
   ```bash
   gcloud services enable sheets.googleapis.com
   ```

2. **サービスアカウントにスプレッドシートを共有**
   - Googleスプレッドシートを開く
   - 「共有」ボタンをクリック
   - サービスアカウントのメールアドレスを入力
   - 「編集者」権限を付与
   - 例: `universegeo-backend@your-project.iam.gserviceaccount.com`

### 3. Google Maps Geocoding API権限

#### 必須権限

- **Geocoding API** の有効化
- APIキーの作成と制限設定

#### 設定手順

1. **APIを有効化**
   ```bash
   gcloud services enable geocoding-backend.googleapis.com
   ```

2. **APIキーを作成**
   - Google Cloud Console → APIとサービス → 認証情報
   - 「認証情報を作成」→「APIキー」
   - APIキーを制限：
     - アプリケーションの制限: HTTPリファラー
     - APIの制限: Geocoding APIのみ

## サービスアカウントの設定

### 1. サービスアカウントの作成

```bash
# サービスアカウントを作成
gcloud iam service-accounts create universegeo-backend \
  --display-name="UNIVERSEGEO Backend Service Account" \
  --description="UNIVERSEGEO案件管理ツール用サービスアカウント"
```

### 2. 権限の付与

```bash
# BigQuery権限を付与
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:universegeo-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.dataEditor"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:universegeo-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.jobUser"

# オプション: データセット作成権限（初期セットアップ時のみ）
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:universegeo-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/bigquery.user"
```

### 3. サービスアカウントキーのダウンロード

```bash
# キーをダウンロード
gcloud iam service-accounts keys create service-account-key.json \
  --iam-account=universegeo-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

## Cloud Runでの設定

Cloud Runにデプロイする場合、サービスアカウントを指定：

```bash
gcloud run deploy universegeo-backend \
  --service-account=universegeo-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com \
  --region=asia-northeast1
```

## 権限の確認

### サービスアカウントの権限を確認

```bash
# サービスアカウントに付与されているロールを確認
gcloud projects get-iam-policy YOUR_PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:serviceAccount:universegeo-backend@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --format="table(bindings.role)"
```

### BigQueryデータセットへのアクセス権限を確認

```bash
# データセットのIAMポリシーを確認
bq show --format=prettyjson YOUR_PROJECT_ID:universegeo_dataset | grep -A 10 "access"
```

## セキュリティのベストプラクティス

### 1. 最小権限の原則

- 必要最小限の権限のみを付与
- カスタムロールを使用して細かく制御

### 2. サービスアカウントキーの管理

- キーファイルは`.gitignore`に追加
- 本番環境ではCloud Runのサービスアカウントを使用（キーファイル不要）
- 定期的にキーをローテーション

### 3. APIキーの制限

- Google Maps APIキーはHTTPリファラーで制限
- 使用するAPIのみを許可

### 4. 監査ログの有効化

```bash
# BigQuery監査ログを有効化
gcloud logging sinks create bigquery-audit-logs \
  bigquery.googleapis.com/projects/YOUR_PROJECT_ID/datasets/universegeo_dataset \
  --log-filter='resource.type="bigquery_resource"'
```

## トラブルシューティング

### エラー: Permission denied

**原因**: サービスアカウントに必要な権限が付与されていない

**解決方法**:
1. 上記の権限設定手順を確認
2. サービスアカウントの権限を再確認
3. プロジェクトレベルとデータセットレベルの両方を確認

### エラー: API not enabled

**原因**: 必要なAPIが有効化されていない

**解決方法**:
```bash
# 必要なAPIを有効化
gcloud services enable bigquery.googleapis.com
gcloud services enable sheets.googleapis.com
gcloud services enable geocoding-backend.googleapis.com
```

### エラー: Spreadsheet access denied

**原因**: サービスアカウントにスプレッドシートへのアクセス権限がない

**解決方法**:
1. Googleスプレッドシートを開く
2. 「共有」→ サービスアカウントのメールアドレスを追加
3. 「編集者」権限を付与

## 関連ドキュメント

- [BigQueryセットアップガイド](./BIGQUERY_SETUP.md)
- [Google Sheets認証設定](./troubleshooting/GOOGLE_SHEETS_AUTH_SETUP.md)
- [デプロイガイド](./DEPLOYMENT_GUIDE.md)

## まとめ

必要な権限の一覧：

| サービス | 必要な権限 | ロール |
|---------|-----------|--------|
| BigQuery | データの読み書き | `roles/bigquery.dataEditor` |
| BigQuery | クエリの実行 | `roles/bigquery.jobUser` |
| Google Sheets | API有効化 + スプレッドシート共有 | スプレッドシートの編集者権限 |
| Google Maps | API有効化 + APIキー | APIキーのみ（サービスアカウント不要） |

これらの権限を適切に設定することで、UNIVERSEGEO案件管理ツールは正常に動作します。
