import { BigQuery } from '@google-cloud/bigquery';

// 環境変数からプロジェクトIDを取得（必須）
// 注意: モジュール読み込み時ではなく、実際に使用される時に検証する
let projectId: string | undefined = process.env.GCP_PROJECT_ID;
const datasetId = process.env.BQ_DATASET || 'universegeo_dataset';

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

// 初期化時のログ（エラーはスローしない）
console.log('🔧 BigQuery client initialization:', {
  GCP_PROJECT_ID: projectId ? `${projectId.substring(0, 10)}...` : 'NOT SET (will be validated on first use)',
  BQ_DATASET: datasetId,
});

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
// projectIdは使用時に動的に取得するため、初期化時には設定しない
const bigqueryConfig: any = {
  // projectIdは使用時に動的に取得
};

// ローカル開発環境でのみkeyFilenameを使用
if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.NODE_ENV !== 'production') {
  bigqueryConfig.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
}

console.log('🔧 BigQuery client config:', {
  projectId,
  datasetId,
  location: BQ_LOCATION,
  hasKeyFilename: !!bigqueryConfig.keyFilename,
  nodeEnv: process.env.NODE_ENV,
});

const bigquery = new BigQuery(bigqueryConfig);

// datasetは使用時に取得（projectIdが設定されている必要がある）
function getDataset() {
  const currentProjectId = validateProjectId();
  return bigquery.dataset(datasetId);
}

export class BigQueryService {
  // ==================== プロジェクト ====================
  
