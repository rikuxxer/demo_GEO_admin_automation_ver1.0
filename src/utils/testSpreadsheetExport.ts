/**
 * スプレッドシート掃き出し処理のテストユーティリティ
 * 
 * 使用方法:
 * 1. ブラウザの開発者ツール（F12）→ Console タブを開く
 * 2. 以下を実行:
 *    import { testSpreadsheetExport } from './src/utils/testSpreadsheetExport'
 *    testSpreadsheetExport()
 */

import { 
  convertPoiToSpreadsheetRow, 
  exportToGoogleSheets,
  convertToCSV,
  downloadCSV,
  calculateExportScheduledDate,
  type SpreadsheetRow 
} from './spreadsheetExport';
import type { PoiInfo, Project, Segment } from '../types/schema';

/**
 * テスト用のサンプルデータを作成
 */
function createTestData(): {
  project: Project;
  segment: Segment;
  pois: PoiInfo[];
} {
  const project: Project = {
    project_id: 'TEST-PRJ-001',
    advertiser_name: 'テスト広告主',
    appeal_point: 'テスト訴求内容',
    delivery_start_date: '2025-01-01',
    delivery_end_date: '2025-12-31',
    person_in_charge: 'テスト担当者',
    project_status: 'active',
  };

  const segment: Segment = {
    segment_id: 'TEST-SEG-001',
    project_id: 'TEST-PRJ-001',
    segment_name: 'テストセグメント',
    media_id: 'google_ads',
    designated_radius: '500m',
    extraction_period: 'last_30_days',
    attribute: 'detector',
    detection_count: '3',
    location_request_status: 'not_requested',
    request_confirmed: false,
    data_link_status: 'before_request',
  };

  const pois: PoiInfo[] = [
    {
      poi_id: 'TEST-POI-001',
      project_id: 'TEST-PRJ-001',
      segment_id: 'TEST-SEG-001',
      poi_name: 'テスト地点1',
      address: '東京都千代田区丸の内1-1-1',
      latitude: 35.681236,
      longitude: 139.767125,
      poi_category: 'tg',
      designated_radius: '500m',
      created: new Date().toISOString(),
    },
    {
      poi_id: 'TEST-POI-002',
      project_id: 'TEST-PRJ-001',
      segment_id: 'TEST-SEG-001',
      poi_name: 'テスト地点2',
      address: '東京都新宿区新宿3-1-1',
      latitude: 35.689487,
      longitude: 139.691706,
      poi_category: 'tg',
      designated_radius: '300m',
      created: new Date().toISOString(),
    },
    {
      poi_id: 'TEST-POI-003',
      project_id: 'TEST-PRJ-001',
      segment_id: 'TEST-SEG-001',
      poi_name: 'テスト地点3',
      address: '神奈川県横浜市西区みなとみらい2-1-1',
      latitude: 35.454954,
      longitude: 139.631128,
      poi_category: 'tg',
      designated_radius: '100m',
      created: new Date().toISOString(),
    },
  ];

  return { project, segment, pois };
}

/**
 * スプレッドシート行への変換をテスト
 */
