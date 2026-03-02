import { BigQuery } from '@google-cloud/bigquery';

function getDatasetId(): string {
  let datasetId = process.env.BQ_DATASET || 'universegeo_dataset';
  if (datasetId.includes('.')) {
    const parts = datasetId.split('.');
    if (parts.length > 1) {
      const firstPart = parts[0];
      if (/^[a-z0-9-]+$/.test(firstPart) && firstPart.length > 5) {
        console.warn(`⚠️ データセットIDにプロジェクトIDが含まれています: ${datasetId}`);
        console.warn(`   プロジェクトID部分を削除します: ${firstPart}`);
        datasetId = parts.slice(1).join('.');
        console.warn(`   修正後のデータセットID: ${datasetId}`);
      }
    }
  }
  return datasetId.trim();
}

export const datasetId = getDatasetId();

export function validateProjectId(): string {
  const currentProjectId = process.env.GCP_PROJECT_ID;
  if (!currentProjectId || currentProjectId.trim() === '') {
    const errorMsg = 'GCP_PROJECT_ID環境変数が設定されていません。Cloud Runの環境変数設定を確認してください。';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }
  return currentProjectId;
}

export const BQ_LOCATION: string = (process.env.BQ_LOCATION && process.env.BQ_LOCATION.trim()) || 'asia-northeast1';

if (!BQ_LOCATION || BQ_LOCATION.trim() === '') {
  throw new Error('BQ_LOCATION is not set correctly');
}
console.log('✅ BQ_LOCATION initialized:', BQ_LOCATION);

function getBigQueryConfig(): any {
  const config: any = {};
  const projectId = process.env.GCP_PROJECT_ID;
  if (projectId && projectId.trim()) {
    config.projectId = projectId.trim();
    console.log('✅ BigQuery client will use explicit projectId:', config.projectId);
  } else {
    console.warn('⚠️ GCP_PROJECT_IDが設定されていません。Cloud Runのデフォルトプロジェクトが使用される可能性があります。');
  }
  return config;
}

const bigqueryConfig = getBigQueryConfig();

if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.NODE_ENV !== 'production') {
  bigqueryConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

const projectIdPreview = process.env.GCP_PROJECT_ID && process.env.GCP_PROJECT_ID.trim()
  ? `${process.env.GCP_PROJECT_ID.substring(0, Math.min(10, process.env.GCP_PROJECT_ID.length))}...`
  : 'NOT SET (will be validated on first use)';

console.log('🔧 BigQuery client initialization:', {
  GCP_PROJECT_ID: projectIdPreview,
  BQ_DATASET: datasetId,
  location: BQ_LOCATION,
  hasKeyFilename: !!bigqueryConfig.keyFilename,
  nodeEnv: process.env.NODE_ENV,
});

if (!process.env.GCP_PROJECT_ID || !process.env.GCP_PROJECT_ID.trim()) {
  console.warn('⚠️ 警告: GCP_PROJECT_ID環境変数が設定されていません。');
  console.warn('   実際にBigQueryを使用する際にエラーが発生します。');
  console.warn('   Cloud Runの環境変数設定を確認してください。');
}

let bigquery: BigQuery | null = null;

export function initializeBigQueryClient(): BigQuery {
  if (bigquery) {
    const currentProjectId = validateProjectId();
    const clientProjectId = bigquery.projectId || '';
    if (clientProjectId && clientProjectId !== currentProjectId) {
      console.warn(`⚠️ BigQuery client projectId mismatch: client=${clientProjectId}, env=${currentProjectId}`);
      console.warn('   クライアントを再初期化します...');
      bigquery = null;
    } else {
      return bigquery;
    }
  }

  try {
    const config = getBigQueryConfig();
    bigquery = new BigQuery(config);

    const actualProjectId = bigquery.projectId || 'NOT SET';
    console.log('✅ BigQuery client created successfully');
    console.log('📋 BigQuery client config:', {
      configuredProjectId: config.projectId || 'NOT SET',
      actualProjectId: actualProjectId,
      datasetId: datasetId,
      location: BQ_LOCATION,
    });

    const expectedProjectId = process.env.GCP_PROJECT_ID?.trim();
    if (expectedProjectId && actualProjectId !== expectedProjectId) {
      console.error('❌ BigQuery client projectId mismatch!');
      console.error(`   期待値: ${expectedProjectId}`);
      console.error(`   実際の値: ${actualProjectId}`);
      console.error('   Cloud Runの環境変数設定を確認してください。');
    }

    return bigquery;
  } catch (error: any) {
    console.error('❌ BigQuery client initialization failed:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    console.warn('⚠️ Creating fallback BigQuery client with default config');
    try {
      bigquery = new BigQuery();
      console.warn('⚠️ Fallback client created (may use wrong project)');
      return bigquery;
    } catch (fallbackError: any) {
      console.error('❌ Fallback BigQuery client creation also failed:', fallbackError);
      throw new Error('BigQuery client initialization failed completely');
    }
  }
}

export function getCleanDatasetId(): string {
  if (datasetId.includes('.')) {
    const parts = datasetId.split('.');
    if (parts.length > 1 && /^[a-z0-9-]+$/.test(parts[0]) && parts[0].length > 5) {
      return parts.slice(1).join('.');
    }
  }
  return datasetId.trim();
}

export function getDataset() {
  const currentProjectId = validateProjectId();
  const bqClient = initializeBigQueryClient();
  const cleanDatasetId = getCleanDatasetId();

  console.log('📋 getDataset() called:', {
    projectId: currentProjectId,
    datasetId: cleanDatasetId,
    rawDatasetId: datasetId,
    clientProjectId: bqClient.projectId || 'NOT SET',
  });

  return bqClient.dataset(cleanDatasetId, { projectId: currentProjectId });
}

// ==================== スキーマ正規化関数 ====================

export function formatDateForBigQuery(dateValue: any): string | null {
  if (!dateValue) return null;

  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }

  if (typeof dateValue === 'string' && /^\d{4}\/\d{2}\/\d{2}$/.test(dateValue)) {
    return dateValue.replace(/\//g, '-');
  }

  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn(`⚠️ Invalid date value: ${dateValue}, setting to null`);
      return null;
    }
    return date.toISOString().split('T')[0];
  } catch (e) {
    console.warn(`⚠️ Date conversion error for ${dateValue}:`, e);
    return null;
  }
}

