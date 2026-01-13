#!/bin/bash
# ローカルでビルドをテストするスクリプト

set -e

echo "🔍 ローカルビルドテストを開始します..."
echo ""

# 必要なファイルの確認
echo "📋 必要なファイルの確認:"
ls -la Dockerfile package.json tsconfig.json src/index.ts 2>&1 || echo "⚠️ 一部のファイルが見つかりません"
echo ""

# npm依存関係のインストール
echo "📦 npm依存関係をインストール中..."
npm install
echo ""

# TypeScriptのコンパイルテスト
echo "🔨 TypeScriptのコンパイルテスト..."
npm run build
echo ""

# ビルド結果の確認
echo "📋 ビルド結果の確認:"
ls -la dist/ 2>&1 || echo "⚠️ distディレクトリが見つかりません"
echo ""

# Dockerビルドテスト
echo "🐳 Dockerビルドテスト..."
docker build -t test-backend .
echo ""

echo "✅ ビルドテストが完了しました！"







