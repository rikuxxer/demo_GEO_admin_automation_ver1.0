/**
 * 「再度登録できない」のテスト（重複登録が正しく拒否されるか）
 *
 * 同じ ID で2回登録しようとしたとき、2回目がエラーになることを確認します。
 * 使い方: node scripts/test-api-duplicate-registration.js https://universegeo-backend-xxx.run.app
 */
const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:8080';

const TEST_SEGMENT_ID = 'e2e-dup-seg-' + Date.now();
const TEST_POI_ID = 'e2e-dup-poi-' + Date.now();

async function getFirstProjectId() {
  const res = await fetch(BASE_URL + '/api/projects', { method: 'GET' });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0].project_id || null;
}

async function testSegmentDuplicateRejected() {
  const projectId = await getFirstProjectId();
  if (!projectId) {
    return { ok: true, skip: true, message: '案件が0件のためスキップ' };
  }

  const body = {
    segment_id: TEST_SEGMENT_ID,
    project_id: projectId,
    segment_registered_at: new Date().toISOString(),
    location_request_status: 'not_requested',
    data_link_status: 'before_request',
    poi_category: 'tg',
    registerd_provider_segment: false,
  };

  const res1 = await fetch(BASE_URL + '/api/segments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res1.status !== 201) {
    const t = await res1.text();
    return { ok: false, message: '1回目のセグメント作成が失敗: ' + res1.status + ' ' + t.slice(0, 120) };
  }

  const res2 = await fetch(BASE_URL + '/api/segments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text2 = await res2.text();
  let json2 = null;
  try {
    json2 = text2 ? JSON.parse(text2) : null;
  } catch (_) {}

  const duplicateRejected = !res2.ok;
  const errMsg = json2?.error || text2?.slice(0, 150);

  if (duplicateRejected) {
    await fetch(BASE_URL + '/api/segments/' + encodeURIComponent(TEST_SEGMENT_ID), { method: 'DELETE' });
    return { ok: true, message: '2回目は拒否されました (' + res2.status + ')。再度登録できない挙動は正常です。' };
  }

  return {
    ok: false,
    message: '2回目のセグメント登録が許可されました (重複が拒否されていない): ' + res2.status + ' ' + (errMsg || ''),
  };
}

async function testPoiDuplicateRejected() {
  const projectId = await getFirstProjectId();
  if (!projectId) {
    return { ok: true, skip: true, message: '案件が0件のためスキップ' };
  }

  const body = {
    poi_id: TEST_POI_ID,
    project_id: projectId,
    poi_name: 'E2E重複テスト地点',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const res1 = await fetch(BASE_URL + '/api/pois', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (res1.status !== 201) {
    const t = await res1.text();
    return { ok: false, message: '1回目の地点作成が失敗: ' + res1.status + ' ' + t.slice(0, 120) };
  }

  const res2 = await fetch(BASE_URL + '/api/pois', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text2 = await res2.text();
  let json2 = null;
  try {
    json2 = text2 ? JSON.parse(text2) : null;
  } catch (_) {}

  const duplicateRejected = !res2.ok;

  if (duplicateRejected) {
    await fetch(BASE_URL + '/api/pois/' + encodeURIComponent(TEST_POI_ID), { method: 'DELETE' });
    return { ok: true, message: '2回目は拒否されました (' + res2.status + ')。再度登録できない挙動は正常です。' };
  }

  return {
    ok: false,
    message: '2回目の地点登録が許可されました (重複が拒否されていない): ' + res2.status,
  };
}

async function testProjectDuplicateRejected() {
  const projectId = await getFirstProjectId();
  if (!projectId) {
    return { ok: true, skip: true, message: '案件が0件のためスキップ' };
  }

  const body = {
    project_id: projectId,
    advertiser_name: 'E2E重複テスト',
    appeal_point: 'テスト',
    delivery_start_date: '2025-01-01',
    delivery_end_date: '2025-12-31',
    person_in_charge: 'test',
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

  const duplicateRejected = !res.ok;
  const errMsg = json?.error || text?.slice(0, 150);
  const hasAlreadyExists = (errMsg && typeof errMsg === 'string' && (errMsg.includes('already exists') || errMsg.includes('既に存在')));

  if (duplicateRejected) {
    return {
      ok: true,
      message: '同じproject_idでの登録は拒否されました (' + res.status + ')。再度登録できない挙動は正常です。' +
        (hasAlreadyExists ? ' メッセージに「既に存在」が含まれています。' : ''),
    };
  }

  return {
    ok: false,
    message: '同じproject_idでの登録が許可されました (重複が拒否されていない): ' + res.status,
  };
}

async function main() {
  console.log('=== 再度登録できないテスト（重複登録の拒否）===');
  console.log('BASE_URL:', BASE_URL);
  console.log('');

  let failed = 0;

  process.stdout.write('同じ project_id で案件を再登録 ... ');
  try {
    const r = await testProjectDuplicateRejected();
    if (r.skip) {
      console.log('スキップ:', r.message);
    } else if (r.ok) {
      console.log('✓', r.message);
    } else {
      console.log('✗', r.message);
      failed++;
    }
  } catch (e) {
    console.log('✗', e.message);
    failed++;
  }

  process.stdout.write('同じ segment_id でセグメントを2回作成 ... ');
  try {
    const r = await testSegmentDuplicateRejected();
    if (r.skip) {
      console.log('スキップ:', r.message);
    } else if (r.ok) {
      console.log('✓', r.message);
    } else {
      console.log('✗', r.message);
      failed++;
    }
  } catch (e) {
    console.log('✗', e.message);
    failed++;
  }

  process.stdout.write('同じ poi_id で地点を2回作成 ... ');
  try {
    const r = await testPoiDuplicateRejected();
    if (r.skip) {
      console.log('スキップ:', r.message);
    } else if (r.ok) {
      console.log('✓', r.message);
    } else {
      console.log('✗', r.message);
      failed++;
    }
  } catch (e) {
    console.log('✗', e.message);
    failed++;
  }

  console.log('');
  if (failed === 0) {
    console.log('重複登録はいずれも正しく拒否されました。再度登録できないエラーは想定どおり動作しています。');
    process.exit(0);
  } else {
    console.log(failed + ' 件で重複が拒否されていません。上記を確認してください。');
    process.exit(1);
  }
}

main();
