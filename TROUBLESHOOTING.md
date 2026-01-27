# アプリケーションが開けない問題のトラブルシューティング

## 確認手順

### 1. 開発サーバーの起動確認

ターミナルで以下を実行：
```bash
npm run dev
```

**期待される出力:**
```
  VITE v6.3.5  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

### 2. ポートの競合確認

ポート3000が既に使用されている場合：
- 別のアプリケーションが起動している可能性があります
- タスクマネージャーで確認するか、別のポートを使用してください

### 3. ブラウザの開発者ツールで確認

1. **F12キー**を押して開発者ツールを開く
2. **Consoleタブ**でエラーメッセージを確認
3. **Networkタブ**で読み込み失敗しているファイルを確認

### 4. よくあるエラーと対処法

#### エラー: "Cannot find module"
**対処法:**
```bash
npm install
```

#### エラー: "Port 3000 is already in use"
**対処法:**
- 別のアプリケーションを終了する
- または `config/dev/vite.config.dev.ts` のポート番号を変更

#### エラー: "Failed to fetch" または CORSエラー
**対処法:**
- `.env` ファイルに `VITE_API_BASE_URL` が正しく設定されているか確認
- バックエンドサーバーが起動しているか確認

#### 白い画面が表示される
**対処法:**
1. ブラウザのコンソールでエラーを確認
2. `src/main.tsx` のインポートパスが正しいか確認
3. `index.html` の `<div id="root"></div>` が存在するか確認

### 5. キャッシュのクリア

```bash
# node_modulesを削除して再インストール
rm -rf node_modules
npm install

# Viteのキャッシュをクリア
rm -rf node_modules/.vite
```

### 6. 環境変数の確認

プロジェクトルートに `.env` ファイルがあるか確認：
```env
VITE_API_BASE_URL=http://localhost:8080
```

### 7. ビルドエラーの確認

```bash
npm run build:dev
```

ビルドが成功するか確認してください。

## 緊急時の対処法

### 最小限の動作確認

1. `src/main.tsx` を以下のように簡略化してテスト：
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <div>Hello World</div>
);
```

2. これで表示されれば、問題は `App.tsx` またはその依存関係にあります

### ログの確認

開発サーバーのターミナル出力を確認し、エラーメッセージを探してください。
