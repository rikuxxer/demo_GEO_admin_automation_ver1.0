# ビルド失敗のトラブルシューティングガイド

## ビルドログを確認する方法

### 方法1: GitHub Actionsのログから確認

1. GitHubリポジトリの「Actions」タブを開く
2. 失敗したワークフロー実行をクリック
3. 「Deploy to Cloud Run」ステップを展開
4. ビルドログの最後の400行を確認

### 方法2: Google Cloud Consoleから確認

1. **プロジェクトIDを確認**
   - GitHub Actionsの「Debug Secrets」ステップで `GCP_PROJECT_ID value:` を確認
   - または、`PROJECT_ID: ...` の行を確認

2. **Cloud Buildの履歴を開く**
   - https://console.cloud.google.com/cloud-build/builds を開く
   - プロジェクトを選択（上記で確認したプロジェクトID）
   - 最新のビルドをクリック
   - ビルドログを確認

### 方法3: gcloud CLIから確認（ローカル）

```bash
# プロジェクトIDを設定（実際のプロジェクトIDに置き換える）
export PROJECT_ID="your-project-id"

# 最新のビルドIDを取得
gcloud builds list --limit=1 --project $PROJECT_ID

# ビルドログを表示（BUILD_IDを実際のIDに置き換える）
gcloud builds log [BUILD_ID] --project $PROJECT_ID
```

## よくあるビルドエラーと対処法

### 1. TypeScriptのコンパイルエラー

**エラーメッセージ例:**
```
error TS2307: Cannot find module 'xxx'
error TS2322: Type 'xxx' is not assignable to type 'yyy'
```

**対処法:**
- `backend/src/` ディレクトリのTypeScriptファイルを確認
- 型定義が正しいか確認
- インポートパスが正しいか確認

### 2. npm依存関係のインストールエラー

**エラーメッセージ例:**
```
npm ERR! code ERESOLVE
npm ERR! Could not resolve dependency
```

**対処法:**
- `backend/package.json` の依存関係を確認
- `package-lock.json` が存在するか確認
- Dockerfileの `npm ci` コマンドを確認

### 3. ファイルが見つからないエラー

**エラーメッセージ例:**
```
COPY failed: file not found
```

**対処法:**
- `backend/Dockerfile` の `COPY` コマンドを確認
- 必要なファイルが存在するか確認
- `.dockerignore` でファイルが除外されていないか確認

### 4. メモリ不足エラー

**エラーメッセージ例:**
```
Error: spawn ENOMEM
```

**対処法:**
- Dockerfileのビルドステージで不要なファイルを削除
- マルチステージビルドを最適化

## ビルドプロセスの確認

### 1. 必要なファイルの確認

```bash
cd backend
ls -la Dockerfile package.json tsconfig.json src/index.ts
```

### 2. ローカルでビルドをテスト

```bash
cd backend
docker build -t test-backend .
```

### 3. TypeScriptのコンパイルをテスト

```bash
cd backend
npm install
npm run build
```

## プロジェクトIDがマスクされている場合

GitHub ActionsのログでプロジェクトIDが `***` と表示される場合：

1. **Debug Secretsステップを確認**
   - ワークフローの「Debug Secrets」ステップを展開
   - `GCP_PROJECT_ID value:` の行を確認

2. **環境変数から確認**
   - ワークフローの「Deploy to Cloud Run」ステップを展開
   - `プロジェクトID: ...` の行を確認

3. **GitHub Secretsから確認**
   - https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/settings/secrets/actions
   - Environment secrets または Repository secrets で `GCP_PROJECT_ID` を確認

## 次のステップ

ビルドログを確認したら、エラーメッセージの内容を共有してください。具体的なエラーに基づいて、修正方法を提案します。




