# ドキュメント移動計画

このファイルは、ドキュメント整理のための移動計画です。

## 📋 移動対象ファイル

以下のファイルを移動します：

### 1. トラブルシューティングドキュメント → `docs/troubleshooting/`

以下のコマンドで移動できます：

```powershell
# PowerShell
$files = @(
    "FIX_DATASET_NOT_FOUND.md",
    "FIX_USER_REQUESTS_SCHEMA_MISMATCH.md",
    "FIX_USER_REQUESTS_SCHEMA_WITH_EXISTING_FIELDS.md",
    "QUICK_FIX_USER_REGISTRATION_500.md",
    "TROUBLESHOOT_USER_REGISTRATION_500.md",
    "DEBUG_USER_REGISTRATION_ERROR.md",
    "FIX_APPROVE_USER_REQUEST_ERROR.md",
    "UPDATE_BIGQUERY_SCHEMA.md",
    "COMPLETE_SCHEMA_UPDATE_GUIDE.md",
    "CREATE_TABLES_ONLY.md",
    "CREATE_REMAINING_TABLES.md",
    "CREATE_TABLES_VIA_API.md",
    "CREATE_TABLES_WITH_TIMEOUT.md",
    "QUICK_TABLE_CREATION.md",
    "TABLE_RECREATION_TIME_ESTIMATE.md",
    "DATASET_RECREATION_GUIDE.md",
    "RECREATE_ALL_TABLES_GUIDE.md",
    "RELEASE_PREPARATION_GUIDE.md",
    "CLOUD_SHELL_QUICK_START.md",
    "CLOUD_SHELL_FILE_SETUP.md",
    "CLOUD_SHELL_VERIFICATION_GUIDE.md",
    "CLOUD_SHELL_QUICK_FIX.md",
    "CLOUD_SHELL_FIX_V2.md",
    "CLOUD_SHELL_DIRECT_COMMANDS.md",
    "DIAGNOSE_DATASET_CREATION_ISSUE.md",
    "troubleshoot_dataset_creation.md",
    "check_dataset_creation_status.md",
    "LIST_TABLES_GUIDE.md",
    "NEXT_STEPS_AFTER_TABLE_CREATION.md",
    "SCRIPT_IMPROVEMENT_GUIDE.md",
    "GITHUB_DEPLOYMENT.md",
    "GITHUB_PUSH_GUIDE.md",
    "GITHUB_ENV_SECRETS_GUIDE.md",
    "GITHUB_SECRETS_TROUBLESHOOTING.md",
    "PUSH_COMMANDS.md",
    "PUSH_WORKFLOWS.md",
    "QUICK_PUSH.md",
    "GIT_INSTALL_GUIDE.md",
    "INSTALL_GIT_NOW.md",
    "REPOSITORY_SECRETS_SETUP.md",
    "SETUP_REPOSITORY_SECRETS.md",
    "SETUP_REPOSITORY_SECRETS_NOW.md",
    "SETUP_ENVIRONMENT_SECRETS_NOW.md",
    "SET_ENVIRONMENT_SECRETS.md",
    "ENVIRONMENT_SECRETS_SETUP.md",
    "REQUIRED_SECRET_NAMES.md",
    "QUICK_FIX_SECRETS.md",
    "FIX_ENV_VARIABLES.md",
    "MANUAL_ENV_SETUP.md",
    "MANUAL_SET_ENV_VARS.md",
    "SET_ENV_FOR_FRONTEND_URL.md",
    "UPDATE_FRONTEND_BACKEND_URL.md",
    "FIX_BACKEND_500_ERROR.md",
    "FIX_SERVICE_ACCOUNT_PERMISSION.md",
    "DOWNLOAD_GCP_SA_KEY.md",
    "CLOUD_RUN_DEPLOY.md",
    "CHECK_API_ERRORS.md",
    "CHECK_BIGQUERY_TABLE.md",
    "CHECK_BUILD_LOG.md",
    "CHECK_DEMO_DATA.md",
    "CHECK_ENVIRONMENT_NAME.md",
    "CHECK_ENVIRONMENT_SECRETS_NAME.md",
    "CHECK_TABLE_SCHEMA.md",
    "VERIFY_BUILD_FIX.md",
    "VERIFY_ENVIRONMENT_NAME.md",
    "VERIFY_GCP_SA_KEY.md",
    "VERIFY_SECRETS_SETUP.md",
    "VERIFY_SHEETS_EXPORT.md",
    "TEST_API_ENDPOINTS.md",
    "TEST_SHEETS_OUTPUT.md",
    "QUICK_TEST.md",
    "DEBUG_PROJECT_CREATION.md",
    "BUILD_ERROR_ANALYSIS.md",
    "TROUBLESHOOT_BUILD_FAILURE.md",
    "SHEETS_API_TROUBLESHOOTING.md",
    "DATA_MANAGEMENT.md",
    "EMAIL_SENDING_STATUS.md",
    "GMAIL_API_ERROR_SOLUTION.md",
    "GMAIL_API_SERVICE_ACCOUNT_SETUP.md",
    "GMAIL_API_SETUP_STEPS.md",
    "PASSWORD_RESET_CHECKLIST.md",
    "PASSWORD_RESET_SETUP.md",
    "GITHUB_ENV_SECRETS_GMAIL_SETUP.md",
    "SENDGRID_SETUP_GUIDE.md",
    "SPREADSHEET_EXPORT_FIX.md",
    "SPREADSHEET_EXPORT_LOGIC.md",
    "SPREADSHEET_EXPORT_REQUIREMENTS.md",
    "SPREADSHEET_EXPORT_TEST.md",
    "SPREADSHEET_ID_UPDATE.md",
    "SPREADSHEET_SHARE_INSTRUCTIONS.md",
    "CORS_TROUBLESHOOTING.md",
    "REDEPLOY_FRONTEND.md",
    "UPDATE_COMPLETION_CHECKLIST.md",
    "ENVIRONMENT_COMPARISON.md",
    "ENVIRONMENT_STATUS.md",
    "TEST_ENVIRONMENT_INFO.md",
    "TEST_ENVIRONMENT_URLS.md",
    "PROJECT_ID_GENERATION_ANALYSIS.md",
    "BIGQUERY_SCHEMA_CHANGE_ANALYSIS.md",
    "EXCEL_INPUT_RULES_UPDATE.md",
    "GOOGLE_SHEETS_AUTH_SETUP.md"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "docs\troubleshooting\" -Force
        Write-Host "移動: $file"
    }
}
```

