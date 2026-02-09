import { BigQuery } from '@google-cloud/bigquery';

// 環境変数からデータセットIDを取得（プロジェクトIDのプレフィックスを削除）
function getDatasetId(): string {
  let datasetId = process.env.BQ_DATASET || 'universegeo_dataset';
  
  // データセットIDにプロジェクトIDが含まれている場合（例: "univere-geo-demo.universegeo_dataset"）、削除
  // プロジェクトIDは通常、ドットで区切られた形式（例: "my-project-id"）
  // データセットIDは通常、アンダースコアやハイフンを含む（例: "my_dataset"）
  // もし "project.dataset" 形式の場合、データセット部分のみを取得
  if (datasetId.includes('.')) {
    const parts = datasetId.split('.');
    // 最後の部分がデータセットID（通常はプロジェクトIDの後に続く）
    // ただし、データセットID自体にドットが含まれる可能性は低い
    if (parts.length > 1) {
      // プロジェクトIDの形式をチェック（通常は小文字、数字、ハイフンのみ）
      const firstPart = parts[0];
      const secondPart = parts[1];
      // 最初の部分がプロジェクトIDっぽい場合（小文字、数字、ハイフンのみ）、2番目以降を結合
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

const datasetId = getDatasetId();

// プロジェクトIDの検証関数（遅延評価）
function validateProjectId(): string {
  const currentProjectId = process.env.GCP_PROJECT_ID;
  if (!currentProjectId || currentProjectId.trim() === '') {
    const errorMsg = 'GCP_PROJECT_ID環境変数が設定されていません。Cloud Runの環境変数設定を確認してください。';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }
  return currentProjectId;
}

// BigQueryのロケーション（固定値）
// 注意: この値は必ず'asia-northeast1'である必要があります
const BQ_LOCATION: string = 'asia-northeast1'; // 東京リージョン

// BQ_LOCATIONが正しく設定されているか確認
if (!BQ_LOCATION || BQ_LOCATION.trim() === '') {
  throw new Error('BQ_LOCATION is not set correctly');
}
console.log('✅ BQ_LOCATION initialized:', BQ_LOCATION);

// BigQueryクライアントの初期化
// Cloud Runではサービスアカウントが自動的に認証されるため、keyFilenameは不要
// 注意: BigQueryクライアントの初期化時にlocationを設定することはできません
// locationはクエリ実行時にのみ指定できます
// projectIdは環境変数から取得して明示的に設定する（Cloud Runのデフォルトプロジェクトを回避）
function getBigQueryConfig(): any {
  const config: any = {};
  
  // プロジェクトIDを明示的に設定（環境変数が設定されている場合）
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

// ローカル開発環境でのみkeyFilenameを使用
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.NODE_ENV !== 'production') {
  bigqueryConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

// ログ出力（projectIdは使用時に取得）
// 安全にログ出力（GCP_PROJECT_IDが空文字列の場合も考慮）
// モジュール読み込み時には環境変数が設定されていない可能性があるため、エラーをスローしない
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

// 環境変数が設定されていない場合の警告（エラーはスローしない）
if (!process.env.GCP_PROJECT_ID || !process.env.GCP_PROJECT_ID.trim()) {
  console.warn('⚠️ 警告: GCP_PROJECT_ID環境変数が設定されていません。');
  console.warn('   実際にBigQueryを使用する際にエラーが発生します。');
  console.warn('   Cloud Runの環境変数設定を確認してください。');
}

// BigQueryクライアントの初期化（エラーハンドリング付き）
// 注意: モジュール読み込み時にエラーが発生しても、アプリケーションは起動を続ける
let bigquery: BigQuery | null = null;

function initializeBigQueryClient(): BigQuery {
  if (bigquery) {
    // 既存のクライアントのprojectIdを確認
    const currentProjectId = validateProjectId();
    const clientProjectId = bigquery.projectId || '';
    
    // プロジェクトIDが一致しない場合、再初期化
    if (clientProjectId && clientProjectId !== currentProjectId) {
      console.warn(`⚠️ BigQuery client projectId mismatch: client=${clientProjectId}, env=${currentProjectId}`);
      console.warn('   クライアントを再初期化します...');
      bigquery = null;
    } else {
      return bigquery;
    }
  }
  
  try {
    // 最新の設定でクライアントを初期化
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
    
    // プロジェクトIDの検証
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
    // エラーが発生してもアプリケーションは起動を続ける（実際の使用時にエラーが発生する）
    // ただし、BigQueryクライアントが作成できない場合は、デフォルト設定で再試行
    console.warn('⚠️ Creating fallback BigQuery client with default config');
    try {
      bigquery = new BigQuery();
      console.warn('⚠️ Fallback client created (may use wrong project)');
      return bigquery;
    } catch (fallbackError: any) {
      console.error('❌ Fallback BigQuery client creation also failed:', fallbackError);
      // 最後の手段として、nullを返す（実際の使用時にエラーが発生する）
      throw new Error('BigQuery client initialization failed completely');
    }
  }
}

// モジュール読み込み時には初期化しない（実際の使用時に初期化）
// これにより、モジュール読み込み時のエラーを回避

// データセットIDをクリーンアップ（プロジェクトIDのプレフィックスを削除）
function getCleanDatasetId(): string {
  // データセットIDにプロジェクトIDが含まれている場合（例: "univere-geo-demo.universegeo_dataset"）、削除
  if (datasetId.includes('.')) {
    const parts = datasetId.split('.');
    // 最初の部分がプロジェクトIDっぽい場合（小文字、数字、ハイフンのみ）、2番目以降を結合
    if (parts.length > 1 && /^[a-z0-9-]+$/.test(parts[0]) && parts[0].length > 5) {
      return parts.slice(1).join('.');
    }
  }
  return datasetId.trim();
}

// datasetは使用時に取得（projectIdが設定されている必要がある）
// 注意: 明示的にプロジェクトIDを指定して、二重指定を回避
function getDataset() {
  const currentProjectId = validateProjectId();
  const bqClient = initializeBigQueryClient();
  const cleanDatasetId = getCleanDatasetId();
  
  console.log('📋 getDataset() called:', {
    projectId: currentProjectId,
    datasetId: cleanDatasetId,
    rawDatasetId: datasetId,
    clientProjectId: bqClient.projectId || 'NOT SET',
  });
  
  // 明示的にプロジェクトIDを指定してデータセットを取得
  // これにより、クライアントのデフォルトプロジェクトIDが使用されることを防ぐ
  return bqClient.dataset(cleanDatasetId, { projectId: currentProjectId });
}

// ==================== スキーマ正規化関数 ====================

// DATE型フィールドをYYYY-MM-DD形式に変換
function formatDateForBigQuery(dateValue: any): string | null {
  if (!dateValue) return null;
  
  // 既にYYYY-MM-DD形式の場合はそのまま返す
  if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    return dateValue;
  }
  
  // YYYY/MM/DD形式をYYYY-MM-DDに変換
  if (typeof dateValue === 'string' && /^\d{4}\/\d{2}\/\d{2}$/.test(dateValue)) {
    return dateValue.replace(/\//g, '-');
  }
  
  // DateオブジェクトまたはISO datetime文字列をYYYY-MM-DDに変換
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      console.warn(`⚠️ Invalid date value: ${dateValue}, setting to null`);
      return null;
    }
    return date.toISOString().split('T')[0]; // YYYY-MM-DD形式に変換
  } catch (e) {
    console.warn(`⚠️ Date conversion error for ${dateValue}:`, e);
    return null;
  }
}

// TIMESTAMP型フィールドをRFC3339/ISO形式に変換
function formatTimestampForBigQuery(timestampValue: any): string {
  if (timestampValue instanceof Date) {
    return timestampValue.toISOString();
  }
  if (typeof timestampValue === 'string') {
    // 既にISO形式の場合はそのまま返す
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(timestampValue)) {
      return timestampValue;
    }
    // Dateオブジェクトに変換してISO形式に
    const date = new Date(timestampValue);
    if (isNaN(date.getTime())) {
      console.warn(`⚠️ Invalid timestamp value: ${timestampValue}, using current time`);
      return new Date().toISOString();
    }
    return date.toISOString();
  }
  // その他の場合は現在時刻を使用
  return new Date().toISOString();
}

// TIME型フィールドをHH:MM:SS形式に変換
function formatTimeForBigQuery(timeValue: any): string | null {
  if (!timeValue) return null;
  
  if (typeof timeValue === 'string') {
    // 既にHH:MM:SS形式の場合はそのまま返す
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeValue)) {
      return timeValue;
    }
    // HH:MM形式をHH:MM:SSに変換
    if (/^\d{2}:\d{2}$/.test(timeValue)) {
      return `${timeValue}:00`;
    }
  }
  
  // Dateオブジェクトから時刻部分を抽出
  if (timeValue instanceof Date) {
    const hours = String(timeValue.getHours()).padStart(2, '0');
    const minutes = String(timeValue.getMinutes()).padStart(2, '0');
    const seconds = String(timeValue.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }
  
  console.warn(`⚠️ Invalid time value: ${timeValue}, setting to null`);
  return null;
}

// BOOL型フィールドをbooleanに変換
function formatBoolForBigQuery(boolValue: any): boolean {
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

// media_id を ARRAY<STRING> 用に正規化（string | string[] → string[]）
function formatMediaIdArrayForBigQuery(value: any): string[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const arr = value.filter((s: any) => s != null && String(s).trim() !== '').map((s: any) => String(s).trim());
    return arr.length > 0 ? arr : null;
  }
  const s = String(value).trim();
  return s ? [s] : null;
}

// delivery_media を ARRAY<STRING> 用に正規化（string | string[] → string[]）
function formatDeliveryMediaForBigQuery(value: any): string[] | null {
  if (value == null) return null;
  if (Array.isArray(value)) {
    const arr = value.filter((s: any) => s != null && String(s).trim() !== '').map((s: any) => String(s).trim());
    return arr.length > 0 ? arr : null;
  }
  const s = String(value).trim();
  return s ? [s] : null;
}

const COUNTERS_TABLE = 'id_counters';

