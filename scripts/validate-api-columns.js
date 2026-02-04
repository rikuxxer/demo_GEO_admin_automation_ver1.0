/**
 * 全APIエンドポイントのレスポンスが「期待するカラム」を持っているか検証するスクリプト
 * 使い方: node scripts/validate-api-columns.js http://localhost:8080
 *    または: node scripts/validate-api-columns.js https://your-backend.run.app
 *
 * バックエンドが起動している必要があります。データが0件のエンドポイントは「スキップ」となります。
 */
const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:8080';

// 各GETエンドポイントと、レスポンス配列の1件目に含まれるべき必須カラム（スキーマ／BigQueryに合わせた最小セット）
const ENDPOINTS_WITH_COLUMNS = [
  { path: '/api/projects', name: 'プロジェクト', requiredColumns: ['project_id', 'advertiser_name', 'appeal_point', 'delivery_start_date', 'delivery_end_date', 'person_in_charge'] },
  { path: '/api/segments', name: 'セグメント', requiredColumns: ['segment_id', 'project_id'] },
  { path: '/api/segments/project/dummy-project-id', name: 'セグメント(案件指定)', requiredColumns: ['segment_id', 'project_id'], skipIfEmpty: true },
  { path: '/api/pois', name: 'POI', requiredColumns: ['poi_id', 'project_id', 'poi_name'] },
  { path: '/api/pois/project/dummy-project-id', name: 'POI(案件指定)', requiredColumns: ['poi_id', 'project_id'], skipIfEmpty: true },
  { path: '/api/users', name: 'ユーザー', requiredColumns: ['user_id'] },
  { path: '/api/user-requests', name: 'ユーザー登録申請', requiredColumns: [] },
  { path: '/api/messages', name: 'メッセージ', requiredColumns: [] },
  { path: '/api/messages/dummy-project-id', name: 'メッセージ(案件指定)', requiredColumns: ['message_id', 'project_id'], skipIfEmpty: true },
  { path: '/api/edit-requests', name: '編集依頼', requiredColumns: ['request_id', 'project_id'] },
  { path: '/api/visit-measurement-groups/project/dummy-project-id', name: '来店計測グループ', requiredColumns: ['group_id', 'project_id', 'group_name'], skipIfEmpty: true },
  { path: '/api/feature-requests', name: '機能リクエスト', requiredColumns: ['request_id', 'requested_by', 'title'] },
  { path: '/api/change-history', name: '変更履歴', requiredColumns: ['history_id', 'project_id', 'entity_type', 'action', 'changed_at'] },
  { path: '/api/sheets/exports', name: 'スプレッドシートエクスポート履歴', requiredColumns: [] },
];

async function validateEndpoint(ep) {
  const url = BASE_URL + ep.path;
  try {
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) {
      return { name: ep.name, path: ep.path, status: res.status, ok: false, error: `HTTP ${res.status}` };
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return { name: ep.name, path: ep.path, status: res.status, ok: false, error: 'JSONではない' };
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      return { name: ep.name, path: ep.path, status: res.status, ok: false, error: '配列ではない' };
    }
    if (data.length === 0) {
      const skip = ep.skipIfEmpty !== false;
      return {
        name: ep.name,
        path: ep.path,
        status: res.status,
        ok: true,
        count: 0,
        skipped: skip,
        message: '0件のためカラム検証をスキップ',
        columnsPresent: [],
        columnsMissing: [],
      };
    }
    const first = data[0];
    const required = ep.requiredColumns || [];
    const columnsPresent = Object.keys(first);
    const columnsMissing = required.filter((col) => !(col in first));
    const ok = columnsMissing.length === 0;
    return {
      name: ep.name,
      path: ep.path,
      status: res.status,
      ok,
      count: data.length,
      skipped: false,
      columnsPresent,
      columnsMissing,
      message: ok
        ? `OK (${data.length}件, 必須カラムすべて存在)`
        : `不足カラム: ${columnsMissing.join(', ')}`,
    };
  } catch (err) {
    return { name: ep.name, path: ep.path, status: null, ok: false, error: err.message };
  }
}

async function main() {
  console.log('=== 全カラム接続確認（APIレスポンスの必須カラム検証）===');
  console.log('BASE_URL:', BASE_URL);
  console.log('');

  let failed = 0;
  const results = [];

  for (const ep of ENDPOINTS_WITH_COLUMNS) {
    const result = await validateEndpoint(ep);
    results.push(result);
    const icon = result.ok ? '✓' : '✗';
    if (!result.ok) failed++;

    if (result.error) {
      console.log(`${icon} ${result.name} ${ep.path}`);
      console.log(`   → ${result.error}`);
    } else if (result.skipped) {
      console.log(`${icon} ${result.name} ${ep.path} (${result.message})`);
    } else {
      console.log(`${icon} ${result.name} ${ep.path} (${result.count}件)`);
      console.log(`   → ${result.message}`);
      if (result.columnsMissing && result.columnsMissing.length > 0) {
        console.log(`   不足: ${result.columnsMissing.join(', ')}`);
      }
      if (result.ok && result.columnsPresent && result.columnsPresent.length <= 20) {
        console.log(`   存在カラム: ${result.columnsPresent.join(', ')}`);
      } else if (result.ok && result.columnsPresent && result.columnsPresent.length > 20) {
        console.log(`   存在カラム: ${result.columnsPresent.length}個 (${result.columnsPresent.slice(0, 10).join(', ')} ...)`);
      }
    }
  }

  console.log('');
  const okCount = results.filter((r) => r.ok).length;
  const skipCount = results.filter((r) => r.skipped).length;
  const withData = results.filter((r) => r.ok && !r.skipped && r.count > 0).length;

  console.log('--- サマリ ---');
  console.log(`接続・形式OK: ${okCount}/${results.length} エンドポイント`);
  console.log(`データありでカラム検証済み: ${withData} エンドポイント`);
  console.log(`0件でスキップ: ${skipCount} エンドポイント`);

  if (failed > 0) {
    console.log('');
    console.log(`${failed} 件でエラーまたは必須カラム不足があります。`);
    process.exit(1);
  }

  console.log('');
  console.log('すべてのエンドポイントで必須カラムが揃っているか、または0件でスキップされました。');
  process.exit(0);
}

main();
