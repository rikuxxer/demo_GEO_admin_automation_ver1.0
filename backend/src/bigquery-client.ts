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
        ORDER BY _register_datetime DESC
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
      return rows;
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
    return rows[0] || null;
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
      if (!project.project_id || typeof project.project_id !== 'string' || project.project_id.trim() === '') {
        throw new Error('project_id is required and must be a non-empty string');
      }

      // 2. DATE型フィールドをYYYY-MM-DD形式に変換
      const formatDateForBigQuery = (dateValue: any): string | null => {
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
      };

      // 3. TIMESTAMP型フィールドをRFC3339/ISO形式に変換
      const formatTimestampForBigQuery = (timestampValue: any): string => {
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
      };

      // 4. BigQueryのスキーマに存在するフィールドのみを含める
      // スキーマに存在するフィールド: project_id, advertiser_name, appeal_point, delivery_start_date, 
      // delivery_end_date, person_in_charge, project_status, _register_datetime, created_at, updated_at
      const allowedFields = [
        'project_id',
        'advertiser_name',
        'appeal_point',
        'delivery_start_date',
        'delivery_end_date',
        'person_in_charge',
        'project_status',
        'project_registration_started_at', // 追加フィールド（存在する場合）
      ];

      const cleanedProject: any = {
        project_id: project.project_id.trim(), // REQUIRED STRING
      };

      // 許可されたフィールドのみをコピー
      for (const field of allowedFields) {
        if (field in project && project[field] !== undefined && project[field] !== null) {
          if (field === 'delivery_start_date' || field === 'delivery_end_date') {
            // DATE型フィールドをYYYY-MM-DD形式に変換
            cleanedProject[field] = formatDateForBigQuery(project[field]);
          } else {
            cleanedProject[field] = project[field];
          }
        }
      }

      // TIMESTAMP型フィールドを追加
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
        await table.insert(rows);
        console.log('✅ Project created successfully in BigQuery.');
      } catch (err: any) {
        // BigQuery insertAll の行エラーがここに入る
        console.error('[BQ insert] message:', err?.message);
        console.error('[BQ insert] name:', err?.name);
        console.error('[BQ insert] errors:', JSON.stringify(err?.errors, null, 2)); // ←最重要
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
        code: error.code,
        errors: error.errors,
        projectId: process.env.GCP_PROJECT_ID,
        datasetId: datasetId,
        location: BQ_LOCATION,
      });
      let errorMessage = error.message || 'プロジェクトの作成に失敗しました';
      if (errorMessage.includes('Not found: Project')) {
        errorMessage = 'GCP_PROJECT_ID環境変数が正しく設定されていないか、プロジェクトが見つかりません。Cloud Runの環境変数設定を確認してください。';
      } else if (errorMessage.includes('Permission denied')) {
        errorMessage = 'BigQueryへの書き込み権限がありません。Cloud Runサービスアカウントの権限を確認してください。';
      } else if (errorMessage.includes('project_id is required')) {
        errorMessage = 'project_idは必須です。リクエストにproject_idが含まれているか確認してください。';
      }
      throw new Error(`プロジェクトの作成に失敗しました: ${errorMessage}`);
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
    await getDataset().table('segments').insert([{
      ...segment,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
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
    await getDataset().table('pois').insert([{
      ...poi,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
  }

  async createPoisBulk(pois: any[]): Promise<void> {
    const poisWithTimestamps = pois.map(poi => ({
      ...poi,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
    await getDataset().table('pois').insert(poisWithTimestamps);
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
      const query = `
        SELECT *
        FROM \`${currentProjectId}.${cleanDatasetId}.users\`
        WHERE email = @email
      `;
    const [rows] = await initializeBigQueryClient().query({
      query,
      params: { email },
      location: BQ_LOCATION,
    });
    return rows[0] || null;
  }

  async createUser(user: any): Promise<void> {
    await getDataset().table('users').insert([{
      ...user,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
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
    // メールアドレスの重複チェック（既存ユーザー）
    const existingUser = await this.getUserByEmail(requestData.email);
    if (existingUser) {
      throw new Error('このメールアドレスは既に登録されています');
    }

    // 既に申請済みかチェック
    const existingRequests = await this.getUserRequests();
    const existingRequest = existingRequests.find(r => 
      r.email === requestData.email && r.status === 'pending'
    );
    if (existingRequest) {
      throw new Error('このメールアドレスで既に申請が行われています');
    }

    // パスワードハッシュ化（簡易実装 - 本番環境ではbcrypt等を使用）
    const password_hash = Buffer.from(requestData.password).toString('base64');

    const user_id = `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newRequest = {
      user_id,
      name: requestData.name,
      email: requestData.email,
      password_hash,
      requested_role: requestData.requested_role,
      department: requestData.department || null,
      reason: requestData.reason || null,
      status: 'pending',
      requested_at: new Date().toISOString(),
      reviewed_at: null,
      reviewed_by: null,
      review_comment: null
    };

    try {
      await getDataset().table('user_requests').insert([newRequest]);
    } catch (err: any) {
      // BigQuery insertAll の行エラーがここに入る
      console.error('[BQ insert user_requests] message:', err?.message);
      console.error('[BQ insert user_requests] name:', err?.name);
      console.error('[BQ insert user_requests] errors:', JSON.stringify(err?.errors, null, 2)); // ←最重要
      console.error('[BQ insert user_requests] response:', JSON.stringify(err?.response?.body ?? err?.response, null, 2));
      console.error('[BQ insert user_requests] code:', err?.code);
      
      // エラーを再スロー（詳細情報を含む）
      throw err;
    }
    
    const { password_hash: _, ...requestWithoutPassword } = newRequest;
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

    // ユーザーを作成
    const newUser = {
      user_id: `USER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: request.name,
      email: request.email,
      password_hash: request.password_hash,
      role: request.requested_role,
      department: request.department,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_login: null
    };

    await getDataset().table('users').insert([newUser]);

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
      location: BQ_LOCATION,
    });
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
    await getDataset().table('messages').insert([message]);
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
    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    const SHEET_NAME = process.env.GOOGLE_SHEET_NAME || 'シート1';

    if (!SPREADSHEET_ID || !API_KEY) {
      return {
        success: false,
        message: 'Google Sheets API が設定されていません。環境変数（GOOGLE_SPREADSHEET_ID, GOOGLE_SHEETS_API_KEY）を確認してください。',
      };
    }

    try {
      // データを2次元配列に変換
      const values = rows.map(row => [
        row.半径 || row.designated_radius || '',
        row.brand_name || '',
        row.poi_id || '',
        row.poi_name || '',
        row.latitude || '',
        row.longitude || '',
        row.prefecture || '',
        row.city || '',
        row.setting_flag || '1',
        row.created || new Date().toISOString().split('T')[0],
      ]);

      // Google Sheets API v4 - append リクエスト
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}:append?valueInputOption=USER_ENTERED&key=${API_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Sheets API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json() as {
        updates?: {
          updatedRows?: number;
        };
      };
      const rowsAdded = result.updates?.updatedRows || rows.length;

      return {
        success: true,
        message: `${rowsAdded}件のデータをスプレッドシートに追加しました`,
        rowsAdded,
      };
    } catch (error) {
      console.error('Google Sheets API エラー:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'スプレッドシートへの出力に失敗しました',
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