export function testConvertToSpreadsheetRow(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🔄 スプレッドシート行への変換テスト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { project, segment, pois } = createTestData();

  console.log('📊 テストデータ:');
  console.log('  案件:', project.advertiser_name);
  console.log('  セグメント:', segment.segment_name);
  console.log('  地点数:', pois.length);
  console.log('');

  const rows: SpreadsheetRow[] = [];
  pois.forEach((poi, index) => {
    try {
      const row = convertPoiToSpreadsheetRow(poi, project, segment);
      rows.push(row);
      console.log(`✅ 地点${index + 1} 変換成功:`, {
        category_id: row.category_id,
        brand_name: row.brand_name,
        poi_id: row.poi_id,
        poi_name: row.poi_name,
        latitude: row.latitude,
        longitude: row.longitude,
        prefecture: row.prefecture,
        city: row.city,
        setting_flag: row.setting_flag,
        created: row.created,
      });
    } catch (error) {
      console.error(`❌ 地点${index + 1} 変換エラー:`, error);
    }
  });

  console.log('');
  console.log('📋 変換結果サマリー:');
  console.log(`  成功: ${rows.length}件`);
  console.log(`  失敗: ${pois.length - rows.length}件`);
  console.log('');

  // CSV形式で表示
  if (rows.length > 0) {
    console.log('📄 CSV形式プレビュー:');
    const csv = convertToCSV(rows);
    console.log(csv);
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  return rows;
}

/**
 * CSVダウンロードをテスト
 */
export function testCSVDownload(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💾 CSVダウンロードテスト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { project, segment, pois } = createTestData();
  const rows = pois.map(poi => convertPoiToSpreadsheetRow(poi, project, segment));

  try {
    const csv = convertToCSV(rows);
    const filename = `test_export_${new Date().toISOString().split('T')[0]}.csv`;
    
    downloadCSV(csv, filename);
    
    console.log('✅ CSVダウンロード成功');
    console.log(`  ファイル名: ${filename}`);
    console.log(`  行数: ${rows.length}`);
    console.log('');
    console.log('💡 ダウンロードフォルダを確認してください');
    console.log('');
  } catch (error) {
    console.error('❌ CSVダウンロードエラー:', error);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * Google Sheetsへの出力をテスト
 */
export async function testGoogleSheetsExport(): Promise<void> {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📤 Google Sheets出力テスト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const { project, segment, pois } = createTestData();
  const rows = pois.map(poi => convertPoiToSpreadsheetRow(poi, project, segment));

  console.log('📊 出力データ:');
  console.log(`  行数: ${rows.length}`);
  console.log('  サンプル:', rows[0]);
  console.log('');

  try {
    console.log('📤 Google Sheetsに送信中...');
    const result = await exportToGoogleSheets(rows);

    if (result.success) {
      console.log('✅ 出力成功!');
      console.log(`  メッセージ: ${result.message}`);
      console.log('');
      console.log('💡 スプレッドシートを確認してください');
    } else {
      console.error('❌ 出力失敗');
      console.error(`  メッセージ: ${result.message}`);
      console.log('');
      console.log('💡 エラーの場合は、キューに保存されています');
      console.log('   exportQueueToCSV() でCSVダウンロードできます');
    }
  } catch (error) {
    console.error('❌ エラー:', error);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * エクスポート予定日の計算をテスト
 */
export function testExportScheduledDate(): void {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📅 エクスポート予定日計算テスト');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');


  const testDates = [
    new Date('2025-01-13T10:00:00'), // 月曜日
    new Date('2025-01-14T10:00:00'), // 火曜日
    new Date('2025-01-15T10:00:00'), // 水曜日
    new Date('2025-01-16T10:00:00'), // 木曜日
    new Date('2025-01-17T10:00:00'), // 金曜日
    new Date('2025-01-18T10:00:00'), // 土曜日
    new Date('2025-01-19T10:00:00'), // 日曜日
    new Date('2025-01-13T21:00:00'), // 月曜日20:00以降
  ];

  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  testDates.forEach(date => {
    const scheduledDate = calculateExportScheduledDate(date);
    const dayName = dayNames[date.getDay()];
    const hour = date.getHours();
    
    console.log(`📅 ${date.toLocaleDateString('ja-JP')} (${dayName}) ${hour}:00`);
    console.log(`   → エクスポート予定日: ${scheduledDate}`);
    console.log('');
  });

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

/**
 * すべてのテストを実行
 */
export async function runAllTests(): Promise<void> {
  console.log('🧪 スプレッドシート掃き出し処理 - 全テスト実行\n');

  // 1. 変換テスト
  testConvertToSpreadsheetRow();

  // 2. CSVダウンロードテスト
  const shouldDownloadCSV = confirm('CSVダウンロードをテストしますか？');
  if (shouldDownloadCSV) {
    testCSVDownload();
  }

  // 3. Google Sheets出力テスト
  const shouldExport = confirm('Google Sheetsへの出力をテストしますか？');
  if (shouldExport) {
    await testGoogleSheetsExport();
  }

  // 4. エクスポート予定日計算テスト
  const shouldTestDate = confirm('エクスポート予定日の計算をテストしますか？');
  if (shouldTestDate) {
    testExportScheduledDate();
  }

  console.log('✅ すべてのテストが完了しました\n');
}

// グローバルスコープに公開（コンソールから簡単に呼び出せるように）
if (typeof window !== 'undefined') {
  (window as any).testSpreadsheetExport = {
    convert: testConvertToSpreadsheetRow,
    csv: testCSVDownload,
    export: testGoogleSheetsExport,
    date: testExportScheduledDate,
    runAll: runAllTests,
  };

  console.log('📊 スプレッドシート掃き出し処理テストユーティリティを読み込みました');
  console.log('');
  console.log('使用方法:');
  console.log('  testSpreadsheetExport.convert()  - スプレッドシート行への変換をテスト');
  console.log('  testSpreadsheetExport.csv()      - CSVダウンロードをテスト');
  console.log('  testSpreadsheetExport.export()   - Google Sheetsへの出力をテスト');
  console.log('  testSpreadsheetExport.date()     - エクスポート予定日計算をテスト');
  console.log('  testSpreadsheetExport.runAll()   - すべてのテストを実行');
  console.log('');
}
