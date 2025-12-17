# ビルドステージ
FROM node:20-alpine AS builder

WORKDIR /app

# ビルドに必要なツールをインストール
RUN apk add --no-cache python3 make g++

# 依存関係をインストール
COPY package*.json ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# TypeScript設定ファイルをコピー
COPY tsconfig.json ./

# ソースコードをコピー
COPY src ./src

# TypeScriptをビルド（エラー詳細を表示）
RUN npm run build 2>&1 | tee /tmp/build.log || (cat /tmp/build.log && exit 1)

# 本番ステージ
FROM node:20-alpine

WORKDIR /app

# 本番依存関係のみをインストール
COPY package*.json ./
RUN npm ci --omit=dev --legacy-peer-deps || npm install --production --legacy-peer-deps

# ビルド済みファイルをコピー
COPY --from=builder /app/dist ./dist

# ポートを公開
EXPOSE 8080

# アプリケーションを起動
CMD ["node", "dist/index.js"]

