# スプレッドシート掃き出し処理のテスト手順

## 📋 概要

スプレッドシートへの掃き出し処理を簡単にテストできるユーティリティを提供しています。

## 🚀 クイックスタート

### 1. 開発サーバーを起動

```bash
npm run dev
```

### 2. ブラウザの開発者ツールを開く

1. アプリケーションを開く（http://localhost:5173）
2. 開発者ツール（F12）を開く
3. **Console**タブを選択

### 3. テストを実行

コンソールで以下のコマンドを実行：

```javascript
// すべてのテストを実行
testSpreadsheetExport.runAll()

// または個別に実行
testSpreadsheetExport.convert()  // スプレッドシート行への変換テスト
testSpreadsheetExport.csv()       // CSVダウンロードテスト
testSpreadsheetExport.export()    // Google Sheetsへの出力テスト
testSpreadsheetExport.date()      // エクスポート予定日計算テスト
```

## 🧪 テスト項目

### 1. スプレッドシート行への変換テスト

POIデータをスプレッドシート行形式に変換する処理をテストします。

```javascript
testSpreadsheetExport.convert()
```

**確認事項:**
- ✅ 地点データが正しく変換される
- ✅ `category_id`が半径から正しく計算される（例: 500m → 99000500）
- ✅ 住所から都道府県・市区町村が正しく抽出される
- ✅ エクスポート予定日が正しく計算される

### 2. CSVダウンロードテスト

変換したデータをCSVファイルとしてダウンロードする処理をテストします。

```javascript
testSpreadsheetExport.csv()
```

**確認事項:**
- ✅ CSVファイルがダウンロードされる
- ✅ CSV形式が正しい（カンマ区切り、引用符で囲まれた文字列）
- ✅ ヘッダーが含まれている

### 3. Google Sheetsへの出力テスト

実際にGoogle Sheetsにデータを出力する処理をテストします。

```javascript
testSpreadsheetExport.export()
```

**確認事項:**
- ✅ Google Sheets APIへの接続が成功する
- ✅ データが正しく追加される
- ✅ エラー時はキューに保存される

**注意:**
- 開発環境ではモック動作（localStorageに保存）になります
- 本番環境では実際にGoogle Sheetsに出力されます

### 4. エクスポート予定日計算テスト

地点登録日時からエクスポート予定日（次の月・水・金）を計算する処理をテストします。

```javascript
testSpreadsheetExport.date()
```

**確認事項:**
- ✅ 月・水・金の場合は当日が返される（20:00まで）
- ✅ その他の曜日または20:00以降は次の月・水・金が返される
- ✅ 日付形式が正しい（YYYY-MM-DD）

## 📊 テストデータ

テストでは以下のサンプルデータが使用されます：

- **案件**: テスト広告主
- **セグメント**: テストセグメント
- **地点**: 3件
  - テスト地点1（東京駅、500m）
  - テスト地点2（新宿、300m）
  - テスト地点3（横浜みなとみらい、100m）

## 🔍 トラブルシューティング

### エラー: "testSpreadsheetExport is not defined"

**原因**: テストユーティリティが読み込まれていない

**対処法**:
1. 開発サーバーが起動しているか確認
2. 開発環境（`npm run dev`）で実行しているか確認
3. ブラウザを再読み込み（F5）

### CSVダウンロードが動作しない

**原因**: ブラウザのポップアップブロック

**対処法**:
1. ブラウザの設定でポップアップを許可
2. ダウンロードフォルダを確認

### Google Sheetsへの出力が失敗する

**原因**: 環境変数が設定されていない、またはAPIキーに問題がある

**対処法**:
1. `.env`ファイルに以下を設定：
   ```
   VITE_GOOGLE_APPS_SCRIPT_URL=your_script_url
   ```
2. 開発環境ではモック動作（localStorageに保存）が正常です
3. 本番環境では実際のGoogle Sheets API URLが必要です

## 📝 テストチェックリスト

- [ ] 開発サーバーが起動している
- [ ] ブラウザの開発者ツール（Console）を開いている
- [ ] `testSpreadsheetExport.convert()`を実行して変換が成功する
- [ ] `testSpreadsheetExport.csv()`を実行してCSVがダウンロードされる
- [ ] `testSpreadsheetExport.export()`を実行して出力が成功する（モックでも可）
- [ ] `testSpreadsheetExport.date()`を実行して日付計算が正しい
- [ ] 実際のPOIデータで動作確認

## 🎯 次のステップ

テストが成功したら：

1. **実際のデータでテスト**
   - プロジェクトを作成
   - セグメントと地点を登録
   - 格納依頼を実行してスプレッドシートに出力

2. **本番環境での確認**
   - 環境変数を設定
   - 実際のGoogle Sheetsに出力
   - データが正しく追加されることを確認

3. **エラーハンドリングの確認**
   - APIキーを無効にしてエラー処理を確認
   - ネットワークエラー時の動作を確認

## 📚 関連ドキュメント

- [スプレッドシート出力ロジック](./SPREADSHEET_EXPORT_LOGIC.md)
- [Google Sheets設定](../shared/GOOGLE_SHEETS_SETUP.md)
- [スプレッドシート出力テスト](./SPREADSHEET_EXPORT_TEST.md)
