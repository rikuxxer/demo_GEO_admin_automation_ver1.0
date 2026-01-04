# Google Sheets 出力テストガイド

開発環境でGoogle Sheetsへの書き出し機能をテストする手順です。

---

## 📋 前提条件

- Google Cloud Platform アカウント
- Google Sheets API が有効化されている
- APIキーが作成されている
- テスト用のスプレッドシートが作成されている

まだの場合は [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md) を参照してください。

---

## 🚀 クイックスタート（5分）

### ステップ1: 環境変数を設定

プロジェクトルートに `.env` ファイルを作成（既にある場合は編集）：

```env
# Google Sheets API設定
VITE_GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
VITE_GOOGLE_SHEETS_API_KEY=your_api_key_here

# デモデータは無効化（クリーンな状態でテスト）
# VITE_USE_DEMO_DATA=false
```

#### スプレッドシートIDの取得方法

1. Google Sheetsでテスト用スプレッドシートを開く
2. URLをコピー:
   ```
   https://docs.google.com/spreadsheets/d/【ここがスプレッドシートID】/edit
   ```
3. スプレッドシートIDを`.env`に貼り付け

---

### ステップ2: スプレッドシートの共有設定

⚠️ **重要**: スプレッドシートを公開する必要があります

1. スプレッドシートで「共有」ボタンをクリック
2. 「リンクを知っている全員」に変更
3. 権限を「編集者」に設定
4. 「完了」をクリック

---

### ステップ3: 開発サーバーを起動

```powershell
# サーバーが起動中の場合は再起動（Ctrl+C → npm run dev）
npm run dev
```

⚠️ **重要**: 環境変数を変更した場合は、必ずサーバーを再起動してください。

---

### ステップ4: テストデータを準備

#### A. デモデータを使用する場合

1. ブラウザで http://localhost:5173 を開く

2. 管理者でログイン
   ```
   Email: admin@example.com
   Password: demo123
   ```

3. サイドバーから「データ管理」を選択

4. 「デモデータを投入」ボタンをクリック

5. ページがリロードされる

#### B. 新規データを作成する場合

1. 営業アカウントでログイン
   ```
   Email: salesA@example.com
   Password: demo123
   ```

2. 「新規案件登録」をクリック

3. 案件情報を入力して登録

4. セグメントと地点を登録

---

### ステップ5: 地点格納依頼を実行

1. **案件詳細画面を開く**
   - 案件一覧から登録した案件をクリック

2. **地点情報タブを開く**
   - 「TG地点」タブを選択

3. **セグメントを展開**
   - セグメント名をクリックして展開

4. **地点を登録**（まだの場合）
   - 「地点を追加」ボタンをクリック
   - 地点情報を入力して登録

5. **「地点格納依頼」ボタンをクリック**
   - セグメントのヘッダー部分にあるボタン

6. **ジオコーディング進捗を確認**
   - プログレスバーが表示される
   - 完了まで待つ

---

### ステップ6: ブラウザコンソールで確認

開発者ツール（F12）→ Console タブを開いて、以下のログを確認：

#### 成功時のログ:

```
📊 スプレッドシートに出力中...
📊 出力対象: TG地点=3件（全地点=3件）
📤 スプレッドシートに送信: {
  spreadsheetId: "1aBc...",
  sheetName: "シート1",
  rowCount: 3,
  sampleData: {...}
}
✅ Google Sheets に追加成功: {...}
```

#### エラー時のログ:

```
❌ Google Sheets API エラー: API Error: 403 Forbidden
```

または

```
⚠️ Google Sheets API が設定されていません: VITE_GOOGLE_SPREADSHEET_ID
```

---

### ステップ7: スプレッドシートで確認

1. Google Sheetsのタブに戻る

2. データが追加されていることを確認

**期待される結果:**

| 半径 | brand_name | poi_id | poi_name | latitude | longitude | prefecture | city | setting_flag | created |
|------|------------|--------|----------|----------|-----------|------------|------|--------------|---------|
| 500m | 株式会社サンプル | 1 | 東京駅 | 35.681236 | 139.767125 | 東京都 | 千代田区 | 1 | 2025-12-17 |

---

## 🔧 トラブルシューティング

### エラー1: 環境変数が設定されていません

**症状:**
```
⚠️ Google Sheets API が設定されていません: VITE_GOOGLE_SPREADSHEET_ID
```

**対処法:**
1. `.env`ファイルがプロジェクトルートに存在するか確認
2. ファイル名が正確に `.env` か確認（`.env.txt`などではない）
3. 環境変数名が正しいか確認（`VITE_`プレフィックスが必要）
4. 開発サーバーを再起動

