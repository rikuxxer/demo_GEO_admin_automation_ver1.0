#!/bin/bash
# 本番環境用ビルドスクリプト

echo "🔨 本番環境用ビルドを開始します..."

# 環境変数の確認
if [ ! -f ".env" ]; then
  echo "⚠️ 警告: .envファイルが見つかりません"
  echo "config/prod/.env.exampleを参考に.envファイルを作成してください"
fi

# フロントエンドのビルド
echo "📦 フロントエンドをビルド中..."
npm run build:prod

# バックエンドのビルド
echo "📦 バックエンドをビルド中..."
cd backend
npm run build
cd ..

echo "✅ 本番環境用ビルドが完了しました"
echo "📁 ビルド成果物: build/"
