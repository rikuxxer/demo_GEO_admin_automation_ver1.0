#!/bin/bash
# 開発環境用ビルドスクリプト

echo "🔨 開発環境用ビルドを開始します..."

# 環境変数の確認
if [ ! -f ".env" ]; then
  echo "⚠️ 警告: .envファイルが見つかりません"
  echo "config/dev/.env.exampleを参考に.envファイルを作成してください"
fi

# フロントエンドのビルド
echo "📦 フロントエンドをビルド中..."
npm run build:dev

# バックエンドのビルド
echo "📦 バックエンドをビルド中..."
cd backend
npm run build
cd ..

echo "✅ 開発環境用ビルドが完了しました"
echo "📁 ビルド成果物: build-dev/"
