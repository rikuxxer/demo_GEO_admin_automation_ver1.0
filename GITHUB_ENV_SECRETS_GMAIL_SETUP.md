# GitHub Environment Secrets に Gmail API 設定を追加する方法

## 📋 概要

Gmail APIを使用する場合、GitHub Environment Secretsに`EMAIL_SERVICE=gmail`を設定するだけでOKです。追加のAPIキーや認証情報は不要です。

## 🚀 設定手順

### ステップ1: GitHub Repository Settings を開く

1. GitHubリポジトリのページを開く
   - https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0

2. **Settings** タブをクリック

3. 左側のメニューから **Environments** を選択
   - または直接: https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments

### ステップ2: Environment を選択または作成

#### 既存のEnvironmentを使用する場合

1. **Environment secrets** という名前の環境があるか確認
   - または **production** という名前の環境があるか確認
   - ワークフロー（`.github/workflows/deploy-backend.yml`）で使用しているEnvironment名を確認

2. 該当するEnvironmentをクリック

#### 新しいEnvironmentを作成する場合

1. **New environment** ボタンをクリック
2. **Name** に `Environment secrets` または `production` と入力
   - ⚠️ 重要: ワークフローの`environment: name:`と一致させる必要があります
3. **Configure environment** をクリック

### ステップ3: Environment Secrets を追加

1. **Environment secrets** セクションまでスクロール

2. **Add secret** ボタンをクリック

3. 以下のSecretを1つずつ追加：

#### Secret 1: EMAIL_SERVICE

- **Name**: `EMAIL_SERVICE`
  - ⚠️ 重要: 大文字・小文字を正確に入力（`EMAIL_SERVICE`）
- **Secret**: `gmail`
  - 小文字で `gmail` と入力
- **Add secret** をクリック

#### Secret 2: FRONTEND_URL（既に設定済みの場合はスキップ）

- **Name**: `FRONTEND_URL`
- **Secret**: フロントエンドのURL
  - 例: `https://universegeo-i5xw76aisq-an.a.run.app`
  - または: `https://your-frontend-url.com`
- **Add secret** をクリック

### ステップ4: 設定の確認

追加したSecretsが正しく表示されているか確認：

- ✅ `EMAIL_SERVICE`: `gmail`（値は表示されませんが、存在を確認）
- ✅ `FRONTEND_URL`: （既に設定済みの場合）

## 📝 注意事項

### Secret名の大文字・小文字

- ✅ 正しい: `EMAIL_SERVICE`
- ❌ 間違い: `email_service`, `Email_Service`, `EMAIL-SERVICE` など

### 値の入力

- `EMAIL_SERVICE` の値は `gmail`（小文字）と入力
- `sendgrid` ではありません

### 既存のSecretがある場合

- `FRONTEND_URL` が既に設定されている場合は、追加する必要はありません
- `EMAIL_SERVICE` のみ追加してください

## 🔍 ワークフローでの確認

設定後、次回のデプロイ時にワークフローで以下のように環境変数が設定されます：

```bash
EMAIL_SERVICE=gmail
FRONTEND_URL=https://your-frontend-url.com
```

## ✅ 設定完了後の確認

1. **GitHub Actions のログを確認**
   - デプロイワークフロー実行時に、環境変数が正しく設定されているか確認
   - `EMAIL_SERVICE: gmail` と表示されることを確認

2. **Cloud Run の環境変数を確認**
   ```bash
   gcloud run services describe universegeo-backend \
     --region asia-northeast1 \
     --project univere-geo-demo \
     --format='value(spec.template.spec.containers[0].env)'
   ```

## 🐛 トラブルシューティング

### Secretが反映されない場合

1. **Environment名の確認**
   - ワークフローの `environment: name:` と一致しているか確認
   - `.github/workflows/deploy-backend.yml` を確認

2. **Secret名の確認**
   - `EMAIL_SERVICE` が正確に入力されているか確認（大文字・小文字）

3. **ワークフローの再実行**
   - 手動でワークフローを実行して確認
   - GitHub Actions > Deploy Backend to Cloud Run > Run workflow

### 値が間違っている場合

1. Secretを削除して再追加
2. 正しい値（`gmail`）を入力

## 📚 関連ドキュメント

- `PASSWORD_RESET_SETUP.md`: パスワードリセット機能のセットアップガイド
- `PASSWORD_RESET_CHECKLIST.md`: 本番環境対応チェックリスト