---

### エラー2: API Error 403 Forbidden

**症状:**
```
❌ Google Sheets API エラー: API Error: 403 Forbidden
```

**対処法:**

#### A. スプレッドシートの共有設定を確認

1. スプレッドシートを開く
2. 「共有」→「リンクを知っている全員」
3. 権限を「編集者」に設定

#### B. APIキーの制限を確認

1. [Google Cloud Console](https://console.cloud.google.com/) を開く
2. 「APIとサービス」→「認証情報」
3. APIキーをクリック
4. 「APIの制限」を確認
   - 「なし」または「Google Sheets API」のみに制限

#### C. APIキーが正しいか確認

コンソールで確認：
```javascript
console.log('API Key:', import.meta.env.VITE_GOOGLE_SHEETS_API_KEY);
```

---

### エラー3: API Error 404 Not Found

**症状:**
```
❌ Google Sheets API エラー: API Error: 404 Not Found
```

**対処法:**
1. スプレッドシートIDが正しいか確認
2. スプレッドシートが削除されていないか確認
3. シート名が「シート1」になっているか確認

---

### エラー4: TG地点が存在しないため出力をスキップ

**症状:**
```
⚠️ TG地点が存在しないため、スプレッドシート出力をスキップします
```

**対処法:**
1. TG地点を登録する（来店計測地点は出力されません）
2. 地点の`poi_category`が`'tg'`または未設定になっているか確認

---

### エラー5: データが出力されない

**症状:**
- エラーは出ないが、スプレッドシートにデータが追加されない

**対処法:**

#### A. ブラウザコンソールを確認

F12 → Console タブで以下を確認：
- `📊 スプレッドシートに出力中...` のログが表示されるか
- エラーメッセージが表示されていないか

#### B. 営業アカウントでログインしているか確認

スプレッドシート出力は**営業ユーザーのみ**が対象です。

```javascript
// コンソールで確認
console.log('User role:', JSON.parse(localStorage.getItem('currentUser'))?.role);
// "sales" と表示されるはず
```

管理者アカウントの場合は出力されません。営業アカウントでログインし直してください。

---

## 🧪 手動テスト用コマンド

ブラウザコンソール（F12 → Console）で以下を実行して、APIが正しく動作するかテストできます：

```javascript
// 環境変数の確認
console.log('Spreadsheet ID:', import.meta.env.VITE_GOOGLE_SPREADSHEET_ID);
console.log('API Key exists:', !!import.meta.env.VITE_GOOGLE_SHEETS_API_KEY);

// API疎通テスト
const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const SHEET_NAME = 'シート1';

// スプレッドシートの情報を取得
const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`;

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log('✅ API接続成功:', data.properties.title);
  })
  .catch(err => {
    console.error('❌ API接続エラー:', err);
  });
```

---

## 📝 テストチェックリスト

以下を確認してください：

- [ ] `.env`ファイルに`VITE_GOOGLE_SPREADSHEET_ID`を設定
- [ ] `.env`ファイルに`VITE_GOOGLE_SHEETS_API_KEY`を設定
- [ ] スプレッドシートの共有設定を「リンクを知っている全員（編集者）」に設定
- [ ] シート名が「シート1」になっている
- [ ] 開発サーバーを再起動した
- [ ] **営業アカウント**でログインしている（`salesA@example.com`など）
- [ ] TG地点を登録している
- [ ] 地点格納依頼を実行した
- [ ] ブラウザコンソールでエラーが出ていない
- [ ] スプレッドシートにデータが追加されている

---

## 🎯 期待される動作フロー

```
1. 営業アカウントでログイン
   ↓
2. 案件・セグメント・TG地点を登録
   ↓
3. 「地点格納依頼」ボタンをクリック
   ↓
4. ジオコーディング実行
   ↓
5. 自動的にスプレッドシートに出力
   ↓
6. コンソールに成功ログ表示
   ↓
7. スプレッドシートで確認
```

---

## 💡 Tips

### デバッグモードを有効にする

より詳細なログを確認したい場合、以下を実行：

```javascript
// ローカルストレージのデバッグモードを有効化
localStorage.setItem('debug_sheets', 'true');
location.reload();
```

### テストデータをクリア

テストを最初からやり直したい場合：

1. サイドバー → 「データ管理」
2. 「すべて削除」をクリック
3. デモデータを再投入

---

## 📞 サポート

問題が解決しない場合：

1. ブラウザコンソールのスクリーンショットを取得
2. `.env`ファイルの内容を確認（APIキーは隠す）
3. スプレッドシートの共有設定を確認
4. [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md) を再確認





