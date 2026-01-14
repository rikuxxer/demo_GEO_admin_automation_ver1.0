# 削除候補ファイル一覧

## 📋 削除対象

### 1. 整理計画書（整理完了後は不要）

以下のファイルは整理作業の計画書で、作業完了後は不要です：

- `docs/DOCUMENT_ORGANIZATION.md` - ドキュメント整理計画
- `docs/CLEANUP_SUMMARY.md` - クリーンアップサマリー
- `docs/DOCUMENT_CLEANUP_PLAN.md` - クリーンアップ計画
- `docs/DOCUMENT_CLEANUP_SUMMARY.md` - クリーンアップサマリー
- `docs/MOVE_PLAN.md` - ファイル移動計画
- `docs/MOVED_FILES_LIST.md` - 移動ファイルリスト
- `docs/DELETE_CANDIDATES.txt` - 削除候補リスト
- `docs/CLASSIFICATION_PLAN.md` - 分類計画（完了済み）
- `docs/ENVIRONMENT_FOLDER_STRUCTURE_PLAN.md` - 環境分離計画（完了済み）
- `docs/APPLICATION_ENVIRONMENT_SEPARATION_PLAN.md` - アプリケーション分離計画（完了済み）

### 2. 一時的なテストファイル

- `test-cors-preflight.ps1` - CORSテストスクリプト（一時的）
- `test-cors-preflight.sh` - CORSテストスクリプト（一時的）
- `test-spreadsheet-export.html` - スプレッドシートエクスポートテスト（一時的）
- `test-spreadsheet-export.ps1` - スプレッドシートエクスポートテスト（一時的）
- `test-spreadsheet-export.sh` - スプレッドシートエクスポートテスト（一時的）
- `show_test_environment.ps1` - テスト環境表示スクリプト（一時的）

### 3. 重複または統合済みドキュメント

- `MANUAL_DEPLOY_INSTRUCTIONS.md` - 手動デプロイ手順（DEPLOYMENT_GUIDE.mdに統合済み）
- `SERVICE_ACCOUNT_FIX.md` - サービスアカウント修正ガイド（一時的、解決済み）
- `QUICK_TEST_GUIDE.md` - クイックテストガイド（docs/dev/troubleshooting/に移動すべき）

### 4. 分類されていないトラブルシューティングファイル

- `docs/troubleshooting/SETUP_REPOSITORY_SECRETS.md` - 本番環境のトラブルシューティングに移動すべき

### 5. 移動すべきファイル（削除ではなく移動）

以下のファイルは適切なディレクトリに移動すべきです：

- `GCP_SA_KEY_SETUP.md` → `docs/shared/troubleshooting/` または `docs/prod/troubleshooting/`
- `QUICK_TEST_GUIDE.md` → `docs/dev/troubleshooting/`

## ✅ 保持するファイル

以下のファイルは主要ドキュメントとして保持します：

- `README.md` - メインドキュメント
- `QUICKSTART.md` - クイックスタートガイド
- `DEPLOYMENT_GUIDE.md` - デプロイガイド
- `GOOGLE_SHEETS_SETUP.md` - Google Sheets設定
- `BIGQUERY_SETUP.md` - BigQuery設定
- `COST_ESTIMATION.md` - コスト見積もり
- `MULTI_API_KEY_STRATEGY.md` - APIキー戦略
- `VERTEX_AI_AGENT_IMPLEMENTATION.md` - Vertex AI実装
- `env.example` - 環境変数テンプレート
