# サービスアカウント設定とスプレッドシート共有の修正

## 🔍 問題の原因

`HTTP 400: The caller does not have permission` エラーは、以下のいずれかが原因です：

1. **Cloud Runが想定外のサービスアカウントで動いている**（デフォルトSAなど）
2. **想定通りのサービスアカウントだが、スプレッドシートを共有していない**

## ✅ 実施した修正

### 1. GitHub Actionsワークフローにサービスアカウント設定を追加

`deploy-backend.yml`に`BACKEND_SERVICE_ACCOUNT`の設定を追加しました。

- `BACKEND_SERVICE_ACCOUNT`が設定されている場合、Cloud Runに明示的にサービスアカウントを設定
- 設定されていない場合、デフォルトのサービスアカウントが使用されます

### 2. バックエンドのエラーハンドリングを改善

`backend/src/bigquery-client.ts`の`exportToGoogleSheets`関数を更新：

- `error?.response?.data`を詳細にログ出力（SheetsかDriveか、どの権限で落ちたかを特定）
- スタックトレースも出力
- エラーオブジェクト全体をJSON形式で出力

## 📋 必要な対応手順

### ステップ1: Cloud Runで使用しているサービスアカウントを確認

Cloud Shellで実行：

```bash
gcloud run services describe universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --format="value(spec.template.spec.serviceAccountName)"
```

**出力例**:
- `223225164238-compute@developer.gserviceaccount.com`（デフォルトSA）
- `universegeo-backend-sa@univere-geo-demo.iam.gserviceaccount.com`（カスタムSA）

**⚠️ 重要**: 空や`default`系の場合は、意図したサービスアカウントではない可能性があります。

### ステップ2: GitHub Environment Secretsに`BACKEND_SERVICE_ACCOUNT`を設定（推奨）

1. GitHubリポジトリにアクセス
2. **Settings** > **Environments** > **production**（または使用している環境）
3. **Secrets and variables** > **Secrets**
4. **New secret**をクリック
5. 以下を入力：
   - **Name**: `BACKEND_SERVICE_ACCOUNT`
   - **Value**: ステップ1で確認したサービスアカウントのメールアドレス
     - 例: `223225164238-compute@developer.gserviceaccount.com`
     - または、カスタムサービスアカウント: `universegeo-backend-sa@univere-geo-demo.iam.gserviceaccount.com`
6. **Add secret**をクリック

### ステップ3: スプレッドシートにサービスアカウントを共有

1. スプレッドシートを開く: https://docs.google.com/spreadsheets/d/17Y9KHOaHjoW5dzrIENPRCDa-HQywScJctgzcSOiX10s/edit
2. 右上の**「共有」**ボタンをクリック
3. **「ユーザーやグループを追加」**の欄に、ステップ1で確認したサービスアカウントのメールアドレスを入力
   - 例: `223225164238-compute@developer.gserviceaccount.com`
4. **権限**を**「編集者」**に設定
5. **「通知を送信しない」**にチェック
6. **「送信」**をクリック

### ステップ4: GitHub Environment Secretsの`GOOGLE_SPREADSHEET_ID`を更新

1. GitHubリポジトリにアクセス
2. **Settings** > **Environments** > **production**（または使用している環境）
3. **Secrets and variables** > **Secrets**
4. `GOOGLE_SPREADSHEET_ID`を編集
5. 値を `17Y9KHOaHjoW5dzrIENPRCDa-HQywScJctgzcSOiX10s` に更新
6. **Update secret**をクリック

### ステップ5: バックエンドを再デプロイ

1. GitHubリポジトリの**Actions**タブを開く
2. **Deploy Backend to Cloud Run**ワークフローを選択
3. **Run workflow**をクリック
4. 環境を選択（`production`）
5. **Run workflow**をクリック

### ステップ6: バックエンドのログでサービスアカウントを確認

デプロイ完了後、バックエンドのログを確認：

```bash
gcloud run services logs read universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --limit 100 | grep -i "Google Sheets API認証情報\|serviceAccountEmail\|🔐"
```

ログに以下のような出力が表示されます：

```
🔐 Google Sheets API認証情報: {
  projectId: 'univere-geo-demo',
  serviceAccountEmail: '223225164238-compute@developer.gserviceaccount.com',
  spreadsheetId: '17Y9KHOaHjoW5dzrIENPRCDa-HQywScJctgzcSOiX10s',
  sheetName: 'シート1'
}
```

**この`serviceAccountEmail`をスプレッドシートに共有してください。**

### ステップ7: 再度テストを実行

1. バックエンドが再デプロイされたことを確認
2. スプレッドシートにサービスアカウントが共有されていることを確認
3. `test-spreadsheet-export.html`で再度テストを実行
4. 成功することを確認

## 🔍 トラブルシューティング

### エラー: "The caller does not have permission"

**原因**: スプレッドシートにサービスアカウントが共有されていない、または権限が不足している

**対処法**:
1. バックエンドのログでサービスアカウントのメールアドレスを確認
2. そのメールアドレスをスプレッドシートに共有（編集者権限）
3. 共有後、数秒待ってから再度テスト

### エラー: "NOT_FOUND" または "404"

**原因**: スプレッドシートIDが間違っている、またはスプレッドシートが削除されている

**対処法**:
1. `GOOGLE_SPREADSHEET_ID`が正しいか確認
2. スプレッドシートが存在するか確認

### エラー詳細の確認

バックエンドのログで詳細なエラー情報を確認：

```bash
gcloud run services logs read universegeo-backend \
  --region asia-northeast1 \
  --project univere-geo-demo \
  --limit 100 | grep -i "Google API エラー詳細\|response.data"
```

ログに以下のような出力が表示されます：

```
📋 Google API エラー詳細 (response.data): {
  "error": {
    "code": 403,
    "message": "The caller does not have permission",
    "status": "PERMISSION_DENIED"
  }
}
```

この情報から、SheetsかDriveか、どの権限で落ちているかを特定できます。

## 📝 チェックリスト

- [ ] Cloud Runで使用しているサービスアカウントを確認
- [ ] GitHub Environment Secretsに`BACKEND_SERVICE_ACCOUNT`を設定（推奨）
- [ ] スプレッドシートにサービスアカウントを共有（編集者権限）
- [ ] `GOOGLE_SPREADSHEET_ID`を更新（`17Y9KHOaHjoW5dzrIENPRCDa-HQywScJctgzcSOiX10s`）
- [ ] バックエンドを再デプロイ
- [ ] バックエンドのログでサービスアカウントを確認
- [ ] 再度テストを実行

## 🎯 まとめ

1. **サービスアカウントの明示的な設定**: GitHub Actionsワークフローで`BACKEND_SERVICE_ACCOUNT`を設定
2. **スプレッドシートへの共有**: 確認したサービスアカウントに編集者権限を付与
3. **エラーハンドリングの改善**: 詳細なエラー情報をログ出力して、問題を特定しやすくする

これらの対応により、`HTTP 400: The caller does not have permission`エラーが解決されます。

