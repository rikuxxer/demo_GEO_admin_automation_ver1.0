# ドキュメント整理計画

## 📋 分類

### ✅ 保持するドキュメント（主要ドキュメント）

#### ルートディレクトリ
- `README.md` - メインドキュメント
- `DEPLOYMENT_GUIDE.md` - デプロイガイド（READMEで参照）
- `QUICKSTART.md` - クイックスタート（READMEで参照）
- `GOOGLE_SHEETS_SETUP.md` - Google Sheets設定（READMEで参照）
- `BIGQUERY_SETUP.md` - BigQuery設定（READMEで参照）
- `COST_ESTIMATION.md` - コスト見積もり（重要）
- `MULTI_API_KEY_STRATEGY.md` - APIキー戦略（重要）
- `VERTEX_AI_AGENT_IMPLEMENTATION.md` - Vertex AI実装（重要）

#### src/docs/ ディレクトリ
- すべて保持（システム仕様書、ER図、テーブル定義など）

#### backend/README.md
- 保持

---

## 🗑️ 削除候補（一時的なトラブルシューティングガイド）

### BigQueryスキーマ関連（一時的な修正ガイド）
以下のファイルは、BigQueryスキーマの問題を解決するための一時的なガイドです。
問題が解決されたら削除可能です。

**削除候補:**
- `FIX_DATASET_NOT_FOUND.md` ⚠️ 削除候補
- `FIX_USER_REQUESTS_SCHEMA_MISMATCH.md` ⚠️ 削除候補
- `FIX_USER_REQUESTS_SCHEMA_WITH_EXISTING_FIELDS.md` ⚠️ 削除候補
- `QUICK_FIX_USER_REGISTRATION_500.md` ⚠️ 削除候補
- `TROUBLESHOOT_USER_REGISTRATION_500.md` ⚠️ 削除候補
- `DEBUG_USER_REGISTRATION_ERROR.md` ⚠️ 削除候補
- `FIX_APPROVE_USER_REQUEST_ERROR.md` ⚠️ 削除候補（修正済み）
- `UPDATE_BIGQUERY_SCHEMA.md` ⚠️ 削除候補（古い方法）
- `COMPLETE_SCHEMA_UPDATE_GUIDE.md` ⚠️ 削除候補（古い方法）
- `CREATE_TABLES_ONLY.md` ⚠️ 削除候補
- `CREATE_REMAINING_TABLES.md` ⚠️ 削除候補
- `CREATE_TABLES_VIA_API.md` ⚠️ 削除候補（REST API方法は有用だが、一時的）
- `CREATE_TABLES_WITH_TIMEOUT.md` ⚠️ 削除候補
- `QUICK_TABLE_CREATION.md` ⚠️ 削除候補
- `TABLE_RECREATION_TIME_ESTIMATE.md` ⚠️ 削除候補
- `DATASET_RECREATION_GUIDE.md` ⚠️ 削除候補
- `RECREATE_ALL_TABLES_GUIDE.md` ⚠️ 削除候補
- `RELEASE_PREPARATION_GUIDE.md` ⚠️ 削除候補
- `CLOUD_SHELL_QUICK_START.md` ⚠️ 削除候補
- `CLOUD_SHELL_FILE_SETUP.md` ⚠️ 削除候補
- `CLOUD_SHELL_VERIFICATION_GUIDE.md` ⚠️ 削除候補
- `CLOUD_SHELL_QUICK_FIX.md` ⚠️ 削除候補
- `CLOUD_SHELL_FIX_V2.md` ⚠️ 削除候補
- `CLOUD_SHELL_DIRECT_COMMANDS.md` ⚠️ 削除候補
- `DIAGNOSE_DATASET_CREATION_ISSUE.md` ⚠️ 削除候補
- `troubleshoot_dataset_creation.md` ⚠️ 削除候補
- `check_dataset_creation_status.md` ⚠️ 削除候補
- `LIST_TABLES_GUIDE.md` ⚠️ 削除候補（REST API方法は有用だが、一時的）
- `NEXT_STEPS_AFTER_TABLE_CREATION.md` ⚠️ 削除候補
- `SCRIPT_IMPROVEMENT_GUIDE.md` ⚠️ 削除候補（参考として有用だが、一時的）

### GitHub/デプロイ関連（一時的な設定ガイド）
以下のファイルは、GitHub Actionsやデプロイ設定の一時的なトラブルシューティングガイドです。

**削除候補:**
- `GITHUB_DEPLOYMENT.md` ⚠️ 削除候補
- `GITHUB_PUSH_GUIDE.md` ⚠️ 削除候補
- `GITHUB_ENV_SECRETS_GUIDE.md` ⚠️ 削除候補
- `GITHUB_SECRETS_TROUBLESHOOTING.md` ⚠️ 削除候補
- `PUSH_COMMANDS.md` ⚠️ 削除候補
- `PUSH_WORKFLOWS.md` ⚠️ 削除候補
- `QUICK_PUSH.md` ⚠️ 削除候補
- `GIT_INSTALL_GUIDE.md` ⚠️ 削除候補
- `INSTALL_GIT_NOW.md` ⚠️ 削除候補
- `REPOSITORY_SECRETS_SETUP.md` ⚠️ 削除候補
- `SETUP_REPOSITORY_SECRETS.md` ⚠️ 削除候補
- `SETUP_REPOSITORY_SECRETS_NOW.md` ⚠️ 削除候補
- `SETUP_ENVIRONMENT_SECRETS_NOW.md` ⚠️ 削除候補
- `SET_ENVIRONMENT_SECRETS.md` ⚠️ 削除候補
- `ENVIRONMENT_SECRETS_SETUP.md` ⚠️ 削除候補
- `REQUIRED_SECRET_NAMES.md` ⚠️ 削除候補
- `QUICK_FIX_SECRETS.md` ⚠️ 削除候補

