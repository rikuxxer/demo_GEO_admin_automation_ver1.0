# サービスアカウント権限の修正

## 現在のエラー

```
Permission 'iam.serviceaccounts.actAs' denied on service account
```

GitHub Actionsで使用しているサービスアカウントが、Cloud Runサービスで使用するサービスアカウントを`actAs`する権限を持っていません。

## 解決方法

### 方法1: サービスアカウントに権限を付与（推奨）

GitHub Actionsで使用しているサービスアカウント（`id-***@***.iam.gserviceaccount.com`）に、`BACKEND_SERVICE_ACCOUNT`に対する`iam.serviceAccounts.actAs`権限を付与します。

**GCP Consoleで実行:**

1. **IAM & Admin** > **Service Accounts** を開く
2. GitHub Actionsで使用しているサービスアカウント（`id-***@***.iam.gserviceaccount.com`）を選択
3. **Permissions** タブを開く
4. **Grant Access** をクリック
5. **New principals** に `id-***@***.iam.gserviceaccount.com` を入力
6. **Role** で **Service Account User** (`roles/iam.serviceAccountUser`) を選択
7. **Save** をクリック

**または、gcloud CLIで実行:**

```bash
# GitHub Actionsで使用しているサービスアカウントのメールアドレスを取得
GITHUB_SA="id-***@***.iam.gserviceaccount.com"

# Cloud Runサービスで使用するサービスアカウントのメールアドレス
BACKEND_SA="id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com"

# 権限を付与
gcloud iam service-accounts add-iam-policy-binding $BACKEND_SA \
  --member="serviceAccount:$GITHUB_SA" \
  --role="roles/iam.serviceAccountUser" \
  --project=univere-geo-demo
```

### 方法2: ワークフローでサービスアカウントを指定しない

`--service-account`オプションを削除して、デフォルトのサービスアカウントを使用します。

**ワークフローの変更:**

```yaml
# 変更前
--service-account=${{ secrets.BACKEND_SERVICE_ACCOUNT }} \

# 変更後（この行を削除）
```

### 方法3: プロジェクトのデフォルトサービスアカウントを使用

Cloud Runサービスで、プロジェクトのデフォルトサービスアカウントを使用します。

**ワークフローの変更:**

```yaml
# 変更前
--service-account=${{ secrets.BACKEND_SERVICE_ACCOUNT }} \

# 変更後
--service-account=${{ env.PROJECT_ID }}@appspot.gserviceaccount.com \
```

## 確認方法

### 現在の権限を確認

```bash
# GitHub Actionsで使用しているサービスアカウント
GITHUB_SA="id-***@***.iam.gserviceaccount.com"

# Cloud Runサービスで使用するサービスアカウント
BACKEND_SA="id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com"

# 権限を確認
gcloud iam service-accounts get-iam-policy $BACKEND_SA \
  --project=univere-geo-demo
```

## 推奨設定

**方法1（サービスアカウントに権限を付与）**を推奨します。これにより、Cloud Runサービスで適切なサービスアカウントを使用できます。







