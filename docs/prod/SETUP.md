# 本番環境セットアップガイド

## 📋 概要

本番環境のセットアップ手順を説明します。

## ⚠️ 重要事項

本番環境への変更は慎重に行ってください。変更前に必ず以下を確認してください：

1. バックアップの取得
2. 変更内容のレビュー
3. テスト環境での検証
4. ロールバック計画の確認

## 🔧 前提条件

- Google Cloud Platform プロジェクトへの管理者権限
- GitHub Actions へのアクセス権限
- 本番環境用のサービスアカウント

## 🚀 セットアップ手順

### 1. GCPプロジェクトの確認

```bash
# プロジェクトIDの確認
gcloud config get-value project

# プロジェクトの切り替え（必要に応じて）
gcloud config set project univere-geo-demo
```

### 2. BigQueryデータセットの確認

本番環境用のBigQueryデータセットが存在することを確認してください。

### 3. GitHub Environment Secretsの設定

GitHubリポジトリのSettings > Environments > production で以下を設定：

- `GCP_PROJECT_ID`: 本番環境のGCPプロジェクトID
- `BQ_DATASET`: 本番環境のBigQueryデータセット名
- `GOOGLE_SPREADSHEET_ID`: 本番環境用スプレッドシートID
- `GOOGLE_SHEETS_API_KEY`: 本番環境用APIキー
- `FRONTEND_URL`: 本番環境のフロントエンドURL
- `SENDGRID_API_KEY`: 本番環境用SendGrid APIキー
- `SENDGRID_FROM_EMAIL`: 本番環境用送信元メールアドレス

### 4. Cloud Runサービスの確認

本番環境のCloud Runサービスが正常に動作していることを確認してください。

## 🔍 確認事項

- [ ] GCPプロジェクトが正しく設定されている
- [ ] BigQueryデータセットが存在する
- [ ] GitHub Environment Secretsが設定されている
- [ ] Cloud Runサービスが正常に動作している
- [ ] フロントエンドが正常に動作している

## 📝 関連ドキュメント

- [デプロイガイド](./DEPLOYMENT.md)
- [運用ガイド](./OPERATIONS.md)
- [トラブルシューティング](./TROUBLESHOOTING.md)
- [共通ドキュメント](../shared/)
