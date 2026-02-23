---
description: CI/CD ワークフローの変更時に適用
globs: .github/workflows/**/*.yml
---

# CI/CD ルール

## デプロイ先

- フロントエンド: Firebase Hosting / Cloud Run
- バックエンド: Google Cloud Run

## 環境

- 開発: `config/dev/`
- 本番: `config/prod/`

## シークレット

- GitHub Secrets / Environment Secrets で管理
- ワークフローファイルにシークレット値を直書きしない
