# 未分類ファイル一覧

## 📋 確認結果

### 1. 空のディレクトリ（削除対象）

- `docs/troubleshooting/` - 空のディレクトリ（すべてのファイルが移動済み）

### 2. ルートのデプロイスクリプト（移動候補）

以下のファイルは環境別に分けるか、`scripts/`ディレクトリに移動すべき：

- `deploy.ps1` - Windows用デプロイスクリプト（環境別に分けるか、`scripts/`に移動）
- `deploy.sh` - Linux/Mac用デプロイスクリプト（環境別に分けるか、`scripts/`に移動）

**推奨**: GitHub Actionsを使用しているため、これらのスクリプトは不要の可能性が高い。削除または`scripts/`に移動。

### 3. docs直下のファイル（移動候補）

- `docs/BIGQUERY_TABLE_DEFINITIONS.md` - BigQueryテーブル定義書（`docs/shared/`に移動すべき）
- `docs/CLEANUP_CANDIDATES.md` - 削除候補リスト（作業完了後は削除すべき）

### 4. 保持すべきファイル（主要ドキュメント）

以下のファイルはルートディレクトリに保持すべき（READMEで参照されている）：

- `BIGQUERY_SETUP.md` - BigQueryセットアップガイド（READMEで参照）
- `COST_ESTIMATION.md` - コスト見積もり
- `DEPLOYMENT_GUIDE.md` - デプロイガイド
- `GOOGLE_SHEETS_SETUP.md` - Google Sheets設定
- `MULTI_API_KEY_STRATEGY.md` - APIキー戦略
- `QUICKSTART.md` - クイックスタートガイド
- `VERTEX_AI_AGENT_IMPLEMENTATION.md` - Vertex AI実装

### 5. docs/README.mdの更新

`docs/README.md`は古い情報を含んでいるため、更新が必要。
