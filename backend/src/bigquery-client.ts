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

export class BigQueryService {
  // ==================== プロジェクト ====================
  
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

  async createSegment(segment: any): Promise<void> {
    try {
      // 必須フィールドの検証
      if (!segment.segment_id || typeof segment.segment_id !== 'string' || segment.segment_id.trim() === '') {
        throw new Error('segment_id is required and must be a non-empty string');
      }
      if (!segment.project_id || typeof segment.project_id !== 'string' || segment.project_id.trim() === '') {
        throw new Error('project_id is required and must be a non-empty string');
      }

      // スキーマに存在するフィールドのみを含める
      const allowedFields = [
        'segment_id',
        'project_id',
        'segment_name',
        'segment_registered_at',
        'delivery_media',
        'media_id',
        'attribute',
        'extraction_period',
        'extraction_start_date',
        'extraction_end_date',
        'detection_count',
        'detection_time_start',
        'detection_time_end',
        'stay_time',
        'designated_radius',
        'location_request_status',
        'data_coordination_date',
        'delivery_confirmed',
      ];

      const cleanedSegment: any = {
        segment_id: segment.segment_id.trim(),
        project_id: segment.project_id.trim(),
      };

      // 許可されたフィールドのみをコピー
      for (const field of allowedFields) {
        if (field in segment && segment[field] !== undefined && segment[field] !== null) {
          if (field === 'extraction_start_date' || field === 'extraction_end_date' || field === 'data_coordination_date') {
            cleanedSegment[field] = formatDateForBigQuery(segment[field]);
          } else if (field === 'detection_time_start' || field === 'detection_time_end') {
            cleanedSegment[field] = formatTimeForBigQuery(segment[field]);
          } else if (field === 'delivery_confirmed') {
            cleanedSegment[field] = formatBoolForBigQuery(segment[field]);
          } else if (field === 'segment_registered_at') {
            cleanedSegment[field] = formatTimestampForBigQuery(segment[field] || new Date());
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
    const setClause = Object.keys(updates)
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
      params: { segment_id, ...updates },
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
          } else {
            cleanedPoi[field] = poi[field];
          }
        }
      }

      // TIMESTAMP型フィールドを追加
      const now = new Date();
      cleanedPoi.created_at = formatTimestampForBigQuery(poi.created_at || now);
      cleanedPoi.updated_at = formatTimestampForBigQuery(poi.updated_at || now);

      console.log('📋 Cleaned POI data for BigQuery:', {
        poi_id: cleanedPoi.poi_id,
        project_id: cleanedPoi.project_id,
        poi_name: cleanedPoi.poi_name,
        allFields: Object.keys(cleanedPoi),
      });

      await getDataset().table('pois').insert([cleanedPoi], { ignoreUnknownValues: true });
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

      console.log(`📋 Cleaned ${cleanedPois.length} POIs for BigQuery bulk insert`);

      await getDataset().table('pois').insert(cleanedPois, { ignoreUnknownValues: true });
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
    const setClause = Object.keys(updates)
      .map(key => `${key} = @${key}`)
      .join(', ');
    
      const cleanDatasetId = getCleanDatasetId();
      const query = `
        UPDATE \`${currentProjectId}.${cleanDatasetId}.pois\`
        SET ${setClause}, updated_at = CURRENT_TIMESTAMP()
        WHERE poi_id = @poi_id
      `;
    
    await initializeBigQueryClient().query({
      query,
      params: { poi_id, ...updates },
      location: BQ_LOCATION,
    });
  }

  async deletePoi(poi_id: string): Promise<void> {
    const currentProjectId = validateProjectId();
    const cleanDatasetId = getCleanDatasetId();
    const query = `
      DELETE FROM \`${currentProjectId}.${cleanDatasetId}.pois\`
      WHERE poi_id = @poi_id
    `;
    await initializeBigQueryClient().query({
      query,
      params: { poi_id },
      location: BQ_LOCATION,
    });
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

  // ==================== ユーザー登録申請 ====================

  async getUserRequests(): Promise<any[]> {
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
  }

  async createUserRequest(requestData: {
    name: string;
    email: string;
    password: string;
    requested_role: 'admin' | 'sales';
    department?: string;
    reason?: string;
  }): Promise<any> {
    // メールアドレスを正規化（前後の空白を除去、小文字化）
    const normalizedEmail = requestData.email.trim().toLowerCase();

    // メールアドレスの重複チェック（既存ユーザー）
    const existingUser = await this.getUserByEmail(normalizedEmail);
    if (existingUser) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    // 既に申請済みかチェック（メールアドレス）- pending または approved の申請をチェック
    const existingRequests = await this.getUserRequests();
    const existingRequestByEmail = existingRequests.find(r => 
      r.email && r.email.trim().toLowerCase() === normalizedEmail && (r.status === 'pending' || r.status === 'approved')
    );
    if (existingRequestByEmail) {
      throw new Error('このメールアドレスで既に申請が行われています。別のメールアドレスを使用するか、既存の申請の承認をお待ちください。');
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
      const dataset = initializeBigQueryClient().dataset(cleanDatasetId, { projectId: currentProjectId });
      const table = dataset.table('user_requests');
      
      console.log('📋 Inserting into BigQuery:', {
        projectId: currentProjectId,
        datasetId: cleanDatasetId,
        table: 'user_requests',
      });
      
      // ignoreUnknownValues: true を追加（未知のフィールドを無視）
      await table.insert([cleanedRequest], { ignoreUnknownValues: true });
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

