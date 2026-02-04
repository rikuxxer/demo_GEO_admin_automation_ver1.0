# POST /api/segments 500 エラーの分析と対処

## 発生するエラー

- **フロント**: `セグメントの作成に失敗しました`（Uncaught (in promise) Error）
- **ネットワーク**: `POST https://...run.app/api/segments 500 (Internal Server Error)`

## 1. ブラウザ側の「message channel closed」について

```
A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received
```

- **原因**: ブラウザ拡張機能（例: 広告ブロック・セキュリティ系）のメッセージ処理によるものです。`frame_ant.js` など拡張由来のスクリプトで出ることがあります。
- **対処**: アプリの不具合ではないため無視して問題ありません。必要なら拡張を無効化して再試行してください。

## 2. 500 エラーの原因（バックエンド）

`POST /api/segments` が 500 を返す場合、バックエンドの `createSegment` 内で BigQuery 挿入時に例外が発生しています。

想定される原因:

| 原因 | 内容 |
|------|------|
| **パーティションキー不足** | `segments` は `PARTITION BY DATE(segment_registered_at)` のため、`segment_registered_at` が必須。未送信だと挿入失敗することがある。 |
| **必須カラム不足** | 本番の BigQuery テーブルに `location_request_status` や `data_link_status` などが NOT NULL で存在する場合、未送信だとエラーになる。 |
| **テーブル未作成** | 本番データセットに `segments` テーブルが存在しない。 |
| **権限・クォータ** | BigQuery の権限不足やクォータ超過。 |

## 3. コード側の対応（実施済み）

バックエンド `backend/src/bigquery-client.ts` の `createSegment` で以下を実施しています。

- **segment_registered_at**: リクエストに無くても必ず現在時刻をセットする（パーティションキー欠落を防ぐ）。
- **location_request_status**: 未送信時は `'not_requested'` をセット。
- **data_link_status**: 未送信時は `'before_request'` をセット。
- **data_link_request_date / data_link_scheduled_date**: フロントから送られていれば許可フィールドとして BigQuery に渡す。

これで多くの環境では 500 が解消されます。まだ 500 が出る場合は本番の BigQuery スキーマとログの突き合わせが必要です。

## 4. 本番で 500 が続く場合の確認手順

1. **Cloud Run のログを確認**
   - GCP コンソール → Cloud Run → 該当サービス → 「ログ」
   - `[BQ insert segments]` や `Error creating segment` で検索し、BigQuery のエラーメッセージ・`errors[].reason` / `errors[].location` を確認する。

2. **本番の segments テーブル定義を確認**
   - BigQuery コンソールで `universegeo_dataset.segments` のスキーマを開く。
   - NOT NULL のカラムに、バックエンドが必ず値を入れているか（または許容されているか）を確認する。

3. **テーブル存在確認**
   - 本番プロジェクトのデータセットに `segments` テーブルが存在するか確認する。無い場合は `docs/shared/BIGQUERY_TABLE_DEFINITIONS.md` の CREATE 文で作成する。

## 5. DELETE /api/segments が 500 になる場合

セグメント**作成**は 201 で成功するが、**削除**で 500 になることがあります。

- **想定原因**: BigQuery でストリーミング挿入を使っている場合、ストリーミングバッファが残っている間は DML（DELETE）が実行できずエラーになることがあります。時間経過後に再試行すると成功することがあります。
- **その他**: `pois` テーブルの `segment_id` カラムの有無、権限、テーブルが存在するかも確認してください。
- **テスト**: `node scripts/test-api-write-endpoints.js <URL>` で「作成はOKだが削除が失敗」と出た場合は上記を確認し、Cloud Run ログで BigQuery のエラー内容を確認してください。

---

## 6. 参照

- テーブル定義: [BIGQUERY_TABLE_DEFINITIONS.md](../BIGQUERY_TABLE_DEFINITIONS.md)
- 本番API接続: [PRODUCTION_API_CONNECTION_STATUS.md](./PRODUCTION_API_CONNECTION_STATUS.md)
