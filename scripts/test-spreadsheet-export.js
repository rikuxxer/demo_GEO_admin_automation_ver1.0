/**
 * スプレッドシートへの書き出し機能のテスト
 * 
 * 使い方:
 *   node scripts/test-spreadsheet-export.js https://your-backend-url.run.app
 */
const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:8080';
const SCHEDULER_SECRET = process.env.SCHEDULER_SECRET || process.argv[3] || '';

// テスト用のサンプルデータ
function createTestRows() {
  const now = new Date();
  const createdDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
  
  return [
    {
      category_id: '',
      brand_id: '',
      brand_name: 'テスト広告主',
      poi_id: 'TEST-POI-' + Date.now(),
      poi_name: 'テスト地点1',
      latitude: '35.681236',
      longitude: '139.767125',
      prefecture: '東京都',
      city: '千代田区',
      radius: '1000',
      polygon: '',
      setting_flag: '4',
      created: createdDate,
    },
    {
      category_id: '99000050',
      brand_id: '',
      brand_name: 'テスト広告主',
      poi_id: 'TEST-POI-' + (Date.now() + 1),
      poi_name: 'テスト地点2',
      latitude: '35.676191',
      longitude: '139.650310',
      prefecture: '東京都',
      city: '新宿区',
      radius: '',
      polygon: '',
      setting_flag: '2',
      created: createdDate,
    },
  ];
}

async function testBasicExport() {
  console.log('=== テスト1: 基本的なスプレッドシートエクスポート ===');
  const rows = createTestRows();
  
  try {
    const response = await fetch(`${BASE_URL}/api/sheets/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ rows }),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✓ 基本的なエクスポート: 成功');
      console.log(`  メッセージ: ${result.message}`);
      console.log(`  追加行数: ${result.rowsAdded || rows.length}件`);
      return { ok: true, message: '基本的なエクスポート成功' };
    } else {
      console.log('✗ 基本的なエクスポート: 失敗');
      console.log(`  ステータス: ${response.status}`);
      console.log(`  エラー: ${result.error || result.message || '不明なエラー'}`);
      return { ok: false, message: result.error || result.message || 'エクスポート失敗' };
    }
  } catch (error) {
    console.log('✗ 基本的なエクスポート: エラー');
    console.log(`  エラー: ${error.message}`);
    return { ok: false, message: error.message };
  }
}

async function testExportWithAccumulation() {
  console.log('\n=== テスト2: テーブル蓄積付きスプレッドシートエクスポート ===');
  const rows = createTestRows();
  const projectId = 'TEST-PRJ-' + Date.now();
  
  try {
    const response = await fetch(`${BASE_URL}/api/sheets/export-with-accumulation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rows,
        projectId,
        segmentId: 'TEST-SEG-' + Date.now(),
        exportedBy: 'test-user',
        exportedByName: 'テストユーザー',
      }),
    });

    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✓ テーブル蓄積付きエクスポート: 成功');
      console.log(`  メッセージ: ${result.message}`);
      console.log(`  エクスポートID: ${result.exportId || 'N/A'}`);
      console.log(`  追加行数: ${result.rowsAdded || rows.length}件`);
      return { ok: true, message: 'テーブル蓄積付きエクスポート成功', exportId: result.exportId };
    } else {
      console.log('✗ テーブル蓄積付きエクスポート: 失敗');
      console.log(`  ステータス: ${response.status}`);
      console.log(`  エラー: ${result.error || result.message || '不明なエラー'}`);
      return { ok: false, message: result.error || result.message || 'エクスポート失敗' };
    }
  } catch (error) {
    console.log('✗ テーブル蓄積付きエクスポート: エラー');
    console.log(`  エラー: ${error.message}`);
    return { ok: false, message: error.message };
  }
}

async function testExportHistory() {
  console.log('\n=== テスト3: エクスポート履歴の取得 ===');
  
  try {
    const response = await fetch(`${BASE_URL}/api/sheets/exports?limit=5`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('✗ エクスポート履歴取得: 失敗');
      console.log(`  ステータス: ${response.status}`);
      console.log(`  エラー: ${error.error || '不明なエラー'}`);
      return { ok: false, message: error.error || '履歴取得失敗' };
    }

    const exports = await response.json();
    console.log('✓ エクスポート履歴取得: 成功');
    console.log(`  取得件数: ${Array.isArray(exports) ? exports.length : 0}件`);
    
    if (Array.isArray(exports) && exports.length > 0) {
      console.log('  最新のエクスポート:');
      const latest = exports[0];
      console.log(`    エクスポートID: ${latest.export_id}`);
      console.log(`    案件ID: ${latest.project_id}`);
      console.log(`    ステータス: ${latest.export_status}`);
      console.log(`    行数: ${latest.row_count || 0}件`);
    }
    
    return { ok: true, message: 'エクスポート履歴取得成功', count: Array.isArray(exports) ? exports.length : 0 };
  } catch (error) {
    console.log('✗ エクスポート履歴取得: エラー');
    console.log(`  エラー: ${error.message}`);
    return { ok: false, message: error.message };
  }
}

