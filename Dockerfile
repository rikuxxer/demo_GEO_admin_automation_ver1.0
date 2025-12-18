# マルチステージビルド
FROM node:18-alpine AS builder

WORKDIR /app

# 依存関係をインストール
COPY package*.json ./
RUN npm ci

# ソースコードをコピー
COPY . .

# ビルド引数として環境変数を受け取る
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_SPREADSHEET_ID
ARG VITE_GOOGLE_SHEETS_API_KEY

# 環境変数を設定してビルド
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_SPREADSHEET_ID=$VITE_GOOGLE_SPREADSHEET_ID
ENV VITE_GOOGLE_SHEETS_API_KEY=$VITE_GOOGLE_SHEETS_API_KEY

# ビルド実行
RUN npm run build

# 本番環境用の軽量イメージ
FROM nginx:alpine

# ビルド成果物をコピー（Viteの出力ディレクトリに合わせる）
COPY --from=builder /app/build /usr/share/nginx/html

# Nginxの設定ファイル
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

