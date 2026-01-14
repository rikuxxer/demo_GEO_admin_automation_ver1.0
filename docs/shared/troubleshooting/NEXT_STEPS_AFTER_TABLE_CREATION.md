# テーブル作成完了後の次のステップ

## ✅ テーブル作成の確認

すべてのテーブルが正しく作成されたか確認：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

echo "作成済みテーブル一覧:"
bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}" 2>&1 | tail -n +3

echo ""
echo "期待されるテーブル数: 10個"
echo "作成済みテーブル数: $(bq ls --project_id=\"${PROJECT_ID}\" \"${DATASET_ID}\" 2>&1 | tail -n +3 | wc -l)個"
```

または、確認スクリプトを実行：

```bash
bash verify_tables_created.sh
```

---

## 📋 期待されるテーブル一覧

以下の10個のテーブルが作成されている必要があります：

1. ✅ `projects` - プロジェクト情報
2. ✅ `segments` - セグメント情報
3. ✅ `pois` - POI（地点）情報
4. ✅ `users` - ユーザー情報
5. ✅ `user_requests` - ユーザー登録申請（**重要**）
6. ✅ `messages` - メッセージ
7. ✅ `change_history` - 変更履歴
8. ✅ `edit_requests` - 編集申請
9. ✅ `feature_requests` - 機能要望
10. ✅ `visit_measurement_groups` - 訪問測定グループ

---

## 🚀 次のステップ

### 1. ブラウザのキャッシュをクリア

ブラウザのキャッシュをクリアして、最新の状態でアプリケーションにアクセスしてください。

### 2. ユーザー登録申請を再試行

以前にエラーが発生していたユーザー登録申請を再試行してください。

**以前のエラー:**
```
Missing required fields: Msg_0_CLOUD_QUERY_TABLE.desired_role, Msg_0_CLOUD_QUERY_TABLE.request_id.
```

**解決済み:**
- `user_requests`テーブルに正しいスキーマ（`user_id`, `requested_role`など）が設定されました

### 3. エラーが解消されたか確認

ユーザー登録申請が正常に完了するか確認してください。

---

## 🔍 トラブルシューティング

### まだエラーが発生する場合

1. **ブラウザの開発者ツールでエラーを確認**
   - F12キーで開発者ツールを開く
   - Consoleタブでエラーメッセージを確認
   - NetworkタブでAPIリクエストのレスポンスを確認

2. **BigQueryでテーブルを直接確認**
   ```bash
   PROJECT_ID="univere-geo-demo"
   DATASET_ID="universegeo_dataset"
   
   # user_requestsテーブルのスキーマを確認
   bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests"
   ```

3. **バックエンドのログを確認**
   - Cloud Runのログを確認
   - エラーメッセージの詳細を確認

---

## 📊 テーブルスキーマの確認

各テーブルのスキーマが正しいか確認：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# user_requestsテーブルのスキーマを確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests"
```

**期待されるスキーマ（user_requests）:**
- `user_id` (STRING, REQUIRED)
- `name` (STRING, NULLABLE)
- `email` (STRING, NULLABLE)
- `password_hash` (STRING, NULLABLE)
- `requested_role` (STRING, NULLABLE)
- `department` (STRING, NULLABLE)
- `reason` (STRING, NULLABLE)
- `status` (STRING, NULLABLE)
- `requested_at` (TIMESTAMP, NULLABLE)
- `reviewed_at` (TIMESTAMP, NULLABLE)
- `reviewed_by` (STRING, NULLABLE)
- `review_comment` (STRING, NULLABLE)

---

## ✅ 完了チェックリスト

- [ ] すべてのテーブルが作成された（10個）
- [ ] `user_requests`テーブルのスキーマが正しい
- [ ] ブラウザのキャッシュをクリア
- [ ] ユーザー登録申請を再試行
- [ ] エラーが解消されたことを確認

---

## 💡 補足

テーブル作成が完了したら、アプリケーションは正常に動作するはずです。もし問題が発生した場合は、上記のトラブルシューティング手順を参照してください。

