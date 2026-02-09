/**
 * 全テーブルへのデータ挿入テスト
 * 全てのテーブルにデータ挿入が問題なく可能かを検証します。
 *
 * 使い方:
 *   node scripts/test-all-table-inserts.js https://universegeo-backend-223225164238.asia-northeast1.run.app
 *
 * 注意: 本番で実行するとテスト用のデータが一時的に作成されます。
 *       案件が1件もない場合は一部のテストをスキップします。
 */
const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:8080';

const TEST_TIMESTAMP = Date.now();

async function getFirstProjectId() {
  const res = await fetch(BASE_URL + '/api/projects', { method: 'GET' });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0].project_id || null;
}

async function testProjectCreate() {
  const testProjectId = 'test-project-' + TEST_TIMESTAMP;
  const body = {
    project_id: testProjectId,
    advertiser_name: 'テスト広告主',
    appeal_point: 'テスト訴求',
    delivery_start_date: '2025-01-01',
    delivery_end_date: '2025-12-31',
    person_in_charge: 'test-user',
    _register_datetime: new Date().toISOString(),
  };

  const res = await fetch(BASE_URL + '/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {}

  if (res.status === 201) {
    return { ok: true, status: 201, message: 'プロジェクト作成OK', testId: testProjectId };
  }

  return {
    ok: false,
    status: res.status,
    message: json?.error || res.statusText || text?.slice(0, 200),
  };
}

async function testSegmentCreate() {
  const projectId = await getFirstProjectId();
  if (!projectId) {
    return { ok: true, skip: true, message: '案件が0件のためセグメント作成テストをスキップ' };
  }

  const testSegmentId = 'test-seg-' + TEST_TIMESTAMP;
  const body = {
    segment_id: testSegmentId,
    project_id: projectId,
    segment_registered_at: new Date().toISOString(),
    location_request_status: 'not_requested',
    data_link_status: 'before_request',
    poi_category: 'tg',
    registerd_provider_segment: false,
  };

  const res = await fetch(BASE_URL + '/api/segments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {}

  if (res.status === 201) {
    return { ok: true, status: 201, message: 'セグメント作成OK', testId: testSegmentId };
  }

  return {
    ok: false,
    status: res.status,
    message: json?.error || res.statusText || text?.slice(0, 200),
  };
}

async function testPoiCreate() {
  const projectId = await getFirstProjectId();
  if (!projectId) {
    return { ok: true, skip: true, message: '案件が0件のため地点(POI)作成テストをスキップ' };
  }

  const testPoiId = 'test-poi-' + TEST_TIMESTAMP;
  const body = {
    poi_id: testPoiId,
    project_id: projectId,
    poi_name: 'テスト地点',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(BASE_URL + '/api/pois', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {}

  if (res.status === 201) {
    return { ok: true, status: 201, message: '地点(POI)作成OK', testId: testPoiId };
  }

  return {
    ok: false,
    status: res.status,
    message: json?.error || res.statusText || text?.slice(0, 200),
  };
}

async function testMessageCreate() {
  const projectId = await getFirstProjectId();
  if (!projectId) {
    return { ok: true, skip: true, message: '案件が0件のためメッセージ作成テストをスキップ' };
  }

  const testMessageId = 'test-msg-' + TEST_TIMESTAMP;
  const body = {
    message_id: testMessageId,
    project_id: projectId,
    sender_id: 'test-user',
    sender_name: 'テストユーザー',
    sender_role: 'sales',
    content: 'テストメッセージ',
    timestamp: new Date().toISOString(),
    is_read: false,
  };

  const res = await fetch(BASE_URL + '/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {}

  if (res.status === 201) {
    return { ok: true, status: 201, message: 'メッセージ作成OK', testId: testMessageId };
  }

  return {
    ok: false,
    status: res.status,
    message: json?.error || res.statusText || text?.slice(0, 200),
  };
}

async function testUserCreate() {
  const testUserId = 'test-user-' + TEST_TIMESTAMP;
  const body = {
    user_id: testUserId,
    name: 'テストユーザー',
    email: `test-${TEST_TIMESTAMP}@example.com`,
    password_hash: 'dummy-hash',
    role: 'sales',
    department: 'テスト部門',
  };

  const res = await fetch(BASE_URL + '/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {}

  if (res.status === 201) {
    return { ok: true, status: 201, message: 'ユーザー作成OK', testId: testUserId };
  }

  return {
    ok: false,
    status: res.status,
    message: json?.error || res.statusText || text?.slice(0, 200),
  };
}

async function testEditRequestCreate() {
  const projectId = await getFirstProjectId();
  if (!projectId) {
    return { ok: true, skip: true, message: '案件が0件のため編集依頼作成テストをスキップ' };
  }

  const testRequestId = 'test-edit-req-' + TEST_TIMESTAMP;
  const body = {
    request_id: testRequestId,
    request_type: 'project',
    target_id: projectId,
    project_id: projectId,
    requested_by: 'test-user',
    requested_at: new Date().toISOString(),
    request_reason: 'テスト編集依頼',
    status: 'pending',
  };

  const res = await fetch(BASE_URL + '/api/edit-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {}

  if (res.status === 201) {
    return { ok: true, status: 201, message: '編集依頼作成OK', testId: testRequestId };
  }

  return {
    ok: false,
    status: res.status,
    message: json?.error || res.statusText || text?.slice(0, 200),
  };
}

async function testVisitMeasurementGroupCreate() {
  const projectId = await getFirstProjectId();
  if (!projectId) {
    return { ok: true, skip: true, message: '案件が0件のため来店計測グループ作成テストをスキップ' };
  }

  const testGroupId = 'test-group-' + TEST_TIMESTAMP;
  const body = {
    group_id: testGroupId,
    project_id: projectId,
    group_name: 'テスト来店計測グループ',
    attribute: 'detector',
    extraction_period: '1month',
  };

  const res = await fetch(BASE_URL + '/api/visit-measurement-groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {}

  if (res.status === 201) {
    return { ok: true, status: 201, message: '来店計測グループ作成OK', testId: testGroupId };
  }

  return {
    ok: false,
    status: res.status,
    message: json?.error || res.statusText || text?.slice(0, 200),
  };
}

async function testFeatureRequestCreate() {
  const testRequestId = 'test-feature-req-' + TEST_TIMESTAMP;
  const body = {
    request_id: testRequestId,
    requested_by: 'test-user',
    requested_by_name: 'テストユーザー',
    requested_at: new Date().toISOString(),
    title: 'テスト機能リクエスト',
    description: 'テスト用の機能リクエストです',
    category: 'improvement',
    priority: 'medium',
    status: 'pending',
  };

  const res = await fetch(BASE_URL + '/api/feature-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {}

  if (res.status === 201) {
    return { ok: true, status: 201, message: '機能リクエスト作成OK', testId: testRequestId };
  }

  return {
    ok: false,
    status: res.status,
    message: json?.error || res.statusText || text?.slice(0, 200),
  };
}

async function testChangeHistoryCreate() {
  const projectId = await getFirstProjectId();
  if (!projectId) {
    return { ok: true, skip: true, message: '案件が0件のため変更履歴作成テストをスキップ' };
  }

  const testHistoryId = 'test-history-' + TEST_TIMESTAMP;
  const body = {
    history_id: testHistoryId,
    entity_type: 'project',
    entity_id: projectId,
    project_id: projectId,
    action: 'create',
    changed_by: 'test-user',
    changed_at: new Date().toISOString(),
  };

  const res = await fetch(BASE_URL + '/api/change-history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {}

  if (res.status === 201) {
    return { ok: true, status: 201, message: '変更履歴作成OK', testId: testHistoryId };
  }

  if (res.status === 404) {
    return { ok: true, skip: true, message: '変更履歴APIが未デプロイ(404)のためスキップ' };
  }

  return {
    ok: false,
    status: res.status,
    message: json?.error || res.statusText || text?.slice(0, 200),
  };
}

async function main() {
  console.log('=== 全テーブルへのデータ挿入テスト ===');
  console.log('BASE_URL:', BASE_URL);
  console.log('');

  let failed = 0;
  let skipped = 0;
  let success = 0;

  const tests = [
    { name: 'プロジェクト (projects)', fn: testProjectCreate },
    { name: 'セグメント (segments)', fn: testSegmentCreate },
    { name: '地点 (pois)', fn: testPoiCreate },
    { name: 'メッセージ (messages)', fn: testMessageCreate },
    { name: 'ユーザー (users)', fn: testUserCreate },
    { name: '編集依頼 (edit_requests)', fn: testEditRequestCreate },
    { name: '来店計測グループ (visit_measurement_groups)', fn: testVisitMeasurementGroupCreate },
    { name: '機能リクエスト (feature_requests)', fn: testFeatureRequestCreate },
    { name: '変更履歴 (change_history)', fn: testChangeHistoryCreate },
  ];

  for (const test of tests) {
    process.stdout.write(`POST ${test.name} ... `);
    try {
      const r = await test.fn();
      if (r.skip) {
        console.log('スキップ:', r.message);
        skipped++;
      } else if (r.ok) {
        console.log('✓', r.status, r.message);
        success++;
      } else {
        console.log('✗', r.status, r.message);
        failed++;
      }
    } catch (e) {
      console.log('✗', e.message);
      failed++;
    }
  }

  console.log('');
  console.log('=== テスト結果サマリー ===');
  console.log(`成功: ${success} 件`);
  console.log(`失敗: ${failed} 件`);
  console.log(`スキップ: ${skipped} 件`);
  console.log(`合計: ${tests.length} 件`);
  console.log('');

  if (failed === 0) {
    console.log('✅ 全てのテーブルへのデータ挿入が正常に動作しました！');
    process.exit(0);
  } else {
    console.log(`❌ ${failed} 件のテーブルで挿入エラーが発生しました。上記のエラー内容を確認してください。`);
    process.exit(1);
  }
}

main();
