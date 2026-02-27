import { BigQuery } from '@google-cloud/bigquery';
import { VertexAI } from '@google-cloud/vertexai';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';

// knowledge-base.md を起動時に1回だけ読み込む（__dirname は dev=src/ prod=dist/ どちらでも ../knowledge-base.md で到達）
function loadKnowledgeBase(): string {
  try {
    return readFileSync(join(__dirname, '../knowledge-base.md'), 'utf-8');
  } catch {
    return '';
  }
}

const KNOWLEDGE_BASE = loadKnowledgeBase();

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

  // 2. セグメント詳細（連携ステータス・連携日付含む）
  try {
    const [segRows] = await bq.query({
      query: `
        SELECT
          segment_id,
          project_id,
          segment_name,
          data_link_status,
          data_link_request_date,
          data_link_scheduled_date,
          segment_registered_at
        FROM \`${projectId}.${datasetId}.segments\`
        ORDER BY segment_registered_at DESC
        LIMIT 500
      `,
      location: BQ_LOCATION,
    });

    if (segRows.length > 0) {
      sections.push('\n## セグメント一覧（連携情報含む）');
      sections.push('| segment_id | project_id | セグメント名 | 連携ステータス | 連携依頼日 | 連携予定日 |');
      sections.push('|-----------|-----------|------------|-------------|---------|---------|');
      for (const r of segRows) {
        const reqDate = r.data_link_request_date ? String(r.data_link_request_date).split('T')[0] : '-';
        const schDate = r.data_link_scheduled_date ? String(r.data_link_scheduled_date).split('T')[0] : '-';
        sections.push(
          `| ${r.segment_id} | ${r.project_id} | ${r.segment_name || '-'} | ${r.data_link_status || '-'} | ${reqDate} | ${schDate} |`
        );
      }
    }
  } catch (_) {
    // ignore
  }

  // 3. プロジェクトメッセージ履歴（全件）
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

  // 4. 変更履歴（直近90日）
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

  // 5. 過去のQ&A履歴（直近90日・最大200件）
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
案件状況・配信設定・アプリの操作方法など、どんな質問にも日本語で答えてください。
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
- 住所から「緯度経度取得」ボタンで座標を自動取得可能

### TG地点と来店計測地点の違い
- **TG地点**: セグメントごとに管理。地点格納依頼後は編集不可
- **来店計測地点**: セグメントに従属しない。地点格納依頼後も編集可能。計測地点グループでグループ分け可能

### ステータス管理
- **地点格納依頼**: セグメント詳細の「地点格納依頼」ボタン → ステータスが「格納対応中」に変わる。TG地点は以後編集不可
- **データ連携依頼**: 「データ連携依頼」ボタン → ステータスが「連携依頼済」に変わる。その後管理部が連携を実行

### よくあるトラブル
- **地点が表示されない**: TG地点/来店計測地点タブの切り替え、グループフィルター、ページネーションを確認
- **編集できない**: TG地点で格納依頼済みの場合は修正依頼が必要。来店計測地点は格納依頼後も編集可能
- **CSVエラー**: ファイル形式（.xlsx/.csv）・必須項目（地点名＋住所 or 緯度経度）・文字コード（UTF-8）を確認

---

${KNOWLEDGE_BASE ? `## 追加ナレッジ\n\n${KNOWLEDGE_BASE}\n\n---\n\n` : ''}## 最新の案件データ

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
