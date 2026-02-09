/**
 * スプレッドシートへの書き出し機能の全パターンテスト
 *
 * SPREADSHEET_EXPORT_RULES.md に基づき、setting_flag 2,4,5,6,7,8 および
 * 基本エクスポート・テーブル蓄積付きエクスポートの全パターンを検証します。
 *
 * 使い方:
 *   node scripts/test-all-spreadsheet-patterns.js https://universegeo-backend-223225164238.asia-northeast1.run.app
 *
 * PowerShell の場合（&& は使えないため）:
 *   cd c:\Users\sakamoto_riku_microa\Downloads\UNIVERSEGEO_backup
 *   node scripts/test-all-spreadsheet-patterns.js https://universegeo-backend-223225164238.asia-northeast1.run.app
 */
const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:8080';

const TEST_TIMESTAMP = Date.now();

function createdDate() {
  const now = new Date();
  return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * SPREADSHEET_EXPORT_RULES に基づく全パターンのテスト行を生成
 * setting_flag: 2, 4, 5, 6, 7, 8
 */
function createRowsForAllPatterns() {
  const base = {
    brand_id: '',
    brand_name: 'テスト広告主（全パターン）',
    created: createdDate(),
  };

  return [
    // --- setting_flag 2: 半径0（未設定）
    {
      ...base,
      category_id: '',
      poi_id: `PATTERN-2-ZERO-${TEST_TIMESTAMP}`,
      poi_name: 'パターン2: 半径未設定',
      latitude: '35.681236',
      longitude: '139.767125',
      prefecture: '東京都',
      city: '千代田区',
      radius: '',
      polygon: '',
      setting_flag: '2',
    },
    // --- setting_flag 2: 自由入力範囲 1-999m（category_id 9900XXXX）
    {
      ...base,
      category_id: '99000050',
      poi_id: `PATTERN-2-50M-${TEST_TIMESTAMP}`,
      poi_name: 'パターン2: 50m自由入力',
      latitude: '35.676191',
      longitude: '139.650310',
      prefecture: '東京都',
      city: '新宿区',
      radius: '',
      polygon: '',
      setting_flag: '2',
    },
    {
      ...base,
      category_id: '99000500',
      poi_id: `PATTERN-2-500M-${TEST_TIMESTAMP}`,
      poi_name: 'パターン2: 500m自由入力',
      latitude: '35.689634',
      longitude: '139.691706',
      prefecture: '東京都',
      city: '渋谷区',
      radius: '',
      polygon: '',
      setting_flag: '2',
    },
    // --- setting_flag 4: 選択可能な値（1000m以上）
    {
      ...base,
      category_id: '',
      poi_id: `PATTERN-4-1000M-${TEST_TIMESTAMP}`,
      poi_name: 'パターン4: 1000m選択',
      latitude: '35.658584',
      longitude: '139.745431',
      prefecture: '東京都',
      city: '港区',
      radius: '1000',
      polygon: '',
      setting_flag: '4',
    },
    {
      ...base,
      category_id: '',
      poi_id: `PATTERN-4-5000M-${TEST_TIMESTAMP}`,
      poi_name: 'パターン4: 5000m選択',
      latitude: '35.710063',
      longitude: '139.810700',
      prefecture: '東京都',
      city: '江東区',
      radius: '5000',
      polygon: '',
      setting_flag: '4',
    },
    // --- setting_flag 5: ポリゴン地点（lng lat, lng lat, ...）
    {
      ...base,
      category_id: '',
      poi_id: `PATTERN-5-POLY-${TEST_TIMESTAMP}`,
      poi_name: 'パターン5: ポリゴン地点',
      latitude: '35.688454',
      longitude: '139.753710',
      prefecture: '東京都',
      city: '中央区',
      radius: '',
      polygon: '139.753710 35.688454, 139.745813 35.684898, 139.752000 35.686000',
      setting_flag: '5',
    },
    // --- setting_flag 6: 都道府県・市区町村指定
    {
      ...base,
      category_id: '',
      poi_id: `PATTERN-6-PREF-${TEST_TIMESTAMP}`,
      poi_name: 'パターン6: 都道府県市区町村指定',
      latitude: '',
      longitude: '',
      prefecture: '東京都',
      city: '千代田区',
      radius: '',
      polygon: '',
      setting_flag: '6',
    },
    // --- setting_flag 7: 居住者（緯度半径ベース）
    {
      ...base,
      category_id: '',
      poi_id: `PATTERN-7-RESIDENT-${TEST_TIMESTAMP}`,
      poi_name: 'パターン7: 居住者・半径',
      latitude: '35.661736',
      longitude: '139.703895',
      prefecture: '東京都',
      city: '品川区',
      radius: '1500',
      polygon: '',
      setting_flag: '7',
    },
    // --- setting_flag 8: 勤務者（緯度半径ベース）
    {
      ...base,
      category_id: '',
      poi_id: `PATTERN-8-WORKER-${TEST_TIMESTAMP}`,
      poi_name: 'パターン8: 勤務者・半径',
      latitude: '35.696107',
      longitude: '139.814453',
      prefecture: '東京都',
      city: '墨田区',
      radius: '2000',
      polygon: '',
      setting_flag: '8',
    },
  ];
}

async function testBasicExportAllPatterns() {
  console.log('=== テスト1: 基本エクスポート（全 setting_flag パターン 2,4,5,6,7,8） ===');
  const rows = createRowsForAllPatterns();

  try {
    const response = await fetch(`${BASE_URL}/api/sheets/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✓ 基本エクスポート（全パターン）: 成功');
      console.log(`  メッセージ: ${result.message}`);
      console.log(`  追加行数: ${result.rowsAdded ?? rows.length} 件`);
      return { ok: true, message: '基本エクスポート成功', count: rows.length };
    }

    console.log('✗ 基本エクスポート: 失敗');
    console.log(`  ステータス: ${response.status}`);
    console.log(`  エラー: ${result.error || result.message || '不明なエラー'}`);
    return { ok: false, message: result.error || result.message || 'エクスポート失敗' };
  } catch (error) {
    console.log('✗ 基本エクスポート: エラー');
    console.log(`  エラー: ${error.message}`);
    return { ok: false, message: error.message };
  }
}

async function testExportWithAccumulationAllPatterns() {
  console.log('\n=== テスト2: テーブル蓄積付きエクスポート（全パターン） ===');
  const rows = createRowsForAllPatterns();
  const projectId = `TEST-PRJ-${TEST_TIMESTAMP}`;
  const segmentId = `TEST-SEG-${TEST_TIMESTAMP}`;

  try {
    const response = await fetch(`${BASE_URL}/api/sheets/export-with-accumulation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rows,
        projectId,
        segmentId,
        exportedBy: 'test-all-patterns@script',
        exportedByName: '全パターンテスト',
      }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log('✓ テーブル蓄積付きエクスポート: 成功');
      console.log(`  メッセージ: ${result.message}`);
      console.log(`  エクスポートID: ${result.exportId || 'N/A'}`);
      console.log(`  追加行数: ${result.rowsAdded ?? rows.length} 件`);
      return { ok: true, message: 'テーブル蓄積付きエクスポート成功', exportId: result.exportId, count: rows.length };
    }

    console.log('✗ テーブル蓄積付きエクスポート: 失敗');
    console.log(`  ステータス: ${response.status}`);
    console.log(`  エラー: ${result.error || result.message || '不明なエラー'}`);
    return { ok: false, message: result.error || result.message || 'エクスポート失敗' };
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
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.log('✗ エクスポート履歴取得: 失敗');
      console.log(`  ステータス: ${response.status}`);
      console.log(`  エラー: ${error.error || '不明なエラー'}`);
      return { ok: false, message: error.error || '履歴取得失敗' };
    }

    const exports = await response.json();
    const list = Array.isArray(exports) ? exports : [];
    console.log('✓ エクスポート履歴取得: 成功');
    console.log(`  取得件数: ${list.length} 件`);

    if (list.length > 0) {
      const latest = list[0];
      console.log('  最新のエクスポート:');
      console.log(`    エクスポートID: ${latest.export_id}`);
      console.log(`    案件ID: ${latest.project_id}`);
      console.log(`    ステータス: ${latest.export_status}`);
      console.log(`    行数: ${latest.row_count ?? 0} 件`);
    }

    return { ok: true, message: 'エクスポート履歴取得成功', count: list.length };
  } catch (error) {
    console.log('✗ エクスポート履歴取得: エラー');
    console.log(`  エラー: ${error.message}`);
    return { ok: false, message: error.message };
  }
}

