import { BigQuery } from '@google-cloud/bigquery';
import { VertexAI, FunctionDeclarationSchemaType } from '@google-cloud/vertexai';
import type { Tool, Part } from '@google-cloud/vertexai';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface QaMessage {
  role: 'user' | 'model';
  content: string;
}

export interface ChatResult {
  reply: string;
  latency_ms: number;
  context_chars: number;
}

const BQ_LOCATION: string = process.env.BQ_LOCATION?.trim() || 'asia-northeast1';
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

function getDatasetId(): string {
  let datasetId = (process.env.BQ_DATASET || 'universegeo_dataset').trim();
  if (datasetId.includes('.')) {
    const parts = datasetId.split('.');
    if (parts.length > 1 && /^[a-z0-9-]+$/.test(parts[0]) && parts[0].length > 5) {
      datasetId = parts.slice(1).join('.');
    }
  }
  return datasetId;
}

function loadKnowledgeBase(): string {
  try {
    return readFileSync(join(__dirname, '../knowledge-base.md'), 'utf-8');
  } catch {
    return '';
  }
}

const KNOWLEDGE_BASE = loadKnowledgeBase();

export function isQaConfigured(): boolean {
  return !!(process.env.GCP_PROJECT_ID?.trim());
}

// ==================== Tool definitions ====================

const TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: 'search_projects',
        description: '案件を検索する。ステータス・広告主名・配信期間で絞り込み可能。引数を省略すると全件取得（最大200件）',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            status: {
              type: FunctionDeclarationSchemaType.STRING,
              description: 'ステータスで絞り込み。例: draft, in_progress, completed, cancelled',
            },
            advertiser_name: {
              type: FunctionDeclarationSchemaType.STRING,
              description: '広告主名の部分一致検索',
            },
            delivery_from: {
              type: FunctionDeclarationSchemaType.STRING,
              description: '配信開始日以降で絞り込み（YYYY-MM-DD）',
            },
            delivery_to: {
              type: FunctionDeclarationSchemaType.STRING,
              description: '配信終了日以前で絞り込み（YYYY-MM-DD）',
            },
          },
        },
      },
      {
        name: 'get_segments',
        description: '指定した案件のセグメント一覧を取得する。データ連携ステータス・連携依頼日・連携予定日を含む',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            project_id: {
              type: FunctionDeclarationSchemaType.STRING,
              description: '取得対象の案件ID',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'search_messages',
        description: 'プロジェクトメッセージを検索する',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            project_id: {
              type: FunctionDeclarationSchemaType.STRING,
              description: '案件IDで絞り込み（省略可）',
            },
            keyword: {
              type: FunctionDeclarationSchemaType.STRING,
              description: 'メッセージ本文のキーワード検索（省略可）',
            },
            limit: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description: '取得件数上限（デフォルト50、最大200）',
            },
          },
        },
      },
      {
        name: 'get_change_history',
        description: '変更履歴を取得する',
        parameters: {
          type: FunctionDeclarationSchemaType.OBJECT,
          properties: {
            project_id: {
              type: FunctionDeclarationSchemaType.STRING,
              description: '案件IDで絞り込み（省略すると全案件）',
            },
            days: {
              type: FunctionDeclarationSchemaType.NUMBER,
              description: '直近N日分を取得（デフォルト90）',
            },
          },
        },
      },
    ],
  },
];

// ==================== Tool execution ====================

