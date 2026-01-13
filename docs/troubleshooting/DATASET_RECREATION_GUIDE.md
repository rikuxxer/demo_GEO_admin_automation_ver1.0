# データセットと全テーブル再作成ガイド

## 📊 現在の状態確認

まず、現在のデータセットとテーブルの状態を確認してください：

```bash
# 状態確認スクリプトを実行
chmod +x check_dataset_status.sh
./check_dataset_status.sh
```

または、手動で確認：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# データセットの存在確認
bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}"

# テーブル一覧
bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}"
```

---

## 🎯 2つの選択肢

### 選択肢1: テーブルのみ削除・再作成（推奨）

既存のデータセットは保持し、テーブルのみを削除・再作成します。

**メリット**:
- データセットの設定（ロケーション、説明など）を保持
- より安全

**実行方法**:
```bash
chmod +x recreate_all_tables.sh
./recreate_all_tables.sh
```

### 選択肢2: データセット全体を削除・再作成

データセット全体を削除して、完全にクリーンな状態から再作成します。

**メリット**:
- 完全にクリーンな状態
- データセットの設定もリセット

**実行方法**:
```bash
chmod +x recreate_dataset_and_tables.sh
./recreate_dataset_and_tables.sh
```

---

## 🚀 データセット全体を再作成する場合

### 実行手順

```bash
# スクリプトを実行
chmod +x recreate_dataset_and_tables.sh
./recreate_dataset_and_tables.sh
```

### 実行内容

1. **データセットを削除**: `universegeo_dataset`全体を削除
2. **データセットを作成**: 新しいデータセットを作成（ロケーション: asia-northeast1）
3. **全テーブルを作成**: 10個のテーブルをすべて作成

### 作成されるテーブル

1. projects
2. segments
3. pois
4. users
5. user_requests
6. messages
7. change_history
8. edit_requests
9. feature_requests
10. visit_measurement_groups

---

## ✅ 確認コマンド

実行後、データセットとテーブルが正しく作成されたか確認：

```bash
PROJECT_ID="univere-geo-demo"
DATASET_ID="universegeo_dataset"

# データセットの存在確認
bq ls -d --project_id="${PROJECT_ID}" "${DATASET_ID}"

# テーブル一覧（10個すべてが表示されるはず）
bq ls --project_id="${PROJECT_ID}" "${DATASET_ID}"

# 各テーブルのスキーマ確認
bq show --schema --format=prettyjson "${PROJECT_ID}:${DATASET_ID}.user_requests"
```

---

## ⚠️ 注意事項

1. **既存データの削除**: すべての既存データが削除されます
2. **リリース前のみ**: 本番環境では使用しないでください
3. **バックアップ**: 必要に応じて、実行前にデータをエクスポートしてください
4. **ロケーション**: データセットのロケーションは`asia-northeast1`に設定されます

---

## 📋 推奨手順

1. **現在の状態を確認**: `check_dataset_status.sh`を実行
2. **テーブルのみ再作成**: `recreate_all_tables.sh`を実行（推奨）
3. **または、データセット全体を再作成**: `recreate_dataset_and_tables.sh`を実行
4. **確認**: テーブル一覧とスキーマを確認
5. **テスト**: アプリケーションをテスト

---

## 🔍 トラブルシューティング

### エラー: "Dataset not found"

データセットが存在しない場合は、`recreate_dataset_and_tables.sh`を使用してデータセットも作成してください。

### エラー: "Permission denied"

BigQueryへの書き込み権限を確認してください。Cloud Shellで実行している場合、通常は権限があります。

### エラー: "Location mismatch"

データセットのロケーションが異なる場合は、既存のデータセットのロケーションを確認してください：

```bash
bq show --format=prettyjson "${PROJECT_ID}:${DATASET_ID}"
```

