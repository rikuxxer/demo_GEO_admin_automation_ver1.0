# 登録まわりの問題の整理

「登録できない」と「再度登録できない」は別の現象です。どちらに当てはまるかで確認・対処が変わります。

---

## 1. 「再度登録できない」＝ 重複登録が拒否される（想定どおりの動作）

**意味**: 同じ ID（案件・セグメント・地点）で**2回目**の登録をしようとしたときにエラーになること。**仕様どおりの動作**です。

- **案件（project_id）**: 同じ project_id で POST → 既存実装で拒否（500 または 4xx）
- **セグメント（segment_id）**: 同じ segment_id で2回 POST → **409 Conflict** で拒否（バックエンドで重複チェックを追加済み）
- **地点（poi_id）**: 同じ poi_id で2回 POST → **409 Conflict** で拒否（同上）

**確認方法**: 重複登録テストを実行する。

```bash
node scripts/test-api-duplicate-registration.js https://本番バックエンドURL
```

成功時は「重複登録はいずれも正しく拒否されました。再度登録できないエラーは想定どおり動作しています。」と表示されます。  
詳細は [TESTING_GUIDE.md](./TESTING_GUIDE.md) の「再度登録できないテスト」を参照してください。

---

## 2. 「登録できない」＝ 初回登録が失敗する（不具合）

**意味**: **1回目**の登録（ユーザー登録申請・案件・セグメント・地点の新規作成）がエラーで失敗すること。こちらは**不具合**として対処します。

### 2.1 ユーザー登録申請ができない（POST /api/user-requests が 500）

**よくある原因**: BigQuery の `user_requests` テーブルに必須列が足りない。

- 不足しやすい列: `requested_at`, `reviewed_at`, `reviewed_by`, `review_comment`

**確認**:

1. ブラウザの DevTools → Network → `POST /api/user-requests` の Response を確認
2. レスポンスに `missingColumns` が含まれていれば、その列が BQ にない

**対処**:

- [QUICK_FIX_USER_REGISTRATION_500.md](./QUICK_FIX_USER_REGISTRATION_500.md) に従い、欠けている列を BigQuery スキーマに追加する
- [TROUBLESHOOT_USER_REGISTRATION_500.md](./TROUBLESHOOT_USER_REGISTRATION_500.md) で詳細なトラブルシュート
- [DEBUG_USER_REGISTRATION_ERROR.md](../../dev/troubleshooting/DEBUG_USER_REGISTRATION_ERROR.md) でデバッグ手順

### 2.2 セグメント登録ができない（POST /api/segments が 500）

**よくある原因**: パーティションキー `segment_registered_at` や必須フィールドが未設定で BigQuery 挿入に失敗する。

**対処**:

- バックエンドの `createSegment` で `segment_registered_at` などをデフォルト設定する修正が入っているか確認
- [SEGMENT_CREATE_500_ERROR.md](./SEGMENT_CREATE_500_ERROR.md) を参照

### 2.3 案件・地点の初回登録ができない

**確認**:

- バックエンドが起動しているか・本番ならデプロイ済みか
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) の「API 書き込みテスト」を実行:  
  `node scripts/test-api-write-endpoints.js https://本番バックエンドURL`
- Cloud Run のログで 500 の原因（BQ エラー・スキーマ不足など）を確認

### 2.4 API に接続できず登録できない（404・ネットワークエラー）

**確認**:

- フロントの `VITE_API_BASE_URL` が本番バックエンド URL を指しているか
- [PRODUCTION_API_CONNECTION_STATUS.md](./PRODUCTION_API_CONNECTION_STATUS.md) の「本番環境での確認」を実行

---

## まとめ

| 現象 | 意味 | 対処 |
|------|------|------|
| **再度登録できない** | 同じ ID で2回目を登録しようとして拒否される | 想定動作。重複テストで 409 になることを確認 |
| **登録できない**（初回） | 1回目の登録が 500 等で失敗する | 上記 2.1〜2.4 の該当ドキュメントで原因を特定し、スキーマ・API・ネットワークを修正 |
