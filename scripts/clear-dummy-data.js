#!/usr/bin/env node

/**
 * ダミーデータクリアスクリプト
 * 
 * ブラウザのlocalStorageをクリアするためのガイドスクリプト
 * 
 * 使用方法:
 * 1. ブラウザの開発者ツール（F12）を開く
 * 2. Consoleタブを表示
 * 3. 以下のコマンドをコピーして実行
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║          UNIVERSEGEO ダミーデータクリアスクリプト              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

【手順】

1. ブラウザで http://localhost:5173 を開く

2. 開発者ツールを開く
   - Windows: F12 または Ctrl + Shift + I
   - Mac: Command + Option + I

3. Consoleタブを表示

4. 以下のコマンドをコピーして貼り付け、Enterを押す：

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. ページが自動的にリロードされ、ダミーデータがクリアされます

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【特定のデータのみ削除する場合】

案件データのみ削除:
  localStorage.removeItem('bq_projects');
  location.reload();

セグメントデータのみ削除:
  localStorage.removeItem('bq_segments');
  location.reload();

地点データのみ削除:
  localStorage.removeItem('bq_poi');
  location.reload();

ユーザーデータのみ削除:
  localStorage.removeItem('bq_users');
  localStorage.removeItem('bq_user_requests');
  localStorage.removeItem('currentUser');
  location.reload();

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【UIから削除する場合（推奨）】

管理者アカウントでログイン後：
1. サイドバーから「データ管理」を選択
2. 削除したいデータタイプを選択
3. 削除ボタンをクリック

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);







