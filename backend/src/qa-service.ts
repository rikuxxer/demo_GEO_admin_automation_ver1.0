import { BigQuery } from '@google-cloud/bigquery';
import { VertexAI } from '@google-cloud/vertexai';
import { randomUUID } from 'crypto';

export interface QaMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatResult {
  reply: string;
  latency_ms: number;
  context_chars: number;
}

const BQ_LOCATION: string = (process.env.BQ_LOCATION?.trim()) || 'asia-northeast1';
const VERTEX_AI_LOCATION = process.env.VERTEX_AI_LOCATION || 'us-central1';
const VERTEX_AI_MODEL = process.env.VERTEX_AI_MODEL || 'gemini-2.0-flash-001';

let bqClient: BigQuery | null = null;

function getClient(): BigQuery {
  if (!bqClient) {
    const projectId = process.env.GCP_PROJECT_ID?.trim();
    const config: Record<string, string> = {};
    if (projectId) config.projectId = projectId;
    bqClient = new BigQuery(config);
  }
  return bqClient;
}

function getProjectId(): string {
  const id = process.env.GCP_PROJECT_ID?.trim();
  if (!id) throw new Error('GCP_PROJECT_ID is not set');
  return id;
}

// bigquery-client.ts の getDatasetId() と同じ正規化ロジック
function getDatasetId(): string {
  let datasetId = (process.env.BQ_DATASET || 'universegeo_dataset').trim();
  if (datasetId.includes('.')) {
    const parts = datasetId.split('.');
    if (parts.length > 1) {
      const firstPart = parts[0];
      if (/^[a-z0-9-]+$/.test(firstPart) && firstPart.length > 5) {
        datasetId = parts.slice(1).join('.');
      }
    }
  }
  return datasetId;
}

export function isQaConfigured(): boolean {
  return !!(process.env.GCP_PROJECT_ID?.trim());
}

async function buildContext(): Promise<string> {
  const projectId = getProjectId();
  const datasetId = getDatasetId();
  const bq = getClient();
  const today = new Date().toISOString().split('T')[0];

  const sections: string[] = [`# UNIVERSEGEO 案件データ（${today} 時点）`];

  // 1. 案件一覧（セグメント件数付き）
  try {
    const [projectRows] = await bq.query({
      query: `
        SELECT
          p.project_id,
          p.advertiser_name,
          p.status,
          p.delivery_start,
          p.delivery_end,
          p.sales_person,
          COUNT(s.segment_id) AS segment_count
        FROM \`${projectId}.${datasetId}.projects\` p
        LEFT JOIN \`${projectId}.${datasetId}.segments\` s ON p.project_id = s.project_id
        GROUP BY p.project_id, p.advertiser_name, p.status, p.delivery_start, p.delivery_end, p.sales_person
        ORDER BY p._register_datetime DESC
        LIMIT 200
      `,
      location: BQ_LOCATION,
    });

    if (projectRows.length > 0) {
      sections.push('\n## 案件一覧');
      sections.push('| project_id | 広告主名 | ステータス | 配信開始 | 配信終了 | 担当者 | セグメント数 |');
      sections.push('|-----------|---------|----------|---------|---------|-------|------------|');
      for (const r of projectRows) {
        const start = r.delivery_start ? String(r.delivery_start).split('T')[0] : '-';
        const end = r.delivery_end ? String(r.delivery_end).split('T')[0] : '-';
        sections.push(
          `| ${r.project_id} | ${r.advertiser_name || '-'} | ${r.status || '-'} | ${start} | ${end} | ${r.sales_person || '-'} | ${r.segment_count ?? 0} |`
        );
      }
    }
  } catch (_) {
    // テーブル未作成等は無視
  }

  // 2. プロジェクトメッセージ履歴（全件）
  try {
    const [msgRows] = await bq.query({
      query: `
        SELECT
          m.project_id,
          m.sender_name,
          m.sender_role,
          m.content,
          m.timestamp
        FROM \`${projectId}.${datasetId}.messages\` m
        ORDER BY m.timestamp ASC
        LIMIT 500
      `,
      location: BQ_LOCATION,
    });

    if (msgRows.length > 0) {
      sections.push('\n## プロジェクトメッセージ履歴（全件）');
      for (const r of msgRows) {
        const ts = r.timestamp ? String(r.timestamp).replace('T', ' ').substring(0, 16) : '-';
        sections.push(
          `[${ts}] ${r.project_id} / ${r.sender_name || '-'}（${r.sender_role || '-'}）: ${r.content || ''}`
        );
      }
    }
  } catch (_) {
    // ignore
  }

  // 3. 変更履歴（直近90日）
  try {
    const [histRows] = await bq.query({
      query: `
        SELECT
          project_id,
          entity_type,
          entity_id,
          action,
          changed_by,
          changed_at
        FROM \`${projectId}.${datasetId}.change_history\`
        WHERE changed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
        ORDER BY changed_at ASC
        LIMIT 300
      `,
      location: BQ_LOCATION,
    });

    if (histRows.length > 0) {
      sections.push('\n## 変更履歴（直近90日）');
      for (const r of histRows) {
        const ts = r.changed_at ? String(r.changed_at).split('T')[0] : '-';
        sections.push(
          `[${ts}] ${r.project_id} ${r.entity_type}(${r.entity_id}) ${r.action} by ${r.changed_by || '-'}`
        );
      }
    }
  } catch (_) {
    // ignore
  }

  // 4. 過去のQ&A履歴（直近90日・最大200件）
  try {
    const [qaRows] = await bq.query({
      query: `
        SELECT role, content, created_at
        FROM \`${projectId}.${datasetId}.qa_logs\`
        WHERE source = 'ai_qa'
          AND created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
        ORDER BY created_at ASC
        LIMIT 200
      `,
      location: BQ_LOCATION,
    });

    if (qaRows.length > 0) {
      sections.push('\n## 過去のQ&A履歴（直近90日）');
      for (const r of qaRows) {
        const ts = r.created_at ? String(r.created_at).replace('T', ' ').substring(0, 16) : '-';
        sections.push(`[${ts}] ${r.role}: ${r.content}`);
      }
    }
  } catch (_) {
    // qa_logs テーブル未作成の場合は無視
  }

  return sections.join('\n');
}

