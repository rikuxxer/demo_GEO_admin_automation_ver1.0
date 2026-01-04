# Environment Secrets 設定ガイド

## ✅ 正しい設定方法

### 1. Environmentの作成

1. GitHubリポジトリの **Settings** > **Environments** を開く
2. **New environment** をクリック
3. **Name**: `production` と入力（重要：この名前をワークフローで使用）
4. **Configure environment** をクリック

### 2. Environment Secretsの設定

1. 作成した **production** 環境をクリック
2. **Environment secrets** セクションで **Add secret** をクリック
3. 以下のSecretsを1つずつ追加：

| Secret名 | 説明 |
|---------|------|
| `GCP_SA_KEY` | GCPサービスアカウントキー（JSON形式） |
| `GCP_PROJECT_ID` | GCPプロジェクトID |
| `BQ_DATASET` | BigQueryデータセット名 |
| `GOOGLE_SPREADSHEET_ID` | Google Sheets スプレッドシートID |
| `GOOGLE_SHEETS_API_KEY` | Google Sheets API キー |
| `BACKEND_SERVICE_ACCOUNT` | バックエンド用サービスアカウントメール |
| `GOOGLE_SHEET_NAME` | Google Sheets シート名（オプション） |
| `FRONTEND_URL` | フロントエンドURL（オプション） |

### 3. ワークフローの確認

ワークフローファイル（`.github/workflows/deploy-backend.yml`）で以下を確認：

```yaml
jobs:
  deploy-backend:
    environment:
      name: production  # ← Environment名と一致しているか確認
```

## 🔍 トラブルシューティング

### 問題1: Secretが空になる

**原因**: Environment名が一致していない

**解決方法**:
1. Settings > Environments でEnvironment名を確認
2. ワークフローの `environment: name:` と一致しているか確認
3. 一致していない場合は、どちらかを修正

### 問題2: Environment secretsが参照されない

**確認事項**:
1. `environment:` ブロックが有効になっているか（コメントアウトされていないか）
2. Environment名が正しいか
3. Secretsが正しく設定されているか

### 問題3: GCP_SA_KEY が空

**確認事項**:
1. Environment secretsに `GCP_SA_KEY` が存在するか
2. 値が正しい形式（JSON）か
3. JSON全体をコピー&ペーストしているか（改行も含む）

## 📝 設定チェックリスト

- [ ] Environment `production` が作成されている
- [ ] Environment secretsに `GCP_SA_KEY` が設定されている
- [ ] Environment secretsに `GCP_PROJECT_ID` が設定されている
- [ ] Environment secretsに `BQ_DATASET` が設定されている
- [ ] Environment secretsに `GOOGLE_SPREADSHEET_ID` が設定されている
- [ ] Environment secretsに `GOOGLE_SHEETS_API_KEY` が設定されている
- [ ] Environment secretsに `BACKEND_SERVICE_ACCOUNT` が設定されている
- [ ] ワークフローの `environment: name: production` が設定されている

## 🚀 確認方法

### GitHub Actionsのログで確認

デプロイを実行すると、「Verify Secrets」ステップで以下が表示されます：

```
🔍 Secret確認中...
Environment: production
Environment secrets を使用します

✅ GCP_SA_KEY が設定されています（長さ: XXX 文字）
✅ GCP_PROJECT_ID: your-project-id
```

### エラーメッセージの確認

エラーが出る場合、ログに詳細なメッセージが表示されます：

- `❌ エラー: GCP_SA_KEY が設定されていません` → Environment secretsに設定されていない
- `❌ エラー: GCP_PROJECT_ID が設定されていません` → Environment secretsに設定されていない

## 💡 推奨事項

Environment secretsを使う場合：

1. **Environment名を統一**: すべてのワークフローで同じEnvironment名を使用
2. **Secretsの確認**: デプロイ前にすべてのSecretsが設定されているか確認
3. **ログの確認**: デプロイ時に「Verify Secrets」ステップのログを確認




