# Google Sheets API 連携セットアップガイド

地点格納依頼時にスプレッドシートへ自動出力する機能のセットアップ手順です。

## 1. Google Cloud Project の作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成（または既存のプロジェクトを選択）
3. プロジェクト名: 例）`UNIVERSEGEO-Sheets`

## 2. Google Sheets API の有効化

1. Google Cloud Console で「APIとサービス」→「ライブラリ」を選択
2. 「Google Sheets API」を検索
3. 「有効にする」をクリック

## 3. API キーの作成

1. 「APIとサービス」→「認証情報」を選択
2. 「認証情報を作成」→「APIキー」をクリック
3. 作成された API キーをコピー
4. **重要**: 「キーを制限」をクリックして以下を設定：
   - **アプリケーションの制限**: HTTPリファラー（推奨）
   - **APIの制限**: Google Sheets API のみに制限
   - 許可するリファラー: あなたのアプリのURL（例: `https://yourdomain.com/*`）

## 4. スプレッドシートの準備

1. [Google Sheets](https://sheets.google.com/) で新しいスプレッドシートを作成
2. シート名を「**シート1**」にする（重要！）
3. 最初の行（A1～J1）に以下のヘッダーを入力（自動で追加されるため省略も可）:
   ```
   半径 | brand_name | poi_id | poi_name | latitude | longitude | prefecture | city | setting_flag | created
   ```
4. スプレッドシートのURLから **スプレッドシートID** をコピー
   ```
   https://docs.google.com/spreadsheets/d/【ここがスプレッドシートID】/edit
   ```
5. **共有設定**:
   - 「共有」ボタンをクリック
   - 「リンクを知っている全員が閲覧可能」に設定
   - または、サービスアカウントを作成して共有

## 5. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下を記述：

```env
# Google Sheets API 設定
VITE_GOOGLE_SPREADSHEET_ID=あなたのスプレッドシートID
VITE_GOOGLE_SHEETS_API_KEY=あなたのAPIキー
```

**例**:
```env
VITE_GOOGLE_SPREADSHEET_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890
VITE_GOOGLE_SHEETS_API_KEY=AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q
```

## 6. アプリの再起動

```bash
# 開発サーバーを再起動
npm run dev
```

## 7. 動作確認

1. アプリにログイン（営業アカウント）
2. 案件を選択 → セグメント管理 → 地点を登録
3. 「地点格納依頼」ボタンをクリック
4. ジオコーディング完了後、スプレッドシートを確認
5. 地点情報が追加されていれば成功！

**注意**: スプレッドシートには **TG地点のみ** が出力されます。来店計測地点は出力されません。

## 出力されるデータ

| カラム | 説明 | 例 |
|--------|------|-----|
| 半径 | 指定半径 | 500m |
| brand_name | 広告主名 | ○○株式会社 |
| poi_id | 地点ID（location_id） | 1 |
| poi_name | 地点名 | 東京駅 |
| latitude | 緯度 | 35.681236 |
| longitude | 経度 | 139.767125 |
| prefecture | 都道府県 | 東京都 |
| city | 市区町村 | 千代田区 |
| setting_flag | 設定フラグ | 1 |
| created | 依頼日 | 2024-01-15 |

## トラブルシューティング

### 環境変数が設定されていない
**症状**: コンソールに「Google Sheets API が設定されていません」と表示される

**確認方法**:
1. プロジェクトルートに `.env` ファイルが存在するか確認
2. `.env` ファイルに以下が記載されているか確認:
   ```env
   VITE_GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
   VITE_GOOGLE_SHEETS_API_KEY=your_api_key
   ```
3. 開発サーバーを再起動（環境変数の変更後は必須）
   ```bash
   # Ctrl+C で停止後
   npm run dev
   ```

### API エラー: 403 Forbidden
**症状**: スプレッドシートへのアクセスが拒否される

**対処法**:
- API キーの制限設定を確認
- スプレッドシートの共有設定を「リンクを知っている全員」に変更
- APIキーでGoogle Sheets APIが有効になっているか確認

### API エラー: 404 Not Found
**症状**: スプレッドシートが見つからない

**対処法**:
- スプレッドシートIDが正しいか確認
- スプレッドシートが削除されていないか確認
- シート名が「シート1」になっているか確認

### データが出力されない
**確認手順**:
1. ブラウザのコンソール（F12）でエラーを確認
2. コンソールに `📊 スプレッドシートに出力中...` というログが表示されるか確認
3. 「TG地点が存在しないため、スプレッドシート出力をスキップします」と表示されていないか確認
4. `.env` ファイルの環境変数名が正しいか確認（`VITE_` プレフィックスが必要）
5. 開発サーバーを再起動

### ヘッダー行が重複する
- スプレッドシートの1行目を手動で削除
- `ensureHeaderRow` 関数が自動で再作成します

### デバッグ方法
1. ブラウザの開発者ツール（F12）を開く
2. Console タブを表示
3. 地点格納依頼を実行
4. 以下のログを確認:
   - `📊 スプレッドシートに出力中...`
   - `📊 出力対象: TG地点=X件`
   - `📤 スプレッドシートに送信:`
   - `✅ Google Sheets に追加成功:` または `❌ Google Sheets API エラー:`

## セキュリティ注意事項

⚠️ **重要**: `.env` ファイルは Git にコミットしないでください！

`.gitignore` に以下が含まれていることを確認：
```
.env
.env.local
.env.*.local
```

## Cloud Run デプロイ時

Cloud Run にデプロイする場合は、環境変数をコンテナに設定：

```bash
gcloud run deploy universegeo \
  --set-env-vars="VITE_GOOGLE_SPREADSHEET_ID=your_id,VITE_GOOGLE_SHEETS_API_KEY=your_key"
```

または、Cloud Run コンソールから「環境変数」タブで設定。

