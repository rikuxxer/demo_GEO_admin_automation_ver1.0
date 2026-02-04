# DB（BigQuery）書き込み処理の状態

**目的**: プロジェクト・セグメント・地点（POI）・メッセージ・ユーザー等、各テーブルの **作成（INSERT）・更新（UPDATE）・削除（DELETE）** が本番で問題ないかを整理した一覧です。

---

## 1. パーティションキー・必須項目の扱い

BigQuery のパーティションキーが未設定だと INSERT が失敗することがあります。バックエンドで以下のようにしています。

| テーブル | パーティションキー | バックエンドでの設定 |
|----------|-------------------|------------------------|
| **projects** | `_register_datetime` | ✅ 未送信時は `now` をセット（`createProject`） |
| **segments** | `segment_registered_at` | ✅ 未送信時は `now` をセット（`createSegment`・修正済み） |
| **pois** | `created_at` | ✅ 未送信時は `now` をセット（`createPoi`） |
| **messages** | `timestamp` | ✅ 未送信時は `new Date()` をセット（`insertMessage`） |
| **users** | （なし） | - |
| **edit_requests** | （なし） | - |
| **visit_measurement_groups** | （なし） | - |
| **feature_requests** | （なし） | - |
| **change_history** | （なし） | - |
| **sheet_exports** | `exported_at` | エクスポート処理で設定 |

---

## 2. 削除（DELETE）で 500 になりうるテーブル

次のテーブルは **DELETE FROM** で削除しています。  
**ストリーミング挿入直後**は BigQuery の制約で DELETE が実行できず 500 になることがあります（バッファが消えるまで最大約 90 分）。

| テーブル | 削除メソッド | 備考 |
|----------|--------------|------|
| **segments** | `deleteSegment` | 先に `pois` を segment_id で削除してから segments を削除。本番で削除 500 の報告あり。 |
| **pois** | `deletePoi` | 同上の制約の影響あり。削除後に `updateSegment`（poi_type クリア）あり。 |
| **projects** | `deleteProject` | 同上の制約の影響あり。 |

**対処**: 削除が 500 の場合は時間をおいて再試行するか、Cloud Run ログで BigQuery のエラー内容を確認してください。

---

## 3. 作成（INSERT）で注意したい点

| リソース | 状態 | 備考 |
|----------|------|------|
| **projects** | ✅ パーティション・必須を設定 | `_register_datetime` を必ずセット |
| **segments** | ✅ 修正済み | `segment_registered_at`・`location_request_status`・`data_link_status` を必須/デフォルトで設定 |
| **pois** | ✅ 必須・タイムスタンプを設定 | 同一セグメント内の poi_type チェックあり。挿入後に `updateSegment(poi_type)` を呼ぶため、その失敗で 500 になる可能性あり。 |
| **messages** | ✅ デフォルトあり | `timestamp`・`is_read` を未送信時もセット |
| **users** | ✅ 挿入処理あり | user_requests 承認時など |
| **edit_requests** | ✅ 挿入処理あり | - |
| **visit_measurement_groups** | ✅ 挿入処理あり | - |
| **feature_requests** | ✅ 挿入処理あり | - |
| **change_history** | ✅ 挿入処理あり | 書き込みテストで 201 確認済み |

---

## 4. 地点（POI）まわりの依存

- **createPoi** 成功後、`segment_id` がある場合に **updateSegment(segment_id, { poi_type })** を実行しています。  
  この UPDATE が失敗すると 500 になります（セグメント側のストリーミングバッファや権限の可能性）。
- **deletePoi** 成功後、当該セグメントに POI が 0 件なら **updateSegment(segId, { poi_type: null })** を実行しています。同様にここで失敗する可能性があります。

---

## 5. 動作確認のためのテスト

- **GET のみ**: `node scripts/test-api-endpoints.js <URL>` … 接続・一覧取得の確認。
- **POST（作成・削除）**: `node scripts/test-api-write-endpoints.js <URL>` で次を検証:
  - セグメント作成 → 削除（削除 500 時はテスト失敗）
  - **地点（POI）作成 → 削除**（同上）
  - 変更履歴登録
- **手動**: 本番フロントから「案件 → セグメント → 地点」の作成・編集・削除を実行し、エラーが出ないか確認。

---

## 6. 参照

- テーブル定義: [BIGQUERY_TABLE_DEFINITIONS.md](../BIGQUERY_TABLE_DEFINITIONS.md)
- セグメント作成・削除 500: [SEGMENT_CREATE_500_ERROR.md](./SEGMENT_CREATE_500_ERROR.md)
- 本番API接続: [PRODUCTION_API_CONNECTION_STATUS.md](./PRODUCTION_API_CONNECTION_STATUS.md)
