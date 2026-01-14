# 共通トラブルシューティング

このディレクトリには、開発環境と本番環境の両方に共通するトラブルシューティングドキュメントが含まれています。

## カテゴリ

### BigQuery
- `BIGQUERY_TABLE_DEFINITIONS.md` - BigQueryテーブル定義
- `ADD_POLYGON_FIELD_TO_BQ.md` - BigQueryにポリゴンフィールドを追加
- `UPDATE_BIGQUERY_SCHEMA.md` - BigQueryスキーマの更新
- `CHECK_BIGQUERY_TABLE.md` - BigQueryテーブルの確認
- `CHECK_TABLE_SCHEMA.md` - テーブルスキーマの確認
- `BIGQUERY_SCHEMA_CHANGE_ANALYSIS.md` - BigQueryスキーマ変更分析
- `BIGQUERY_COST_OPTIMIZATION.md` - BigQueryコスト最適化
- `BIGQUERY_COST_REDUCTION_IMPLEMENTATION_GUIDE.md` - BigQueryコスト削減実装ガイド

### テーブル作成・管理
- `TABLE_CREATION_GUIDE.md` - テーブル作成ガイド
- `CREATE_TABLES_ONLY.md` - テーブルのみ作成
- `CREATE_TABLES_VIA_API.md` - API経由でテーブル作成
- `CREATE_TABLES_WITH_TIMEOUT.md` - タイムアウト付きテーブル作成
- `CREATE_REMAINING_TABLES.md` - 残りのテーブル作成
- `QUICK_TABLE_CREATION.md` - クイックテーブル作成
- `TABLE_RECREATION_TIME_ESTIMATE.md` - テーブル再作成時間見積もり
- `RECREATE_ALL_TABLES_GUIDE.md` - 全テーブル再作成ガイド
- `DATASET_RECREATION_GUIDE.md` - データセット再作成ガイド
- `NEXT_STEPS_AFTER_TABLE_CREATION.md` - テーブル作成後の次のステップ
- `LIST_TABLES_GUIDE.md` - テーブル一覧ガイド
- `COMPLETE_SCHEMA_UPDATE_GUIDE.md` - 完全スキーマ更新ガイド
- `SCRIPT_IMPROVEMENT_GUIDE.md` - スクリプト改善ガイド
- `DIAGNOSE_DATASET_CREATION_ISSUE.md` - データセット作成問題の診断
- `troubleshoot_dataset_creation.md` - データセット作成のトラブルシューティング
- `check_dataset_creation_status.md` - データセット作成ステータスの確認
- `FIX_DATASET_NOT_FOUND.md` - データセットが見つからない問題の修正

### Cloud Shell
- `CLOUD_SHELL_DIRECT_COMMANDS.md` - Cloud Shell直接コマンド
- `CLOUD_SHELL_FILE_SETUP.md` - Cloud Shellファイル設定
- `CLOUD_SHELL_FIX_V2.md` - Cloud Shell修正v2
- `CLOUD_SHELL_QUICK_FIX.md` - Cloud Shellクイック修正
- `CLOUD_SHELL_QUICK_START.md` - Cloud Shellクイックスタート
- `CLOUD_SHELL_VERIFICATION_GUIDE.md` - Cloud Shell検証ガイド

### スプレッドシートエクスポート
- `SPREADSHEET_EXPORT_TABLE_ACCUMULATION.md` - スプレッドシートエクスポートテーブル蓄積
- `SPREADSHEET_EXPORT_RADIUS_LOGIC.md` - スプレッドシートエクスポート半径ロジック
- `SPREADSHEET_EXPORT_REQUIREMENTS.md` - スプレッドシートエクスポート要件
- `SPREADSHEET_EXPORT_LOGIC.md` - スプレッドシートエクスポートロジック
- `SPREADSHEET_EXPORT_FIX.md` - スプレッドシートエクスポート修正
- `SPREADSHEET_ID_UPDATE.md` - スプレッドシートID更新
- `SPREADSHEET_SHARE_INSTRUCTIONS.md` - スプレッドシート共有手順
- `SHEET_EXPORT_ADMIN_IMPLEMENTATION.md` - シートエクスポート管理実装
- `SHEETS_API_TROUBLESHOOTING.md` - Sheets APIトラブルシューティング
- `GOOGLE_SHEETS_AUTH_SETUP.md` - Google Sheets認証設定
- `VERIFY_SHEETS_EXPORT.md` - シートエクスポートの検証

### API・エラー
- `CORS_TROUBLESHOOTING.md` - CORSトラブルシューティング
- `CHECK_API_ERRORS.md` - APIエラーの確認
- `FIX_BACKEND_500_ERROR.md` - バックエンド500エラーの修正
- `FIX_APPROVE_USER_REQUEST_ERROR.md` - ユーザーリクエスト承認エラーの修正
- `QUICK_FIX_USER_REGISTRATION_500.md` - ユーザー登録500エラーのクイック修正
- `TROUBLESHOOT_USER_REGISTRATION_500.md` - ユーザー登録500エラーのトラブルシューティング

### スキーマ・データ
- `FIX_USER_REQUESTS_SCHEMA_MISMATCH.md` - ユーザーリクエストスキーマ不一致の修正
- `FIX_USER_REQUESTS_SCHEMA_WITH_EXISTING_FIELDS.md` - 既存フィールド付きユーザーリクエストスキーマの修正

### サービスアカウント
- `FIX_SERVICE_ACCOUNT_PERMISSION.md` - サービスアカウント権限の修正
- `VERIFY_GCP_SA_KEY.md` - GCPサービスアカウントキーの検証
- `DOWNLOAD_GCP_SA_KEY.md` - GCPサービスアカウントキーのダウンロード

### メール
- `SENDGRID_SETUP_GUIDE.md` - SendGrid設定ガイド
- `EMAIL_SENDING_STATUS.md` - メール送信ステータス
- `GMAIL_API_SERVICE_ACCOUNT_SETUP.md` - Gmail APIサービスアカウント設定
- `GMAIL_API_SETUP_STEPS.md` - Gmail API設定ステップ
- `GMAIL_API_ERROR_SOLUTION.md` - Gmail APIエラー解決
- `PASSWORD_RESET_SETUP.md` - パスワードリセット設定
- `PASSWORD_RESET_CHECKLIST.md` - パスワードリセットチェックリスト

### その他
- `GIT_INSTALL_GUIDE.md` - Gitインストールガイド
- `INSTALL_GIT_NOW.md` - Gitの今すぐインストール
- `DATA_MANAGEMENT.md` - データ管理
- `EXCEL_INPUT_RULES_UPDATE.md` - Excel入力ルール更新
- `PROJECT_ID_GENERATION_ANALYSIS.md` - プロジェクトID生成分析
- `UPDATE_COMPLETION_CHECKLIST.md` - 更新完了チェックリスト

## 関連ドキュメント

- [開発環境トラブルシューティング](../../dev/troubleshooting/)
- [本番環境トラブルシューティング](../../prod/troubleshooting/)
