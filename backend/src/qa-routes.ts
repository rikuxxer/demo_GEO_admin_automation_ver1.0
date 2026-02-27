import { Router } from 'express';
import { randomUUID } from 'crypto';
import { wrapAsync } from './middleware/async-wrapper';
import {
  chatWithContext,
  isQaConfigured,
  saveQaLogs,
  updateFeedback,
} from './qa-service';
import type { QaMessage } from './qa-service';

const router = Router();

// POST /api/qa/chat
router.post('/chat', wrapAsync(async (req, res) => {
  if (!isQaConfigured()) {
    res.status(503).json({ configured: false, error: 'QA機能が設定されていません' });
    return;
  }

  const { messages, sessionId, userId } = req.body as {
    messages?: QaMessage[];
    sessionId?: string;
    userId?: string;
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({
      error: 'messages は1件以上必要です',
      type: 'ValidationError',
      request_id: (req as any).request_id,
    });
    return;
  }

  const sid = sessionId || randomUUID();
  const uid = userId || '';

  const { reply, latency_ms, context_chars } = await chatWithContext(messages);

  const userMessage = messages[messages.length - 1];
  // model の log_id をここで生成し、レスポンスと DB を同じ ID にする
  const modelLogId = randomUUID();

  // 非同期でログ保存（レスポンスをブロックしない）
  saveQaLogs(sid, uid, userMessage, reply, latency_ms, context_chars, modelLogId).catch((err) => {
    console.error('[qa-routes] saveQaLogs error:', err?.message);
  });

  res.json({ reply, log_id: modelLogId });
}));

// POST /api/qa/feedback
router.post('/feedback', wrapAsync(async (req, res) => {
  if (!isQaConfigured()) {
    res.status(503).json({ configured: false, error: 'QA機能が設定されていません' });
    return;
  }

  const { log_id, feedback } = req.body as {
    log_id?: string;
    feedback?: string;
  };

  if (!log_id) {
    res.status(400).json({
      error: 'log_id は必須です',
      type: 'ValidationError',
      request_id: (req as any).request_id,
    });
    return;
  }

  if (feedback !== 'good' && feedback !== 'bad') {
    res.status(400).json({
      error: 'feedback は "good" または "bad" のみ有効です',
      type: 'ValidationError',
      request_id: (req as any).request_id,
    });
    return;
  }

  await updateFeedback(log_id, feedback);
  res.json({ updated: true });
}));

// POST /api/qa/import-logs（外部チャットアプリのログ取り込み用）
router.post('/import-logs', wrapAsync(async (req, res) => {
  if (!isQaConfigured()) {
    res.status(503).json({ configured: false, error: 'QA機能が設定されていません' });
    return;
  }

  const { logs } = req.body as {
    logs?: Array<{
      role: string;
      content: string;
      created_at: string;
      source: string;
      session_id: string;
      user_id?: string;
    }>;
  };

  if (!logs || !Array.isArray(logs) || logs.length === 0) {
    res.status(400).json({
      error: 'logs は1件以上必要です',
      type: 'ValidationError',
      request_id: (req as any).request_id,
    });
    return;
  }

  const { BigQuery } = await import('@google-cloud/bigquery');
  const { randomUUID: genId } = await import('crypto');
  const projectId = process.env.GCP_PROJECT_ID?.trim();
  let datasetId = (process.env.BQ_DATASET || 'universegeo_dataset').trim();
  if (datasetId.includes('.')) {
    const parts = datasetId.split('.');
    if (parts.length > 1 && /^[a-z0-9-]+$/.test(parts[0]) && parts[0].length > 5) {
      datasetId = parts.slice(1).join('.');
    }
  }
  const bqLocation =
    (process.env.BQ_LOCATION && process.env.BQ_LOCATION.trim()) || 'asia-northeast1';

  if (!projectId) {
    res.status(503).json({ error: 'GCP_PROJECT_ID が未設定です', type: 'ConfigurationError' });
    return;
  }

  const bq = new BigQuery({ projectId });
  const rows = logs.map((l) => ({
    log_id: genId(),
    session_id: l.session_id,
    user_id: l.user_id || '',
    role: l.role,
    content: l.content,
    created_at: l.created_at,
    source: l.source,
    feedback: null,
    latency_ms: null,
    context_chars: null,
    model_id: null,
  }));

  await bq.dataset(datasetId).table('qa_logs').insert(rows, { ignoreUnknownValues: true });

  res.json({ imported: rows.length });
}));

export default router;
