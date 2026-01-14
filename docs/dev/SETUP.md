# 開発環境セットアップガイド

## 📋 概要

開発環境のセットアップ手順を説明します。

## 🔧 前提条件

- Node.js 18以上
- npm または yarn
- Google Cloud SDK（オプション）
- 開発用GCPプロジェクトへのアクセス権限

## 🚀 セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/rikuxxer/demo_GEO_admin_automation_ver1.0.git
cd demo_GEO_admin_automation_ver1.0
```

### 2. 依存関係のインストール

```bash
# フロントエンド
npm install

# バックエンド
cd backend
npm install
cd ..
```

### 3. 環境変数の設定

```bash
# 開発環境用の環境変数ファイルをコピー
cp config/dev/.env.example .env
cp config/dev/.env.example backend/.env
```

`.env`ファイルを編集して、開発環境用の値を設定してください。

### 4. サービスアカウントキーの配置

開発用のサービスアカウントキーを`backend/service-account-key-dev.json`に配置します。

### 5. 開発サーバーの起動

```bash
# フロントエンド（ターミナル1）
npm run dev

# バックエンド（ターミナル2）
cd backend
npm run dev
```

## 🔍 確認事項

- [ ] フロントエンドが http://localhost:5173 で起動している
- [ ] バックエンドが http://localhost:8080 で起動している
- [ ] BigQueryへの接続が成功している
- [ ] 開発用データセットが存在している

## 📝 関連ドキュメント

- [デプロイガイド](./DEPLOYMENT.md)
- [トラブルシューティング](./TROUBLESHOOTING.md)
- [共通ドキュメント](../shared/)
