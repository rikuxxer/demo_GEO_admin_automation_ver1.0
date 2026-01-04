# 🔍 Environment Secrets の名前確認

## 現在の状況

Environment secretsに設定されているSecret名が正しくない可能性があります。

## ✅ 確認手順

### ステップ1: Environment secretsにアクセス

以下のリンクを開いてください：

**`https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/environments/production`**

### ステップ2: Environment secretsの一覧を確認

**Environment secrets** セクションで、以下のSecret名が**正確に**表示されているか確認してください：

#### ✅ 正しいSecret名（大文字・小文字を正確に）

- `GCP_SA_KEY` （正しい）
- `GCP_PROJECT_ID` （正しい）
- `BACKEND_SERVICE_ACCOUNT` （正しい）
- `BQ_DATASET` （正しい）

#### ❌ 間違ったSecret名の例

- `gcp_sa_key` （小文字 - 間違い）
- `GCP-SA-KEY` （ハイフン - 間違い）
- `GCP_SA_KEY_` （末尾にアンダースコア - 間違い）
- `GCP_SA_KEY ` （末尾にスペース - 間違い）
- `Gcp_Sa_Key` （大文字・小文字が混在 - 間違い）

### ステップ3: Secret名を修正する必要がある場合

もしSecret名が間違っている場合：

1. 間違ったSecretをクリック
2. **Delete** をクリックして削除
3. **Add secret** をクリック
4. **Name**: 正しい名前を入力（例: `GCP_SA_KEY`）
5. **Secret**: 値を貼り付け
6. **Add secret** をクリック

## 📋 必須Secretsの一覧

Environment secretsに以下のSecretsが**正確な名前**で設定されている必要があります：

| Secret名 | 値の例 | 必須 |
|---------|--------|------|
| `GCP_SA_KEY` | JSONファイルの内容全体 | ✅ |
| `GCP_PROJECT_ID` | `univere-geo-demo` | ✅ |
| `BACKEND_SERVICE_ACCOUNT` | `id-universegeo-backend@univere-geo-demo.iam.gserviceaccount.com` | ✅ |
| `BQ_DATASET` | BigQueryデータセット名 | ✅ |

## ⚠️ 重要: Secret名の規則

- **大文字・小文字を区別**: `GCP_SA_KEY` と `gcp_sa_key` は別物
- **アンダースコアのみ**: ハイフン（`-`）は使用不可
- **スペースなし**: 前後にスペースを入れない
- **正確に一致**: ワークフローで使用している名前と完全に一致する必要がある

## 🔍 ワークフローで使用しているSecret名

ワークフロー（`.github/workflows/deploy-all.yml`）では以下の名前を使用しています：

- `${{ secrets.GCP_SA_KEY }}`
- `${{ secrets.GCP_PROJECT_ID }}`
- `${{ secrets.BACKEND_SERVICE_ACCOUNT }}`
- `${{ secrets.BQ_DATASET }}`

Environment secretsの名前がこれらと**完全に一致**している必要があります。

## 🚀 修正後の確認

1. Environment secretsのSecret名が正しいか確認
2. すべての必須Secretsが設定されているか確認
3. GitHub Actionsでデプロイを再実行
4. 「Debug Secrets」ステップのログを確認