### 環境変数/設定関連（一時的なトラブルシューティング）
**削除候補:**
- `FIX_ENV_VARIABLES.md` ⚠️ 削除候補
- `MANUAL_ENV_SETUP.md` ⚠️ 削除候補
- `MANUAL_SET_ENV_VARS.md` ⚠️ 削除候補
- `SET_ENV_FOR_FRONTEND_URL.md` ⚠️ 削除候補
- `UPDATE_FRONTEND_BACKEND_URL.md` ⚠️ 削除候補
- `FIX_BACKEND_500_ERROR.md` ⚠️ 削除候補
- `FIX_SERVICE_ACCOUNT_PERMISSION.md` ⚠️ 削除候補
- `DOWNLOAD_GCP_SA_KEY.md` ⚠️ 削除候補
- `CLOUD_RUN_DEPLOY.md` ⚠️ 削除候補（DEPLOYMENT_GUIDE.mdに統合可能）

### 検証/デバッグ関連（一時的なトラブルシューティング）
**削除候補:**
- `CHECK_API_ERRORS.md` ⚠️ 削除候補
- `CHECK_BIGQUERY_TABLE.md` ⚠️ 削除候補
- `CHECK_BUILD_LOG.md` ⚠️ 削除候補
- `CHECK_DEMO_DATA.md` ⚠️ 削除候補
- `CHECK_ENVIRONMENT_NAME.md` ⚠️ 削除候補
- `CHECK_ENVIRONMENT_SECRETS_NAME.md` ⚠️ 削除候補
- `CHECK_TABLE_SCHEMA.md` ⚠️ 削除候補
- `VERIFY_BUILD_FIX.md` ⚠️ 削除候補
- `VERIFY_ENVIRONMENT_NAME.md` ⚠️ 削除候補
- `VERIFY_GCP_SA_KEY.md` ⚠️ 削除候補
- `VERIFY_SECRETS_SETUP.md` ⚠️ 削除候補
- `VERIFY_SHEETS_EXPORT.md` ⚠️ 削除候補
- `TEST_API_ENDPOINTS.md` ⚠️ 削除候補
- `TEST_SHEETS_OUTPUT.md` ⚠️ 削除候補（READMEで参照されているが、一時的）
- `QUICK_TEST.md` ⚠️ 削除候補（READMEで参照されているが、一時的）
- `DEBUG_PROJECT_CREATION.md` ⚠️ 削除候補
- `BUILD_ERROR_ANALYSIS.md` ⚠️ 削除候補
- `TROUBLESHOOT_BUILD_FAILURE.md` ⚠️ 削除候補
- `SHEETS_API_TROUBLESHOOTING.md` ⚠️ 削除候補

### データ管理関連
**削除候補:**
- `DATA_MANAGEMENT.md` ⚠️ 削除候補（データ管理機能が削除されたため）

---

## 📝 まとめ提案

### 1. BigQueryトラブルシューティングガイド（新規作成）
以下の内容を1つのドキュメントにまとめる：
- `BIGQUERY_TROUBLESHOOTING.md`（新規）
  - データセット作成の問題
  - テーブル作成の問題
  - スキーマ更新の問題
  - REST APIを使用した回避方法

### 2. デプロイトラブルシューティングガイド（新規作成）
以下の内容を1つのドキュメントにまとめる：
- `DEPLOYMENT_TROUBLESHOOTING.md`（新規）
  - GitHub Secrets設定
  - 環境変数設定
  - ビルドエラー
  - デプロイエラー

---

## 🗂️ 削除対象スクリプト

以下のシェルスクリプトも削除候補です：

**削除候補:**
- `check_dataset_status.sh` ⚠️ 削除候補
- `check_table_creation_status.sh` ⚠️ 削除候補
- `create_all_tables_improved.sh` ⚠️ 削除候補
- `create_all_tables_only.sh` ⚠️ 削除候補
- `create_all_tables_via_api.sh` ⚠️ 削除候補（有用だが一時的）
- `create_all_tables_with_timeout.sh` ⚠️ 削除候補
- `create_dataset_and_tables.sh` ⚠️ 削除候補
- `create_remaining_tables.sh` ⚠️ 削除候補
- `create_schema_update_script.sh` ⚠️ 削除候補
- `create_tables_step_by_step.sh` ⚠️ 削除候補
- `diagnose_dataset_creation_issue.sh` ⚠️ 削除候補
- `fix_user_requests_schema.sh` ⚠️ 削除候補
- `fix_user_requests_schema_v2.sh` ⚠️ 削除候補
- `list_tables_safe_bq.sh` ⚠️ 削除候補
- `list_tables_via_api.sh` ⚠️ 削除候補（有用だが一時的）
- `recreate_all_tables.sh` ⚠️ 削除候補
- `recreate_dataset_and_tables.sh` ⚠️ 削除候補
- `recreate_user_requests_table.sh` ⚠️ 削除候補
- `test_cloud_shell.sh` ⚠️ 削除候補
- `update_all_schemas.sh` ⚠️ 削除候補
- `update_all_schemas_complete.sh` ⚠️ 削除候補
- `verify_tables_created.sh` ⚠️ 削除候補

---

## ✅ 実行計画

1. **削除候補ファイルに `⚠️ 削除候補` フラグを追加**
2. **まとめドキュメントを作成**（オプション）
3. **削除実行**（確認後）

---

## 📊 統計

- **総ドキュメント数**: 約114ファイル
- **保持**: 約15ファイル
- **削除候補**: 約99ファイル
- **削減率**: 約87%

