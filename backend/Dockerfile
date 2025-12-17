# ビルドステージ
FROM node:20-alpine AS builder

WORKDIR /app

# 依存関係をインストール
COPY package*.json ./
RUN npm ci

# ソースコードをコピー
COPY . .

# TypeScriptをビルド
RUN npm run build

# 本番ステージ
FROM node:20-alpine

WORKDIR /app

# 本番依存関係のみをインストール
COPY package*.json ./
RUN npm ci --only=production

# ビルド済みファイルをコピー
COPY --from=builder /app/dist ./dist

# ポートを公開
EXPOSE 8080

# アプリケーションを起動
CMD ["node", "dist/index.js"]

