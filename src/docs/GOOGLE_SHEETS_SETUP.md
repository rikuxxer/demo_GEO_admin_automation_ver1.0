# Google Sheets自動入力機能 セットアップガイド

## 概要

営業による地点登録依頼がされたタイミングで、自動的にGoogleスプレッドシートにデータを出力する機能です。

## 機能

- **自動入力**: 地点登録時に自動的にスプレッドシートにデータを追加
- **フォールバック**: 自動入力に失敗した場合はキューに保存され、後で手動エクスポート可能
- **一括登録対応**: 一括登録時も自動的にスプレッドシートに送信

## セットアップ手順

### 1. Googleスプレッドシートの準備

1. [Googleスプレッドシート](https://sheets.google.com/)を開く
2. 新しいスプレッドシートを作成（または既存のスプレッドシートを使用）
3. スプレッドシートのURLをコピー（後で使用します）

### 2. Google Apps Scriptの設定

1. スプレッドシートで **拡張機能** > **Apps Script** を開く
2. 以下のコードを貼り付けて保存:

```javascript
function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // ヘッダーが存在しない場合は追加
    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        'category_id', 'brand_name', 'poi_id', 'poi_name',
        'latitude', 'longitude', 'prefecture', 'city',
        'setting_flag', 'created'
      ]);
    }
    
    // データを追加
    let addedCount = 0;
    data.forEach(row => {
      sheet.appendRow([
        row.category_id || '',
        row.brand_name || '',
        row.poi_id || '',
        row.poi_name || '',
        row.latitude || '',
        row.longitude || '',
        row.prefecture || '',
        row.city || '',
        row.setting_flag || 2,
        row.created || ''
      ]);
      addedCount++;
    });
    
    return ContentService.createTextOutput(JSON.stringify({ 
      success: true, 
      added: addedCount 
    }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 
      success: false, 
      error: error.toString() 
    }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Google Sheets API is ready')
    .setMimeType(ContentService.MimeType.TEXT);
}
```

3. **保存** ボタンをクリック（Ctrl+S / Cmd+S）

### 3. ウェブアプリとしてデプロイ

1. **デプロイ** > **新しいデプロイ** をクリック
2. **種類の選択** で **ウェブアプリ** を選択
3. 以下の設定を行います:
   - **説明**: 任意（例: "地点登録データ自動入力"）
   - **次のユーザーとして実行**: **自分**
   - **アクセスできるユーザー**: **全員**
4. **デプロイ** ボタンをクリック
5. **承認が必要です** というダイアログが表示されたら:
   - **承認** をクリック
   - Googleアカウントを選択
   - **詳細** > **[プロジェクト名]に移動** をクリック
   - **許可** をクリック
6. デプロイが完了すると、**ウェブアプリのURL** が表示されます
7. このURLをコピー（例: `https://script.google.com/macros/s/AKfycby.../exec`）

### 4. 環境変数の設定

#### 開発環境（.env.local）

プロジェクトルートに `.env.local` ファイルを作成（既に存在する場合は追加）:

```bash
# Google Apps Script Web App URL
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

**⚠️ 重要**: `.env.local` ファイルはGitにコミットしないでください（`.gitignore`に追加済み）

#### 本番環境（Vercel/Netlifyなど）

ホスティングサービスの環境変数設定で以下を追加:

```
VITE_GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### 5. 動作確認

1. 開発サーバーを再起動（環境変数の変更を反映）
2. 営業ユーザーでログイン
3. 地点を登録
4. スプレッドシートを確認して、データが自動的に追加されていることを確認

## データ形式

スプレッドシートに追加されるデータの形式:

| カラム名 | 説明 | 例 |
|---------|------|-----|
| category_id | 99000000（00には指定半径の広さ） | 99000050（50mの場合） |
| brand_name | 案件名 | 株式会社サンプル |
| poi_id | セグメントID | SEG-20240101-0001 |
| poi_name | 地点名 | 東京駅 |
| latitude | 緯度 | 35.6812 |
| longitude | 経度 | 139.7671 |
| prefecture | 都道府県 | 東京都 |
| city | 市区町村 | 千代田区 |
| setting_flag | 設定フラグ（固定値） | 2 |
| created | 依頼日（YYYY-MM-DD） | 2024-01-15 |

## トラブルシューティング

### 自動入力が動作しない

1. **環境変数の確認**
   - `.env.local` に `VITE_GOOGLE_APPS_SCRIPT_URL` が正しく設定されているか確認
   - 開発サーバーを再起動しているか確認

2. **Google Apps Scriptの確認**
   - Apps Scriptエディタでエラーがないか確認
   - デプロイが最新版になっているか確認
   - ウェブアプリのURLが正しいか確認

3. **ブラウザのコンソールを確認**
   - F12で開発者ツールを開く
   - コンソールタブでエラーメッセージを確認

### データが重複する

- スプレッドシートに既にデータがある場合、新しいデータが追加されます
- 重複を防ぎたい場合は、Apps Scriptに重複チェック機能を追加してください

### 権限エラー

- Google Apps Scriptのデプロイ設定で「アクセスできるユーザー: 全員」に設定されているか確認
- 承認プロセスが完了しているか確認

## 開発環境での動作

開発環境（`import.meta.env.MODE === 'development'`）では、自動的にモック動作になります:

- スプレッドシートへの送信は行われません
- データはキューに保存されます
- 管理画面から手動でCSVエクスポート可能

本番環境では、環境変数 `VITE_GOOGLE_APPS_SCRIPT_URL` が設定されている場合、自動的にスプレッドシートに送信されます。

## セキュリティ

- Google Apps ScriptのURLは公開されているため、URLを知っている人は誰でもデータを送信できます
- 本番環境では、必要に応じて追加の認証（APIキーなど）を実装することを推奨します
- スプレッドシートの共有設定で、適切な権限を設定してください

