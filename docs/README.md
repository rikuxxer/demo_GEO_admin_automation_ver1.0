# ドキュメントディレクトリ

このディレクトリには、プロジェクトのドキュメントが環境ごとに整理されています。

## ディレクトリ構造

```
docs/
├── README.md (このファイル)
├── dev/              # 開発環境用ドキュメント
│   ├── README.md
│   ├── SETUP.md
│   ├── DEPLOYMENT.md
│   └── troubleshooting/
├── prod/             # 本番環境用ドキュメント
│   ├── README.md
│   ├── SETUP.md
│   ├── DEPLOYMENT.md
│   └── troubleshooting/
├── shared/           # 共通ドキュメント
│   ├── README.md
│   ├── BIGQUERY_TABLE_DEFINITIONS.md
│   └── troubleshooting/
├── security/        # セキュリティ部門向けドキュメント
│   ├── README.md
│   └── AUTHORIZATION_SPECIFICATION.md
└── scripts/          # BigQueryスクリプト
```

## 主要ドキュメント

主要なドキュメントは [`docs/shared/`](./shared/) ディレクトリに配置されています：

- [`QUICKSTART.md`](./shared/QUICKSTART.md) - クイックスタートガイド
- [`DEPLOYMENT_GUIDE.md`](./shared/DEPLOYMENT_GUIDE.md) - デプロイガイド
- [`GOOGLE_SHEETS_SETUP.md`](./shared/GOOGLE_SHEETS_SETUP.md) - Google Sheets設定
- [`BIGQUERY_SETUP.md`](./shared/BIGQUERY_SETUP.md) - BigQuery設定
- [`COST_ESTIMATION.md`](./shared/COST_ESTIMATION.md) - コスト見積もり
- [`MULTI_API_KEY_STRATEGY.md`](./shared/MULTI_API_KEY_STRATEGY.md) - APIキー戦略
- [`VERTEX_AI_AGENT_IMPLEMENTATION.md`](./shared/VERTEX_AI_AGENT_IMPLEMENTATION.md) - Vertex AI実装
- [`BIGQUERY_TABLE_DEFINITIONS.md`](./shared/BIGQUERY_TABLE_DEFINITIONS.md) - BigQueryテーブル定義書

セキュリティ関連のドキュメントは [`docs/security/`](./security/) ディレクトリに配置されています：

- [`AUTHORIZATION_SPECIFICATION.md`](./security/AUTHORIZATION_SPECIFICATION.md) - 権限管理仕様書（セキュリティ部門向け）

メインドキュメントはプロジェクトルートの [`README.md`](../README.md) を参照してください。

## 環境別ドキュメント

### dev/ - 開発環境

開発環境のセットアップ、デプロイ、トラブルシューティングガイド。

### prod/ - 本番環境

本番環境のセットアップ、デプロイ、トラブルシューティングガイド。

### shared/ - 共通ドキュメント

開発環境と本番環境で共通して使用するドキュメント：
- BigQueryテーブル定義書
- 共通のトラブルシューティングガイド

### security/ - セキュリティドキュメント

セキュリティ部門向けの技術文書：
- 権限管理仕様書
- 認証・認可の詳細仕様
- セキュリティ対策とリスク評価

### scripts/ - BigQueryスクリプト

BigQueryテーブル作成、更新、検証用のSQLスクリプトとシェルスクリプト。

## 注意事項

- 環境別のドキュメントはそれぞれのディレクトリを参照してください
- 最新の情報はルートディレクトリのドキュメントを参照してください

