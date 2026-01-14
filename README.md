# UNIVERSEGEO 案件管理システム

UNIVERSEGEO案件管理ツールは、位置情報データ（POI）と広告配信案件を管理するためのWebアプリケーションです。

## 📋 目次

- [機能](#機能)
- [技術スタック](#技術スタック)
- [ローカル開発](#ローカル開発)
- [デプロイ](#デプロイ)
- [ドキュメント](#ドキュメント)

---

## ✨ 機能

### 営業機能
- 📊 案件・セグメント・地点の登録・管理
- 🗺️ 地図表示による地点の可視化
- 📤 Excel一括登録（案件・セグメント・地点）
- 📋 Google Sheetsへの自動出力
- 💬 チャットボットによる操作サポート
- 💡 機能リクエストの送信

### 管理部門機能
- ✅ 編集リクエストの承認・却下
- 📈 案件ステータスの管理
- 👥 ユーザー管理
- 🔐 ユーザー登録申請の承認
- 📋 地点データのエクスポート

---

## 🛠️ 技術スタック

- **フロントエンド**: React 18 + TypeScript + Vite
- **UIライブラリ**: Radix UI + Tailwind CSS
- **地図**: Leaflet.js（Google Maps API対応、APIキー設定で切り替え可能）
- **Excel処理**: ExcelJS, XLSX
- **外部API**: Google Sheets API, Google Maps API
- **デプロイ**: Cloud Run (推奨), Netlify, Vercel

---

## 💻 ローカル開発

### 前提条件

- Node.js 18以上
- npm または yarn

### セットアップ

```bash
# 依存関係をインストール
npm install

# 環境変数を設定
cp env.example .env
# .envファイルを編集してAPIキーを設定
# - VITE_API_BASE_URL: バックエンドAPI URL
# - VITE_GOOGLE_MAPS_API_KEY: Google Maps APIキー（オプション、ポリゴン選択機能で使用）
# - VITE_API_BASE_URL: バックエンドAPI URL
# - VITE_GOOGLE_MAPS_API_KEY: Google Maps APIキー（オプション、ポリゴン選択機能で使用）

# 開発サーバーを起動
npm run dev
```

開発サーバーが起動すると、 http://localhost:5173 でアクセスできます。

### デモアカウント

```
管理者:
Email: admin@example.com
Password: demo123

営業A:
Email: salesA@example.com
Password: demo123

営業B:
Email: salesB@example.com
Password: demo123
```

---

## 🚀 デプロイ

### クイックスタート

```powershell
# Windows
.\deploy.ps1

# Mac/Linux
chmod +x deploy.sh
./deploy.sh
```

### 詳細な手順

- **5分でデプロイ**: [QUICKSTART.md](./docs/shared/QUICKSTART.md)
- **詳細なガイド**: [DEPLOYMENT_GUIDE.md](./docs/shared/DEPLOYMENT_GUIDE.md)
- **Google Sheets設定**: [GOOGLE_SHEETS_SETUP.md](./docs/shared/GOOGLE_SHEETS_SETUP.md)

### 対応プラットフォーム

- ✅ **Cloud Run**（推奨） - 自動スケーリング、従量課金
- ✅ **Netlify** - 無料枠あり、簡単デプロイ
- ✅ **Vercel** - 無料枠あり、高速
- ✅ **Firebase Hosting** - Firebaseエコシステム

---

## 📚 ドキュメント

### 主要ドキュメント

| ドキュメント | 説明 |
|------------|------|
| [QUICKSTART.md](./docs/shared/QUICKSTART.md) | 5ステップでデプロイ |
| [DEPLOYMENT_GUIDE.md](./docs/shared/DEPLOYMENT_GUIDE.md) | 詳細なデプロイ手順 |
| [GOOGLE_SHEETS_SETUP.md](./docs/shared/GOOGLE_SHEETS_SETUP.md) | Google Sheets API設定 |
| [BIGQUERY_SETUP.md](./docs/shared/BIGQUERY_SETUP.md) | BigQuery接続設定 |
| [COST_ESTIMATION.md](./docs/shared/COST_ESTIMATION.md) | コスト見積もり |
| [MULTI_API_KEY_STRATEGY.md](./docs/shared/MULTI_API_KEY_STRATEGY.md) | APIキー戦略 |
| [VERTEX_AI_AGENT_IMPLEMENTATION.md](./docs/shared/VERTEX_AI_AGENT_IMPLEMENTATION.md) | Vertex AI実装 |
| [env.example](./env.example) | 環境変数テンプレート |

### システム仕様書

システム仕様書は [`src/docs/`](./src/docs/) ディレクトリにあります。

### 環境別ドキュメント

ドキュメントは環境ごとに整理されています：

- **開発環境**: [`docs/dev/`](./docs/dev/) - 開発環境のセットアップ、デプロイ、トラブルシューティング
- **本番環境**: [`docs/prod/`](./docs/prod/) - 本番環境のセットアップ、デプロイ、トラブルシューティング
- **共通**: [`docs/shared/`](./docs/shared/) - 開発・本番で共通のドキュメント

---

## 🔒 セキュリティ

### 重要事項

⚠️ **`.env`ファイルをGitHubにpushしないでください**

- `.env`は`.gitignore`で除外されています
- 環境変数はデプロイ先のプラットフォームで設定します
- `env.example`がテンプレートとして提供されています

### APIキーの管理

1. Google Cloud ConsoleでAPIキーを制限
2. 許可するリファラーを設定
3. 定期的にキーをローテーション

---

## 🤝 貢献

プロジェクトへの貢献を歓迎します！

1. このリポジトリをフォーク
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

---

## 📝 ライセンス

このプロジェクトはプライベートリポジトリです。

---

## 📞 サポート

- **バグ報告**: GitHub Issues
- **機能リクエスト**: アプリ内の機能リクエスト機能を使用
- **その他**: プロジェクト管理者にお問い合わせください

---

## 🎨 デザイン

オリジナルデザイン: [Figma](https://www.figma.com/design/XOfty1EThZvsw3PsuBMZVE/)

---

**Made with ❤️ for UNIVERSEGEO**
