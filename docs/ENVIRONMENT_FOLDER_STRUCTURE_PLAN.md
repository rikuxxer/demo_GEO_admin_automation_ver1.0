# 開発環境と本番環境のフォルダ分け計画

## 📋 概要

開発環境と本番環境のコードとドキュメントを物理的に分離するための構造を提案します。

## 🗂️ 提案するフォルダ構造

```
UNIVERSEGEO_backup/
├── environments/
│   ├── dev/
│   │   ├── frontend/
│   │   │   ├── src/          # 開発環境専用のコード
│   │   │   ├── package.json
│   │   │   ├── vite.config.ts
│   │   │   └── .env.example
│   │   ├── backend/
│   │   │   ├── src/
│   │   │   ├── package.json
│   │   │   └── .env.example
│   │   └── config/
│   │       ├── bigquery-dev.json
│   │       └── deployment-dev.yml
│   └── prod/
│       ├── frontend/
│       │   ├── src/
│       │   ├── package.json
│       │   ├── vite.config.ts
│       │   └── .env.example
│       ├── backend/
│       │   ├── src/
│       │   ├── package.json
│       │   └── .env.example
│       └── config/
│           ├── bigquery-prod.json
│           └── deployment-prod.yml
├── shared/                    # 共通コード
│   ├── types/
│   ├── utils/
│   └── components/
├── docs/
│   ├── dev/                   # 開発環境用ドキュメント
│   │   ├── README.md
│   │   ├── SETUP.md
│   │   ├── DEPLOYMENT.md
│   │   └── TROUBLESHOOTING/
│   ├── prod/                  # 本番環境用ドキュメント
│   │   ├── README.md
│   │   ├── SETUP.md
│   │   ├── DEPLOYMENT.md
│   │   └── TROUBLESHOOTING/
│   └── shared/                # 共通ドキュメント
│       ├── API.md
│       └── ARCHITECTURE.md
└── scripts/
    ├── setup-dev.sh
    ├── setup-prod.sh
    └── sync-shared.sh
```

## 🔄 代替案: シンボリックリンク方式

共通コードを`shared/`に配置し、各環境からシンボリックリンクで参照する方式：

```
UNIVERSEGEO_backup/
├── shared/
│   ├── src/
│   │   ├── types/
│   │   ├── utils/
│   │   └── components/
│   └── backend/
│       └── src/
├── environments/
│   ├── dev/
│   │   ├── frontend/
│   │   │   ├── src -> ../../shared/src
│   │   │   └── vite.config.dev.ts
│   │   └── backend/
│   │       ├── src -> ../../shared/backend/src
│   │       └── index.dev.ts
│   └── prod/
│       ├── frontend/
│       │   ├── src -> ../../shared/src
│       │   └── vite.config.prod.ts
│       └── backend/
│           ├── src -> ../../shared/backend/src
│           └── index.prod.ts
```

## 📝 推奨案: 環境変数 + 設定ファイル方式（現状維持 + 改善）

現在の構造を維持しつつ、環境ごとの設定ファイルを分離：

```
UNIVERSEGEO_backup/
├── src/                       # 共通コード（現状維持）
├── backend/
│   └── src/                   # 共通コード（現状維持）
├── config/
│   ├── dev/
│   │   ├── .env.example
│   │   ├── vite.config.dev.ts
│   │   └── bigquery.config.dev.ts
│   └── prod/
│       ├── .env.example
│       ├── vite.config.prod.ts
│       └── bigquery.config.prod.ts
├── docs/
│   ├── dev/
│   │   ├── README.md
│   │   ├── SETUP.md
│   │   └── DEPLOYMENT.md
│   ├── prod/
│   │   ├── README.md
│   │   ├── SETUP.md
│   │   └── DEPLOYMENT.md
│   └── shared/                # 共通ドキュメント
└── .github/
    └── workflows/
        ├── deploy-dev.yml
        └── deploy-prod.yml
```

## 🎯 実装ステップ

### ステップ1: ドキュメントの分離（簡単）

1. `docs/dev/` と `docs/prod/` フォルダを作成
2. 既存のドキュメントを環境ごとに分類・移動
3. 共通ドキュメントは `docs/shared/` に配置

### ステップ2: 設定ファイルの分離

1. `config/dev/` と `config/prod/` フォルダを作成
2. 環境変数ファイル（`.env.example`）を環境ごとに分離
3. ビルド設定ファイルを環境ごとに分離

### ステップ3: コードの分離（オプション）

- 環境固有のコードがある場合のみ分離
- 大部分は共通コードとして維持

## ⚠️ 注意事項

1. **Git管理**: 環境ごとの設定ファイルは適切に`.gitignore`を設定
2. **依存関係**: 各環境で同じ依存関係を維持
3. **ビルドプロセス**: 環境ごとのビルドスクリプトを用意
4. **デプロイ**: GitHub Actionsのワークフローを環境ごとに分離

## 📊 比較表

| 方式 | メリット | デメリット | 推奨度 |
|------|---------|-----------|--------|
| **完全分離** | 環境間の混同がない | コード重複、メンテナンス困難 | ⭐⭐ |
| **シンボリックリンク** | コード重複なし | Windows互換性の問題 | ⭐⭐⭐ |
| **設定ファイル分離** | 現状維持、実装容易 | コードは共通 | ⭐⭐⭐⭐⭐ |

## 🚀 推奨実装

**設定ファイル分離方式**を推奨します。理由：
- 現在のコード構造を維持できる
- 環境ごとの設定のみを分離できる
- 実装が簡単で、リスクが低い
- メンテナンスが容易