### 2. スクリプトファイル → `docs/scripts/`

```powershell
$scripts = @(
    "check_dataset_status.sh",
    "check_table_creation_status.sh",
    "create_all_tables_improved.sh",
    "create_all_tables_only.sh",
    "create_all_tables_via_api.sh",
    "create_all_tables_with_timeout.sh",
    "create_dataset_and_tables.sh",
    "create_remaining_tables.sh",
    "create_schema_update_script.sh",
    "create_tables_step_by_step.sh",
    "diagnose_dataset_creation_issue.sh",
    "fix_user_requests_schema.sh",
    "fix_user_requests_schema_v2.sh",
    "list_tables_safe_bq.sh",
    "list_tables_via_api.sh",
    "recreate_all_tables.sh",
    "recreate_dataset_and_tables.sh",
    "recreate_user_requests_table.sh",
    "test_cloud_shell.sh",
    "update_all_schemas.sh",
    "update_all_schemas_complete.sh",
    "verify_tables_created.sh",
    "FIX_BACKEND_ENV_VARS.sh",
    "SET_ENV_VARS_NOW.sh"
)

foreach ($script in $scripts) {
    if (Test-Path $script) {
        Move-Item -Path $script -Destination "docs\scripts\" -Force
        Write-Host "移動: $script"
    }
}
```

## ⚠️ 注意事項

- 移動前に重要な情報を他のドキュメントに移行してください
- 移動後、参照リンクを更新してください
- バックアップを取ってから移動してください

## ✅ 実行後の確認

移動後、以下のコマンドで確認できます：

```powershell
# ルートディレクトリの.mdファイル数を確認
(Get-ChildItem -Path . -Filter "*.md" -Recurse | Where-Object { $_.FullName -notmatch "node_modules|build|\.git" }).Count

# docs/troubleshooting/のファイル数を確認
(Get-ChildItem -Path "docs\troubleshooting\" -Filter "*.md").Count

# docs/scripts/のファイル数を確認
(Get-ChildItem -Path "docs\scripts\" -Filter "*.sh").Count
```

