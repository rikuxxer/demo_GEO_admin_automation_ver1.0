/**
 * API 書き込み（POST/PUT）の動作テスト
 * GET のみの test-api-endpoints.js では検知できない「POST で 500」などを検出する。
 *
 * 使い方:
 *   node scripts/test-api-write-endpoints.js https://your-backend-url.run.app
 *
 * 注意: 本番で実行するとテスト用のセグメントが一時的に作成され、直後に削除されます。
 *       案件が1件もない場合はセグメント作成テストをスキップします。
 */
const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:8080';

const TEST_SEGMENT_ID = 'e2e-test-seg-write-' + Date.now();
const TEST_POI_ID = 'e2e-test-poi-write-' + Date.now();

async function getFirstProjectId() {
  const res = await fetch(BASE_URL + '/api/projects', { method: 'GET' });
  if (!res.ok) return null;
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return data[0].project_id || null;
}

async function testSegmentCreate() {
  const projectId = await getFirstProjectId();
  if (!projectId) {
    return { ok: true, skip: true, message: '案件が0件のためセグメント作成テストをスキップ' };
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
    // 作成成功 → 削除してクリーンアップ
    const delRes = await fetch(BASE_URL + '/api/segments/' + encodeURIComponent(TEST_SEGMENT_ID), {
      method: 'DELETE',
    });
    if (!delRes.ok) {
      const delText = await delRes.text();
      let delErr = '';
      try {
        const j = JSON.parse(delText);
        delErr = j.error || delText.slice(0, 150);
      } catch (_) {
        delErr = delText.slice(0, 150);
      }
      return {
        ok: false,
        status: res.status,
        message: '作成はOKだが削除が失敗: ' + delRes.status + ' ' + delErr,
        deleteFailed: true,
      };
    }
    return { ok: true, status: 201, message: '作成・削除OK' };
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

  const body = {
    poi_id: TEST_POI_ID,
    project_id: projectId,
    poi_name: 'E2Eテスト地点',
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
    const delRes = await fetch(BASE_URL + '/api/pois/' + encodeURIComponent(TEST_POI_ID), {
      method: 'DELETE',
    });
    if (!delRes.ok) {
      const delText = await delRes.text();
      let delErr = '';
      try {
        const j = JSON.parse(delText);
        delErr = j.error || delText.slice(0, 150);
      } catch (_) {
        delErr = delText.slice(0, 150);
      }
      return {
        ok: false,
        status: res.status,
        message: '作成はOKだが削除が失敗: ' + delRes.status + ' ' + delErr,
        deleteFailed: true,
      };
    }
    return { ok: true, status: 201, message: '作成・削除OK' };
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

  const body = {
    history_id: 'e2e-test-his-' + Date.now(),
    entity_type: 'project',
    entity_id: projectId,
    project_id: projectId,
    action: 'create',
    changed_by: 'e2e-test',
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
    return { ok: true, status: 201, message: '変更履歴登録OK' };
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
  console.log('=== API 書き込みテスト（POST/PUT のエラー検知）===');
  console.log('BASE_URL:', BASE_URL);
  console.log('');

  let failed = 0;

  // POST /api/segments
  process.stdout.write('POST /api/segments (作成→削除) ... ');
  try {
    const r = await testSegmentCreate();
    if (r.skip) {
      console.log('スキップ:', r.message);
    } else if (r.ok) {
      console.log('✓', r.status, r.message);
    } else {
      console.log('✗', r.status, r.message);
      failed++;
    }
  } catch (e) {
    console.log('✗', e.message);
    failed++;
  }

  // POST /api/pois（地点）
  process.stdout.write('POST /api/pois (作成→削除) ... ');
  try {
    const r = await testPoiCreate();
    if (r.skip) {
      console.log('スキップ:', r.message);
    } else if (r.ok) {
      console.log('✓', r.status, r.message);
    } else {
      console.log('✗', r.status, r.message);
      failed++;
    }
  } catch (e) {
    console.log('✗', e.message);
    failed++;
  }

  // POST /api/change-history
  process.stdout.write('POST /api/change-history ... ');
  try {
    const r = await testChangeHistoryCreate();
    if (r.skip) {
      console.log('スキップ:', r.message);
    } else if (r.ok) {
      console.log('✓', r.status, r.message);
    } else {
      console.log('✗', r.status, r.message);
      failed++;
    }
  } catch (e) {
    console.log('✗', e.message);
    failed++;
  }

  console.log('');
  if (failed === 0) {
    console.log('書き込みテスト: 検証した項目にエラーはありませんでした。');
    process.exit(0);
  } else {
    console.log('書き込みテスト: ' + failed + ' 件でエラー（500/4xx 等）。上記のステータス・メッセージを確認してください。');
    process.exit(1);
  }
}

main();