export async function chatWithContext(messages: QaMessage[]): Promise<ChatResult> {
  const projectId = getProjectId();
  const context = await buildContext();

  const vertexai = new VertexAI({ project: projectId, location: VERTEX_AI_LOCATION });
  const model = vertexai.getGenerativeModel({
    model: VERTEX_AI_MODEL,
    systemInstruction: {
      role: 'system',
      parts: [
        {
          text: `あなたは UNIVERSEGEO（位置情報広告配信管理システム）のアシスタントです。
以下の最新データおよび過去のやり取りを参照して、案件状況・セグメント・配信設定などの
質問に日本語で答えてください。
回答する際は、根拠となる案件ID・広告主名・日付など具体的なデータを引用してください。
データに存在しない情報は「確認できません」と答えてください。

${context}`,
        },
      ],
    },
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  const chat = model.startChat({ history });

  const t0 = Date.now();
  const result = await chat.sendMessage(lastMessage.content);
  const latency_ms = Date.now() - t0;

  const response = await result.response;
  const reply =
    response.candidates?.[0]?.content?.parts?.[0]?.text ?? '回答を取得できませんでした。';

  return { reply, latency_ms, context_chars: context.length };
}

// 直前の user/model ペアを qa_logs に保存する
// modelLogId はルート側で事前生成して渡す（レスポンスと DB を同一 ID に保つため）
export async function saveQaLogs(
  sessionId: string,
  userId: string,
  userMessage: QaMessage,
  modelReply: string,
  latency_ms: number,
  context_chars: number,
  modelLogId: string
): Promise<void> {
  const projectId = getProjectId();
  const datasetId = getDatasetId();
  const bq = getClient();
  const now = new Date().toISOString();

  const rows = [
    {
      log_id: randomUUID(),
      session_id: sessionId,
      user_id: userId || '',
      role: 'user',
      content: userMessage.content,
      created_at: now,
      source: 'ai_qa',
      feedback: null,
      latency_ms: null,
      context_chars: null,
      model_id: null,
    },
    {
      log_id: modelLogId,
      session_id: sessionId,
      user_id: userId || '',
      role: 'model',
      content: modelReply,
      created_at: now,
      source: 'ai_qa',
      feedback: null,
      latency_ms,
      context_chars,
      model_id: VERTEX_AI_MODEL,
    },
  ];

  await bq.dataset(datasetId).table('qa_logs').insert(rows, { ignoreUnknownValues: true });
}

export async function updateFeedback(logId: string, feedback: 'good' | 'bad'): Promise<void> {
  const projectId = getProjectId();
  const datasetId = getDatasetId();
  const bq = getClient();

  await bq.query({
    query: `
      UPDATE \`${projectId}.${datasetId}.qa_logs\`
      SET feedback = @feedback
      WHERE log_id = @log_id
    `,
    params: { feedback, log_id: logId },
    location: BQ_LOCATION,
  });
}