async function ensureCountersTable(): Promise<void> {
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

/**
 * トランザクションスクリプトを使わず、projects テーブルの MAX(連番)+1 で次の案件IDを取得する。
 * getNextIdFromCounter が失敗したときのフォールバック用（同時実行時は重複の可能性あり）。
 */
async function getNextProjectIdFromProjectsTable(): Promise<number> {
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
  `;
  const [rows] = await client.query({ query, location: BQ_LOCATION });
  const nextId = rows?.[0]?.next_id;
  if (typeof nextId !== 'number') {
    throw new Error('Failed to get next_id from projects table');
  }
  return nextId;
}

async function getNextIdFromCounter(counterName: string): Promise<number> {
  const currentProjectId = validateProjectId();
  const cleanDatasetId = getCleanDatasetId();
  const client = initializeBigQueryClient();

  try {
    await ensureCountersTable();
  } catch (err: any) {
    console.warn('⚠️ id_counters テーブル確保に失敗、projects から採番します:', err?.message || err);
    return getNextProjectIdFromProjectsTable();
  }

  try {
    const query = `
      BEGIN TRANSACTION;
        DECLARE max_id INT64;
        DECLARE next_val INT64;

        SET max_id = (
          SELECT IFNULL(
            MAX(CAST(REGEXP_EXTRACT(project_id, r'PRJ-(\\d+)') AS INT64)),
            0
          )
          FROM \`${currentProjectId}.${cleanDatasetId}.projects\`
          WHERE project_id LIKE 'PRJ-%'
            AND REGEXP_CONTAINS(project_id, r'^PRJ-\\d+$')
        );
        SET next_val = max_id + 1;

        IF NOT EXISTS (
          SELECT 1 FROM \`${currentProjectId}.${cleanDatasetId}.${COUNTERS_TABLE}\`
          WHERE name = @counter_name
        ) THEN
          INSERT INTO \`${currentProjectId}.${cleanDatasetId}.${COUNTERS_TABLE}\`
            (name, next_id, updated_at)
          VALUES
            (@counter_name, next_val, CURRENT_TIMESTAMP());
        ELSE
          UPDATE \`${currentProjectId}.${cleanDatasetId}.${COUNTERS_TABLE}\`
          SET next_id = GREATEST(next_id + 1, next_val),
              updated_at = CURRENT_TIMESTAMP()
          WHERE name = @counter_name;
        END IF;

        SELECT next_id FROM \`${currentProjectId}.${cleanDatasetId}.${COUNTERS_TABLE}\`
        WHERE name = @counter_name;
      COMMIT TRANSACTION;
    `;

    const [rows] = await client.query({
      query,
      params: { counter_name: counterName },
      location: BQ_LOCATION,
    });

    const nextId = rows?.[0]?.next_id;
    if (typeof nextId !== 'number') {
      throw new Error(`Failed to allocate next_id for counter: ${counterName}`);
    }
    return nextId;
  } catch (err: any) {
    console.warn('⚠️ カウンタースクリプトが失敗したため、projects テーブルから採番します:', err?.message || err);
    return getNextProjectIdFromProjectsTable();
  }
}

export class BigQueryService {
  // ==================== プロジェクト ====================
  
  /**
   * 次の案件IDを生成（連番形式: PRJ-1, PRJ-2, ...）
   */
  async generateNextProjectId(options?: { mode?: 'sequential' | 'timestamp' }): Promise<string> {
    try {
      const mode = options?.mode ?? 'sequential';
      if (mode === 'timestamp') {
        const fallbackId = `PRJ-${Date.now()}${Math.floor(Math.random() * 1000)
          .toString()
          .padStart(3, '0')}`;
        console.warn('⚠️ タイムスタンプ採番を使用:', fallbackId);
        return fallbackId;
      }

      const nextNumber = await getNextIdFromCounter('project_id');
      const newProjectId = `PRJ-${nextNumber}`;
      console.log('✅ 生成された案件ID:', newProjectId);
      return newProjectId;
    } catch (error: any) {
      console.error('❌ 案件ID生成エラー（連番・projects からの取得も失敗）:', error?.message || error);
      // 上記が両方失敗した場合のみ、タイムスタンプベースのフォールバック
      const fallbackId = `PRJ-${Date.now()}${Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0')}`;
      console.warn('⚠️ フォールバックIDを使用（projects テーブルの確認や BigQuery 権限を確認してください）:', fallbackId);
      return fallbackId;
    }
  }
  
  async getProjects(): Promise<any[]> {
    try {
      // プロジェクトIDを検証して取得
      const currentProjectId = validateProjectId();
      
      // データセットIDをクリーンアップ（プロジェクトIDのプレフィックスを削除）
      const cleanDatasetId = getCleanDatasetId();
      
      const query = `
        SELECT *
        FROM \`${currentProjectId}.${cleanDatasetId}.projects\`
        ORDER BY COALESCE(_register_datetime, created_at, updated_at) DESC
      `;
      
      console.log('🔍 BigQuery query config:', {
        projectId: currentProjectId,
        datasetId: cleanDatasetId,
        rawDatasetId: datasetId,
        location: BQ_LOCATION,
        locationType: typeof BQ_LOCATION,
        locationLength: BQ_LOCATION?.length,
        query: query.substring(0, 100) + '...',
      });
      
      // クエリオプションを構築（locationを明示的に指定）
      const queryOptions: any = {
        query: query,
      };
      
      // locationが正しく設定されているか確認
      if (BQ_LOCATION && BQ_LOCATION.trim()) {
        queryOptions.location = BQ_LOCATION.trim();
        console.log('✅ Location設定:', queryOptions.location);
      } else {
        console.error('❌ Locationが空です！');
        throw new Error('BigQuery location is not set');
      }
      
      console.log('📋 Query options:', JSON.stringify({
        query: query.substring(0, 50) + '...',
        location: queryOptions.location,
      }));
      
      const [rows] = await initializeBigQueryClient().query(queryOptions);
      console.log('✅ BigQuery query successful, rows:', rows.length);
      
      // DATE型フィールドとTIMESTAMP型フィールドを適切な形式の文字列に変換
      const formattedRows = rows.map((row: any) => {
        const formattedRow = { ...row };
        
        // delivery_start_dateとdelivery_end_dateを変換（DATE型）
        if (formattedRow.delivery_start_date) {
          if (formattedRow.delivery_start_date instanceof Date) {
            formattedRow.delivery_start_date = formattedRow.delivery_start_date.toISOString().split('T')[0];
          } else if (typeof formattedRow.delivery_start_date === 'string') {
            // 既にYYYY-MM-DD形式の場合はそのまま
            if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedRow.delivery_start_date)) {
              // 他の形式の場合は変換を試みる
              const date = new Date(formattedRow.delivery_start_date);
              if (!isNaN(date.getTime())) {
                formattedRow.delivery_start_date = date.toISOString().split('T')[0];
              }
            }
          }
        }
        
        if (formattedRow.delivery_end_date) {
          if (formattedRow.delivery_end_date instanceof Date) {
            formattedRow.delivery_end_date = formattedRow.delivery_end_date.toISOString().split('T')[0];
          } else if (typeof formattedRow.delivery_end_date === 'string') {
            // 既にYYYY-MM-DD形式の場合はそのまま
            if (!/^\d{4}-\d{2}-\d{2}$/.test(formattedRow.delivery_end_date)) {
              // 他の形式の場合は変換を試みる
              const date = new Date(formattedRow.delivery_end_date);
              if (!isNaN(date.getTime())) {
                formattedRow.delivery_end_date = date.toISOString().split('T')[0];
              }
            }
          }
        }
        
        // TIMESTAMP型フィールドをISO形式の文字列に変換
        // project_registration_started_at, _register_datetime, created_at, updated_at
        const timestampFields = ['project_registration_started_at', '_register_datetime', 'created_at', 'updated_at'];
        timestampFields.forEach(field => {
          if (formattedRow[field]) {
            if (formattedRow[field] instanceof Date) {
              formattedRow[field] = formattedRow[field].toISOString();
            } else if (typeof formattedRow[field] === 'string') {
              // 既にISO形式の場合はそのまま
              if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(formattedRow[field])) {
                // 他の形式の場合は変換を試みる
                const date = new Date(formattedRow[field]);
                if (!isNaN(date.getTime())) {
                  formattedRow[field] = date.toISOString();
                }
              }
            } else if (typeof formattedRow[field] === 'object') {
              // オブジェクトの場合（BigQueryから返された可能性）
              if ('value' in formattedRow[field]) {
                formattedRow[field] = String(formattedRow[field].value);
              } else {
                try {
                  const date = new Date(formattedRow[field]);
                  if (!isNaN(date.getTime())) {
                    formattedRow[field] = date.toISOString();
                  }
                } catch (e) {
                  console.warn(`⚠️ ${field}の変換エラー:`, formattedRow[field], e);
                }
              }
            }
          }
        });
        
        return formattedRow;
      });
      
      // デバッグ: 最初のプロジェクトの日付フィールドをログ出力
      if (formattedRows.length > 0) {
        console.log('📅 最初のプロジェクトの日付フィールド:', {
          project_id: formattedRows[0].project_id,
          delivery_start_date: formattedRows[0].delivery_start_date,
          delivery_start_date_type: typeof formattedRows[0].delivery_start_date,
          delivery_end_date: formattedRows[0].delivery_end_date,
          delivery_end_date_type: typeof formattedRows[0].delivery_end_date,
          project_registration_started_at: formattedRows[0].project_registration_started_at,
          project_registration_started_at_type: typeof formattedRows[0].project_registration_started_at,
          _register_datetime: formattedRows[0]._register_datetime,
          _register_datetime_type: typeof formattedRows[0]._register_datetime,
        });
      }
      
      return formattedRows;
    } catch (error: any) {
      console.error('❌ BigQuery getProjects error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
          errors: error.errors,
          projectId: process.env.GCP_PROJECT_ID || 'NOT SET',
          datasetId: getCleanDatasetId(),
          rawDatasetId: datasetId,
          location: BQ_LOCATION,
        });
      
      // より詳細なエラーメッセージを構築
      let errorMessage = error.message || 'Unknown error';
      if (errorMessage.includes('universegeo-project')) {
        errorMessage = 'GCP_PROJECT_ID環境変数が設定されていません。Cloud Runの環境変数設定を確認してください。';
      }
      
      throw new Error(`BigQuery error: ${errorMessage}`);
    }
  }

  async getProjectById(project_id: string): Promise<any> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const query = `
      SELECT *
      FROM \`${currentProjectId}.${cleanDatasetId}.projects\`
      WHERE project_id = @project_id
    `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      params: { project_id },
      location: BQ_LOCATION,
    });
    
    if (!rows || rows.length === 0) {
      return null;
    }
    
    const project = rows[0];
    
    // DATE型フィールドをYYYY-MM-DD形式の文字列に変換
    if (project.delivery_start_date) {
      if (project.delivery_start_date instanceof Date) {
        project.delivery_start_date = project.delivery_start_date.toISOString().split('T')[0];
      } else if (typeof project.delivery_start_date === 'object') {
        // オブジェクトの場合（BigQueryから返された可能性）
        if ('value' in project.delivery_start_date) {
          project.delivery_start_date = String(project.delivery_start_date.value);
        } else {
          // オブジェクトを文字列に変換を試行
          try {
            const date = new Date(project.delivery_start_date);
            if (!isNaN(date.getTime())) {
              project.delivery_start_date = date.toISOString().split('T')[0];
            } else {
              console.warn('⚠️ delivery_start_dateの変換に失敗:', project.delivery_start_date);
              project.delivery_start_date = null;
            }
          } catch (e) {
            console.warn('⚠️ delivery_start_dateの変換エラー:', project.delivery_start_date, e);
            project.delivery_start_date = null;
          }
        }
      } else if (typeof project.delivery_start_date === 'string') {
        // 既にYYYY-MM-DD形式の場合はそのまま
        if (!/^\d{4}-\d{2}-\d{2}$/.test(project.delivery_start_date)) {
          // 他の形式の場合は変換を試みる
          const date = new Date(project.delivery_start_date);
          if (!isNaN(date.getTime())) {
            project.delivery_start_date = date.toISOString().split('T')[0];
          }
        }
      }
    }
    
    if (project.delivery_end_date) {
      if (project.delivery_end_date instanceof Date) {
        project.delivery_end_date = project.delivery_end_date.toISOString().split('T')[0];
      } else if (typeof project.delivery_end_date === 'object') {
        // オブジェクトの場合（BigQueryから返された可能性）
        if ('value' in project.delivery_end_date) {
          project.delivery_end_date = String(project.delivery_end_date.value);
        } else {
          // オブジェクトを文字列に変換を試行
          try {
            const date = new Date(project.delivery_end_date);
            if (!isNaN(date.getTime())) {
              project.delivery_end_date = date.toISOString().split('T')[0];
            } else {
              console.warn('⚠️ delivery_end_dateの変換に失敗:', project.delivery_end_date);
              project.delivery_end_date = null;
            }
          } catch (e) {
            console.warn('⚠️ delivery_end_dateの変換エラー:', project.delivery_end_date, e);
            project.delivery_end_date = null;
          }
        }
      } else if (typeof project.delivery_end_date === 'string') {
        // 既にYYYY-MM-DD形式の場合はそのまま
        if (!/^\d{4}-\d{2}-\d{2}$/.test(project.delivery_end_date)) {
          // 他の形式の場合は変換を試みる
          const date = new Date(project.delivery_end_date);
          if (!isNaN(date.getTime())) {
            project.delivery_end_date = date.toISOString().split('T')[0];
          }
        }
      }
    }
    
    return project;
  }

  async createProject(project: any): Promise<void> {
    try {
      const bq = initializeBigQueryClient(); // クライアントを初期化
      const currentProjectId = validateProjectId(); // プロジェクトIDを検証
      
      if (!currentProjectId || currentProjectId.trim() === '') {
        const errorMsg = 'GCP_PROJECT_ID環境変数が設定されていません。Cloud Runの環境変数設定を確認してください。';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      // データセットIDをクリーンアップ（プロジェクトIDのプレフィックスを削除）
      const cleanDatasetId = getCleanDatasetId();
      
      console.log('📋 createProject config:', {
        projectId: currentProjectId,
        datasetId: cleanDatasetId,
        rawDatasetId: datasetId,
        clientProjectId: bq.projectId || 'NOT SET',
        location: BQ_LOCATION,
      });

      // プロジェクトデータの検証と変換
      // 1. project_idが必須であることを確認
      console.log('🔍 project_id検証開始:');
      console.log('  project.project_id:', project.project_id);
      console.log('  typeof project.project_id:', typeof project.project_id);
      console.log('  project.project_id?.trim():', project.project_id?.trim());
      console.log('  project keys:', Object.keys(project || {}));
      
      if (!project.project_id) {
        console.error('❌ project_idが存在しません');
        throw new Error('project_id is required and must be a non-empty string');
      }
      
      if (typeof project.project_id !== 'string') {
        console.error('❌ project_idが文字列ではありません:', typeof project.project_id);
        throw new Error('project_id is required and must be a non-empty string');
      }
      
      if (project.project_id.trim() === '') {
        console.error('❌ project_idが空文字列です');
        throw new Error('project_id is required and must be a non-empty string');
      }
      
      console.log('✅ project_id検証成功:', project.project_id);

      // 2. 既存の案件IDとの重複チェック
      const existingProject = await this.getProjectById(project.project_id);
      if (existingProject) {
        console.error('❌ project_idが既に存在します:', project.project_id);
        throw new Error(`project_id "${project.project_id}" already exists. Please use a different project_id.`);
      }
      console.log('✅ project_id重複チェック成功（重複なし）:', project.project_id);

      // 3. DATE型フィールドをYYYY-MM-DD形式に変換（共通関数を使用）

      // 4. BigQueryのスキーマに存在するフィールドのみを含める
      // スキーマに存在するフィールド: project_id, advertiser_name, appeal_point, delivery_start_date, 
      // delivery_end_date, person_in_charge, project_status, agency_name, remarks,
      // _register_datetime, created_at, updated_at
      // 注意: universe_service_id, universe_service_name, sub_person_in_charge は
      // スキーマに存在しないため、除外されます
      const allowedFields = [
        'project_id',
        'advertiser_name',
        'agency_name', // スキーマに追加済み
        'appeal_point',
        'delivery_start_date',
        'delivery_end_date',
        'person_in_charge',
        'project_status',
        'remarks', // スキーマに追加済み
        'project_registration_started_at', // 追加フィールド（存在する場合）
      ];

      // 受信したプロジェクトデータの全フィールドをログ出力
      const receivedFields = Object.keys(project || {});
      const excludedFields = receivedFields.filter(field => !allowedFields.includes(field));
      
      console.log('📋 フィールドフィルタリング:');
      console.log('  受信したフィールド:', receivedFields);
      console.log('  許可されたフィールド:', allowedFields);
      console.log('  除外されるフィールド:', excludedFields);
      if (excludedFields.length > 0) {
        console.warn('  ⚠️ 以下のフィールドはBigQueryスキーマに存在しないため除外されます:', excludedFields);
        excludedFields.forEach(field => {
          console.warn(`    - ${field}: ${JSON.stringify(project[field])}`);
        });
      }

      const cleanedProject: any = {
        project_id: project.project_id.trim(), // REQUIRED STRING
      };

      // 許可されたフィールドのみをコピー
      for (const field of allowedFields) {
        // フィールドが存在し、undefinedでない場合のみ処理
        if (field in project && project[field] !== undefined) {
          if (field === 'delivery_start_date' || field === 'delivery_end_date') {
            // DATE型フィールドをYYYY-MM-DD形式に変換
            // 空文字列やnullの場合はnullとして保存（BigQueryのNULLABLEフィールド）
            const originalValue = project[field];
            const formattedDate = formatDateForBigQuery(originalValue);
            
            if (formattedDate !== null) {
              // 有効な日付形式の場合
              cleanedProject[field] = formattedDate;
              console.log(`✅ ${field}を保存:`, formattedDate);
            } else {
              // 無効な日付または空の場合
              if (originalValue === null || originalValue === '' || originalValue === undefined) {
                // 空文字列やnullの場合は明示的にnullとして保存
                cleanedProject[field] = null;
                console.log(`📝 ${field}をnullとして保存（空文字列/null）`);
              } else {
                // それ以外（無効な形式）の場合は警告を出してnullとして保存
                console.warn(`⚠️ 無効な日付形式のため、${field}をnullとして保存します:`, originalValue);
                cleanedProject[field] = null;
              }
            }
          } else {
            cleanedProject[field] = project[field];
          }
        }
      }
      
      console.log('✅ フィルタリング後のプロジェクトデータ:', {
        includedFields: Object.keys(cleanedProject),
        excludedFields: excludedFields,
      });

      // TIMESTAMP型フィールドを追加（共通関数を使用）
      const now = new Date();
      cleanedProject._register_datetime = formatTimestampForBigQuery(project._register_datetime || now);
      cleanedProject.created_at = formatTimestampForBigQuery(project.created_at || now);
      cleanedProject.updated_at = formatTimestampForBigQuery(project.updated_at || now);

      console.log('📋 Cleaned project data for BigQuery:', {
        project_id: cleanedProject.project_id,
        delivery_start_date: cleanedProject.delivery_start_date,
        delivery_end_date: cleanedProject.delivery_end_date,
        _register_datetime: cleanedProject._register_datetime,
        created_at: cleanedProject.created_at,
        updated_at: cleanedProject.updated_at,
        allFields: Object.keys(cleanedProject),
      });

      // 明示的にプロジェクトIDとデータセットIDを指定してテーブルを取得
      const dataset = bq.dataset(cleanDatasetId, { projectId: currentProjectId });
      const table = dataset.table('projects');
      
      const rows = [cleanedProject];
      
      try {
        // ignoreUnknownValues: true を追加（未知のフィールドを無視）
        await table.insert(rows, { ignoreUnknownValues: true });
        console.log('✅ Project created successfully in BigQuery.');
      } catch (err: any) {
        // BigQuery insertAll の行エラーがここに入る
        console.error('[BQ insert] message:', err?.message);
        console.error('[BQ insert] name:', err?.name);
        console.error('[BQ insert] errors:', JSON.stringify(err?.errors, null, 2)); // ←最重要
        
        // location情報を詳細に出力（欠けている列名がここに出る）
        if (err.errors && Array.isArray(err.errors)) {
          err.errors.forEach((error: any, index: number) => {
            console.error(`[BQ insert] error[${index}]:`, {
              message: error.message,
              reason: error.reason,
              location: error.location, // ←欠けている列名がここに出る
              debugInfo: error.debugInfo,
            });
          });
        }
        
        console.error('[BQ insert] response:', JSON.stringify(err?.response?.body ?? err?.response, null, 2));
        console.error('[BQ insert] code:', err?.code);
        console.error('[BQ insert] config:', {
          projectId: currentProjectId,
          datasetId: cleanDatasetId,
          rawDatasetId: datasetId,
          location: BQ_LOCATION,
          clientProjectId: bq.projectId || 'NOT SET',
        });
        console.error('[BQ insert] attempted data:', JSON.stringify(cleanedProject, null, 2));
        
        // エラーを再スロー（詳細情報を含む）
        throw err;
      }
    } catch (error: any) {
      console.error('❌ BigQuery createProject error:', error);
      console.error('Error details:', {
        message: error.message,
        name: error.name,
        code: error.code,
        errors: error.errors,
        response: error.response,
        stack: error.stack,
        projectId: process.env.GCP_PROJECT_ID,
        datasetId: datasetId,
        location: BQ_LOCATION,
      });
      
      // BigQueryのエラー情報を保持したまま、新しいエラーオブジェクトを作成
      // causeに元のエラーを設定（Node.js 16.9.0+でサポート）
      const enhancedError = new Error(error.message || 'プロジェクトの作成に失敗しました');
      enhancedError.name = error.name || 'BigQueryError';
      
      // 元のエラー情報を保持
      (enhancedError as any).code = error.code;
      (enhancedError as any).errors = error.errors;
      (enhancedError as any).response = error.response;
      (enhancedError as any).cause = error; // 元例外をcauseに設定
      
      // エラーメッセージの補足説明を追加（元のメッセージは保持）
      if (error.message) {
        if (error.message.includes('Not found: Project')) {
          (enhancedError as any).hint = 'GCP_PROJECT_ID環境変数が正しく設定されていないか、プロジェクトが見つかりません。Cloud Runの環境変数設定を確認してください。';
        } else if (error.message.includes('Permission denied')) {
          (enhancedError as any).hint = 'BigQueryへの書き込み権限がありません。Cloud Runサービスアカウントの権限を確認してください。';
        } else if (error.message.includes('project_id is required')) {
          (enhancedError as any).hint = 'project_idは必須です。リクエストにproject_idが含まれているか確認してください。';
        }
      }
      
      // スタックトレースを保持
      enhancedError.stack = error.stack || enhancedError.stack;
      
      throw enhancedError;
    }
  }

  async updateProject(project_id: string, updates: any): Promise<void> {
    const currentProjectId = validateProjectId();
    const setClause = Object.keys(updates)
      .map(key => `${key} = @${key}`)
      .join(', ');
    
      const cleanDatasetId = getCleanDatasetId();
      const query = `
        UPDATE \`${currentProjectId}.${cleanDatasetId}.projects\`
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP()
        WHERE project_id = @project_id
      `;
    
    await initializeBigQueryClient().query({
      query,
      params: { project_id, ...updates },
      location: BQ_LOCATION,
    });
  }

  async deleteProject(project_id: string): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const query = `
      DELETE FROM \`${currentProjectId}.${cleanDatasetId}.projects\`
      WHERE project_id = @project_id
    `;
    await initializeBigQueryClient().query({
      query,
      params: { project_id },
      location: BQ_LOCATION,
    });
  }

  // ==================== セグメント ====================
  
  async getSegments(): Promise<any[]> {
    const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      const query = `
        SELECT *
        FROM \`${currentProjectId}.${cleanDatasetId}.segments\`
        ORDER BY segment_registered_at DESC
      `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      location: BQ_LOCATION,
    });
    return rows;
  }

  async getSegmentsByProject(project_id: string): Promise<any[]> {
    const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      const query = `
        SELECT *
        FROM \`${currentProjectId}.${cleanDatasetId}.segments\`
        WHERE project_id = @project_id
        ORDER BY segment_registered_at DESC
      `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      params: { project_id },
      location: BQ_LOCATION,
    });
    return rows;
  }

  /** segment_id で1件取得（重複登録チェック用） */
  async getSegmentById(segment_id: string): Promise<any | null> {
    if (!segment_id || typeof segment_id !== 'string' || segment_id.trim() === '') {
      return null;
    }
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const query = `
      SELECT segment_id
      FROM \`${currentProjectId}.${cleanDatasetId}.segments\`
      WHERE segment_id = @segment_id
      LIMIT 1
    `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      params: { segment_id: segment_id.trim() },
      location: BQ_LOCATION,
    });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  }

  async createSegment(segment: any): Promise<void> {
    try {
      // 必須フィールドの検証
      if (!segment.segment_id || typeof segment.segment_id !== 'string' || segment.segment_id.trim() === '') {
        throw new Error('segment_id is required and must be a non-empty string');
      }
      if (!segment.project_id || typeof segment.project_id !== 'string' || segment.project_id.trim() === '') {
        throw new Error('project_id is required and must be a non-empty string');
      }

      // スキーマに存在するフィールドのみを含める（data_link_* はフロントから送られる）
      const allowedFields = [
        'segment_id',
        'project_id',
        'segment_name',
        'segment_registered_at',
        'delivery_media',
        'media_id',
        'poi_category',
        'poi_type',
        'attribute',
        'extraction_period',
        'extraction_period_type',
        'extraction_start_date',
        'extraction_end_date',
        'extraction_dates',
        'detection_count',
        'detection_time_start',
        'detection_time_end',
        'stay_time',
        'designated_radius',
        'location_request_status',
        'data_link_status',
        'data_link_request_date',
        'data_link_scheduled_date',
        'data_coordination_date',
        'delivery_confirmed',
        'registerd_provider_segment',
      ];

      const cleanedSegment: any = {
        segment_id: segment.segment_id.trim(),
        project_id: segment.project_id.trim(),
      };

      // パーティションキー・必須に近い項目は欠けていてもデフォルトを入れる
      cleanedSegment.segment_registered_at = formatTimestampForBigQuery(segment.segment_registered_at || new Date());
      if (!(segment.location_request_status != null && segment.location_request_status !== '')) {
        cleanedSegment.location_request_status = 'not_requested';
      }
      if (!(segment.data_link_status != null && segment.data_link_status !== '')) {
        cleanedSegment.data_link_status = 'before_request';
      }

      // 許可されたフィールドのみをコピー
      for (const field of allowedFields) {
        if (field in segment && segment[field] !== undefined && segment[field] !== null) {
          if (field === 'extraction_start_date' || field === 'extraction_end_date' || field === 'data_coordination_date') {
            cleanedSegment[field] = formatDateForBigQuery(segment[field]);
          } else if (field === 'data_link_request_date' || field === 'data_link_scheduled_date') {
            cleanedSegment[field] = formatDateForBigQuery(segment[field]);
          } else if (field === 'detection_time_start' || field === 'detection_time_end') {
            cleanedSegment[field] = formatTimeForBigQuery(segment[field]);
          } else if (field === 'delivery_confirmed' || field === 'registerd_provider_segment') {
            cleanedSegment[field] = formatBoolForBigQuery(segment[field]);
          } else if (field === 'segment_registered_at') {
            cleanedSegment[field] = formatTimestampForBigQuery(segment[field] || new Date());
          } else if (field === 'media_id') {
            // media_id: ARRAY<STRING>（配信媒体IDの複数可）
            const arr = formatMediaIdArrayForBigQuery(segment[field]);
            if (arr) cleanedSegment[field] = arr;
          } else if (field === 'delivery_media') {
            // delivery_media: ARRAY<STRING>（universe, tver_sp, tver_ctv 等の複数可）
            const arr = formatDeliveryMediaForBigQuery(segment[field]);
            if (arr) cleanedSegment[field] = arr;
          } else if (field === 'extraction_dates') {
            // extraction_dates: ARRAY<STRING> 形式（YYYY-MM-DDの配列）
            if (Array.isArray(segment[field])) {
              const arr = (segment[field] as any[]).filter((s: any) => s != null && String(s).trim() !== '');
              if (arr.length > 0) {
                cleanedSegment[field] = arr;
              }
            }
          } else {
            cleanedSegment[field] = segment[field];
          }
        }
      }

      // TIMESTAMP型フィールドを追加
      const now = new Date();
      cleanedSegment.created_at = formatTimestampForBigQuery(segment.created_at || now);
      cleanedSegment.updated_at = formatTimestampForBigQuery(segment.updated_at || now);

      console.log('📋 Cleaned segment data for BigQuery:', {
        segment_id: cleanedSegment.segment_id,
        project_id: cleanedSegment.project_id,
        extraction_start_date: cleanedSegment.extraction_start_date,
        extraction_end_date: cleanedSegment.extraction_end_date,
        allFields: Object.keys(cleanedSegment),
      });

      await getDataset().table('segments').insert([cleanedSegment], { ignoreUnknownValues: true });
    } catch (err: any) {
      console.error('[BQ insert segments] message:', err?.message);
      console.error('[BQ insert segments] errors:', JSON.stringify(err?.errors, null, 2));
      
      // location情報を詳細に出力
      if (err.errors && Array.isArray(err.errors)) {
        err.errors.forEach((error: any, index: number) => {
          console.error(`[BQ insert segments] error[${index}]:`, {
            message: error.message,
            reason: error.reason,
            location: error.location, // ←欠けている列名がここに出る
          });
        });
      }
      
      throw err;
    }
  }

  async updateSegment(segment_id: string, updates: any): Promise<void> {
    const currentProjectId = validateProjectId();
    
    const processedUpdates = { ...updates };
    // media_id: ARRAY<STRING> に正規化
    if ('media_id' in processedUpdates && processedUpdates.media_id !== undefined) {
      const arr = formatMediaIdArrayForBigQuery(processedUpdates.media_id);
      processedUpdates.media_id = arr;
    }
    // delivery_media: ARRAY<STRING> に正規化
    if ('delivery_media' in processedUpdates && processedUpdates.delivery_media !== undefined) {
      const arr = formatDeliveryMediaForBigQuery(processedUpdates.delivery_media);
      processedUpdates.delivery_media = arr;
    }
    // extraction_dates: ARRAY<STRING> に正規化（文字列の場合は [str] に）
    if ('extraction_dates' in processedUpdates && processedUpdates.extraction_dates !== undefined) {
      const v = processedUpdates.extraction_dates;
      const arr = Array.isArray(v)
        ? v.filter((s: any) => s != null && String(s).trim() !== '').map((s: any) => String(s).trim())
        : (typeof v === 'string' && v.trim() ? [v.trim()] : []);
      processedUpdates.extraction_dates = arr;
    }
    // BOOL フィールド
    if ('delivery_confirmed' in processedUpdates && processedUpdates.delivery_confirmed !== undefined) {
      processedUpdates.delivery_confirmed = formatBoolForBigQuery(processedUpdates.delivery_confirmed);
    }
    if ('registerd_provider_segment' in processedUpdates && processedUpdates.registerd_provider_segment !== undefined) {
      processedUpdates.registerd_provider_segment = formatBoolForBigQuery(processedUpdates.registerd_provider_segment);
    }
    
    const setClause = Object.keys(processedUpdates)
      .map(key => `${key} = @${key}`)
      .join(', ');
    
      const cleanDatasetId = getCleanDatasetId();
      const query = `
        UPDATE \`${currentProjectId}.${cleanDatasetId}.segments\`
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP()
        WHERE segment_id = @segment_id
      `;
    
    await initializeBigQueryClient().query({
      query,
      params: { segment_id, ...processedUpdates },
      location: BQ_LOCATION,
    });
  }

  async deleteSegment(segment_id: string): Promise<void> {
    if (!segment_id || typeof segment_id !== 'string' || segment_id.trim() === '') {
      throw new Error('segment_id is required');
    }
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const segId = segment_id.trim();
    // 先に当該セグメントに紐づくPOIを削除
    await initializeBigQueryClient().query({
      query: `DELETE FROM \`${currentProjectId}.${cleanDatasetId}.pois\` WHERE segment_id = @segment_id`,
      params: { segment_id: segId },
      location: BQ_LOCATION,
    });
    await initializeBigQueryClient().query({
      query: `DELETE FROM \`${currentProjectId}.${cleanDatasetId}.segments\` WHERE segment_id = @segment_id`,
      params: { segment_id: segId },
      location: BQ_LOCATION,
    });
  }

  // ==================== POI（地点） ====================
  
  async getPois(): Promise<any[]> {
    const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      const query = `
        SELECT *
        FROM \`${currentProjectId}.${cleanDatasetId}.pois\`
        ORDER BY created_at DESC
      `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      location: BQ_LOCATION,
    });
    return rows;
  }

  async getPoisByProject(project_id: string): Promise<any[]> {
    const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      const query = `
        SELECT *
        FROM \`${currentProjectId}.${cleanDatasetId}.pois\`
        WHERE project_id = @project_id
        ORDER BY created_at DESC
      `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      params: { project_id },
    });
    return rows;
  }

  /** セグメントIDで地点一覧を取得（同一セグメント内のpoi_typeチェック用） */
  async getPoisBySegment(segment_id: string): Promise<any[]> {
    if (!segment_id || typeof segment_id !== 'string' || segment_id.trim() === '') {
      return [];
    }
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const query = `
      SELECT poi_id, segment_id, poi_type, polygon
      FROM \`${currentProjectId}.${cleanDatasetId}.pois\`
      WHERE segment_id = @segment_id
    `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      params: { segment_id: segment_id.trim() },
      location: BQ_LOCATION,
    });
    return rows || [];
  }

  /** poi_id で1件取得（重複登録チェック用） */
  async getPoiById(poi_id: string): Promise<any | null> {
    if (!poi_id || typeof poi_id !== 'string' || poi_id.trim() === '') {
      return null;
    }
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const query = `
      SELECT poi_id
      FROM \`${currentProjectId}.${cleanDatasetId}.pois\`
      WHERE poi_id = @poi_id
      LIMIT 1
    `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      params: { poi_id: poi_id.trim() },
      location: BQ_LOCATION,
    });
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  }

  /**
   * 地点のpoi_typeを正規化（manual / prefecture / polygon のいずれか）。
   * polygon フィールドが存在する場合は 'polygon' とみなす。
   */
  private normalizePoiType(poi: any): string {
    if (poi.polygon != null) {
      const p = typeof poi.polygon === 'string' ? (() => { try { return JSON.parse(poi.polygon); } catch { return []; } })() : poi.polygon;
      if (Array.isArray(p) && p.length > 0) return 'polygon';
    }
    const t = poi.poi_type;
    if (t === 'polygon' || t === 'prefecture' || t === 'manual') return t;
    return t && typeof t === 'string' ? t : 'manual';
  }

  async createPoi(poi: any): Promise<void> {
    try {
      // 必須フィールドの検証
      if (!poi.poi_id || typeof poi.poi_id !== 'string' || poi.poi_id.trim() === '') {
        throw new Error('poi_id is required and must be a non-empty string');
      }
      if (!poi.project_id || typeof poi.project_id !== 'string' || poi.project_id.trim() === '') {
        throw new Error('project_id is required and must be a non-empty string');
      }
      if (!poi.poi_name || typeof poi.poi_name !== 'string' || poi.poi_name.trim() === '') {
        throw new Error('poi_name is required and must be a non-empty string');
      }

      // スキーマに存在するフィールドのみを含める
      const allowedFields = [
        'poi_id',
        'project_id',
        'segment_id',
        'location_id',
        'poi_name',
        'address',
        'latitude',
        'longitude',
        'prefectures',
        'cities',
        'poi_type',
        'poi_category',
        'designated_radius',
        'setting_flag',
        'visit_measurement_group_id',
        'polygon',
      ];

      const cleanedPoi: any = {
        poi_id: poi.poi_id.trim(),
        project_id: poi.project_id.trim(),
        poi_name: poi.poi_name.trim(),
      };

      // 許可されたフィールドのみをコピー
      for (const field of allowedFields) {
        if (field in poi && poi[field] !== undefined && poi[field] !== null) {
          if (field === 'latitude' || field === 'longitude') {
            // FLOAT64型フィールド
            const numValue = typeof poi[field] === 'string' ? parseFloat(poi[field]) : poi[field];
            if (!isNaN(numValue)) {
              cleanedPoi[field] = numValue;
            }
          } else if (field === 'prefectures' || field === 'cities') {
            // ARRAY<STRING>型フィールド
            if (Array.isArray(poi[field])) {
              cleanedPoi[field] = poi[field];
            } else if (typeof poi[field] === 'string') {
              // JSON文字列の場合はパース
              try {
                cleanedPoi[field] = JSON.parse(poi[field]);
              } catch {
                cleanedPoi[field] = [poi[field]];
              }
            }
          } else if (field === 'polygon') {
            // polygonフィールド: number[][]をJSON文字列に変換して保存
            if (Array.isArray(poi[field]) && poi[field].length > 0) {
              // 2次元配列をJSON文字列に変換
              cleanedPoi[field] = JSON.stringify(poi[field]);
            } else if (typeof poi[field] === 'string') {
              // 既にJSON文字列の場合はそのまま
              cleanedPoi[field] = poi[field];
            }
          } else {
            cleanedPoi[field] = poi[field];
          }
        }
      }

      // TIMESTAMP型フィールドを追加
      const now = new Date();
      cleanedPoi.created_at = formatTimestampForBigQuery(poi.created_at || now);
      cleanedPoi.updated_at = formatTimestampForBigQuery(poi.updated_at || now);

      // 同一セグメント内では poi_type を1種類に限定（manual / prefecture / polygon の混在を禁止）
      if (cleanedPoi.segment_id) {
        const existingPois = await this.getPoisBySegment(cleanedPoi.segment_id);
        const newType = this.normalizePoiType(cleanedPoi);
        for (const existing of existingPois) {
          const existingType = this.normalizePoiType(existing);
          if (existingType !== newType) {
            throw new Error(
              `このセグメントには既に「${existingType}」タイプの地点が登録されています。同一セグメント内では地点タイプ（任意地点・都道府県・ポリゴン）を1種類に統一してください。`
            );
          }
        }
      }

      console.log('📋 Cleaned POI data for BigQuery:', {
        poi_id: cleanedPoi.poi_id,
        project_id: cleanedPoi.project_id,
        poi_name: cleanedPoi.poi_name,
        allFields: Object.keys(cleanedPoi),
      });

      await getDataset().table('pois').insert([cleanedPoi], { ignoreUnknownValues: true });

      // セグメントにpoiが登録された際、segments.poi_type を記録（同一セグメントは1種類のためこのpoiのタイプで更新）
      if (cleanedPoi.segment_id && String(cleanedPoi.segment_id).trim()) {
        const segmentId = String(cleanedPoi.segment_id).trim();
        const poiType = this.normalizePoiType(cleanedPoi);
        await this.updateSegment(segmentId, { poi_type: poiType });
        console.log(`[BQ] segments.poi_type を更新: segment_id=${segmentId}, poi_type=${poiType}`);
      }
    } catch (err: any) {
      console.error('[BQ insert pois] message:', err?.message);
      console.error('[BQ insert pois] errors:', JSON.stringify(err?.errors, null, 2));
      
      // location情報を詳細に出力
      if (err.errors && Array.isArray(err.errors)) {
        err.errors.forEach((error: any, index: number) => {
          console.error(`[BQ insert pois] error[${index}]:`, {
            message: error.message,
            reason: error.reason,
            location: error.location, // ←欠けている列名がここに出る
          });
        });
      }
      
      throw err;
    }
  }

  async createPoisBulk(pois: any[]): Promise<void> {
    try {
      const cleanedPois = pois.map(poi => {
        // 必須フィールドの検証
        if (!poi.poi_id || typeof poi.poi_id !== 'string' || poi.poi_id.trim() === '') {
          throw new Error('poi_id is required and must be a non-empty string');
        }
        if (!poi.project_id || typeof poi.project_id !== 'string' || poi.project_id.trim() === '') {
          throw new Error('project_id is required and must be a non-empty string');
        }
        if (!poi.poi_name || typeof poi.poi_name !== 'string' || poi.poi_name.trim() === '') {
          throw new Error('poi_name is required and must be a non-empty string');
        }

        // スキーマに存在するフィールドのみを含める
        const allowedFields = [
          'poi_id',
          'project_id',
          'segment_id',
          'location_id',
          'poi_name',
          'address',
          'latitude',
          'longitude',
          'prefectures',
          'cities',
          'poi_type',
          'poi_category',
          'designated_radius',
          'setting_flag',
          'visit_measurement_group_id',
          'polygon',
        ];

        const cleanedPoi: any = {
          poi_id: poi.poi_id.trim(),
          project_id: poi.project_id.trim(),
          poi_name: poi.poi_name.trim(),
        };

        // 許可されたフィールドのみをコピー
        for (const field of allowedFields) {
          if (field in poi && poi[field] !== undefined && poi[field] !== null) {
            if (field === 'latitude' || field === 'longitude') {
              const numValue = typeof poi[field] === 'string' ? parseFloat(poi[field]) : poi[field];
              if (!isNaN(numValue)) {
                cleanedPoi[field] = numValue;
              }
            } else if (field === 'prefectures' || field === 'cities') {
              if (Array.isArray(poi[field])) {
                cleanedPoi[field] = poi[field];
              } else if (typeof poi[field] === 'string') {
                try {
                  cleanedPoi[field] = JSON.parse(poi[field]);
                } catch {
                  cleanedPoi[field] = [poi[field]];
                }
              }
            } else if (field === 'polygon') {
              // polygonフィールド: number[][]をJSON文字列に変換して保存
              if (Array.isArray(poi[field]) && poi[field].length > 0) {
                // 2次元配列をJSON文字列に変換
                cleanedPoi[field] = JSON.stringify(poi[field]);
              } else if (typeof poi[field] === 'string') {
                // 既にJSON文字列の場合はそのまま
                cleanedPoi[field] = poi[field];
              }
            } else {
              cleanedPoi[field] = poi[field];
            }
          }
        }

        // TIMESTAMP型フィールドを追加
        const now = new Date();
        cleanedPoi.created_at = formatTimestampForBigQuery(poi.created_at || now);
        cleanedPoi.updated_at = formatTimestampForBigQuery(poi.updated_at || now);

        return cleanedPoi;
      });

      // 同一セグメント内では poi_type を1種類に限定（混在禁止）
      const segmentToTypes = new Map<string, Set<string>>();
      for (const p of cleanedPois) {
        if (!p.segment_id) continue;
        const segId = String(p.segment_id).trim();
        const type = this.normalizePoiType(p);
        if (!segmentToTypes.has(segId)) segmentToTypes.set(segId, new Set());
        segmentToTypes.get(segId)!.add(type);
      }
      for (const [segId, types] of segmentToTypes) {
        if (types.size > 1) {
          throw new Error(
            `セグメント「${segId}」に複数の地点タイプ（${[...types].join('・')}）を含めています。同一セグメント内では地点タイプを1種類に統一してください。`
          );
        }
        const existingPois = await this.getPoisBySegment(segId);
        const newType = [...types][0];
        for (const existing of existingPois) {
          const existingType = this.normalizePoiType(existing);
          if (existingType !== newType) {
            throw new Error(
              `このセグメントには既に「${existingType}」タイプの地点が登録されています。同一セグメント内では地点タイプを1種類に統一してください。`
            );
          }
        }
      }

      console.log(`📋 Cleaned ${cleanedPois.length} POIs for BigQuery bulk insert`);

      await getDataset().table('pois').insert(cleanedPois, { ignoreUnknownValues: true });

      // セグメントにpoiが登録された際、segments.poi_type を記録（同一セグメントは1種類のため、各セグメントの代表poi_typeで更新）
      for (const [segId, types] of segmentToTypes) {
        const poiType = [...types][0];
        await this.updateSegment(segId, { poi_type: poiType });
        console.log(`[BQ] segments.poi_type を更新（一括）: segment_id=${segId}, poi_type=${poiType}`);
      }
    } catch (err: any) {
      console.error('[BQ insert pois bulk] message:', err?.message);
      console.error('[BQ insert pois bulk] errors:', JSON.stringify(err?.errors, null, 2));
      
      // location情報を詳細に出力
      if (err.errors && Array.isArray(err.errors)) {
        err.errors.forEach((error: any, index: number) => {
          console.error(`[BQ insert pois bulk] error[${index}]:`, {
            message: error.message,
            reason: error.reason,
            location: error.location, // ←欠けている列名がここに出る
          });
        });
      }
      
      throw err;
    }
  }

  async updatePoi(poi_id: string, updates: any): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();

    // segment_id または poi_type を変更する場合は、同一セグメント内で poi_type が1種類に限定されるようチェック
    if ('segment_id' in updates || 'poi_type' in updates || 'polygon' in updates) {
      const [currentRows] = await initializeBigQueryClient().query({
        query: `SELECT segment_id, poi_type, polygon FROM \`${currentProjectId}.${cleanDatasetId}.pois\` WHERE poi_id = @poi_id`,
        params: { poi_id },
        location: BQ_LOCATION,
      });
      const current = Array.isArray(currentRows) && currentRows.length > 0 ? currentRows[0] : null;
      const targetSegmentId = updates.segment_id != null ? String(updates.segment_id).trim() : (current?.segment_id ?? '');
      const merged = { ...current, ...updates };
      const targetType = this.normalizePoiType(merged);
      if (targetSegmentId) {
        const existingPois = await this.getPoisBySegment(targetSegmentId);
        for (const p of existingPois) {
          if (p.poi_id === poi_id) continue; // 自分自身は除外
          const existingType = this.normalizePoiType(p);
          if (existingType !== targetType) {
            throw new Error(
              `このセグメントには既に「${existingType}」タイプの地点が登録されています。同一セグメント内では地点タイプを1種類に統一してください。`
            );
          }
        }
      }
    }

    // ARRAY<STRING> / STRING 型に合わせて正規化（createPoi と同様）
    const processedUpdates = { ...updates };
    if ('prefectures' in processedUpdates && processedUpdates.prefectures !== undefined) {
      const v = processedUpdates.prefectures;
      if (Array.isArray(v)) {
        processedUpdates.prefectures = v;
      } else if (typeof v === 'string') {
        try {
          processedUpdates.prefectures = JSON.parse(v);
        } catch {
          processedUpdates.prefectures = [v];
        }
      }
    }
    if ('cities' in processedUpdates && processedUpdates.cities !== undefined) {
      const v = processedUpdates.cities;
      if (Array.isArray(v)) {
        processedUpdates.cities = v;
      } else if (typeof v === 'string') {
        try {
          processedUpdates.cities = JSON.parse(v);
        } catch {
          processedUpdates.cities = [v];
        }
      }
    }
    if ('polygon' in processedUpdates && processedUpdates.polygon !== undefined && processedUpdates.polygon !== null) {
      const v = processedUpdates.polygon;
      if (Array.isArray(v) && v.length > 0) {
        processedUpdates.polygon = JSON.stringify(v);
      }
      // 既に文字列の場合はそのまま
    }

    const setClause = Object.keys(processedUpdates)
      .map(key => `${key} = @${key}`)
      .join(', ');
    const query = `
        UPDATE \`${currentProjectId}.${cleanDatasetId}.pois\`
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP()
        WHERE poi_id = @poi_id
      `;
    await initializeBigQueryClient().query({
      query,
      params: { poi_id, ...processedUpdates },
      location: BQ_LOCATION,
    });

    // segment_id または poi_type / polygon が変わった場合、該当セグメントの segments.poi_type を更新
    if ('segment_id' in updates || 'poi_type' in updates || 'polygon' in updates) {
      const [rows] = await initializeBigQueryClient().query({
        query: `SELECT segment_id, poi_type, polygon FROM \`${currentProjectId}.${cleanDatasetId}.pois\` WHERE poi_id = @poi_id`,
        params: { poi_id },
        location: BQ_LOCATION,
      });
      const updated = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
      if (updated?.segment_id && String(updated.segment_id).trim()) {
        const segId = String(updated.segment_id).trim();
        const poiType = this.normalizePoiType(updated);
        await this.updateSegment(segId, { poi_type: poiType });
        console.log(`[BQ] segments.poi_type を更新（updatePoi後）: segment_id=${segId}, poi_type=${poiType}`);
      }
    }
  }

  async deletePoi(poi_id: string): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();

    // 削除前に segment_id を取得（削除後はセグメントの poi_type をクリアするため）
    const [beforeRows] = await initializeBigQueryClient().query({
      query: `SELECT segment_id FROM \`${currentProjectId}.${cleanDatasetId}.pois\` WHERE poi_id = @poi_id`,
      params: { poi_id },
      location: BQ_LOCATION,
    });
    const segmentIdBefore = Array.isArray(beforeRows) && beforeRows.length > 0 ? (beforeRows[0] as any)?.segment_id : null;

    const query = `
      DELETE FROM \`${currentProjectId}.${cleanDatasetId}.pois\`
      WHERE poi_id = @poi_id
    `;
    await initializeBigQueryClient().query({
      query,
      params: { poi_id },
      location: BQ_LOCATION,
    });

    // 当該セグメントにPOIが残っていなければ segments.poi_type をクリア
    if (segmentIdBefore && String(segmentIdBefore).trim()) {
      const segId = String(segmentIdBefore).trim();
      const remaining = await this.getPoisBySegment(segId);
      if (remaining.length === 0) {
        await this.updateSegment(segId, { poi_type: null });
        console.log(`[BQ] segments.poi_type をクリア（当該セグメントのPOIが0件）: segment_id=${segId}`);
      }
    }
  }

  // ==================== ユーザー ====================
  
  async getUsers(): Promise<any[]> {
    const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      const query = `
        SELECT *
        FROM \`${currentProjectId}.${cleanDatasetId}.users\`
        ORDER BY created_at DESC
      `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      location: BQ_LOCATION,
    });
    return rows;
  }

  async getUserByEmail(email: string): Promise<any> {
    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      // メールアドレスを小文字に正規化して検索
      const normalizedEmail = email.trim().toLowerCase();
      const query = `
        SELECT *
        FROM \`${currentProjectId}.${cleanDatasetId}.users\`
        WHERE LOWER(TRIM(email)) = @email
      `;
      const [rows] = await initializeBigQueryClient().query({
        query,
        params: { email: normalizedEmail },
        location: BQ_LOCATION,
      });
      return rows[0] || null;
    } catch (err: any) {
      console.error('[BQ getUserByEmail] error:', err?.message);
      console.error('[BQ getUserByEmail] code:', err?.code);
      
      // テーブルが存在しない場合のエラーハンドリング
      if (err?.message?.includes('Not found') || err?.code === 404) {
        console.warn('⚠️ usersテーブルが存在しません。nullを返します。');
        return null;
      }
      
      throw err;
    }
  }

  async createUser(user: any): Promise<void> {
    try {
      // 必須フィールドの検証
      if (!user.user_id || typeof user.user_id !== 'string' || user.user_id.trim() === '') {
        throw new Error('user_id is required and must be a non-empty string');
      }
      if (!user.name || typeof user.name !== 'string' || user.name.trim() === '') {
        throw new Error('name is required and must be a non-empty string');
      }
      if (!user.email || typeof user.email !== 'string' || user.email.trim() === '') {
        throw new Error('email is required and must be a non-empty string');
      }
      if (!user.password_hash || typeof user.password_hash !== 'string' || user.password_hash.trim() === '') {
        throw new Error('password_hash is required and must be a non-empty string');
      }
      if (!user.role || typeof user.role !== 'string' || user.role.trim() === '') {
        throw new Error('role is required and must be a non-empty string');
      }

      // スキーマに存在するフィールドのみを含める
      const allowedFields = [
        'user_id',
        'name',
        'email',
        'password_hash',
        'role',
        'department',
        'is_active',
        'last_login',
      ];

      const cleanedUser: any = {
        user_id: user.user_id.trim(),
        name: user.name.trim(),
        email: user.email.trim().toLowerCase(),
        password_hash: user.password_hash,
        role: user.role.trim(),
      };

      // 許可されたフィールドのみをコピー
      for (const field of allowedFields) {
        if (field in user && user[field] !== undefined && user[field] !== null) {
          if (field === 'is_active') {
            cleanedUser[field] = formatBoolForBigQuery(user[field]);
          } else if (field === 'last_login') {
            cleanedUser[field] = user[field] ? formatTimestampForBigQuery(user[field]) : null;
          } else {
            cleanedUser[field] = user[field];
          }
        }
      }

      // TIMESTAMP型フィールドを追加
      const now = new Date();
      cleanedUser.created_at = formatTimestampForBigQuery(user.created_at || now);
      cleanedUser.updated_at = formatTimestampForBigQuery(user.updated_at || now);

      console.log('📋 Cleaned user data for BigQuery:', {
        user_id: cleanedUser.user_id,
        email: cleanedUser.email,
        role: cleanedUser.role,
        allFields: Object.keys(cleanedUser),
      });

      await getDataset().table('users').insert([cleanedUser], { ignoreUnknownValues: true });
    } catch (err: any) {
      console.error('[BQ insert users] message:', err?.message);
      console.error('[BQ insert users] errors:', JSON.stringify(err?.errors, null, 2));
      
      // location情報を詳細に出力
      if (err.errors && Array.isArray(err.errors)) {
        err.errors.forEach((error: any, index: number) => {
          console.error(`[BQ insert users] error[${index}]:`, {
            message: error.message,
            reason: error.reason,
            location: error.location, // ←欠けている列名がここに出る
          });
        });
      }
      
      throw err;
    }
  }

  async updateUser(user_id: string, updates: any): Promise<void> {
    const currentProjectId = validateProjectId();
    const setClause = Object.keys(updates)
      .map(key => `${key} = @${key}`)
      .join(', ');
    
      const cleanDatasetId = getCleanDatasetId();
      const query = `
        UPDATE \`${currentProjectId}.${cleanDatasetId}.users\`
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP()
        WHERE user_id = @user_id
      `;
    
    await initializeBigQueryClient().query({
      query,
      params: { user_id, ...updates },
      location: BQ_LOCATION,
    });
  }

  async deleteUser(user_id: string): Promise<void> {
    if (!user_id || typeof user_id !== 'string' || user_id.trim() === '') {
      throw new Error('user_id is required');
    }
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    await initializeBigQueryClient().query({
      query: `DELETE FROM \`${currentProjectId}.${cleanDatasetId}.users\` WHERE user_id = @user_id`,
      params: { user_id: user_id.trim() },
      location: BQ_LOCATION,
    });
  }

  // ==================== ユーザー登録申請 ====================

  async getUserRequests(): Promise<any[]> {
    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      const query = `
        SELECT *
        FROM \`${currentProjectId}.${cleanDatasetId}.user_requests\`
        ORDER BY requested_at DESC
      `;
      const [rows] = await initializeBigQueryClient().query({
        query,
        location: BQ_LOCATION,
      });
      return rows;
    } catch (err: any) {
      console.error('[BQ getUserRequests] error:', err?.message);
      console.error('[BQ getUserRequests] code:', err?.code);
      console.error('[BQ getUserRequests] errors:', JSON.stringify(err?.errors, null, 2));
      
      // テーブルが存在しない場合のエラーハンドリング
      if (err?.message?.includes('Not found') || err?.code === 404) {
        console.warn('⚠️ user_requestsテーブルが存在しません。空の配列を返します。');
        return [];
      }
      
      throw err;
    }
  }

  async createUserRequest(requestData: {
    name: string;
    email: string;
    password: string;
    requested_role: 'admin' | 'sales';
    department?: string;
    reason?: string;
  }): Promise<any> {
    try {
      // メールアドレスを正規化（前後の空白を除去、小文字化）
      const normalizedEmail = requestData.email.trim().toLowerCase();

      // メールアドレスの重複チェック（既存ユーザー）
      let existingUser: any = null;
      try {
        existingUser = await this.getUserByEmail(normalizedEmail);
      } catch (err: any) {
        // getUserByEmailでエラーが発生した場合（テーブルが存在しないなど）、ログを出力して続行
        console.warn('[createUserRequest] getUserByEmail error (continuing):', err?.message);
      }
      
      if (existingUser) {
        const error = new Error('このメールアドレスは既に登録されています');
        (error as any).statusCode = 400;
        throw error;
      }

      // 既に申請済みかチェック（メールアドレス）- pending または approved の申請をチェック
      let existingRequests: any[] = [];
      try {
        existingRequests = await this.getUserRequests();
      } catch (err: any) {
        // getUserRequestsでエラーが発生した場合（テーブルが存在しないなど）、ログを出力して続行
        console.warn('[createUserRequest] getUserRequests error (continuing):', err?.message);
      }
      
      const existingRequestByEmail = existingRequests.find(r => 
        r.email && r.email.trim().toLowerCase() === normalizedEmail && (r.status === 'pending' || r.status === 'approved')
      );
      if (existingRequestByEmail) {
        const error = new Error('このメールアドレスで既に申請が行われています。別のメールアドレスを使用するか、既存の申請の承認をお待ちください。');
        (error as any).statusCode = 400;
        throw error;
      }

      // パスワードハッシュ化（簡易実装 - 本番環境ではbcrypt等を使用）
      const password_hash = Buffer.from(requestData.password).toString('base64');

    const user_id = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // スキーマに存在するフィールドのみを含める
    // user_requestsテーブルのスキーマ: user_id, name, email, password_hash, requested_role, 
    // department, reason, status, requested_at, reviewed_at, reviewed_by, review_comment
    const allowedFields = [
      'user_id',
      'name',
      'email',
      'password_hash',
      'requested_role',
      'department',
      'reason',
      'status',
      'requested_at',
      'reviewed_at',
      'reviewed_by',
      'review_comment',
    ];

    const cleanedRequest: any = {
      user_id: user_id.trim(),
      name: requestData.name.trim(),
      email: normalizedEmail,
      password_hash: password_hash,
      requested_role: requestData.requested_role,
      status: 'pending',
      requested_at: formatTimestampForBigQuery(new Date()),
      reviewed_at: null,
      reviewed_by: null,
      review_comment: null,
    };

    // オプションフィールド
    if (requestData.department) {
      cleanedRequest.department = requestData.department.trim();
    }
    if (requestData.reason) {
      cleanedRequest.reason = requestData.reason.trim();
    }

    console.log('📋 Cleaned user_request data for BigQuery:', {
      user_id: cleanedRequest.user_id,
      email: cleanedRequest.email,
      requested_role: cleanedRequest.requested_role,
      allFields: Object.keys(cleanedRequest),
      fullData: JSON.stringify(cleanedRequest, null, 2),
    });

    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      
      console.log('📋 Inserting into BigQuery:', {
        projectId: currentProjectId,
        datasetId: cleanDatasetId,
        table: 'user_requests',
      });
      
      // ストリーミングバッファの問題を回避するため、DML INSERT文を使用
      // これにより、すぐにUPDATE/DELETEが可能になる
      const insertQuery = `
        INSERT INTO \`${currentProjectId}.${cleanDatasetId}.user_requests\`
        (user_id, name, email, password_hash, requested_role, department, reason, status, requested_at, reviewed_at, reviewed_by, review_comment)
        VALUES
        (@user_id, @name, @email, @password_hash, @requested_role, @department, @reason, @status, @requested_at, @reviewed_at, @reviewed_by, @review_comment)
      `;
      
      await initializeBigQueryClient().query({
        query: insertQuery,
        params: {
          user_id: cleanedRequest.user_id,
          name: cleanedRequest.name,
          email: cleanedRequest.email,
          password_hash: cleanedRequest.password_hash,
          requested_role: cleanedRequest.requested_role,
          department: cleanedRequest.department || null,
          reason: cleanedRequest.reason || null,
          status: cleanedRequest.status,
          requested_at: cleanedRequest.requested_at,
          reviewed_at: cleanedRequest.reviewed_at,
          reviewed_by: cleanedRequest.reviewed_by,
          review_comment: cleanedRequest.review_comment,
        },
        location: BQ_LOCATION,
      });
      
      console.log('✅ User request created successfully in BigQuery.');
    } catch (err: any) {
      // BigQuery insertAll の行エラーがここに入る
      console.error('[BQ insert user_requests] message:', err?.message);
      console.error('[BQ insert user_requests] name:', err?.name);
      console.error('[BQ insert user_requests] errors:', JSON.stringify(err?.errors, null, 2)); // ←最重要
      
      // location情報を詳細に出力（欠けている列名がここに出る）
      if (err.errors && Array.isArray(err.errors)) {
        err.errors.forEach((error: any, index: number) => {
          console.error(`[BQ insert user_requests] error[${index}]:`, {
            message: error.message,
            reason: error.reason,
            location: error.location, // ←欠けている列名がここに出る
            debugInfo: error.debugInfo,
          });
        });
      }
      
      console.error('[BQ insert user_requests] response:', JSON.stringify(err?.response?.body ?? err?.response, null, 2));
      console.error('[BQ insert user_requests] code:', err?.code);
      console.error('[BQ insert user_requests] attempted data:', JSON.stringify(cleanedRequest, null, 2));
      
      // BigQueryのエラー情報を保持したまま、新しいエラーオブジェクトを作成
      const enhancedError = new Error(err.message || 'ユーザー登録申請の作成に失敗しました');
      enhancedError.name = err.name || 'BigQueryError';
      
      // 元のエラー情報を保持
      (enhancedError as any).code = err.code;
      (enhancedError as any).errors = err.errors;
      (enhancedError as any).response = err.response;
      (enhancedError as any).cause = err; // 元例外をcauseに設定
      
      // スタックトレースを保持
      enhancedError.stack = err.stack || enhancedError.stack;
      
      throw enhancedError;
    }
    
      const { password_hash: _, ...requestWithoutPassword } = cleanedRequest;
      return requestWithoutPassword;
    } catch (err: any) {
      // 既にエラーが設定されている場合（重複チェックなど）はそのまま再スロー
      if (err.statusCode === 400) {
        throw err;
      }
      
      // その他のエラーはログを出力して再スロー
      console.error('[createUserRequest] unexpected error:', err?.message);
      throw err;
    }
  }

  async approveUserRequest(requestId: string, reviewedBy: string, comment?: string): Promise<void> {
    const requests = await this.getUserRequests();
    const request = requests.find(r => r.user_id === requestId);
    
    if (!request) {
      throw new Error('申請が見つかりません');
    }

    if (request.status !== 'pending') {
      throw new Error('この申請は既に処理されています');
    }

    // ユーザーを作成（スキーマに存在するフィールドのみを含める）
    // usersテーブルのスキーマ: user_id, name, email, password_hash, role, department, 
    // is_active, created_at, updated_at, last_login
    const cleanedUser: any = {
      user_id: `USER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: request.name.trim(),
      email: request.email.trim().toLowerCase(),
      password_hash: request.password_hash,
      role: request.requested_role,
      is_active: formatBoolForBigQuery(true),
      created_at: formatTimestampForBigQuery(new Date()),
      updated_at: formatTimestampForBigQuery(new Date()),
      last_login: null,
    };

    if (request.department) {
      cleanedUser.department = request.department.trim();
    }

    console.log('📋 Cleaned user data for BigQuery:', {
      user_id: cleanedUser.user_id,
      email: cleanedUser.email,
      role: cleanedUser.role,
      is_active: cleanedUser.is_active,
      password_hash_length: cleanedUser.password_hash?.length,
      password_hash_preview: cleanedUser.password_hash?.substring(0, 20) + '...',
      allFields: Object.keys(cleanedUser),
    });

    await getDataset().table('users').insert([cleanedUser], { ignoreUnknownValues: true });
    
    console.log('✅ ユーザーを作成しました:', {
      user_id: cleanedUser.user_id,
      email: cleanedUser.email,
      role: cleanedUser.role,
      is_active: cleanedUser.is_active
    });

    // 申請を承認済みに更新
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const query = `
      UPDATE \`${currentProjectId}.${cleanDatasetId}.user_requests\`
      SET status = 'approved',
          reviewed_at = CURRENT_TIMESTAMP(),
          reviewed_by = @reviewed_by,
          review_comment = @review_comment
      WHERE user_id = @user_id
    `;
    
    try {
      await initializeBigQueryClient().query({
        query,
        params: {
          user_id: requestId,
          reviewed_by: reviewedBy,
          review_comment: comment || null
        },
        types: {
          user_id: 'STRING',
          reviewed_by: 'STRING',
          review_comment: 'STRING'  // NULL値でも型を指定する必要がある
        },
        location: BQ_LOCATION,
      });
    } catch (err: any) {
      if (err?.message?.includes('streaming buffer') || err?.message?.includes('would affect rows in the streaming buffer')) {
        const error = new Error('データがまだ処理中のため、しばらく待ってから再度お試しください。通常、数分で処理が完了します。');
        (error as any).statusCode = 409; // Conflict
        (error as any).retryAfter = 300; // 5分後に再試行を推奨
        throw error;
      }
      throw err;
    }
  }

  // パスワードリセット機能
  async requestPasswordReset(email: string): Promise<void> {
    const inputEmail = email.trim().toLowerCase();
    
    // ユーザーが存在するか確認（登録されているメールアドレスで検索）
    const user = await this.getUserByEmail(inputEmail);
    if (!user) {
      // セキュリティ上の理由で、ユーザーが存在しない場合でも成功メッセージを返す
      console.log('⚠️ パスワードリセット申請: ユーザーが見つかりませんでした（セキュリティ上の理由で成功メッセージを返します）');
      return;
    }

    // 登録されているメールアドレスを取得（データベースに保存されている正確なメールアドレス）
    const registeredEmail = user.email ? user.email.trim().toLowerCase() : inputEmail;
    
    // 既存の有効なトークンを無効化（登録されているメールアドレスで）
    await this.invalidatePasswordResetTokens(registeredEmail);

    // リセットトークンを生成
    const tokenId = `TOKEN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const resetToken = `RESET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24時間後

    // パスワードリセットトークンを保存
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    
    const tokenData = {
      token_id: tokenId,
      user_id: user.user_id,
      email: registeredEmail, // 登録されているメールアドレスを使用
      token: resetToken,
      expires_at: formatTimestampForBigQuery(resetExpiry),
      used: formatBoolForBigQuery(false),
      created_at: formatTimestampForBigQuery(new Date()),
    };

    await getDataset().table('password_reset_tokens').insert([tokenData], { ignoreUnknownValues: true });

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}?token=${resetToken}`;
    
    console.log('📧 パスワードリセットトークンを生成しました:', {
      inputEmail: inputEmail,
      registeredEmail: registeredEmail, // 登録されているメールアドレス
      user_id: user.user_id,
      token: resetToken,
      expires_at: formatTimestampForBigQuery(resetExpiry),
      resetUrl: resetUrl
    });

    // メール送信（登録されているメールアドレスに送信）
    await this.sendPasswordResetEmail(registeredEmail, user.name, resetUrl);
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    if (!token.startsWith('RESET-')) {
      throw new Error('無効なリセットトークンです');
    }

    // トークンを検証
    const resetRequest = await this.getPasswordResetToken(token);
    if (!resetRequest) {
      throw new Error('無効なリセットトークンです');
    }

    if (resetRequest.used === true || resetRequest.used === 'true' || resetRequest.used === 1) {
      throw new Error('このリセットトークンは既に使用されています');
    }

    const expiresAt = new Date(resetRequest.expires_at);
    if (expiresAt < new Date()) {
      throw new Error('リセットトークンの有効期限が切れています');
    }

    // パスワードを更新
    const passwordHash = Buffer.from(newPassword).toString('base64');
    await this.updateUser(resetRequest.user_id, {
      password_hash: passwordHash,
      updated_at: formatTimestampForBigQuery(new Date())
    });

    // 使用済みトークンをマーク
    await this.markPasswordResetTokenAsUsed(resetRequest.token_id);
  }

  private async getPasswordResetToken(token: string): Promise<any | null> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const query = `
      SELECT *
      FROM \`${currentProjectId}.${cleanDatasetId}.password_reset_tokens\`
      WHERE token = @token
      LIMIT 1
    `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      params: { token },
      location: BQ_LOCATION,
    });
    return rows[0] || null;
  }

  private async invalidatePasswordResetTokens(email: string): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const query = `
      UPDATE \`${currentProjectId}.${cleanDatasetId}.password_reset_tokens\`
      SET used = TRUE
      WHERE email = @email AND used = FALSE
    `;
    await initializeBigQueryClient().query({
      query,
      params: { email },
      location: BQ_LOCATION,
    });
  }

  private async markPasswordResetTokenAsUsed(tokenId: string): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const query = `
      UPDATE \`${currentProjectId}.${cleanDatasetId}.password_reset_tokens\`
      SET used = TRUE
      WHERE token_id = @token_id
    `;
    await initializeBigQueryClient().query({
      query,
      params: { token_id: tokenId },
      location: BQ_LOCATION,
    });
  }

  private async sendPasswordResetEmail(email: string, userName: string, resetUrl: string): Promise<void> {
    // メール送信機能の実装
    // Gmail APIまたはSendGridを使用
    const emailService = process.env.EMAIL_SERVICE || 'gmail';
    
    if (emailService === 'gmail') {
      await this.sendEmailViaGmail(email, userName, resetUrl);
    } else if (emailService === 'sendgrid') {
      await this.sendEmailViaSendGrid(email, userName, resetUrl);
    } else {
      // 開発環境ではログ出力のみ
      console.log('📧 メール送信（開発モード）:', {
        to: email,
        subject: 'パスワードリセットのご案内',
        resetUrl: resetUrl
      });
    }
  }

  private async sendEmailViaGmail(to: string, userName: string, resetUrl: string): Promise<void> {
    // Gmail APIを使用したメール送信
    // 実装にはGmail APIの認証が必要
    try {
      const { google } = require('googleapis');
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
      });
      const gmail = google.gmail({ version: 'v1', auth });

      const emailContent = `
パスワードリセットのご案内

${userName} 様

UNIVERSEGEO案件管理システムのパスワードリセット申請を受け付けました。

以下のリンクからパスワードを再設定してください。
このリンクは24時間有効です。

${resetUrl}

※このメールに心当たりがない場合は、無視してください。

--
UNIVERSEGEO案件管理システム
      `.trim();

      const message = [
        `To: ${to}`,
        `Subject: =?UTF-8?B?${Buffer.from('パスワードリセットのご案内', 'utf-8').toString('base64')}?=`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        emailContent
      ].join('\n');

      const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });

      console.log('✅ Gmail API経由でメールを送信しました:', to);
    } catch (error) {
      console.error('❌ Gmail API経由のメール送信に失敗しました:', error);
      // エラーが発生しても処理は続行（ログ出力のみ）
    }
  }

  private async sendEmailViaSendGrid(to: string, userName: string, resetUrl: string): Promise<void> {
    // SendGridを使用したメール送信
    try {
      const sgMail = require('@sendgrid/mail');
      const apiKey = process.env.SENDGRID_API_KEY;
      
      if (!apiKey) {
        throw new Error('SENDGRID_API_KEY環境変数が設定されていません');
      }

      sgMail.setApiKey(apiKey);

      const msg = {
        to: to,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@universegeo.com',
        subject: 'パスワードリセットのご案内',
        text: `
パスワードリセットのご案内

${userName} 様

UNIVERSEGEO案件管理システムのパスワードリセット申請を受け付けました。

以下のリンクからパスワードを再設定してください。
このリンクは24時間有効です。

${resetUrl}

※このメールに心当たりがない場合は、無視してください。

--
UNIVERSEGEO案件管理システム
        `.trim(),
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>パスワードリセットのご案内</h2>
            <p>${userName} 様</p>
            <p>UNIVERSEGEO案件管理システムのパスワードリセット申請を受け付けました。</p>
            <p>以下のリンクからパスワードを再設定してください。<br>このリンクは24時間有効です。</p>
            <p><a href="${resetUrl}" style="background-color: #5b5fff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">パスワードをリセット</a></p>
            <p style="color: #666; font-size: 12px;">※このメールに心当たりがない場合は、無視してください。</p>
            <hr>
            <p style="color: #666; font-size: 12px;">UNIVERSEGEO案件管理システム</p>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log('✅ SendGrid経由でメールを送信しました:', to);
    } catch (error) {
      console.error('❌ SendGrid経由のメール送信に失敗しました:', error);
      // エラーが発生しても処理は続行（ログ出力のみ）
    }
  }

  async rejectUserRequest(requestId: string, reviewedBy: string, comment: string): Promise<void> {
    const requests = await this.getUserRequests();
    const request = requests.find(r => r.user_id === requestId);
    
    if (!request) {
      throw new Error('申請が見つかりません');
    }

    if (request.status !== 'pending') {
      throw new Error('この申請は既に処理されています');
    }

    // 申請を却下済みに更新
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const query = `
      UPDATE \`${currentProjectId}.${cleanDatasetId}.user_requests\`
      SET status = 'rejected',
          reviewed_at = CURRENT_TIMESTAMP(),
          reviewed_by = @reviewed_by,
          review_comment = @review_comment
      WHERE user_id = @user_id
    `;
    
    try {
      await initializeBigQueryClient().query({
        query,
        params: {
          user_id: requestId,
          reviewed_by: reviewedBy,
          review_comment: comment
        },
        types: {
          user_id: 'STRING',
          reviewed_by: 'STRING',
          review_comment: 'STRING'
        },
        location: BQ_LOCATION,
      });
    } catch (err: any) {
      if (err?.message?.includes('streaming buffer') || err?.message?.includes('would affect rows in the streaming buffer')) {
        const error = new Error('データがまだ処理中のため、しばらく待ってから再度お試しください。通常、数分で処理が完了します。');
        (error as any).statusCode = 409; // Conflict
        (error as any).retryAfter = 300; // 5分後に再試行を推奨
        throw error;
      }
      throw err;
    }
  }

  // ==================== メッセージ ====================
  
  async getMessages(project_id: string): Promise<any[]> {
    const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      const query = `
        SELECT *
        FROM \`${currentProjectId}.${cleanDatasetId}.messages\`
        WHERE project_id = @project_id
        ORDER BY timestamp DESC
      `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      params: { project_id },
      location: BQ_LOCATION,
    });
    return rows;
  }

  async getAllMessages(): Promise<any[]> {
    const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      const query = `
        SELECT *
        FROM \`${currentProjectId}.${cleanDatasetId}.messages\`
        ORDER BY timestamp DESC
      `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      location: BQ_LOCATION,
    });
    return rows;
  }

  async createMessage(message: any): Promise<void> {
    try {
      // 必須フィールドの検証
      if (!message.message_id || typeof message.message_id !== 'string' || message.message_id.trim() === '') {
        throw new Error('message_id is required and must be a non-empty string');
      }
      if (!message.project_id || typeof message.project_id !== 'string' || message.project_id.trim() === '') {
        throw new Error('project_id is required and must be a non-empty string');
      }
      if (!message.sender_id || typeof message.sender_id !== 'string' || message.sender_id.trim() === '') {
        throw new Error('sender_id is required and must be a non-empty string');
      }
      if (!message.sender_name || typeof message.sender_name !== 'string' || message.sender_name.trim() === '') {
        throw new Error('sender_name is required and must be a non-empty string');
      }
      if (!message.sender_role || typeof message.sender_role !== 'string' || message.sender_role.trim() === '') {
        throw new Error('sender_role is required and must be a non-empty string');
      }
      if (!message.content || typeof message.content !== 'string' || message.content.trim() === '') {
        throw new Error('content is required and must be a non-empty string');
      }

      // スキーマに存在するフィールドのみを含める
      // messagesテーブルのスキーマ: message_id, project_id, sender_id, sender_name, 
      // sender_role, content, message_type, is_read, timestamp
      const allowedFields = [
        'message_id',
        'project_id',
        'sender_id',
        'sender_name',
        'sender_role',
        'content',
        'message_type',
        'is_read',
        'timestamp',
      ];

      const cleanedMessage: any = {
        message_id: message.message_id.trim(),
        project_id: message.project_id.trim(),
        sender_id: message.sender_id.trim(),
        sender_name: message.sender_name.trim(),
        sender_role: message.sender_role.trim(),
        content: message.content.trim(),
      };

      // 許可されたフィールドのみをコピー
      for (const field of allowedFields) {
        if (field in message && message[field] !== undefined && message[field] !== null) {
          if (field === 'is_read') {
            cleanedMessage[field] = formatBoolForBigQuery(message[field]);
          } else if (field === 'timestamp') {
            cleanedMessage[field] = formatTimestampForBigQuery(message[field] || new Date());
          } else {
            cleanedMessage[field] = message[field];
          }
        }
      }

      // デフォルト値の設定
      if (!cleanedMessage.is_read) {
        cleanedMessage.is_read = formatBoolForBigQuery(false);
      }
      if (!cleanedMessage.timestamp) {
        cleanedMessage.timestamp = formatTimestampForBigQuery(new Date());
      }

      console.log('📋 Cleaned message data for BigQuery:', {
        message_id: cleanedMessage.message_id,
        project_id: cleanedMessage.project_id,
        sender_id: cleanedMessage.sender_id,
        allFields: Object.keys(cleanedMessage),
      });

      await getDataset().table('messages').insert([cleanedMessage], { ignoreUnknownValues: true });
    } catch (err: any) {
      console.error('[BQ insert messages] message:', err?.message);
      console.error('[BQ insert messages] errors:', JSON.stringify(err?.errors, null, 2));
      
      // location情報を詳細に出力
      if (err.errors && Array.isArray(err.errors)) {
        err.errors.forEach((error: any, index: number) => {
          console.error(`[BQ insert messages] error[${index}]:`, {
            message: error.message,
            reason: error.reason,
            location: error.location, // ←欠けている列名がここに出る
          });
        });
      }
      
      throw err;
    }
  }

  async markMessagesAsRead(message_ids: string[]): Promise<void> {
    if (message_ids.length === 0) return;
    
    const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      const placeholders = message_ids.map((_, i) => `@message_id_${i}`).join(', ');
      const query = `
        UPDATE \`${currentProjectId}.${cleanDatasetId}.messages\`
        SET is_read = TRUE
        WHERE message_id IN (${placeholders})
      `;
    
    const params: any = {};
    message_ids.forEach((id, i) => {
      params[`message_id_${i}`] = id;
    });
    
    await initializeBigQueryClient().query({ 
      query, 
      params,
      location: BQ_LOCATION,
    });
  }

  // ==================== 編集依頼 (edit_requests) ====================

  async getEditRequests(): Promise<any[]> {
    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      const [rows] = await initializeBigQueryClient().query({
        query: `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.edit_requests\` ORDER BY requested_at DESC`,
        location: BQ_LOCATION,
      });
      return (rows || []).map((r: any) => ({
        ...r,
        changes: r.changes ? (typeof r.changes === 'string' ? JSON.parse(r.changes) : r.changes) : {},
      }));
    } catch (err: any) {
      if (err?.message?.includes('Not found') || err?.code === 404) return [];
      console.error('[BQ getEditRequests]', err?.message);
      throw err;
    }
  }

  async createEditRequest(row: any): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const changesStr = row.changes ? (typeof row.changes === 'string' ? row.changes : JSON.stringify(row.changes)) : null;
    const cleaned: any = {
      request_id: String(row.request_id).trim(),
      request_type: String(row.request_type).trim(),
      target_id: String(row.target_id).trim(),
      project_id: String(row.project_id).trim(),
      requested_by: String(row.requested_by).trim(),
      requested_at: formatTimestampForBigQuery(row.requested_at || new Date()),
      request_reason: String(row.request_reason ?? '').trim(),
      status: String(row.status ?? 'pending').trim(),
      changes: changesStr,
      segment_id: row.segment_id != null ? String(row.segment_id).trim() : null,
      reviewed_by: row.reviewed_by != null ? String(row.reviewed_by).trim() : null,
      reviewed_at: row.reviewed_at ? formatTimestampForBigQuery(row.reviewed_at) : null,
      review_comment: row.review_comment != null ? String(row.review_comment).trim() : null,
    };
    await getDataset().table('edit_requests').insert([cleaned], { ignoreUnknownValues: true });
  }

  async updateEditRequest(request_id: string, updates: any): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const setParts: string[] = [];
    const params: any = { request_id: request_id.trim() };
    if (updates.status != null) { setParts.push('status = @status'); params.status = String(updates.status).trim(); }
    if (updates.reviewed_by != null) { setParts.push('reviewed_by = @reviewed_by'); params.reviewed_by = String(updates.reviewed_by).trim(); }
    if (updates.reviewed_at != null) { setParts.push('reviewed_at = @reviewed_at'); params.reviewed_at = formatTimestampForBigQuery(updates.reviewed_at); }
    if (updates.review_comment != null) { setParts.push('review_comment = @review_comment'); params.review_comment = String(updates.review_comment).trim(); }
    if (updates.changes != null) { setParts.push('changes = @changes'); params.changes = typeof updates.changes === 'string' ? updates.changes : JSON.stringify(updates.changes); }
    if (setParts.length === 0) return;
    const query = `UPDATE \`${currentProjectId}.${cleanDatasetId}.edit_requests\` SET ${setParts.join(', ')} WHERE request_id = @request_id`;
    await initializeBigQueryClient().query({ query, params, location: BQ_LOCATION });
  }

  async deleteEditRequest(request_id: string): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    await initializeBigQueryClient().query({
      query: `DELETE FROM \`${currentProjectId}.${cleanDatasetId}.edit_requests\` WHERE request_id = @request_id`,
      params: { request_id: request_id.trim() },
      location: BQ_LOCATION,
    });
  }

  // ==================== 来店計測地点グループ (visit_measurement_groups) ====================

  async getVisitMeasurementGroups(project_id: string): Promise<any[]> {
    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      const [rows] = await initializeBigQueryClient().query({
        query: `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.visit_measurement_groups\` WHERE project_id = @project_id ORDER BY created DESC`,
        params: { project_id: project_id.trim() },
        location: BQ_LOCATION,
      });
      return rows || [];
    } catch (err: any) {
      if (err?.message?.includes('Not found') || err?.code === 404) return [];
      console.error('[BQ getVisitMeasurementGroups]', err?.message);
      throw err;
    }
  }

  async createVisitMeasurementGroup(row: any): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const now = new Date();
    const cleaned: any = {
      project_id: String(row.project_id).trim(),
      group_id: String(row.group_id).trim(),
      group_name: String(row.group_name ?? '').trim(),
      attribute: row.attribute != null ? String(row.attribute).trim() : null,
      extraction_period: row.extraction_period != null ? String(row.extraction_period).trim() : null,
      extraction_period_type: row.extraction_period_type != null ? String(row.extraction_period_type).trim() : null,
      extraction_start_date: row.extraction_start_date ? formatDateForBigQuery(row.extraction_start_date) : null,
      extraction_end_date: row.extraction_end_date ? formatDateForBigQuery(row.extraction_end_date) : null,
      extraction_dates: Array.isArray(row.extraction_dates) ? row.extraction_dates : null,
      detection_count: row.detection_count != null ? (typeof row.detection_count === 'number' ? row.detection_count : parseInt(String(row.detection_count), 10)) : null,
      detection_time_start: row.detection_time_start ? formatTimeForBigQuery(row.detection_time_start) : null,
      detection_time_end: row.detection_time_end ? formatTimeForBigQuery(row.detection_time_end) : null,
      stay_time: row.stay_time != null ? String(row.stay_time).trim() : null,
      designated_radius: row.designated_radius != null ? String(row.designated_radius).trim() : null,
      created: formatTimestampForBigQuery(row.created || now),
      updated_at: formatTimestampForBigQuery(row.updated_at || now),
    };
    await getDataset().table('visit_measurement_groups').insert([cleaned], { ignoreUnknownValues: true });
  }

  async updateVisitMeasurementGroup(group_id: string, updates: any): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const allowed = ['group_name', 'attribute', 'extraction_period', 'extraction_period_type', 'extraction_start_date', 'extraction_end_date', 'extraction_dates', 'detection_count', 'detection_time_start', 'detection_time_end', 'stay_time', 'designated_radius'];
    const setClause = allowed.filter(f => updates[f] !== undefined).map(f => `${f} = @${f}`).join(', ');
    if (!setClause) return;
    const params: any = { group_id: group_id.trim() };
    allowed.forEach(f => { if (updates[f] !== undefined) params[f] = f === 'extraction_start_date' || f === 'extraction_end_date' ? formatDateForBigQuery(updates[f]) : f === 'detection_time_start' || f === 'detection_time_end' ? formatTimeForBigQuery(updates[f]) : f === 'extraction_dates' ? updates[f] : updates[f]; });
    params.updated_at = formatTimestampForBigQuery(new Date());
    const query = `UPDATE \`${currentProjectId}.${cleanDatasetId}.visit_measurement_groups\` SET ${setClause}, updated_at = @updated_at WHERE group_id = @group_id`;
    await initializeBigQueryClient().query({ query, params, location: BQ_LOCATION });
  }

  async deleteVisitMeasurementGroup(group_id: string): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    await initializeBigQueryClient().query({
      query: `DELETE FROM \`${currentProjectId}.${cleanDatasetId}.visit_measurement_groups\` WHERE group_id = @group_id`,
      params: { group_id: group_id.trim() },
      location: BQ_LOCATION,
    });
  }

  // ==================== 機能リクエスト (feature_requests) ====================

  async getFeatureRequests(): Promise<any[]> {
    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      const [rows] = await initializeBigQueryClient().query({
        query: `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.feature_requests\` ORDER BY requested_at DESC`,
        location: BQ_LOCATION,
      });
      return rows || [];
    } catch (err: any) {
      if (err?.message?.includes('Not found') || err?.code === 404) return [];
      console.error('[BQ getFeatureRequests]', err?.message);
      throw err;
    }
  }

  async createFeatureRequest(row: any): Promise<void> {
    const now = new Date();
    const cleaned: any = {
      request_id: String(row.request_id).trim(),
      requested_by: String(row.requested_by).trim(),
      requested_by_name: String(row.requested_by_name ?? '').trim(),
      requested_at: formatTimestampForBigQuery(row.requested_at || now),
      title: String(row.title ?? '').trim(),
      description: String(row.description ?? '').trim(),
      category: String(row.category ?? 'other').trim(),
      priority: String(row.priority ?? 'medium').trim(),
      status: String(row.status ?? 'pending').trim(),
      reviewed_by: row.reviewed_by != null ? String(row.reviewed_by).trim() : null,
      reviewed_at: row.reviewed_at ? formatTimestampForBigQuery(row.reviewed_at) : null,
      review_comment: row.review_comment != null ? String(row.review_comment).trim() : null,
      implemented_at: row.implemented_at ? formatTimestampForBigQuery(row.implemented_at) : null,
    };
    await getDataset().table('feature_requests').insert([cleaned], { ignoreUnknownValues: true });
  }

  async updateFeatureRequest(request_id: string, updates: any): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const allowed = ['title', 'description', 'category', 'priority', 'status', 'reviewed_by', 'reviewed_at', 'review_comment', 'implemented_at'];
    const setParts: string[] = [];
    const params: any = { request_id: request_id.trim() };
    allowed.forEach(f => {
      if (updates[f] !== undefined) {
        setParts.push(`${f} = @${f}`);
        params[f] = f === 'reviewed_at' || f === 'implemented_at' ? formatTimestampForBigQuery(updates[f]) : updates[f];
      }
    });
    if (setParts.length === 0) return;
    const query = `UPDATE \`${currentProjectId}.${cleanDatasetId}.feature_requests\` SET ${setParts.join(', ')} WHERE request_id = @request_id`;
    await initializeBigQueryClient().query({ query, params, location: BQ_LOCATION });
  }

  // ==================== レポート作成依頼 (report_requests) ====================

  async getReportRequests(project_id?: string, status?: string): Promise<any[]> {
    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      let query = `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.report_requests\` WHERE 1=1`;
      const params: any = {};
      
      if (project_id && project_id.trim()) {
        query += ` AND project_id = @project_id`;
        params.project_id = project_id.trim();
      }
      
      if (status && status.trim()) {
        query += ` AND status = @status`;
        params.status = status.trim();
      }
      
      query += ` ORDER BY requested_at DESC`;
      
      const [rows] = await initializeBigQueryClient().query({
        query,
        params: Object.keys(params).length ? params : undefined,
        location: BQ_LOCATION,
      });
      
      return (rows || []).map((r: any) => ({
        ...r,
        segment_ids: r.segment_ids ? (typeof r.segment_ids === 'string' ? JSON.parse(r.segment_ids) : r.segment_ids) : [],
      }));
    } catch (err: any) {
      if (err?.message?.includes('Not found') || err?.code === 404) return [];
      console.error('[BQ getReportRequests]', err?.message);
      throw err;
    }
  }

  async getReportRequestById(request_id: string): Promise<any | null> {
    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      const [rows] = await initializeBigQueryClient().query({
        query: `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.report_requests\` WHERE request_id = @request_id`,
        params: { request_id: request_id.trim() },
        location: BQ_LOCATION,
      });
      if (!rows || rows.length === 0) return null;
      const r = rows[0];
      return {
        ...r,
        segment_ids: r.segment_ids ? (typeof r.segment_ids === 'string' ? JSON.parse(r.segment_ids) : r.segment_ids) : [],
      };
    } catch (err: any) {
      if (err?.message?.includes('Not found') || err?.code === 404) return null;
      console.error('[BQ getReportRequestById]', err?.message);
      throw err;
    }
  }

  async createReportRequest(row: any): Promise<void> {
    const now = new Date();
    const cleaned: any = {
      request_id: String(row.request_id).trim(),
      requested_by: String(row.requested_by).trim(),
      requested_by_name: String(row.requested_by_name ?? '').trim(),
      requested_at: formatTimestampForBigQuery(row.requested_at || now),
      project_id: String(row.project_id).trim(),
      report_type: String(row.report_type ?? 'custom').trim(),
      report_title: String(row.report_title ?? '').trim(),
      description: row.description != null ? String(row.description).trim() : null,
      start_date: row.start_date ? formatDateForBigQuery(row.start_date) : null,
      end_date: row.end_date ? formatDateForBigQuery(row.end_date) : null,
      segment_ids: row.segment_ids && Array.isArray(row.segment_ids) ? JSON.stringify(row.segment_ids) : null,
      status: String(row.status ?? 'pending').trim(),
      reviewed_by: row.reviewed_by != null ? String(row.reviewed_by).trim() : null,
      reviewed_at: row.reviewed_at ? formatTimestampForBigQuery(row.reviewed_at) : null,
      review_comment: row.review_comment != null ? String(row.review_comment).trim() : null,
      report_url: row.report_url != null ? String(row.report_url).trim() : null,
      completed_at: row.completed_at ? formatTimestampForBigQuery(row.completed_at) : null,
      error_message: row.error_message != null ? String(row.error_message).trim() : null,
    };
    await getDataset().table('report_requests').insert([cleaned], { ignoreUnknownValues: true });
  }

  async updateReportRequest(request_id: string, updates: any): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const allowed = [
      'report_title', 'description', 'report_type', 'start_date', 'end_date', 'segment_ids',
      'status', 'reviewed_by', 'reviewed_at', 'review_comment', 'report_url', 'completed_at', 'error_message'
    ];
    const setParts: string[] = [];
    const params: any = { request_id: request_id.trim() };
    
    allowed.forEach(f => {
      if (updates[f] !== undefined) {
        if (f === 'start_date' || f === 'end_date') {
          setParts.push(`${f} = @${f}`);
          params[f] = formatDateForBigQuery(updates[f]);
        } else if (f === 'segment_ids' && Array.isArray(updates[f])) {
          setParts.push(`${f} = @${f}`);
          params[f] = JSON.stringify(updates[f]);
        } else if (f === 'reviewed_at' || f === 'completed_at') {
          setParts.push(`${f} = @${f}`);
          params[f] = formatTimestampForBigQuery(updates[f]);
        } else {
          setParts.push(`${f} = @${f}`);
          params[f] = updates[f];
        }
      }
    });
    
    if (setParts.length === 0) return;
    
    const query = `UPDATE \`${currentProjectId}.${cleanDatasetId}.report_requests\` SET ${setParts.join(', ')}, updated_at = CURRENT_TIMESTAMP() WHERE request_id = @request_id`;
    await initializeBigQueryClient().query({ query, params, location: BQ_LOCATION });
  }

  // ==================== 変更履歴 (change_history) ====================

  async getChangeHistories(project_id?: string): Promise<any[]> {
    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getCleanDatasetId();
      let query = `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.change_history\` ORDER BY changed_at DESC`;
      const params: any = {};
      if (project_id && project_id.trim()) {
        query = `SELECT * FROM \`${currentProjectId}.${cleanDatasetId}.change_history\` WHERE project_id = @project_id ORDER BY changed_at DESC`;
        params.project_id = project_id.trim();
      }
      const [rows] = await initializeBigQueryClient().query({
        query,
        params: Object.keys(params).length ? params : undefined,
        location: BQ_LOCATION,
      });
      return (rows || []).map((r: any) => ({
        ...r,
        changes: r.changes ? (typeof r.changes === 'string' ? JSON.parse(r.changes) : r.changes) : undefined,
        deleted_data: r.deleted_data ? (typeof r.deleted_data === 'string' ? JSON.parse(r.deleted_data) : r.deleted_data) : undefined,
      }));
    } catch (err: any) {
      if (err?.message?.includes('Not found') || err?.code === 404) return [];
      console.error('[BQ getChangeHistories]', err?.message);
      throw err;
    }
  }

  async insertChangeHistory(row: any): Promise<void> {
    const cleaned: any = {
      history_id: String(row.history_id).trim(),
      entity_type: String(row.entity_type).trim(),
      entity_id: String(row.entity_id).trim(),
      project_id: String(row.project_id).trim(),
      segment_id: row.segment_id != null ? String(row.segment_id).trim() : null,
      action: String(row.action).trim(),
      changed_by: String(row.changed_by).trim(),
      changed_at: formatTimestampForBigQuery(row.changed_at || new Date()),
      changes: row.changes ? (typeof row.changes === 'string' ? row.changes : JSON.stringify(row.changes)) : null,
      deleted_data: row.deleted_data ? (typeof row.deleted_data === 'string' ? row.deleted_data : JSON.stringify(row.deleted_data)) : null,
    };
    await getDataset().table('change_history').insert([cleaned], { ignoreUnknownValues: true });
  }

  // ==================== Google Sheets ====================

  async exportToGoogleSheets(rows: any[]): Promise<{
    success: boolean;
    message: string;
    rowsAdded?: number;
  }> {
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
    const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'シート1';

    if (!SPREADSHEET_ID) {
      return {
        success: false,
        message: 'Google Sheets API が設定されていません。環境変数（GOOGLE_SPREADSHEET_ID）を確認してください。',
      };
    }

    try {
      // データを2次元配列に変換（13列形式: category_id, brand_id, brand_name, poi_id, poi_name, latitude, longitude, prefecture, city, radius, polygon, setting_flag, created）
      const values = rows.map(row => {
        // createdフィールドがYYYY/MM/DD形式でない場合は変換
        let createdValue = row.created || '';
        if (createdValue && !createdValue.includes('/')) {
          // YYYY-MM-DD形式をYYYY/MM/DD形式に変換
          createdValue = createdValue.replace(/-/g, '/');
        }
        if (!createdValue) {
          // デフォルト値として現在日時をYYYY/MM/DD形式で設定
          const now = new Date();
          createdValue = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`;
        }
        
        return [
          row.category_id || '',
          row.brand_id || '', // 空
          row.brand_name || '',
          row.poi_id || '',
          row.poi_name || '',
          row.latitude !== undefined && row.latitude !== null ? String(row.latitude) : '',
          row.longitude !== undefined && row.longitude !== null ? String(row.longitude) : '',
          row.prefecture || '',
          row.city || '',
          row.radius || '',
          row.polygon || '', // 空
          row.setting_flag || '2',
          createdValue, // YYYY/MM/DD形式
        ];
      });

      // Google Sheets API v4 をサービスアカウント認証で使用
      // Cloud Runでは、サービスアカウントが自動的に認証に使用される
      const { google } = require('googleapis');
      const auth = new google.auth.GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      // 認証情報を取得してサービスアカウントのメールアドレスを確認
      const authClient = await auth.getClient();
      const projectId = await auth.getProjectId();
      let serviceAccountEmail = 'unknown';
      
      if (authClient && 'email' in authClient) {
        serviceAccountEmail = (authClient as any).email || 'unknown';
      } else if (authClient && 'credentials' in authClient) {
        const credentials = (authClient as any).credentials;
        if (credentials && credentials.client_email) {
          serviceAccountEmail = credentials.client_email;
        }
      }
      
      console.log('🔐 Google Sheets API認証情報:', {
        projectId,
        serviceAccountEmail,
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
      });

      const sheets = google.sheets({ version: 'v4', auth });
      
      const response = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:M`, // 列AからMまで（13列）
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values,
        },
      });

      const rowsAdded = response.data.updates?.updatedRows || rows.length;

      console.log('✅ Google Sheets API経由でデータを追加しました:', {
        spreadsheetId: SPREADSHEET_ID,
        sheetName: SHEET_NAME,
        rowsAdded,
      });

      return {
        success: true,
        message: `${rowsAdded}件のデータをスプレッドシートに追加しました`,
        rowsAdded,
      };
    } catch (error: any) {
      console.error('❌ Google Sheets API エラー:', error);
      
      // Google APIのエラー詳細を詳細にログ出力
      const errorDetails: any = {
        message: error?.message,
        code: error?.code,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
      };
      
      // error.response.data の詳細を出力（SheetsかDriveか、どの権限で落ちたかを特定）
      if (error?.response?.data) {
        errorDetails.responseData = error.response.data;
        console.error('📋 Google API エラー詳細 (response.data):', JSON.stringify(error.response.data, null, 2));
      }
      
      // エラーオブジェクト全体を出力（デバッグ用）
      console.error('📋 エラー詳細:', errorDetails);
      
      // スタックトレースも出力
      if (error?.stack) {
        console.error('📋 スタックトレース:', error.stack);
      }
      
      let errorMessage = 'スプレッドシートへの出力に失敗しました';
      let detailedMessage = '';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // より詳細なエラーメッセージを提供
        if (error.message.includes('PERMISSION_DENIED') || 
            error.message.includes('403') || 
            error.message.includes('does not have permission') ||
            error.message.includes('The caller does not have permission')) {
          errorMessage = 'スプレッドシートへのアクセス権限がありません。';
          detailedMessage = `
以下の手順でサービスアカウントにスプレッドシートへの共有権限を付与してください：

1. Googleスプレッドシートを開く
2. 右上の「共有」ボタンをクリック
3. サービスアカウントのメールアドレスを入力（バックエンドのログで確認できます）
4. 権限を「編集者」に設定
5. 「送信」をクリック

サービスアカウントの確認方法:
- Cloud Runの設定から確認
- または、バックエンドのログで「Google Sheets API認証情報」を確認
          `.trim();
        } else if (error.message.includes('NOT_FOUND') || error.message.includes('404')) {
          errorMessage = 'スプレッドシートが見つかりません。';
          detailedMessage = 'スプレッドシートID（GOOGLE_SPREADSHEET_ID）が正しいか確認してください。';
        } else if (error.message.includes('UNAUTHENTICATED') || error.message.includes('401')) {
          errorMessage = '認証に失敗しました。';
          detailedMessage = 'サービスアカウントの権限を確認してください。';
        }
      }

      return {
        success: false,
        message: errorMessage + (detailedMessage ? '\n\n' + detailedMessage : ''),
      };
    }
  }

  // ==================== スプレッドシートエクスポート（テーブル蓄積付き） ====================

  /**
   * スプレッドシートへのエクスポート（テーブルに蓄積してから書き出し）
   */
  async exportToGoogleSheetsWithAccumulation(
    rows: any[],
    projectId: string,
    segmentId?: string,
    exportedBy?: string,
    exportedByName?: string
  ): Promise<{
    success: boolean;
    message: string;
    exportId?: string;
    rowsAdded?: number;
  }> {
    const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
    const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'シート1';

    // エクスポートIDを生成
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = String(Math.floor(Math.random() * 10000)).padStart(3, '0');
    const exportId = `EXP-${dateStr}-${randomNum}`;
    
    try {
      // ========== ステップ1: テーブルにデータを保存 ==========
      console.log('📊 ステップ1: エクスポート履歴をテーブルに保存中...');
      
      // 1-1. エクスポート履歴を保存
      const exportRecord = {
        export_id: exportId,
        project_id: projectId,
        segment_id: segmentId || null,
        exported_by: exportedBy || 'system',
        exported_by_name: exportedByName || 'システム',
        export_status: 'pending',
        spreadsheet_id: SPREADSHEET_ID,
        sheet_name: SHEET_NAME,
        row_count: rows.length,
        exported_at: now.toISOString(),
        completed_at: null,
        error_message: null,
      };

      await this.createSheetExport(exportRecord);

      // 1-2. エクスポートデータを保存
      const exportDataRecords = rows.map((row, index) => ({
        export_data_id: `${exportId}-${String(index + 1).padStart(3, '0')}`,
        export_id: exportId,
        project_id: projectId,
        segment_id: segmentId || null,
        poi_id: row.poi_id || null,
        category_id: row.category_id || null,
        brand_id: row.brand_id || null,
        brand_name: row.brand_name || null,
        poi_name: row.poi_name || null,
        latitude: row.latitude || null,
        longitude: row.longitude || null,
        prefecture: row.prefecture || null,
        city: row.city || null,
        radius: row.radius || null,
        polygon: row.polygon || null,
        setting_flag: row.setting_flag || '2',
        created: row.created || null,
        row_index: index + 1,
      }));

      await this.createSheetExportDataBulk(exportDataRecords);

      console.log('✅ エクスポート履歴とデータをテーブルに保存完了:', {
        exportId,
        rowCount: rows.length,
      });

      // ========== ステップ2: スプレッドシートに書き出し ==========
      console.log('📤 ステップ2: スプレッドシートに書き出し中...');
      
      const exportResult = await this.exportToGoogleSheets(rows);

      // ========== ステップ3: ステータス更新 ==========
      if (exportResult.success) {
        // 成功時: ステータスを'completed'に更新
        await this.updateSheetExportStatus(exportId, 'completed', null);
        
        console.log('✅ エクスポート完了:', {
          exportId,
          rowsAdded: exportResult.rowsAdded,
        });

        return {
          success: true,
          message: `${exportResult.rowsAdded || rows.length}件のデータをスプレッドシートに追加しました（エクスポートID: ${exportId}）`,
          exportId,
          rowsAdded: exportResult.rowsAdded || rows.length,
        };
      } else {
        // 失敗時: ステータスを'failed'に更新
        await this.updateSheetExportStatus(exportId, 'failed', exportResult.message);
        
        console.error('❌ エクスポート失敗:', {
          exportId,
          error: exportResult.message,
        });

        return {
          success: false,
          message: `スプレッドシートへの書き出しに失敗しました。データはテーブルに保存されています（エクスポートID: ${exportId}）。エラー: ${exportResult.message}`,
          exportId,
        };
      }
    } catch (error: any) {
      // エラー時: ステータスを'failed'に更新
      const errorMessage = error?.message || 'Unknown error';
      try {
        await this.updateSheetExportStatus(exportId, 'failed', errorMessage);
      } catch (updateError) {
        // ステータス更新に失敗しても続行
        console.error('⚠️ ステータス更新に失敗しました:', updateError);
      }

      console.error('❌ エクスポート処理エラー:', error);
      return {
        success: false,
        message: `エクスポート処理中にエラーが発生しました。エラー: ${errorMessage}`,
        exportId,
      };
    }
  }

  /**
   * エクスポート履歴を作成
   */
  async createSheetExport(exportRecord: any): Promise<void> {
    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getDatasetId();

      const allowedFields = [
        'export_id',
        'project_id',
        'segment_id',
        'exported_by',
        'exported_by_name',
        'export_status',
        'spreadsheet_id',
        'sheet_name',
        'row_count',
        'exported_at',
        'completed_at',
        'error_message',
      ];

      const cleanedExport: any = {
        export_id: exportRecord.export_id.trim(),
      };

      for (const field of allowedFields) {
        if (field in exportRecord && exportRecord[field] !== undefined && exportRecord[field] !== null) {
          if (field === 'exported_at' || field === 'completed_at') {
            cleanedExport[field] = formatTimestampForBigQuery(exportRecord[field]);
          } else if (field === 'row_count') {
            const numValue = typeof exportRecord[field] === 'string' ? parseInt(exportRecord[field]) : exportRecord[field];
            if (!isNaN(numValue)) {
              cleanedExport[field] = numValue;
            }
          } else {
            cleanedExport[field] = exportRecord[field];
          }
        }
      }

      const now = new Date();
      cleanedExport.created_at = formatTimestampForBigQuery(exportRecord.created_at || now);
      cleanedExport.updated_at = formatTimestampForBigQuery(exportRecord.updated_at || now);

      await getDataset().table('sheet_exports').insert([cleanedExport], { ignoreUnknownValues: true });
      console.log('✅ エクスポート履歴を作成しました:', exportRecord.export_id);
    } catch (err: any) {
      console.error('[BQ insert sheet_export] error:', err?.message);
      throw err;
    }
  }

  /**
   * エクスポートデータを一括作成
   */
  async createSheetExportDataBulk(exportData: any[]): Promise<void> {
    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getDatasetId();

      const allowedFields = [
        'export_data_id',
        'export_id',
        'project_id',
        'segment_id',
        'poi_id',
        'category_id',
        'brand_id',
        'brand_name',
        'poi_name',
        'latitude',
        'longitude',
        'prefecture',
        'city',
        'radius',
        'polygon',
        'setting_flag',
        'created',
        'row_index',
      ];

      const cleanedData = exportData.map(data => {
        const cleaned: any = {
          export_data_id: data.export_data_id.trim(),
          export_id: data.export_id.trim(),
          project_id: data.project_id.trim(),
        };

        for (const field of allowedFields) {
          if (field in data && data[field] !== undefined && data[field] !== null) {
            if (field === 'latitude' || field === 'longitude') {
              const numValue = typeof data[field] === 'string' ? parseFloat(data[field]) : data[field];
              if (!isNaN(numValue)) {
                cleaned[field] = numValue;
              }
            } else if (field === 'row_index') {
              const numValue = typeof data[field] === 'string' ? parseInt(data[field]) : data[field];
              if (!isNaN(numValue)) {
                cleaned[field] = numValue;
              }
            } else {
              cleaned[field] = data[field];
            }
          }
        }

        const now = new Date();
        cleaned.created_at = formatTimestampForBigQuery(data.created_at || now);

        return cleaned;
      });

      await getDataset().table('sheet_export_data').insert(cleanedData, { ignoreUnknownValues: true });
      console.log(`✅ エクスポートデータを一括作成しました: ${cleanedData.length}件`);
    } catch (err: any) {
      console.error('[BQ insert sheet_export_data bulk] error:', err?.message);
      throw err;
    }
  }

  /**
   * エクスポートステータスを更新
   */
  async updateSheetExportStatus(
    exportId: string,
    status: 'pending' | 'completed' | 'failed',
    errorMessage?: string | null
  ): Promise<void> {
    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getDatasetId();

      const updateFields: string[] = ['export_status', 'updated_at'];
      const updateValues: any = {
        export_status: status,
        updated_at: formatTimestampForBigQuery(new Date()),
      };

      if (status === 'completed') {
        updateFields.push('completed_at');
        updateValues.completed_at = formatTimestampForBigQuery(new Date());
      }

      if (status === 'failed' && errorMessage) {
        updateFields.push('error_message');
        updateValues.error_message = errorMessage;
      }

      const setClause = updateFields.map(field => `${field} = @${field}`).join(', ');

      const query = `
        UPDATE \`${currentProjectId}.${cleanDatasetId}.sheet_exports\`
        SET ${setClause}
        WHERE export_id = @export_id
      `;

      const queryOptions: any = {
        query,
        params: {
          export_id: exportId,
          ...updateValues,
        },
      };

      if (BQ_LOCATION && BQ_LOCATION.trim()) {
        queryOptions.location = BQ_LOCATION.trim();
      }

      await initializeBigQueryClient().query(queryOptions);
      console.log('✅ エクスポートステータスを更新しました:', { exportId, status });
    } catch (err: any) {
      console.error('[BQ update sheet_export status] error:', err?.message);
      throw err;
    }
  }

  /**
   * エクスポート履歴を取得
   */
  async getSheetExports(
    projectId?: string,
    status?: string,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getDatasetId();

      let query = `
        SELECT *
        FROM \`${currentProjectId}.${cleanDatasetId}.sheet_exports\`
        WHERE 1=1
      `;

      const params: any = {};

      if (projectId) {
        query += ` AND project_id = @project_id`;
        params.project_id = projectId;
      }

      if (status) {
        query += ` AND export_status = @export_status`;
        params.export_status = status;
      }

      query += ` ORDER BY exported_at DESC LIMIT @limit`;
      params.limit = limit;

      const queryOptions: any = {
        query,
        params,
      };

      if (BQ_LOCATION && BQ_LOCATION.trim()) {
        queryOptions.location = BQ_LOCATION.trim();
      }

      const [rows] = await initializeBigQueryClient().query(queryOptions);
      return rows;
    } catch (err: any) {
      console.error('[BQ get sheet_exports] error:', err?.message);
      return [];
    }
  }

  /**
   * エクスポートデータを取得（再エクスポート用）
   */
  async getSheetExportData(exportId: string): Promise<any[]> {
    try {
      const currentProjectId = validateProjectId();
      const cleanDatasetId = getDatasetId();

      const query = `
        SELECT *
        FROM \`${currentProjectId}.${cleanDatasetId}.sheet_export_data\`
        WHERE export_id = @export_id
        ORDER BY row_index ASC
      `;

      const queryOptions: any = {
        query,
        params: {
          export_id: exportId,
        },
      };

      if (BQ_LOCATION && BQ_LOCATION.trim()) {
        queryOptions.location = BQ_LOCATION.trim();
      }

      const [rows] = await initializeBigQueryClient().query(queryOptions);
      return rows;
    } catch (err: any) {
      console.error('[BQ get sheet_export_data] error:', err?.message);
      return [];
    }
  }
}

// BigQueryServiceのインスタンスを作成
// モジュール読み込み時にエラーが発生しないように、遅延初期化を使用
let bqServiceInstance: BigQueryService | null = null;

export function getBqService(): BigQueryService {
  if (!bqServiceInstance) {
    bqServiceInstance = new BigQueryService();
  }
  return bqServiceInstance;
}

