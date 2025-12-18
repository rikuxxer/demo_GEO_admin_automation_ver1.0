# ビルドステージ
FROM node:20-alpine AS builder

WORKDIR /app

# ビルドに必要なツールをインストール
RUN apk add --no-cache python3 make g++ libc6-compat

# 依存関係をインストール（エラー詳細を表示）
COPY package*.json ./
RUN echo "📦 Installing dependencies..." && \
    npm ci 2>&1 || (echo "⚠️ npm ci failed, trying npm install..." && npm install 2>&1) || \
    (echo "❌ npm install failed!" && exit 1)

# TypeScript設定ファイルをコピー
COPY tsconfig.json ./

# ソースコードをコピー
COPY src ./src

# ファイルの存在確認
RUN echo "📋 Verifying files..." && \
    ls -la && \
    ls -la src/ && \
    [ -f tsconfig.json ] && echo "✅ tsconfig.json exists" || (echo "❌ tsconfig.json not found!" && exit 1) && \
    [ -f src/index.ts ] && echo "✅ src/index.ts exists" || (echo "❌ src/index.ts not found!" && exit 1)

# TypeScriptをビルド（エラー詳細を表示）
RUN echo "🔨 Building TypeScript..." && \
    npm run build 2>&1 || (echo "❌ TypeScript build failed!" && exit 1) && \
    echo "✅ Build completed successfully" && \
    ls -la dist/

# 本番ステージ
FROM node:20-alpine

WORKDIR /app

# 本番依存関係のみをインストール
COPY package*.json ./
RUN npm ci --omit=dev || npm install --production

# ビルド済みファイルをコピー
COPY --from=builder /app/dist ./dist

# ポートを公開
EXPOSE 8080

# アプリケーションを起動
CMD ["node", "dist/index.js"]