async function testDeferredExport() {
  console.log('\n=== テスト4: deferExport=true（キュー登録のみ）===');
  const rows = createTestRows();
  const projectId = 'TEST-PRJ-DEFER-' + Date.now();
  const segmentId = 'TEST-SEG-DEFER-' + Date.now();

  try {
    const response = await fetch(`${BASE_URL}/api/sheets/export-with-accumulation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows,
        projectId,
        segmentId,
        exportedBy: 'test-user',
        exportedByName: 'テストユーザー',
        deferExport: true,
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✓ キュー登録: 成功');
      console.log(`  メッセージ: ${result.message}`);
      console.log(`  エクスポートID: ${result.exportId || 'N/A'}`);
      return { ok: true, exportId: result.exportId };
    } else {
      console.log('✗ キュー登録: 失敗');
      console.log(`  ステータス: ${response.status}`);
      console.log(`  エラー: ${result.error || result.message || '不明なエラー'}`);
      return { ok: false };
    }
  } catch (error) {
    console.log('✗ キュー登録: エラー');
    console.log(`  エラー: ${error.message}`);
    return { ok: false };
  }
}

async function testScheduledBatch() {
  console.log('\n=== テスト5: 定期バッチ実行（/api/sheets/run-scheduled-export）===');

  if (!SCHEDULER_SECRET) {
    console.log('⚠ SCHEDULER_SECRET が未設定のためスキップ');
    console.log('  実行方法: SCHEDULER_SECRET=<secret> node scripts/test-spreadsheet-export.js <url>');
    return { ok: true, skipped: true };
  }

  try {
    const response = await fetch(`${BASE_URL}/api/sheets/run-scheduled-export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Scheduler-Token': SCHEDULER_SECRET,
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✓ バッチ実行: 成功');
      console.log(`  処理件数: ${result.totalProcessed}`);
      console.log(`  成功: ${result.succeeded} / 失敗: ${result.failed}`);
      if (result.results && result.results.length > 0) {
        result.results.forEach(r => {
          console.log(`  [${r.exportId}] ${r.success ? '成功' : '失敗'} ${r.rowsAdded != null ? `(${r.rowsAdded}行)` : r.error || ''}`);
        });
      }
      return { ok: true };
    } else {
      console.log('✗ バッチ実行: 失敗');
      console.log(`  ステータス: ${response.status}`);
      console.log(`  エラー: ${result.error || result.message || '不明なエラー'}`);
      return { ok: false };
    }
  } catch (error) {
    console.log('✗ バッチ実行: エラー');
    console.log(`  エラー: ${error.message}`);
    return { ok: false };
  }
}

async function main() {
  console.log('=== スプレッドシート書き出し機能のテスト ===');
  console.log('BASE_URL:', BASE_URL);
  console.log('');

  let failed = 0;
  let success = 0;

  // テスト1: 基本的なエクスポート
  const result1 = await testBasicExport();
  if (result1.ok) {
    success++;
  } else {
    failed++;
  }

  // テスト2: テーブル蓄積付きエクスポート
  const result2 = await testExportWithAccumulation();
  if (result2.ok) {
    success++;
  } else {
    failed++;
  }

  // テスト3: エクスポート履歴取得
  const result3 = await testExportHistory();
  if (result3.ok) {
    success++;
  } else {
    failed++;
  }

  // テスト4: deferExport=true でキューに登録
  const result4 = await testDeferredExport();
  if (result4.ok) {
    success++;
  } else {
    failed++;
  }

  // テスト5: バッチ実行（登録されたキューを処理）
  const result5 = await testScheduledBatch();
  if (result5.ok) {
    success++;
  } else {
    failed++;
  }

  console.log('\n=== テスト結果サマリー ===');
  console.log(`成功: ${success} 件`);
  console.log(`失敗: ${failed} 件`);
  console.log(`合計: ${success + failed} 件`);
  console.log('');

  if (failed === 0) {
    console.log('全てのスプレッドシート書き出しテストが正常に動作しました！');
    console.log('実際のスプレッドシートでデータが追加されているか確認してください。');
    process.exit(0);
  } else {
    console.log(`${failed} 件のテストが失敗しました。上記のエラー内容を確認してください。`);
    process.exit(1);
  }
}

main();
