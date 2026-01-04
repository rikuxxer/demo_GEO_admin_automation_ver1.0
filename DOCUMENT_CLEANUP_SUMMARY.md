# ドキュメント整理サマリー

## 📊 統計

- **総ドキュメント数**: 約114ファイル
- **保持**: 約15ファイル
- **削除候補**: 約99ファイル
- **削減率**: 約87%

## ✅ 保持するドキュメント

### ルートディレクトリ（主要ドキュメント）
- `README.md` - メインドキュメント
- `DEPLOYMENT_GUIDE.md` - デプロイガイド
- `QUICKSTART.md` - クイックスタート
- `GOOGLE_SHEETS_SETUP.md` - Google Sheets設定
- `BIGQUERY_SETUP.md` - BigQuery設定
- `COST_ESTIMATION.md` - コスト見積もり
- `MULTI_API_KEY_STRATEGY.md` - APIキー戦略
- `VERTEX_AI_AGENT_IMPLEMENTATION.md` - Vertex AI実装
- `DOCUMENT_CLEANUP_PLAN.md` - ドキュメント整理計画（本ファイル）
- `DELETE_CANDIDATES.txt` - 削除候補リスト

### src/docs/ ディレクトリ
- すべて保持（システム仕様書、ER図、テーブル定義など）

### backend/README.md
- 保持

## 🗑️ 削除候補ファイル

詳細は `DELETE_CANDIDATES.txt` を参照してください。

### カテゴリ別

1. **BigQueryスキーマ関連**（約30ファイル）
   - 一時的なトラブルシューティングガイド
   - スキーマ更新ガイド
   - テーブル作成ガイド

2. **GitHub/デプロイ関連**（約15ファイル）
   - GitHub Secrets設定
   - デプロイ手順
   - プッシュ手順

3. **環境変数/設定関連**（約10ファイル）
   - 環境変数設定
   - サービスアカウント設定

4. **検証/デバッグ関連**（約20ファイル）
   - 検証スクリプト
   - デバッグガイド
   - テストガイド

5. **データ管理関連**（1ファイル）
   - `DATA_MANAGEMENT.md`（機能が削除されたため）

6. **スクリプトファイル**（約20ファイル）
   - 一時的なトラブルシューティングスクリプト

## 📝 まとめ提案

### 1. BigQueryトラブルシューティングガイド（新規作成推奨）
以下の内容を1つのドキュメントにまとめる：
- `BIGQUERY_TROUBLESHOOTING.md`（新規）
  - データセット作成の問題
  - テーブル作成の問題
  - スキーマ更新の問題
  - REST APIを使用した回避方法

### 2. デプロイトラブルシューティングガイド（新規作成推奨）
以下の内容を1つのドキュメントにまとめる：
- `DEPLOYMENT_TROUBLESHOOTING.md`（新規）
  - GitHub Secrets設定
  - 環境変数設定
  - ビルドエラー
  - デプロイエラー

## 🚀 次のステップ

1. **削除候補ファイルの確認**
   - `DELETE_CANDIDATES.txt` を参照
   - 各ファイルの内容を確認
   - 重要な情報があれば他のドキュメントに移行

2. **まとめドキュメントの作成**（オプション）
   - `BIGQUERY_TROUBLESHOOTING.md`
   - `DEPLOYMENT_TROUBLESHOOTING.md`

3. **削除実行**
   - 確認後、削除候補ファイルを削除

## ⚠️ 注意事項

- 削除前に必ず内容を確認してください
- 重要な情報は他のドキュメントに移行してください
- バックアップを取ってから削除してください

