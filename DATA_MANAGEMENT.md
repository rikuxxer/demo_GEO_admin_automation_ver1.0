# データ管理ガイド

UNIVERSEGEO案件管理システムのデータ管理方法について説明します。

---

## 📋 目次

1. [現在の構成（開発環境）](#現在の構成開発環境)
2. [ダミーデータの削除](#ダミーデータの削除)
3. [BigQueryへの移行](#bigqueryへの移行)
4. [データバックアップ](#データバックアップ)

---

## 現在の構成（開発環境）

### データストレージ

現在、アプリケーションは**localStorage**（ブラウザ内のストレージ）を使用しています。

```
フロントエンド（React）
  ↓
src/utils/bigquery.ts（モック実装）
  ↓
localStorage（ブラウザ内）
```

### 保存されているデータ

- `bq_projects` - 案件データ
- `bq_segments` - セグメントデータ
- `bq_poi` - 地点（POI）データ
- `bq_messages` - メッセージデータ
- `bq_users` - ユーザーデータ
- `bq_user_requests` - ユーザー登録申請
- その他（編集リクエスト、履歴など）

---

## ダミーデータの削除

⚠️ **重要**: デフォルトでは、データを削除してもデモデータは自動的に再投入されません。

デモデータの自動投入を有効にする場合は、`.env`ファイルに以下を追加してください：
```env
VITE_USE_DEMO_DATA=true
```

### 方法1: UIから削除（推奨）

管理者アカウントでログインし、データ管理画面から削除します。

#### 手順:

1. **管理者としてログイン**
   ```
   Email: admin@example.com
   Password: demo123
   ```

2. **サイドバーから「データ管理」を選択**

3. **削除したいデータを選択**
   - 案件データのみ
   - セグメントデータのみ
   - 地点データのみ
   - メッセージデータのみ
   - ユーザーデータのみ
   - **すべて削除**（すべてのデータを削除）

4. **「削除する」をクリック**

5. **ページが自動的にリロードされます**

---

### 方法2: ブラウザコンソールから削除

開発者ツールのコンソールから直接削除できます。

#### 手順:

1. **開発者ツールを開く**
   - Windows: `F12` または `Ctrl + Shift + I`
   - Mac: `Command + Option + I`

2. **Consoleタブを表示**

3. **以下のコマンドを貼り付けて実行**

```javascript
// すべてのダミーデータを削除
const keys = [
  'bq_projects',
  'bq_segments',
  'bq_poi',
  'bq_edit_requests',
  'bq_messages',
  'bq_change_history',
  'bq_visit_measurement_groups',
  'bq_feature_requests',
  'bq_users',
  'bq_user_requests',
  'currentUser'
];

keys.forEach(key => localStorage.removeItem(key));

// firstLogin_ で始まるキーも削除
Object.keys(localStorage).forEach(key => {
  if (key.startsWith('firstLogin_')) {
    localStorage.removeItem(key);
  }
});

console.log('✅ ダミーデータを削除しました');
location.reload();
```

---

### 方法3: スクリプトから確認

```powershell
# ガイドを表示
npm run clear-data
```

このコマンドは、ブラウザコンソールで実行するコマンドを表示します。

---

## デモデータの投入

開発・テスト用にデモデータを投入する方法です。

### 方法1: UIから投入（推奨）

1. **管理者としてログイン**
   ```
   Email: admin@example.com
   Password: demo123
   ```

2. **サイドバーから「データ管理」を選択**

3. **「デモデータの投入」セクション**

4. **「デモデータを投入」ボタンをクリック**

5. **ページが自動的にリロードされます**

### 方法2: 自動投入を有効化

`.env`ファイルに以下を追加：

```env
VITE_USE_DEMO_DATA=true
```

この設定により、データが空の場合に自動的にデモデータが投入されます。

**注意**: 本番環境では必ず`false`に設定するか、この設定を削除してください。

---

## BigQueryへの移行

本番環境でBigQueryを使用する場合の手順は、[BIGQUERY_SETUP.md](./BIGQUERY_SETUP.md) をご覧ください。

### 概要

1. **BigQueryのセットアップ**
   - GCPプロジェクトの作成
   - データセットの作成
   - テーブルの作成

2. **バックエンドAPIの実装**
   - Cloud Functions または Cloud Run
   - BigQuery Client Libraryの使用
   - REST API エンドポイントの実装

3. **フロントエンドの接続**
   - `src/utils/bigquery.ts` の書き換え
   - API URLの設定

詳細は [BIGQUERY_SETUP.md](./BIGQUERY_SETUP.md) を参照してください。

---

## データバックアップ

### エクスポート

現在のデータをJSONファイルとしてバックアップできます。

#### 手順:

1. **データ管理画面を開く**
   - サイドバー → 「データ管理」

2. **「エクスポート」ボタンをクリック**

3. **ダウンロードされたファイルを保存**
   - ファイル名: `universegeo_backup_YYYY-MM-DD.json`

---

### インポート

バックアップファイルからデータを復元できます。

#### 手順:

1. **データ管理画面を開く**

2. **「インポート」ボタンをクリック**

3. **バックアップファイルを選択**

4. **ページが自動的にリロードされ、データが復元されます**

---

## よくある質問

### Q1. データを削除すると復元できませんか？

**A:** はい、削除したデータは復元できません。重要なデータは事前にエクスポートしてバックアップを取ることを推奨します。

---

### Q2. 本番環境でもlocalStorageを使いますか？

**A:** いいえ、本番環境では**BigQuery**を使用することを強く推奨します。localStorageは開発環境でのみ使用してください。

理由:
- ブラウザを変えるとデータが消える
- ユーザー間でデータを共有できない
- データのバックアップが困難
- セキュリティリスク

---

### Q3. データの移行方法は？

**A:** localStorage → BigQuery への移行手順:

1. **現在のデータをエクスポート**
   - データ管理画面 → 「エクスポート」

2. **BigQueryをセットアップ**
   - [BIGQUERY_SETUP.md](./BIGQUERY_SETUP.md) を参照

3. **バックエンドAPIを実装**

4. **エクスポートしたデータをBigQueryにインポート**
   - BigQueryのWebコンソールまたはCLIを使用

---

### Q4. 開発環境でBigQueryを使えますか？

**A:** はい、可能です。ただし、開発環境では以下の理由からlocalStorageを推奨します:

- セットアップが簡単
- オフラインでも動作
- APIコストがかからない
- 高速

BigQueryは本番環境でのみ使用することを推奨します。

---

## セキュリティ注意事項

⚠️ **重要**

1. **本番環境ではlocalStorageを使用しない**
   - ブラウザ内のデータは誰でもアクセス可能
   - セキュリティリスクが高い

2. **バックアップファイルの取り扱い**
   - エクスポートしたJSONファイルには機密情報が含まれます
   - GitHubにpushしない
   - 安全な場所に保管

3. **データ削除前の確認**
   - 削除したデータは復元できません
   - 重要なデータは必ずバックアップ

---

## 関連ドキュメント

- [BIGQUERY_SETUP.md](./BIGQUERY_SETUP.md) - BigQuery接続設定
- [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) - デプロイ手順
- [README.md](./README.md) - プロジェクト概要