async function execSearchProjects(args: Record<string, any>): Promise<string> {
  const pid = getProjectId();
  const did = getDatasetId();
  const bq = getClient();

  const conditions: string[] = [];
  const params: Record<string, any> = {};

  if (args.status) {
    conditions.push('p.status = @status');
    params.status = args.status;
  }
  if (args.advertiser_name) {
    conditions.push('LOWER(p.advertiser_name) LIKE LOWER(@advertiser_name)');
    params.advertiser_name = `%${args.advertiser_name}%`;
  }
  if (args.delivery_from) {
    conditions.push('p.delivery_start >= @delivery_from');
    params.delivery_from = args.delivery_from;
  }
  if (args.delivery_to) {
    conditions.push('p.delivery_end <= @delivery_to');
    params.delivery_to = args.delivery_to;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await bq.query({
    query: `
      SELECT p.project_id, p.advertiser_name, p.status,
             p.delivery_start, p.delivery_end, p.sales_person,
             COUNT(s.segment_id) AS segment_count
      FROM \`${pid}.${did}.projects\` p
      LEFT JOIN \`${pid}.${did}.segments\` s ON p.project_id = s.project_id
      ${where}
      GROUP BY p.project_id, p.advertiser_name, p.status, p.delivery_start, p.delivery_end, p.sales_person
      ORDER BY p._register_datetime DESC
      LIMIT 200
    `,
    params: Object.keys(params).length ? params : undefined,
    location: BQ_LOCATION,
  });

  if (rows.length === 0) return '該当する案件はありません。';

  const lines = ['| project_id | 広告主名 | ステータス | 配信開始 | 配信終了 | 担当者 | セグメント数 |',
                 '|-----------|---------|----------|---------|---------|-------|------------|'];
  for (const r of rows) {
    const start = r.delivery_start ? String(r.delivery_start).split('T')[0] : '-';
    const end   = r.delivery_end   ? String(r.delivery_end).split('T')[0]   : '-';
    lines.push(`| ${r.project_id} | ${r.advertiser_name || '-'} | ${r.status || '-'} | ${start} | ${end} | ${r.sales_person || '-'} | ${r.segment_count ?? 0} |`);
  }
  return lines.join('\n');
}

async function execGetSegments(args: Record<string, any>): Promise<string> {
  const pid = getProjectId();
  const did = getDatasetId();
  const bq = getClient();

  const [rows] = await bq.query({
    query: `
      SELECT segment_id, segment_name, data_link_status,
             data_link_request_date, data_link_scheduled_date, segment_registered_at
      FROM \`${pid}.${did}.segments\`
      WHERE project_id = @project_id
      ORDER BY segment_registered_at DESC
    `,
    params: { project_id: args.project_id },
    location: BQ_LOCATION,
  });

  if (rows.length === 0) return `案件 ${args.project_id} にセグメントはありません。`;

  const lines = ['| segment_id | セグメント名 | 連携ステータス | 連携依頼日 | 連携予定日 |',
                 '|-----------|------------|-------------|---------|---------|'];
  for (const r of rows) {
    const req = r.data_link_request_date   ? String(r.data_link_request_date).split('T')[0]   : '-';
    const sch = r.data_link_scheduled_date ? String(r.data_link_scheduled_date).split('T')[0] : '-';
    lines.push(`| ${r.segment_id} | ${r.segment_name || '-'} | ${r.data_link_status || '-'} | ${req} | ${sch} |`);
  }
  return lines.join('\n');
}

async function execSearchMessages(args: Record<string, any>): Promise<string> {
  const pid = getProjectId();
  const did = getDatasetId();
  const bq = getClient();
  const limit = Math.min(Number(args.limit) || 50, 200);

  const conditions: string[] = [];
  const params: Record<string, any> = {};

  if (args.project_id) {
    conditions.push('project_id = @project_id');
    params.project_id = args.project_id;
  }
  if (args.keyword) {
    conditions.push('LOWER(content) LIKE LOWER(@keyword)');
    params.keyword = `%${args.keyword}%`;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const [rows] = await bq.query({
    query: `
      SELECT project_id, sender_name, sender_role, content, timestamp
      FROM \`${pid}.${did}.messages\`
      ${where}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `,
    params: Object.keys(params).length ? params : undefined,
    location: BQ_LOCATION,
  });

  if (rows.length === 0) return '該当するメッセージはありません。';

  return rows.map((r: any) => {
    const ts = r.timestamp ? String(r.timestamp).replace('T', ' ').substring(0, 16) : '-';
    return `[${ts}] ${r.project_id} / ${r.sender_name || '-'}（${r.sender_role || '-'}）: ${r.content || ''}`;
  }).join('\n');
}

async function execGetChangeHistory(args: Record<string, any>): Promise<string> {
  const pid = getProjectId();
  const did = getDatasetId();
  const bq = getClient();
  const days = Number(args.days) || 90;

  const conditions: string[] = [`changed_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL ${days} DAY)`];
  const params: Record<string, any> = {};

  if (args.project_id) {
    conditions.push('project_id = @project_id');
    params.project_id = args.project_id;
  }

  const [rows] = await bq.query({
    query: `
      SELECT project_id, entity_type, entity_id, action, changed_by, changed_at
      FROM \`${pid}.${did}.change_history\`
      WHERE ${conditions.join(' AND ')}
      ORDER BY changed_at DESC
      LIMIT 300
    `,
    params: Object.keys(params).length ? params : undefined,
    location: BQ_LOCATION,
  });

  if (rows.length === 0) return '該当する変更履歴はありません。';

  return rows.map((r: any) => {
    const ts = r.changed_at ? String(r.changed_at).split('T')[0] : '-';
    return `[${ts}] ${r.project_id} ${r.entity_type}(${r.entity_id}) ${r.action} by ${r.changed_by || '-'}`;
  }).join('\n');
}

async function executeTool(name: string, args: Record<string, any>): Promise<string> {
  try {
    switch (name) {
      case 'search_projects':   return await execSearchProjects(args);
      case 'get_segments':      return await execGetSegments(args);
      case 'search_messages':   return await execSearchMessages(args);
      case 'get_change_history': return await execGetChangeHistory(args);
      default: return `未知のツール: ${name}`;
    }
  } catch (err: any) {
    return `ツール実行エラー（${name}）: ${err?.message}`;
  }
}

// ==================== Chat ====================

export async function chatWithContext(messages: QaMessage[]): Promise<ChatResult> {
  const projectId = getProjectId();

  const vertexai = new VertexAI({ project: projectId, location: VERTEX_AI_LOCATION });
  const model = vertexai.getGenerativeModel({
    model: VERTEX_AI_MODEL,
    systemInstruction: {
      role: 'system',
      parts: [{
        text: `あなたは UNIVERSEGEO（位置情報広告配信管理システム）のアシスタントです。
案件状況・配信設定・アプリの操作方法など、どんな質問にも日本語で答えてください。
データが必要なときはツールを呼び出して取得してください。
回答する際は、根拠となる案件ID・広告主名・日付など具体的なデータを引用してください。
データに存在しない情報は「確認できません」と答えてください。

---

## アプリの使い方

### 案件の作成
1. 案件管理画面の「案件を追加」ボタンをクリック
2. 案件情報（広告主名、代理店名、訴求ポイントなど）を入力
3. 「登録」ボタンをクリック

### セグメントの作成
1. 案件詳細画面で「セグメント」タブを選択
2. 「セグメントを追加」ボタンをクリック
3. セグメント情報（セグメント名、配信媒体など）を入力
4. セグメント共通条件（指定半径、抽出期間、属性など）を設定
5. 「登録」ボタンをクリック

### 地点の登録方法（3種類）
- **手動登録**: 地点名と住所または緯度経度を個別に入力
- **CSV一括登録**: Excelファイルをアップロードして一括登録（1行目ヘッダー、UTF-8形式）
- **表形式コピペ**: ExcelやGoogleスプレッドシートからコピーして貼り付け

### TG地点と来店計測地点の違い
- **TG地点**: セグメントごとに管理。地点格納依頼後は編集不可
- **来店計測地点**: セグメントに従属しない。地点格納依頼後も編集可能

### ステータス管理
- **地点格納依頼**: 「地点格納依頼」ボタン → ステータスが「格納対応中」に変わる
- **データ連携依頼**: 「データ連携依頼」ボタン → ステータスが「連携依頼済」に変わる

### よくあるトラブル
- **地点が表示されない**: TG地点/来店計測地点タブの切り替え、グループフィルター、ページネーションを確認
- **編集できない**: TG地点で格納依頼済みの場合は修正依頼が必要
- **CSVエラー**: ファイル形式（.xlsx/.csv）・必須項目・文字コード（UTF-8）を確認

---

${KNOWLEDGE_BASE ? `## 追加ナレッジ\n\n${KNOWLEDGE_BASE}\n\n---\n\n` : ''}`,
      }],
    },
  });

  const history = messages.slice(0, -1).map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }));

  const lastMessage = messages[messages.length - 1];
  const chat = model.startChat({ history, tools: TOOLS });

  const t0 = Date.now();
  let result = await chat.sendMessage(lastMessage.content);
  let totalToolChars = 0;

  // Function calling ループ（Gemini がツール呼び出しを止めるまで繰り返す）
  for (let i = 0; i < 10; i++) {
    const parts = result.response.candidates?.[0]?.content?.parts ?? [];
    const callParts = parts.filter((p: any) => p.functionCall);
    if (callParts.length === 0) break;

    const responseParts: Part[] = await Promise.all(
      callParts.map(async (p: any) => {
        const output = await executeTool(p.functionCall.name, p.functionCall.args ?? {});
        totalToolChars += output.length;
        return {
          functionResponse: {
            name: p.functionCall.name,
            response: { result: output },
          },
        } as Part;
      })
    );

    result = await chat.sendMessage(responseParts);
  }

  const latency_ms = Date.now() - t0;
  const parts = result.response.candidates?.[0]?.content?.parts ?? [];
  const reply = parts.filter((p: any) => p.text).map((p: any) => p.text).join('') || '回答を取得できませんでした。';

  return { reply, latency_ms, context_chars: totalToolChars };
}

// ==================== Logging ====================

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
