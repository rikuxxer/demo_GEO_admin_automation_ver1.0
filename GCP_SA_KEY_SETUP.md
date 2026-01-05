# GCP_SA_KEY の設定手順

## 🔍 問題

GitHub Actionsのワークフローで`GCP_SA_KEY`が見つからないエラーが発生しています。

```
❌ GCP_SA_KEY is missing
   環境スコープのSecretsに GCP_SA_KEY が設定されているか確認してください
   Settings > Environments > production > Secrets
```

## 📋 原因

`deploy-backend.yml`では`environment: production`が設定されているため、**環境スコープ（Environment secrets）**のSecretsを参照します。

リポジトリレベルのSecretsではなく、**Environment secrets**に設定する必要があります。

## ✅ 解決方法

### 1. GitHub Environment Secrets に `GCP_SA_KEY` を追加

1. **GitHubリポジトリの設定ページを開く**
   ```
   https://github.com/[ユーザー名]/[リポジトリ名]/settings/environments
   ```

2. **`production`環境を選択**
   - 環境一覧から`production`をクリック

3. **Secrets セクションで「Add secret」をクリック**

4. **Secret名を入力**
   - **Name**: `GCP_SA_KEY`（大文字・小文字を正確に）
   - ⚠️ 重要: Secret名は`GCP_SA_KEY`と完全に一致する必要があります
   - ❌ 間違い: `gcp_sa_key`, `GCP-SA-KEY`, `GCP_SA_KEY_`など

5. **Secret値を入力**
   - **Secret**: サービスアカウントキー（JSON）の内容全体を貼り付け
   - JSON全体（`{`から`}`まで）をそのまま貼り付け
   - 改行も含めてそのまま貼り付け

6. **「Add secret」をクリック**

### 2. サービスアカウントキーの取得方法

1. **Google Cloud Console を開く**
   ```
   https://console.cloud.google.com/
   ```

2. **IAM & Admin > Service Accounts に移動**

3. **サービスアカウントを選択**（または新規作成）

4. **「Keys」タブを開く**

5. **「Add Key」>「Create new key」をクリック**

6. **Key type で「JSON」を選択**

7. **「Create」をクリック**（JSONファイルがダウンロードされます）

8. **ダウンロードしたJSONファイルの内容全体をコピー**

9. **GitHub Environment Secrets に貼り付け**

## 🔍 確認方法

### ワークフロー実行後の確認

ワークフローを再実行して、以下のメッセージが表示されれば成功です：

```
✅ 必須Secretsが設定されています

📋 環境変数の確認:
  GCP_SA_KEY: ✅ SET
  GCP_PROJECT_ID: ✅ SET
  BQ_DATASET: ✅ SET
```

### 手動確認

1. **GitHubリポジトリの設定ページを開く**
   ```
   https://github.com/[ユーザー名]/[リポジトリ名]/settings/environments/production
   ```

2. **Secrets セクションで`GCP_SA_KEY`が表示されているか確認**

## ⚠️ 注意事項

1. **Environment secrets と Repository secrets の違い**
   - `deploy-backend.yml`は`environment: production`を設定しているため、**Environment secrets**を参照します
   - リポジトリレベルのSecretsでは参照できません

2. **Secret名の大文字・小文字**
   - `GCP_SA_KEY`と完全に一致する必要があります
   - `gcp_sa_key`や`GCP-SA-KEY`では参照できません

3. **JSONファイルの内容**
   - JSONファイルの内容全体（`{`から`}`まで）をそのまま貼り付けてください
   - 改行も含めてそのまま貼り付けてください
   - 一部だけをコピーしないでください

## 🔄 他の環境（staging）の場合

`staging`環境を使用する場合も、同様に`staging`環境のSecretsに`GCP_SA_KEY`を設定してください。

1. **GitHubリポジトリの設定ページを開く**
   ```
   https://github.com/[ユーザー名]/[リポジトリ名]/settings/environments
   ```

2. **`staging`環境を選択**（存在しない場合は作成）

3. **Secrets セクションで`GCP_SA_KEY`を追加**

## 📝 関連ファイル

- `.github/workflows/deploy-backend.yml`: バックエンドデプロイワークフロー
- `.github/workflows/deploy-frontend.yml`: フロントエンドデプロイワークフロー
- `.github/workflows/deploy-all.yml`: 全デプロイワークフロー

すべてのワークフローで`GCP_SA_KEY`が必要です。

