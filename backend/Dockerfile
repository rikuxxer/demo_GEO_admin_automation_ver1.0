# ビルドステージ
FROM node:20-alpine AS builder

WORKDIR /app

# 依存関係をインストール
COPY package*.json ./
RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps

# TypeScript設定ファイルをコピー
COPY tsconfig.json ./

# ソースコードをコピー
COPY src ./src

# TypeScriptをビルド
RUN npm run build

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

