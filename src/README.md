# UNIVERSEGEO

案件管理SaaSプロダクト - React + Tailwind CSS + Cloud Run

## 🚀 クイックスタート

### 開発環境

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev

# ブラウザで開く
# http://localhost:3000
```

### 本番ビルド

```bash
# ビルド
npm run build

# プレビュー
npm run preview
```

### Dockerで実行

```bash
# Dockerイメージのビルド
npm run docker:build

# コンテナの起動
npm run docker:run

# ブラウザで確認
# http://localhost:8080
```

## 📦 技術スタック

- **Frontend**: React 18.3 + TypeScript
- **Styling**: Tailwind CSS 4.0
- **Build**: Vite 5.2
- **UI Components**: Radix UI + shadcn/ui
- **Icons**: Lucide React
- **Charts**: Recharts
- **Forms**: React Hook Form
- **Deployment**: Google Cloud Run
- **CI/CD**: GitHub Actions

## 🏗️ プロジェクト構造

```
universegeo/
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions デプロイワークフロー
├── components/                 # Reactコンポーネント
│   ├── ui/                     # shadcn/ui コンポーネント
│   ├── AdminDashboard.tsx
│   ├── BulkImport.tsx
│   ├── Header.tsx
│   ├── Login.tsx
│   ├── ProjectDetail.tsx
│   ├── ProjectForm.tsx
│   ├── ProjectTable.tsx
│   ├── SalesPerformance.tsx
│   ├── Sidebar.tsx
│   └── ...
├── contexts/                   # React Context
│   └── AuthContext.tsx
├── styles/                     # スタイル
│   └── globals.css
├── types/                      # TypeScript型定義
│   └── schema.ts
├── utils/                      # ユーティリティ関数
│   ├── bigquery.ts
│   ├── editRequest.ts
│   ├── projectStatus.ts
│   └── ...
├── App.tsx                     # メインアプリケーション
├── main.tsx                    # エントリーポイント
├── index.html                  # HTMLテンプレート
├── vite.config.ts              # Vite設定
├── package.json                # 依存関係
├── nginx.conf                  # Nginx設定（本番環境用）
├── Dockerfile                  # Dockerイメージビルド設定
└── DEPLOY_GUIDE.md            # デプロイガイド

```

## 🎨 主な機能

### ✅ 実装済み機能

- **認証・権限管理**
  - ロールベースアクセス制御（管理者・営業）
  - 営業担当者の案件閲覧権限制御

- **案件管理**
  - 案件の登録・編集・削除
  - 案件詳細画面（3タブ構成）
  - 案件ステータス管理
  - 修正依頼・承認フロー

- **セグメント管理**
  - セグメントの作成・編集
  - セグメントステータス管理
  - 期間、属性、検知条件の設定

- **地点管理**
  - 3つの登録方法
    - 任意地点指定
    - 都道府県・市区町村指定
    - PKG指定
  - CSV一括登録
  - Geocoding API連携

- **Excel一括登録**
  - 案件・セグメント・地点の一括登録
  - テンプレートダウンロード

- **営業担当者集計**
  - 担当者ごとの案件集計
  - パフォーマンスグラフ表示

- **配信媒体管理**
  - UNIVERSE、TVer(SP)、TVer(CTV)
  - TVer(CTV)の排他制御

## 🚀 Cloud Run デプロイ

詳細な手順は [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) を参照してください。

### 簡易手順

1. **Dockerfileの準備**
   ```bash
   rm -rf Dockerfile
   mv Dockerfile.txt Dockerfile
   ```

2. **GitHubシークレットの設定**
   - `GCP_PROJECT_ID`: GCPプロジェクトID
   - `GCP_SA_KEY`: サービスアカウントキー（JSON）

3. **プッシュしてデプロイ**
   ```bash
   git add .
   git commit -m "feat: deploy to Cloud Run"
   git push origin main
   ```

## 🔑 環境変数

本番環境では以下の環境変数を設定できます：

```bash
NODE_ENV=production
```

## 📝 開発ガイド

### コーディング規約

- TypeScriptを使用
- コンポーネントは関数コンポーネントで記述
- Tailwind CSSでスタイリング（ユーティリティクラス使用）
- 型定義は `types/schema.ts` に集約

### ブランチ戦略

- `main`: 本番環境（自動デプロイ）
- `develop`: 開発環境
- `feature/*`: 機能開発
- `fix/*`: バグ修正

## 🐛 トラブルシューティング

### ビルドエラー

```bash
# キャッシュをクリア
npm run clean
rm -rf node_modules
npm install
npm run build
```

### Dockerエラー

```bash
# Dockerイメージを削除して再ビルド
docker rmi universegeo:latest
npm run docker:build
```

### デプロイエラー

- GitHub Actionsのログを確認
- GCPのCloud Runログを確認

```bash
gcloud run services logs tail universegeo --region asia-northeast1
```

## 📊 パフォーマンス

- **ビルドサイズ**: 約1.5MB (gzip圧縮後)
- **初期ロード**: < 2秒
- **Lighthouse スコア**: 90+

## 🔒 セキュリティ

- HTTPSのみ（Cloud Runで自動設定）
- セキュリティヘッダー設定済み（nginx.conf）
- 認証・認可機能実装済み
- XSS/CSRF対策

## 📄 ライセンス

Proprietary - UNIVERSEGEO

## 👥 開発者

UNIVERSEGEO開発チーム

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesで報告してください。

---

**Built with ❤️ using React + Tailwind CSS + Cloud Run**