export function formatTimestampForBigQuery(timestampValue: any): string {
  if (timestampValue instanceof Date) {
    return timestampValue.toISOString();
  }
  if (typeof timestampValue === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timestampValue)) {
      return timestampValue;
    }
    const date = new Date(timestampValue);
    if (isNaN(date.getTime())) {
      console.warn(`⚠️ Invalid timestamp value: ${timestampValue}, using current time`);
      return new Date().toISOString();
    }
    return date.toISOString();
  }
  return new Date().toISOString();
}

export function formatTimeForBigQuery(timeValue: any): string | null {
  if (!timeValue) return null;

  if (typeof timeValue === 'string') {
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeValue)) {
      return timeValue;
    }
    if (/^\d{2}:\d{2}$/.test(timeValue)) {
      return `${timeValue}:00`;
    }
  }

  if (timeValue instanceof Date) {
    const hours = String(timeValue.getHours()).padStart(2, '0');
    const minutes = String(timeValue.getMinutes()).padStart(2, '0');
    const seconds = String(timeValue.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  console.warn(`⚠️ Invalid time value: ${timeValue}, setting to null`);
  return null;
}

export function formatBoolForBigQuery(boolValue: any): boolean {
  if (typeof boolValue === 'boolean') {
    return boolValue;
  }
  if (typeof boolValue === 'string') {
    const lower = boolValue.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  }
  if (typeof boolValue === 'number') {
    return boolValue !== 0;
  }
  return false;
}

export function formatMediaIdArrayForBigQuery(value: any): string[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const arr = value.filter((s: any) => s != null && String(s).trim() !== '').map((s: any) => String(s).trim());
    return arr.length > 0 ? arr : null;
  }
  const s = String(value).trim();
  return s ? [s] : null;
}

export function formatDeliveryMediaForBigQuery(value: any): string[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const arr = value.filter((s: any) => s != null && String(s).trim() !== '').map((s: any) => String(s).trim());
    return arr.length > 0 ? arr : null;
  }
  const s = String(value).trim();
  return s ? [s] : null;
}

export function formatMediaIdStringForBigQuery(value: any): string | null {
  const arr = formatMediaIdArrayForBigQuery(value);
  return arr && arr.length > 0 ? arr.join(',') : null;
}

export function formatDeliveryMediaStringForBigQuery(value: any): string | null {
  const arr = formatDeliveryMediaForBigQuery(value);
  return arr && arr.length > 0 ? arr.join(',') : null;
}

export const COUNTERS_TABLE = 'id_counters';

export async function ensureCountersTable(): Promise<void> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const query = `
    CREATE TABLE IF NOT EXISTS \`${currentProjectId}.${cleanDatasetId}.${COUNTERS_TABLE}\`
    (
      name STRING,
      next_id INT64,
      updated_at TIMESTAMP
    )
  `;
  await initializeBigQueryClient().query({ query, location: BQ_LOCATION });
}