  async getProjects(): Promise<any[]> {
    try {
      // プロジェクトIDが設定されているか再確認
      const currentProjectId = process.env.GCP_PROJECT_ID;
      if (!currentProjectId || currentProjectId.trim() === '') {
        const errorMsg = 'GCP_PROJECT_ID環境変数が設定されていません。Cloud Runの環境変数設定を確認してください。';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }
      
      // projectId変数と環境変数が一致しているか確認
      if (currentProjectId !== projectId) {
        console.warn('⚠️ projectId変数と環境変数が一致していません:', {
          projectIdVariable: projectId,
          envVariable: currentProjectId,
        });
      }
      
      const query = `
        SELECT *
        FROM \`${currentProjectId}.${datasetId}.projects\`
        ORDER BY _register_datetime DESC
      `;
      
      console.log('🔍 BigQuery query config:', {
        projectId: currentProjectId,
        datasetId,
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
      
      const [rows] = await bigquery.query(queryOptions);
      console.log('✅ BigQuery query successful, rows:', rows.length);
      return rows;
    } catch (error: any) {
      console.error('❌ BigQuery getProjects error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        errors: error.errors,
        projectId: process.env.GCP_PROJECT_ID || 'NOT SET',
        datasetId,
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
    const query = `
      SELECT *
      FROM \`${projectId}.${datasetId}.projects\`
      WHERE project_id = @project_id
    `;
    const [rows] = await bigquery.query({
      query,
      params: { project_id },
    });
    return rows[0] || null;
  }

  async createProject(project: any): Promise<void> {
    await getDataset().table('projects').insert([{
      ...project,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }]);
  }

  async updateProject(project_id: string, updates: any): Promise<void> {
    const setClause = Object.keys(updates)
      .map(key => `${key} = @${key}`)
      .join(', ');
    
    const query = `
      UPDATE \`${projectId}.${datasetId}.projects\`
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP()
      WHERE project_id = @project_id
    `;
    
    await bigquery.query({
      query,
      params: { project_id, ...updates },
      location: BQ_LOCATION,
    });
  }

  async deleteProject(project_id: string): Promise<void> {
    const query = `
      DELETE FROM \`${projectId}.${datasetId}.projects\`
      WHERE project_id = @project_id
    `;
    await bigquery.query({
      query,
      params: { project_id },
      location: BQ_LOCATION,
    });
  }

  // ==================== セグメント ====================
  
  async getSegments(): Promise<any[]> {
    const query = `
      SELECT *
      FROM \`${projectId}.${datasetId}.segments\`
      ORDER BY segment_registered_at DESC
    `;
    const [rows] = await bigquery.query({
      query,
      location: BQ_LOCATION,
    });
    return rows;
  }

  async getSegmentsByProject(project_id: string): Promise<any[]> {
    const query = `
      SELECT *
      FROM \`${projectId}.${datasetId}.segments\`
      WHERE project_id = @project_id
      ORDER BY segment_registered_at DESC
    `;
    const [rows] = await bigquery.query({
      query,
      params: { project_id },
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
    const setClause = Object.keys(updates)
      .map(key => `${key} = @${key}`)
      .join(', ');
    
    const query = `
      UPDATE \`${projectId}.${datasetId}.segments\`
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP()
      WHERE segment_id = @segment_id
    `;
    
    await bigquery.query({
      query,
      params: { segment_id, ...updates },
      location: BQ_LOCATION,
    });
  }

  // ==================== POI（地点） ====================
  
  async getPois(): Promise<any[]> {
    const query = `
      SELECT *
      FROM \`${projectId}.${datasetId}.pois\`
      ORDER BY created_at DESC
    `;
    const [rows] = await bigquery.query({
      query,
      location: BQ_LOCATION,
    });
    return rows;
  }

  async getPoisByProject(project_id: string): Promise<any[]> {
    const query = `
      SELECT *
      FROM \`${projectId}.${datasetId}.pois\`
      WHERE project_id = @project_id
      ORDER BY created_at DESC
    `;
    const [rows] = await bigquery.query({
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
    const setClause = Object.keys(updates)
      .map(key => `${key} = @${key}`)
      .join(', ');
    
    const query = `
      UPDATE \`${projectId}.${datasetId}.pois\`
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP()
      WHERE poi_id = @poi_id
    `;
    
    await bigquery.query({
      query,
      params: { poi_id, ...updates },
      location: BQ_LOCATION,
    });
  }

  async deletePoi(poi_id: string): Promise<void> {
    const query = `
      DELETE FROM \`${projectId}.${datasetId}.pois\`
      WHERE poi_id = @poi_id
    `;
    await bigquery.query({
      query,
      params: { poi_id },
      location: BQ_LOCATION,
    });
  }

  // ==================== ユーザー ====================
  
  async getUsers(): Promise<any[]> {
    const query = `
      SELECT *
      FROM \`${projectId}.${datasetId}.users\`
      ORDER BY created_at DESC
    `;
    const [rows] = await bigquery.query({
      query,
      location: BQ_LOCATION,
    });
    return rows;
  }

  async getUserByEmail(email: string): Promise<any> {
    const query = `
      SELECT *
      FROM \`${projectId}.${datasetId}.users\`
      WHERE email = @email
    `;
    const [rows] = await bigquery.query({
      query,
      params: { email },
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
    const setClause = Object.keys(updates)
      .map(key => `${key} = @${key}`)
      .join(', ');
    
    const query = `
      UPDATE \`${projectId}.${datasetId}.users\`
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP()
      WHERE user_id = @user_id
    `;
    
    await bigquery.query({
      query,
      params: { user_id, ...updates },
      location: BQ_LOCATION,
    });
  }

  // ==================== ユーザー登録申請 ====================

  async getUserRequests(): Promise<any[]> {
    const query = `
      SELECT *
      FROM \`${projectId}.${datasetId}.user_requests\`
      ORDER BY requested_at DESC
    `;
    const [rows] = await bigquery.query({
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

    await getDataset().table('user_requests').insert([newRequest]);
    
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

    await dataset.table('users').insert([newUser]);

    // 申請を承認済みに更新
    const query = `
      UPDATE \`${projectId}.${datasetId}.user_requests\`
      SET status = 'approved',
          reviewed_at = CURRENT_TIMESTAMP(),
          reviewed_by = @reviewed_by,
          review_comment = @review_comment
      WHERE user_id = @user_id
    `;
    
    await bigquery.query({
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
    const query = `
      UPDATE \`${projectId}.${datasetId}.user_requests\`
      SET status = 'rejected',
          reviewed_at = CURRENT_TIMESTAMP(),
          reviewed_by = @reviewed_by,
          review_comment = @review_comment
      WHERE user_id = @user_id
    `;
    
    await bigquery.query({
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
    const query = `
      SELECT *
      FROM \`${projectId}.${datasetId}.messages\`
      WHERE project_id = @project_id
      ORDER BY timestamp DESC
    `;
    const [rows] = await bigquery.query({
      query,
      params: { project_id },
    });
    return rows;
  }

  async getAllMessages(): Promise<any[]> {
    const query = `
      SELECT *
      FROM \`${projectId}.${datasetId}.messages\`
      ORDER BY timestamp DESC
    `;
    const [rows] = await bigquery.query({
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
    
    const placeholders = message_ids.map((_, i) => `@message_id_${i}`).join(', ');
    const query = `
      UPDATE \`${projectId}.${datasetId}.messages\`
      SET is_read = TRUE
      WHERE message_id IN (${placeholders})
    `;
    
    const params: any = {};
    message_ids.forEach((id, i) => {
      params[`message_id_${i}`] = id;
    });
    
    await bigquery.query({ 
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

export const bqService = new BigQueryService();

