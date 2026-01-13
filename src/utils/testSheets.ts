/**
 * Google Sheets API テストユーティリティ
 * 
 * ブラウザコンソールから簡単にAPIをテストできる関数を提供します。
 * 
 * 使用方法:
 * 1. 開発者ツール（F12）→ Console タブを開く
 * 2. 以下をコピー&ペースト:
 *    import { testSheetsConnection } from './src/utils/testSheets'
 *    testSheetsConnection()
 */

const SPREADSHEET_ID = import.meta.env.VITE_GOOGLE_SPREADSHEET_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const SHEET_NAME = 'シート1';

/**
 * 環境変数が設定されているかチェック
 */
export function checkEnvVars(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 環境変数チェック');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const spreadsheetId = SPREADSHEET_ID;
  const apiKey = API_KEY;
  
  console.log('VITE_GOOGLE_SPREADSHEET_ID:', spreadsheetId ? '✅ 設定済み' : '❌ 未設定');
  if (spreadsheetId) {
    console.log('  値:', spreadsheetId);
  }
  
  console.log('VITE_GOOGLE_SHEETS_API_KEY:', apiKey ? '✅ 設定済み' : '❌ 未設定');
  if (apiKey) {
    console.log('  値:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
  }
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (!spreadsheetId || !apiKey) {
    console.warn('⚠️ 環境変数が設定されていません');
    console.log('📝 .envファイルに以下を追加してください:');
    console.log('');
    console.log('VITE_GOOGLE_SPREADSHEET_ID=your_spreadsheet_id');
    console.log('VITE_GOOGLE_SHEETS_API_KEY=your_api_key');
    console.log('');
    console.log('設定後、開発サーバーを再起動してください（Ctrl+C → npm run dev）');
  }
}

/**
 * Google Sheets API との接続をテスト
 */
export async function testSheetsConnection(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔌 Google Sheets API 接続テスト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 環境変数チェック
  if (!SPREADSHEET_ID || !API_KEY) {
    console.error('❌ 環境変数が設定されていません');
    checkEnvVars();
    return;
  }
  
  try {
    console.log('📤 APIリクエスト送信中...');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?key=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ APIエラー:', data);
      console.log('');
      
      if (response.status === 403) {
        console.log('💡 対処法:');
        console.log('1. スプレッドシートの共有設定を確認');
        console.log('   「共有」→「リンクを知っている全員（編集者）」');
        console.log('2. APIキーの制限を確認');
        console.log('   Google Cloud Console → APIとサービス → 認証情報');
      } else if (response.status === 404) {
        console.log('💡 対処法:');
        console.log('1. スプレッドシートIDが正しいか確認');
        console.log('2. スプレッドシートが削除されていないか確認');
      }
      
      return;
    }
    
    console.log('✅ 接続成功!');
    console.log('');
    console.log('📊 スプレッドシート情報:');
    console.log('  タイトル:', data.properties.title);
    console.log('  ロケール:', data.properties.locale);
    console.log('  タイムゾーン:', data.properties.timeZone);
    console.log('  シート数:', data.sheets.length);
    console.log('');
    console.log('📄 シート一覧:');
    data.sheets.forEach((sheet: any, index: number) => {
      console.log(`  ${index + 1}. ${sheet.properties.title}`);
    });
    
    // シート名チェック
    const hasTargetSheet = data.sheets.some((sheet: any) => 
      sheet.properties.title === SHEET_NAME
    );
    
    console.log('');
    if (hasTargetSheet) {
      console.log(`✅ ターゲットシート「${SHEET_NAME}」が存在します`);
    } else {
      console.warn(`⚠️ ターゲットシート「${SHEET_NAME}」が見つかりません`);
      console.log('💡 シート名を「シート1」に変更してください');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ 接続エラー:', error);
    console.log('');
    console.log('💡 ネットワーク接続を確認してください');
  }
}

/**
 * テストデータを書き込む
 */
export async function writeTestData(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📝 テストデータ書き込み');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (!SPREADSHEET_ID || !API_KEY) {
    console.error('❌ 環境変数が設定されていません');
    checkEnvVars();
    return;
  }
  
  try {
    const testData = [
      ['テスト半径', 'テスト企業', 'test-001', 'テスト地点', '35.681236', '139.767125', '東京都', '千代田区', '1', new Date().toISOString().split('T')[0]]
    ];
    
    console.log('📤 テストデータ送信中...');
    console.log('データ:', testData);
    
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: testData,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('❌ 書き込みエラー:', result);
      return;
    }
    
    console.log('✅ 書き込み成功!');
    console.log('');
    console.log('📊 結果:');
    console.log('  更新範囲:', result.updates.updatedRange);
    console.log('  追加行数:', result.updates.updatedRows);
    console.log('  追加列数:', result.updates.updatedColumns);
    console.log('  追加セル数:', result.updates.updatedCells);
    console.log('');
    console.log('🔗 スプレッドシートで確認してください:');
    console.log(`https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit`);
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ 書き込みエラー:', error);
  }
}

/**
 * スプレッドシートの内容を読み取る
 */
export async function readSheetData(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📖 スプレッドシート読み取り');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  if (!SPREADSHEET_ID || !API_KEY) {
    console.error('❌ 環境変数が設定されていません');
    checkEnvVars();
    return;
  }
  
  try {
    console.log('📤 データ取得中...');
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (!response.ok) {
      console.error('❌ 読み取りエラー:', data);
      return;
    }
    
    console.log('✅ 読み取り成功!');
    console.log('');
    console.log('📊 データ:');
    console.log('  範囲:', data.range);
    console.log('  行数:', data.values?.length || 0);
    console.log('');
    
    if (data.values && data.values.length > 0) {
      console.log('📄 最初の10行:');
      data.values.slice(0, 10).forEach((row: any[], index: number) => {
        console.log(`  ${index + 1}:`, row.join(' | '));
      });
      
      if (data.values.length > 10) {
        console.log(`  ... 他 ${data.values.length - 10} 行`);
      }
    } else {
      console.log('📄 データがありません');
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('❌ 読み取りエラー:', error);
  }
}

/**
 * すべてのテストを実行
 */
export async function runAllTests(): Promise<void> {
  console.log('🧪 Google Sheets API - 全テスト実行\n');
  
  checkEnvVars();
  await testSheetsConnection();
  
  const shouldWrite = confirm('テストデータを書き込みますか？');
  if (shouldWrite) {
    await writeTestData();
  }
  
  const shouldRead = confirm('スプレッドシートの内容を読み取りますか？');
  if (shouldRead) {
    await readSheetData();
  }
  
  console.log('✅ すべてのテストが完了しました\n');
}

// グローバルスコープに公開（コンソールから簡単に呼び出せるように）
if (typeof window !== 'undefined') {
  (window as any).testSheets = {
    checkEnvVars,
    testConnection: testSheetsConnection,
    writeTest: writeTestData,
    readData: readSheetData,
    runAll: runAllTests,
  };
  
  console.log('📊 Google Sheets テストユーティリティを読み込みました');
  console.log('');
  console.log('使用方法:');
  console.log('  testSheets.checkEnvVars()     - 環境変数をチェック');
  console.log('  testSheets.testConnection()   - API接続をテスト');
  console.log('  testSheets.writeTest()        - テストデータを書き込み');
  console.log('  testSheets.readData()         - データを読み取り');
  console.log('  testSheets.runAll()           - すべてのテストを実行');
  console.log('');
}







