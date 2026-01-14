# ドキュメント整理完了サマリー

## ✅ 整理完了日

2025年1月

## 📁 最終的なディレクトリ構造

```
プロジェクトルート/
├── README.md                    # メインドキュメント（ルートに保持）
├── docs/
│   ├── README.md               # ドキュメントディレクトリの説明
│   ├── dev/                    # 開発環境用ドキュメント
│   │   ├── README.md
│   │   ├── SETUP.md
│   │   ├── DEPLOYMENT.md
│   │   └── troubleshooting/   # 開発環境のトラブルシューティング（15ファイル）
│   ├── prod/                   # 本番環境用ドキュメント
│   │   ├── README.md
│   │   ├── SETUP.md
│   │   ├── DEPLOYMENT.md
│   │   └── troubleshooting/   # 本番環境のトラブルシューティング（31ファイル）
│   ├── shared/                 # 共通ドキュメント
│   │   ├── README.md
│   │   ├── QUICKSTART.md
│   │   ├── DEPLOYMENT_GUIDE.md
│   │   ├── GOOGLE_SHEETS_SETUP.md
│   │   ├── BIGQUERY_SETUP.md
│   │   ├── COST_ESTIMATION.md
│   │   ├── MULTI_API_KEY_STRATEGY.md
│   │   ├── VERTEX_AI_AGENT_IMPLEMENTATION.md
│   │   ├── BIGQUERY_TABLE_DEFINITIONS.md
│   │   └── troubleshooting/   # 共通のトラブルシューティング（67ファイル）
│   └── scripts/                # BigQueryスクリプト（28ファイル）
├── scripts/                    # ビルド・デプロイスクリプト
│   ├── build-dev.sh
│   ├── build-prod.sh
│   ├── deploy.ps1
│   ├── deploy.sh
│   └── clear-dummy-data.js
└── config/                     # 環境別設定ファイル
    ├── dev/
    └── prod/
```

## 📊 整理結果

### 削除されたファイル

- 一時的なテストファイル（test-*.ps1, test-*.sh, test-*.html）
- 整理計画書（DOCUMENT_ORGANIZATION.md, MOVE_PLAN.md等）
- 重複・統合済みドキュメント（MANUAL_DEPLOY_INSTRUCTIONS.md等）
- 空のディレクトリ（docs/troubleshooting/）

### 移動されたファイル

- ルートの主要ドキュメント → `docs/shared/`
- デプロイスクリプト → `scripts/`
- 環境別ドキュメント → `docs/dev/`, `docs/prod/`
- 共通ドキュメント → `docs/shared/`

### 分類されたファイル数

- **開発環境**: 15ファイル（troubleshooting）
- **本番環境**: 31ファイル（troubleshooting）
- **共通**: 76ファイル（主要ドキュメント + troubleshooting）
- **スクリプト**: 28ファイル（BigQueryスクリプト）

## ✅ 整理の原則

1. **環境別分離**: 開発環境と本番環境のドキュメントを明確に分離
2. **共通化**: 両環境で使用するドキュメントは`docs/shared/`に配置
3. **階層化**: トラブルシューティングは各環境の`troubleshooting/`サブディレクトリに配置
4. **スクリプト分離**: BigQueryスクリプトは`docs/scripts/`、ビルド・デプロイスクリプトは`scripts/`に配置

## 📝 今後のメンテナンス

- 新しいドキュメントは適切な環境ディレクトリに配置
- 一時的なドキュメントは定期的に整理
- README.mdの参照を最新の状態に保つ
