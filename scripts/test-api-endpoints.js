/**
 * バックエンドAPI接続の簡易テスト（全GETエンドポイント＋レスポンス形式の簡易チェック）
 *
 * 使い方（URLを引数で指定・Windows PowerShell / Mac / Linux 共通）:
 *   node scripts/test-api-endpoints.js http://localhost:8080
 *   node scripts/test-api-endpoints.js https://your-backend.run.app
 *
 * レスポンスの形式（配列・必須キー）もチェックする場合:
 *   node scripts/test-api-endpoints.js http://localhost:8080 --validate
 *
 * 環境変数で指定する場合:
 *   Mac/Linux:  BASE_URL=https://your-backend.run.app node scripts/test-api-endpoints.js
 *   PowerShell: $env:BASE_URL="https://your-backend.run.app"; node scripts/test-api-endpoints.js
 */
const BASE_URL = process.env.BASE_URL || process.argv[2] || 'http://localhost:8080';
const VALIDATE = process.argv.includes('--validate');

// バックエンドの全GETエンドポイント（ID不要 or ダミーIDで呼べるもの）
const ENDPOINTS = [
  { method: 'GET', path: '/health', name: 'ヘルスチェック', expectArray: false, requiredKeys: ['status'] },
  { method: 'GET', path: '/api/projects', name: 'プロジェクト一覧', expectArray: true, requiredKeys: [] },
  { method: 'GET', path: '/api/segments', name: 'セグメント一覧', expectArray: true, requiredKeys: [] },
  { method: 'GET', path: '/api/segments/project/dummy-project-id', name: 'セグメント(案件指定)', expectArray: true, requiredKeys: [] },
  { method: 'GET', path: '/api/pois', name: 'POI一覧', expectArray: true, requiredKeys: [] },
  { method: 'GET', path: '/api/pois/project/dummy-project-id', name: 'POI(案件指定)', expectArray: true, requiredKeys: [] },
  { method: 'GET', path: '/api/users', name: 'ユーザー一覧', expectArray: true, requiredKeys: [] },
  { method: 'GET', path: '/api/user-requests', name: 'ユーザー登録申請一覧', expectArray: true, requiredKeys: [] },
  { method: 'GET', path: '/api/messages', name: 'メッセージ一覧', expectArray: true, requiredKeys: [] },
  { method: 'GET', path: '/api/messages/dummy-project-id', name: 'メッセージ(案件指定)', expectArray: true, requiredKeys: [] },
  { method: 'GET', path: '/api/edit-requests', name: '編集依頼一覧', expectArray: true, requiredKeys: [] },
  { method: 'GET', path: '/api/visit-measurement-groups/project/dummy-project-id', name: '来店計測グループ(案件指定)', expectArray: true, requiredKeys: [] },
  { method: 'GET', path: '/api/feature-requests', name: '機能リクエスト一覧', expectArray: true, requiredKeys: [] },
  { method: 'GET', path: '/api/change-history', name: '変更履歴', expectArray: true, requiredKeys: [] },
  { method: 'GET', path: '/api/sheets/exports', name: 'スプレッドシートエクスポート履歴', expectArray: true, requiredKeys: [] },
];

async function testEndpoint(ep) {
  const url = BASE_URL + ep.path;
  try {
    const res = await fetch(url, { method: ep.method });
    const ok = res.ok || res.status === 404;
    let body = null;
    let validationError = null;
    if (VALIDATE && res.ok && res.headers.get('content-type')?.includes('application/json')) {
      try {
        body = await res.json();
        if (ep.expectArray && !Array.isArray(body)) {
          validationError = '配列ではない';
        } else if (ep.requiredKeys?.length && Array.isArray(body) && body.length > 0) {
          const first = body[0];
          const missing = ep.requiredKeys.filter((k) => !(k in first));
          if (missing.length) validationError = `先頭要素に不足キー: ${missing.join(', ')}`;
        }
      } catch (e) {
        validationError = 'JSONパース失敗';
      }
    }
    return {
      name: ep.name,
      path: ep.path,
      status: res.status,
      ok: ok && !validationError,
      error: validationError || null,
    };
  } catch (err) {
    return { name: ep.name, path: ep.path, status: null, ok: false, error: err.message };
  }
}

async function main() {
  console.log('=== API接続テスト ===');
  console.log('BASE_URL:', BASE_URL);
  if (VALIDATE) console.log('モード: 接続＋レスポンス形式チェック (--validate)');
  console.log('');

  let failed = 0;
  for (const ep of ENDPOINTS) {
    const result = await testEndpoint(ep);
    const icon = result.ok ? '✓' : '✗';
    const status = result.status != null ? result.status : result.error;
    const extra = result.error ? ` (${result.error})` : '';
    console.log(`${icon} ${result.name} ${ep.path} -> ${status}${extra}`);
    if (!result.ok) failed++;
  }

  console.log('');
  if (failed === 0) {
    console.log(`全 ${ENDPOINTS.length} エンドポイントが応答しました（200/404等）。`);
    process.exit(0);
  } else {
    console.log(`${failed} 件のエンドポイントが接続できませんでした（バックエンドの起動・URLを確認してください）。`);
    process.exit(1);
  }
}

main();
