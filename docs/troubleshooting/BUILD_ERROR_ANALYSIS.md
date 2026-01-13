# ビルドエラーの原因分析

## エラーメッセージ
```
ERROR: build step 0 "gcr.io/cloud-builders/docker" failed: step exited with non-zero status: 2
```

## 考えられる原因

### 1. TypeScriptのコンパイルエラー（最も可能性が高い）

**症状:**
- `npm run build` が失敗
- TypeScriptの型エラーや構文エラー

**確認方法:**
```bash
cd backend
npm install
npm run build
```

**よくあるエラー:**
- `error TS2307: Cannot find module 'xxx'`
- `error TS2322: Type 'xxx' is not assignable to type 'yyy'`
- `error TS2304: Cannot find name 'xxx'`

### 2. npm依存関係のインストールエラー

**症状:**
- `npm ci` または `npm install` が失敗
- `package-lock.json` との不整合

**確認方法:**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

**よくあるエラー:**
- `npm ERR! code ERESOLVE`
- `npm ERR! Could not resolve dependency`
- `npm ERR! lock file is missing`

### 3. ファイルが見つからない

**症状:**
- `COPY` コマンドが失敗
- 必要なファイルが存在しない

**確認方法:**
```bash
cd backend
ls -la Dockerfile package.json tsconfig.json src/index.ts
```

**よくあるエラー:**
- `COPY failed: file not found`
- `no such file or directory`

### 4. メモリ不足

**症状:**
- ビルド中にメモリエラー
- プロセスが強制終了

**確認方法:**
- Cloud Buildのログで `ENOMEM` エラーを確認

### 5. package-lock.jsonの問題

**症状:**
- `npm ci` が失敗
- 依存関係のバージョン不一致

**確認方法:**
```bash
cd backend
npm install --package-lock-only
```

## 実際の原因を特定する方法

### 方法1: GitHub Actionsのログから確認

1. GitHubリポジトリの「Actions」タブを開く
2. 最新の失敗したワークフロー実行をクリック
3. 「Deploy to Cloud Run」ステップを展開
4. 「📋 ビルドログ（最後の500行）」セクションを確認
5. 「📋 エラー部分のみ抽出」セクションを確認

### 方法2: ローカルでビルドをテスト

```bash
cd backend
docker build -t test-backend .
```

このコマンドで、実際のエラーメッセージが表示されます。

### 方法3: TypeScriptのコンパイルをテスト

```bash
cd backend
npm install
npm run build
```

## 次のステップ

実際のビルドログを確認して、具体的なエラーメッセージを共有してください。
特に以下の情報があると原因を特定しやすくなります：

1. **エラーが発生したステップ**
   - `npm ci` / `npm install` の段階か
   - `npm run build` の段階か
   - その他のステップか

2. **具体的なエラーメッセージ**
   - TypeScriptのエラーコード（例: `TS2307`）
   - npmのエラーコード（例: `ERESOLVE`）
   - ファイルが見つからないエラー

3. **エラーの前後数行**
   - コンテキストがあると原因を特定しやすい

## よくある修正方法

### TypeScriptエラーの場合
- 型定義を修正
- インポートパスを修正
- 不足している型定義を追加

### npm依存関係エラーの場合
- `package-lock.json` を再生成
- 依存関係のバージョンを更新
- `npm ci` の代わりに `npm install` を使用

### ファイルが見つからない場合
- `.dockerignore` を確認
- ファイルパスを確認
- `COPY` コマンドを修正