export async function getNextProjectIdFromProjectsTable(): Promise<number> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const client = initializeBigQueryClient();
  const query = `
    SELECT IFNULL(
      MAX(CAST(REGEXP_EXTRACT(project_id, r'PRJ-(\\d+)') AS INT64)),
      0
    ) + 1 AS next_id
    FROM \`${currentProjectId}.${cleanDatasetId}.projects\`
    WHERE project_id LIKE 'PRJ-%'
      AND REGEXP_CONTAINS(project_id, r'^PRJ-\\d+$')
      AND CAST(REGEXP_EXTRACT(project_id, r'PRJ-(\\d+)') AS INT64) < 10000000
  `;
  const [rows] = await client.query({ query, location: BQ_LOCATION });
  // BigQuery v7+ returns INT64 as BigQueryInt object ({ value: "N" }), BigInt, or number
  const rawId = rows?.[0]?.next_id;
  const nextId =
    typeof rawId === 'number' ? rawId
    : typeof rawId === 'bigint' ? Number(rawId)
    : rawId !== null && rawId !== undefined
      ? parseInt(String(rawId?.value ?? rawId), 10)
      : NaN;
  if (!Number.isInteger(nextId) || nextId <= 0) {
    throw new Error('Failed to get next_id from projects table');
  }
  return nextId;
}

export async function getNextIdFromCounter(counterName: string): Promise<number> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const client = initializeBigQueryClient();

  try {
    await ensureCountersTable();
  } catch (err: any) {
    console.warn('id_counters table setup failed, falling back to projects table:', err?.message || err);
    return getNextProjectIdFromProjectsTable();
  }

  try {
    // MERGE atomically upserts and increments the counter.
    // client.query() cannot return rows from multi-statement scripts (SCRIPT jobs return
    // empty rows from getQueryResults on the parent job), so we use a single MERGE DML
    // statement followed by a separate SELECT to read back the committed value.
    const mergeQuery = `
      MERGE \`${currentProjectId}.${cleanDatasetId}.${COUNTERS_TABLE}\` AS T
      USING (
        SELECT
          @counter_name AS name,
          GREATEST(
            IFNULL(
              (SELECT CASE WHEN next_id < 10000000 THEN next_id + 1 ELSE 1 END
               FROM \`${currentProjectId}.${cleanDatasetId}.${COUNTERS_TABLE}\`
               WHERE name = @counter_name),
              1
            ),
            (SELECT IFNULL(MAX(CAST(REGEXP_EXTRACT(project_id, r'PRJ-(\\d+)') AS INT64)), 0) + 1
             FROM \`${currentProjectId}.${cleanDatasetId}.projects\`
             WHERE project_id LIKE 'PRJ-%'
               AND REGEXP_CONTAINS(project_id, r'^PRJ-\\d+$')
               AND CAST(REGEXP_EXTRACT(project_id, r'PRJ-(\\d+)') AS INT64) < 10000000)
          ) AS new_next_id
      ) AS S ON T.name = S.name
      WHEN MATCHED THEN
        UPDATE SET T.next_id = S.new_next_id, T.updated_at = CURRENT_TIMESTAMP()
      WHEN NOT MATCHED THEN
        INSERT (name, next_id, updated_at)
        VALUES (S.name, S.new_next_id, CURRENT_TIMESTAMP())
    `;
    await client.query({ query: mergeQuery, params: { counter_name: counterName }, location: BQ_LOCATION });

    const selectQuery = `
      SELECT next_id
      FROM \`${currentProjectId}.${cleanDatasetId}.${COUNTERS_TABLE}\`
      WHERE name = @counter_name
    `;
    const [rows] = await client.query({ query: selectQuery, params: { counter_name: counterName }, location: BQ_LOCATION });

    const rawId = rows?.[0]?.next_id;
    const nextId =
      typeof rawId === 'number' ? rawId
      : typeof rawId === 'bigint' ? Number(rawId)
      : rawId !== null && rawId !== undefined
        ? parseInt(String(rawId?.value ?? rawId), 10)
        : NaN;
    if (!Number.isInteger(nextId) || nextId <= 0) {
      throw new Error(`Failed to read next_id for counter: ${counterName}`);
    }
    return nextId;
  } catch (err: any) {
    console.warn('Counter MERGE failed, falling back to projects table:', err?.message || err);
    return getNextProjectIdFromProjectsTable();
  }
}

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
