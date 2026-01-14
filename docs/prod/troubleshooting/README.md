# 本番環境トラブルシューティング

このディレクトリには、本番環境に関するトラブルシューティングドキュメントが含まれています。

## 📋 カテゴリ

### 環境設定
- `ENVIRONMENT_STATUS.md` - 環境設定の現状確認
- `ENVIRONMENT_COMPARISON.md` - テスト環境と本番環境の比較
- `ENVIRONMENT_SECRETS_SETUP.md` - 環境シークレットの設定
- `CHECK_ENVIRONMENT_NAME.md` - 環境名の確認
- `CHECK_ENVIRONMENT_SECRETS_NAME.md` - 環境シークレット名の確認
- `VERIFY_ENVIRONMENT_NAME.md` - 環境名の検証
- `SET_ENVIRONMENT_SECRETS.md` - 環境シークレットの設定
- `SETUP_ENVIRONMENT_SECRETS_NOW.md` - 環境シークレットの即時設定
- `SETUP_REPOSITORY_SECRETS_NOW.md` - リポジトリシークレットの即時設定
- `REPOSITORY_SECRETS_SETUP.md` - リポジトリシークレットの設定
- `REQUIRED_SECRET_NAMES.md` - 必要なシークレット名
- `VERIFY_SECRETS_SETUP.md` - シークレット設定の検証
- `QUICK_FIX_SECRETS.md` - シークレットのクイック修正

### GitHub設定
- `GITHUB_ENV_SECRETS_GUIDE.md` - GitHub環境シークレットガイド
- `GITHUB_ENV_SECRETS_GMAIL_SETUP.md` - GitHub環境シークレットGmail設定
- `GITHUB_SECRETS_TROUBLESHOOTING.md` - GitHubシークレットのトラブルシューティング
- `GITHUB_DEPLOYMENT.md` - GitHubデプロイメント
- `GITHUB_PUSH_GUIDE.md` - GitHubプッシュガイド
- `PUSH_COMMANDS.md` - プッシュコマンド
- `PUSH_WORKFLOWS.md` - プッシュワークフロー
- `QUICK_PUSH.md` - クイックプッシュ

### デプロイ
- `CLOUD_RUN_DEPLOY.md` - Cloud Runデプロイ
- `REDEPLOY_FRONTEND.md` - フロントエンドの再デプロイ
- `RELEASE_PREPARATION_GUIDE.md` - リリース準備ガイド
- `UPDATE_FRONTEND_BACKEND_URL.md` - フロントエンド・バックエンドURLの更新

### ビルドエラー
- `VERIFY_BUILD_FIX.md` - ビルド修正の検証
- `TROUBLESHOOT_BUILD_FAILURE.md` - ビルド失敗のトラブルシューティング
- `BUILD_ERROR_ANALYSIS.md` - ビルドエラー分析
- `CHECK_BUILD_LOG.md` - ビルドログの確認

## ⚠️ 注意事項

本番環境への変更は慎重に行ってください。変更前に必ず以下を確認してください：

1. バックアップの取得
2. 変更内容のレビュー
3. テスト環境での検証
4. ロールバック計画の確認

## 📝 関連ドキュメント

- [本番環境セットアップガイド](../SETUP.md)
- [共通トラブルシューティング](../../shared/troubleshooting/)
