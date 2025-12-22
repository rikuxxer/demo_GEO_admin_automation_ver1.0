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

# ビルド成果物の確認（デバッグ用）
# vite.config.tsでoutDir: 'build'が設定されているため、成果物は/app/buildに生成される
RUN echo "📋 ビルド成果物の確認:" && \
    ls -la /app/ && \
    echo "" && \
    echo "📁 buildディレクトリの内容（期待される出力先）:" && \
    if [ -d "/app/build" ]; then \
      ls -la /app/build/ && \
      echo "✅ /app/build が存在します"; \
    else \
      echo "❌ エラー: /app/build が見つかりません！" && \
      echo "vite.config.tsのoutDir設定を確認してください" && \
      exit 1; \
    fi && \
    echo "" && \
    echo "📁 distディレクトリの内容（存在しないはず）:" && \
    ls -la /app/dist/ 2>/dev/null || echo "⚠️ /app/dist が見つかりません（これは正常です。vite.config.tsでoutDir: 'build'が設定されているため）"

# 本番環境用の軽量イメージ
FROM nginx:alpine

# ビルド成果物をコピー
# 重要: vite.config.tsでoutDir: 'build'が設定されているため、/app/buildを使用
# /app/distは使用しない（存在しないため、エラーになります）
COPY --from=builder /app/build /usr/share/nginx/html

# Nginxの設定ファイル
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]

