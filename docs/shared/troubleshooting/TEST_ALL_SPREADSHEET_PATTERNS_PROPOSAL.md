# 全パターンスプレッドシートテストの対応方針（承認待ち）

**作成日:** 2026年2月7日  
**対象:** テスト2「テーブル蓄積付きエクスポート」が 500 になる原因の整理  
**ステータス:** 承認待ち（スキップは行わない）

---

## 何が未作成か

**未作成なのは BigQuery の次の 2 テーブルです。**

| テーブル名 | 説明 | データセット |
|------------|------|----------------|
| **`sheet_exports`** | スプレッドシートエクスポート履歴 | `universegeo_dataset` |
| **`sheet_export_data`** | エクスポートされた行データの詳細 | `universegeo_dataset` |

エラーメッセージの例:
```text
Not found: Table univere-geo-demo:universegeo_dataset.sheet_exports
```

- プロジェクト: `univere-geo-demo`（バックエンドが参照している GCP プロジェクト）
- データセット: `universegeo_dataset`
- 上記 2 テーブルがこのデータセットに存在しないため、テーブル蓄積付きエクスポート（`/api/sheets/export-with-accumulation`）が 500 を返しています。

---

## 対応方針（スキップなし）

- **テスト環境・本番環境のどちらでもスキップは行いません。**
- テストスクリプト: テーブル蓄積付きエクスポートは「テーブルが存在する前提」のテストのままにし、スキップ処理は追加しない。
- 本番環境: テーブル蓄積（`sheet_exports` / `sheet_export_data` への書き込み）をスキップする処理は入れない。テーブルが未作成の場合はエラーとし、事前に 2 テーブルを BigQuery に作成する運用とする。
- **未作成の 2 テーブルを BigQuery に作成する**ことで、テスト2 および本番のテーブル蓄積付きエクスポートが通るようにします。

---

## 作成手順（参照ドキュメント）

次のいずれかで 2 テーブルを作成してください。

1. **`docs/shared/troubleshooting/TABLE_CREATION_GUIDE.md`**  
   - スプレッドシートエクスポート用テーブル作成ガイド  
   - BigQuery コンソール用の CREATE 文が記載されています。

2. **`docs/shared/BIGQUERY_TABLE_DEFINITIONS.md`**  
   - 全テーブル定義のうち「11. sheet_exports」「12. sheet_export_data」の CREATE 文を参照。

作成するテーブル:
- `universegeo_dataset.sheet_exports`
- `universegeo_dataset.sheet_export_data`

※ データセット `universegeo_dataset` がまだない場合は、先にデータセットを作成してから上記テーブルを作成してください。

---

## 承認

- [ ] 上記「何が未作成か」と「スキップなし・テーブル作成で対応」の方針で問題ない（承認）
- [ ] 修正したい点がある（コメントで指示）

承認いただければ、他にドキュメントの追記が必要であれば対応します。  
テストスクリプト・本番バックエンドともに、テーブル蓄積のスキップ処理は追加しません。
