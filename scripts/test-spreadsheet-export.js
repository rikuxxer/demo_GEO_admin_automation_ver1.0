/**
 * スプレッドシートへの書き出し機能のテスト
 * 
 * 使い方:
 *   node scripts/test-spreadsheet-export.js https://your-backend-url.run.app
 */
const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:8080';
const SCHEDULER_SECRET = process.env.SCHEDULER_SECRET || process.argv[3] || '';

// フロントエンドと同じ変換ルールで生成したサンプルデータ
// setting_flag: 2=自由入力半径(1-999m), 4=選択半径(1000m+), 5=ポリゴン, 6=都道府県
function createTestRows() {
  const now = new Date();
  const createdDate = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;

  return [
    {
      // 手動入力 + 選択半径 1000m → setting_flag=4, category_id=空, radius=1000
      category_id: '',
      brand_id: '',
      brand_name: 'サンプル株式会社',
      poi_id: 'seg-uni-001',
      poi_name: '東京駅',
      latitude: '35.6812362',
      longitude: '139.7671248',
      prefecture: '東京都',
      city: '千代田区',
      radius: '1000',
      polygon: '',
      setting_flag: '4',
      created: createdDate,
    },
    {
      // 手動入力 + 自由入力半径 500m → setting_flag=2, category_id=99000500, radius=空
      category_id: '99000500',
      brand_id: '',
      brand_name: 'サンプル株式会社',
      poi_id: 'seg-uni-001',
      poi_name: '新宿駅',
      latitude: '35.6896067',
      longitude: '139.7005713',
      prefecture: '東京都',
      city: '新宿区',
      radius: '',
      polygon: '',
      setting_flag: '2',
      created: createdDate,
    },
    {
      // 都道府県指定 → setting_flag=6, category_id=空, radius=空
      category_id: '',
      brand_id: '',
      brand_name: 'サンプル株式会社',
      poi_id: 'seg-uni-001',
      poi_name: '渋谷区全域',
      latitude: '',
      longitude: '',
      prefecture: '東京都',
      city: '渋谷区',
      radius: '',
      polygon: '',
      setting_flag: '6',
      created: createdDate,
    },
    {
      // ポリゴン指定 → setting_flag=5, category_id=空, radius=空
      category_id: '',
      brand_id: '',
      brand_name: 'サンプル株式会社',
      poi_id: 'seg-uni-001',
      poi_name: '渋谷スクランブル交差点エリア',
      latitude: '35.6594',
      longitude: '139.7006',
      prefecture: '東京都',
      city: '渋谷区',
      radius: '',
      polygon: '139.6993 35.6603, 139.7018 35.6603, 139.7018 35.6585, 139.6993 35.6585, 139.6993 35.6603',
      setting_flag: '5',
      created: createdDate,
    },
    {
      // 都道府県指定（複数都道府県の1件目）→ setting_flag=6, 東京都
      // prefectures配列が複数ある場合、フロントエンドは1都道府県につき1行に展開して送信する
      category_id: '',
      brand_id: '',
      brand_name: 'サンプル株式会社',
      poi_id: 'seg-uni-002',
      poi_name: '関東エリア全域',
      latitude: '',
      longitude: '',
      prefecture: '東京都',
      city: '',
      radius: '',
      polygon: '',
      setting_flag: '6',
      created: createdDate,
    },
    {
      // 都道府県指定（複数都道府県の2件目）→ setting_flag=6, 神奈川県
      category_id: '',
      brand_id: '',
      brand_name: 'サンプル株式会社',
      poi_id: 'seg-uni-002',
      poi_name: '関東エリア全域',
      latitude: '',
      longitude: '',
      prefecture: '神奈川県',
      city: '',
      radius: '',
      polygon: '',
      setting_flag: '6',
      created: createdDate,
    },
    {
      // 都道府県指定 + 居住者 → setting_flag=7
      category_id: '',
      brand_id: '',
      brand_name: 'サンプル株式会社',
      poi_id: 'seg-uni-004',
      poi_name: '大阪府居住者エリア',
      latitude: '',
      longitude: '',
      prefecture: '大阪府',
      city: '',
      radius: '',
      polygon: '',
      setting_flag: '7',
      created: createdDate,
    },
    {
      // 都道府県指定 + 勤務者 → setting_flag=8
      category_id: '',
      brand_id: '',
      brand_name: 'サンプル株式会社',
      poi_id: 'seg-uni-005',
      poi_name: '愛知県勤務者エリア',
      latitude: '',
      longitude: '',
      prefecture: '愛知県',
      city: '',
      radius: '',
      polygon: '',
      setting_flag: '8',
      created: createdDate,
    },
    {
      // 住所のみで登録（lat/lng なし）→ setting_flag=2（デフォルト）, category_id=空
      // poi.address から都道府県・市区町村を抽出した結果。ジオコーディング未実施のケース。
      category_id: '',
      brand_id: '',
      brand_name: 'サンプル株式会社',
      poi_id: 'seg-uni-006',
      poi_name: '丸の内オフィス',
      latitude: '',
      longitude: '',
      prefecture: '東京都',
      city: '千代田区',
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
  const projectId = 'PRJ-TEST';

  try {
    const response = await fetch(`${BASE_URL}/api/sheets/export-with-accumulation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rows,
        projectId,
        segmentId: 'seg-uni-001',
        exportedBy: 'sales@example.com',
        exportedByName: '営業担当',
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
  const projectId = 'PRJ-TEST';
  const segmentId = 'seg-uni-001';

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