async function testSinglePatternExport(flag, label) {
  console.log(`\n=== 単体パターン: setting_flag ${flag} (${label}) ===`);
  const all = createRowsForAllPatterns();
  const rows = all.filter((r) => r.setting_flag === String(flag));
  if (rows.length === 0) {
    console.log(`  スキップ: setting_flag ${flag} の行がありません`);
    return { ok: true, skip: true };
  }

  try {
    const response = await fetch(`${BASE_URL}/api/sheets/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      console.log(`✓ setting_flag ${flag}: 成功 (${rows.length} 行)`);
      return { ok: true, count: rows.length };
    }

    console.log(`✗ setting_flag ${flag}: 失敗`);
    console.log(`  ステータス: ${response.status}`);
    console.log(`  エラー: ${result.error || result.message || '不明'}`);
    return { ok: false, message: result.error || result.message };
  } catch (error) {
    console.log(`✗ setting_flag ${flag}: エラー`);
    console.log(`  エラー: ${error.message}`);
    return { ok: false, message: error.message };
  }
}

async function main() {
  console.log('=== スプレッドシート書き出し・全パターンテスト ===');
  console.log('BASE_URL:', BASE_URL);
  console.log('対象: setting_flag 2, 4, 5, 6, 7, 8');
  console.log('');

  let success = 0;
  let failed = 0;

  const r1 = await testBasicExportAllPatterns();
  if (r1.ok) success++; else failed++;

  const r2 = await testExportWithAccumulationAllPatterns();
  if (r2.ok) success++; else failed++;

  const r3 = await testExportHistory();
  if (r3.ok) success++; else failed++;

  // オプション: 各 setting_flag の単体テスト（重複書き出しになるため軽めに）
  const singleTests = [
    [2, '半径未設定/自由入力'],
    [4, '選択可能半径'],
    [5, 'ポリゴン'],
    [6, '都道府県市区町村'],
    [7, '居住者'],
    [8, '勤務者'],
  ];
  for (const [flag, label] of singleTests) {
    const r = await testSinglePatternExport(flag, label);
    if (r.skip) continue;
    if (r.ok) success++; else failed++;
  }

  console.log('\n=== テスト結果サマリー ===');
  console.log(`成功: ${success} 件`);
  console.log(`失敗: ${failed} 件`);
  console.log(`合計: ${success + failed} 件`);
  console.log('');

  if (failed === 0) {
    console.log('✅ 全パターンのスプレッドシート書き出しテストが正常に完了しました。');
    console.log('💡 実際のスプレッドシートでデータが追加されているか確認してください。');
    process.exit(0);
  } else {
    console.log(`❌ ${failed} 件のテストが失敗しました。上記のエラーを確認してください。`);
    process.exit(1);
  }
}

main();
