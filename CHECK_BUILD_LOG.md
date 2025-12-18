# ビルドログの確認方法

## すぐにビルドログを確認する方法

### 方法1: GitHub Actionsのログから確認（最も簡単）

1. GitHubリポジトリの「Actions」タブを開く
   - https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0/actions

2. 最新の失敗したワークフロー実行をクリック

3. 「Deploy to Cloud Run」ステップを展開

4. ログの最後の部分を確認
   - 「📋 ビルドログ（最後の500行）」セクションを確認
   - 「📋 エラー部分のみ抽出」セクションを確認

### 方法2: Google Cloud Consoleから確認

1. **プロジェクトIDを確認**
   - GitHub Actionsの「Debug Secrets」ステップで確認
   - `GCP_PROJECT_ID value: ...` の行を見る

2. **Cloud Buildの履歴を開く**
   - https://console.cloud.google.com/cloud-build/builds を開く
   - プロジェクトセレクタでプロジェクトを選択
   - 最新のビルドをクリック
   - ビルドログを確認

### 方法3: gcloud CLIから確認（ローカル）

```bash
# プロジェクトIDを設定（実際のプロジェクトIDに置き換える）
export PROJECT_ID="your-project-id"

# 最新のビルドIDを取得
BUILD_ID=$(gcloud builds list --limit=1 --format='value(id)' --project $PROJECT_ID)
echo "Build ID: $BUILD_ID"

# ビルドログを表示（エラー部分のみ）
gcloud builds log "$BUILD_ID" --project $PROJECT_ID | grep -i "error\|failed\|fail" | tail -50

# ビルドログ全体を表示（最後の500行）
gcloud builds log "$BUILD_ID" --project $PROJECT_ID | tail -500
```

## よくあるエラーパターン

### 1. TypeScriptのコンパイルエラー
```
error TS2307: Cannot find module 'xxx'
error TS2322: Type 'xxx' is not assignable to type 'yyy'
```
→ `backend/src/` のTypeScriptファイルを確認

### 2. npm依存関係のエラー
```
npm ERR! code ERESOLVE
npm ERR! Could not resolve dependency
```
→ `backend/package.json` を確認

### 3. ファイルが見つからない
```
COPY failed: file not found
```
→ `backend/Dockerfile` の `COPY` コマンドを確認

### 4. メモリ不足
```
Error: spawn ENOMEM
```
→ Dockerfileの最適化が必要

## エラーログを共有する方法

ビルドログのエラー部分をコピーして、以下を含めて共有してください：
- エラーメッセージ全体
- エラーが発生したステップ（例: `npm ci`、`npm run build` など）
- エラーの前後数行のコンテキスト

