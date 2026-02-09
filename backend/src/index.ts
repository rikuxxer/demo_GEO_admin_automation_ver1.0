import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

// 環境変数の確認（アプリケーション起動時）
console.log('🔍 環境変数の確認（起動時）:');
console.log(`  GCP_PROJECT_ID: ${process.env.GCP_PROJECT_ID ? '✅ SET' : '❌ NOT SET'}`);
console.log(`  BQ_DATASET: ${process.env.BQ_DATASET ? '✅ SET' : '❌ NOT SET'}`);

// BigQueryサービスのインポート
// モジュール読み込み時にエラーが発生しないように、遅延初期化を使用
import { getBqService } from './bigquery-client';

// ミドルウェアのインポート
import { requestContext } from './middleware/request-context';
import { wrapAsync } from './middleware/async-wrapper';
import { errorHandler } from './middleware/error-handler';

const app = express();
const PORT = process.env.PORT || 8080;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// CORS設定: 複数のoriginに対応
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  // Cloud RunのフロントエンドURLも許可（環境変数から動的に取得）
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  // 一般的なCloud RunのURLパターンも許可（開発中）
  /^https:\/\/universegeo.*\.run\.app$/,
].filter(Boolean); // 空の値を除外

console.log('🌐 CORS設定:', {
  FRONTEND_URL,
  allowedOrigins: allowedOrigins.map(o => typeof o === 'string' ? o : 'regex pattern'),
});

// ミドルウェア
app.use(cors({
  origin: (origin, callback) => {
    // originが未設定（同一オリジンリクエスト、サーバー間通信、Postmanなど）の場合
    if (!origin) {
      callback(null, true);
      return;
    }

    // file:// からの fetch は "null" 文字列になることがある
    if (origin === "null") {
      callback(null, true);
      return;
    }
    
    // 開発環境またはテスト環境では、すべてのoriginを許可（オプション）
    // 本番環境では削除または条件を追加してください
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (isDevelopment && process.env.ALLOW_ALL_ORIGINS === 'true') {
      callback(null, true);
      return;
    }
    
    // 文字列のoriginをチェック
    if (allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') {
        return origin === allowed;
      } else if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return false;
    })) {
      callback(null, true);
      return;
    }
    
    console.warn(`⚠️ CORS blocked origin: ${origin}`);
    console.warn(`   Allowed origins:`, allowedOrigins);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Preflight（OPTIONS）リクエストを確実に通す
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));

// リクエストコンテキストミドルウェア（相関IDの生成・設定）
app.use(requestContext);

// ルートパス（API情報を返す）
app.get('/', (req, res) => {
  res.json({
    message: 'UNIVERSEGEO Backend API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      projects: '/api/projects',
      segments: '/api/segments',
      pois: '/api/pois',
      users: '/api/users',
      userRequests: '/api/user-requests',
      messages: '/api/messages',
      sheets: '/api/sheets/export',
    },
    environment: {
      GCP_PROJECT_ID: process.env.GCP_PROJECT_ID ? 'SET' : 'NOT SET',
      BQ_DATASET: process.env.BQ_DATASET || 'NOT SET',
    }
  });
});

// ヘルスチェック
app.get('/health', wrapAsync(async (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: {
      GCP_PROJECT_ID: process.env.GCP_PROJECT_ID ? 'SET' : 'NOT SET',
      BQ_DATASET: process.env.BQ_DATASET || 'NOT SET',
    }
  });
}));

// ==================== プロジェクト ====================

app.get('/api/projects', wrapAsync(async (req, res) => {
  // 環境変数の確認
  if (!process.env.GCP_PROJECT_ID) {
    const error: any = new Error('GCP_PROJECT_ID環境変数が設定されていません');
    error.statusCode = 500;
    error.name = 'ConfigurationError';
    error.details = 'Cloud Runの環境変数設定を確認してください。GitHub SecretsのGCP_PROJECT_IDが正しく設定されているか確認してください。';
    throw error;
  }
  
  const projects = await getBqService().getProjects();
  res.json(projects);
}));

app.get('/api/projects/:project_id', async (req, res) => {
  try {
    const project = await getBqService().getProjectById(req.params.project_id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error: any) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    // リクエストボディをログ出力（デバッグ用）
    console.log('📥 POST /api/projects リクエスト受信:');
    console.log('  Content-Type:', req.headers['content-type']);
    console.log('  Body keys:', Object.keys(req.body || {}));
    console.log('  Body:', JSON.stringify(req.body, null, 2));
    console.log('  project_id:', req.body?.project_id || 'NOT FOUND');
    
    // 環境変数の確認
    if (!process.env.GCP_PROJECT_ID) {
      console.error('❌ GCP_PROJECT_ID環境変数が設定されていません');
      return res.status(500).json({
        error: 'GCP_PROJECT_ID環境変数が設定されていません',
        type: 'ConfigurationError',
        details: 'Cloud Runの環境変数設定を確認してください。GitHub SecretsのGCP_PROJECT_IDが正しく設定されているか確認してください。',
      });
    }
    
    if (!process.env.BQ_DATASET) {
      console.error('❌ BQ_DATASET環境変数が設定されていません');
      return res.status(500).json({
        error: 'BQ_DATASET環境変数が設定されていません',
        type: 'ConfigurationError',
        details: 'Cloud Runの環境変数設定を確認してください。GitHub SecretsのBQ_DATASETが正しく設定されているか確認してください。',
      });
    }
    
    // project_idの事前チェックと自動生成
    let projectData = { ...req.body };
    const isProjectIdProvided =
      !!projectData.project_id &&
      typeof projectData.project_id === 'string' &&
      projectData.project_id.trim() !== '';

    // NOTE:
    // - project_idが未指定の場合はバックエンドで自動採番する
    // - 本番では同時作成などで採番衝突が起こり得るため、未指定時のみリトライする
    const MAX_ID_GENERATION_RETRIES = 5;

    if (!isProjectIdProvided) {
      let lastError: any = null;

      for (let attempt = 1; attempt <= MAX_ID_GENERATION_RETRIES; attempt++) {
        const generatedProjectId = await getBqService().generateNextProjectId();
        console.warn(
          `⚠️ リクエストボディにproject_idが含まれていません。自動生成します: ${generatedProjectId} (attempt ${attempt}/${MAX_ID_GENERATION_RETRIES})`,
        );
        projectData.project_id = generatedProjectId;

        try {
          break; // createProjectの前にループを抜けるのではなく、下で実際に作成する
        } catch (e) {
          lastError = e;
        }
      }

      // createProject は下で実行するが、念のため project_id が生成できていない場合はエラー
      if (!projectData.project_id || typeof projectData.project_id !== 'string' || projectData.project_id.trim() === '') {
        throw lastError || new Error('Failed to generate project_id');
      }
    }
    
    // person_in_chargeが存在しない場合、デフォルト値を設定
    if (!projectData.person_in_charge || typeof projectData.person_in_charge !== 'string' || projectData.person_in_charge.trim() === '') {
      projectData.person_in_charge = '営業A';
      console.warn('⚠️ person_in_chargeが設定されていません。デフォルト値を設定します:', projectData.person_in_charge);
    }
    
    console.log('📋 最終的なプロジェクトデータ:', {
      project_id: projectData.project_id,
      advertiser_name: projectData.advertiser_name,
      delivery_start_date: projectData.delivery_start_date,
      delivery_end_date: projectData.delivery_end_date,
      person_in_charge: projectData.person_in_charge,
      allKeys: Object.keys(projectData),
    });
    
    // project_id未指定（自動生成）の場合のみ、重複時に採番し直してリトライ
    if (!isProjectIdProvided) {
      let created = false;
      let lastError: any = null;

      for (let attempt = 1; attempt <= MAX_ID_GENERATION_RETRIES; attempt++) {
        try {
          // 初回はすでにprojectData.project_idが入っている（上で生成済み）
          if (attempt > 1) {
            const regeneratedProjectId = await getBqService().generateNextProjectId({ mode: 'timestamp' });
            console.warn(
              `⚠️ project_id重複のためタイムスタンプ採番に切替: ${regeneratedProjectId} (attempt ${attempt}/${MAX_ID_GENERATION_RETRIES})`,
            );
            projectData.project_id = regeneratedProjectId;
          }

          await getBqService().createProject(projectData);
          created = true;
          break;
        } catch (e: any) {
          lastError = e;
          const msg = e?.message || '';
          // BigQueryService.createProject が投げる重複エラー文言に合わせて判定
          const isDuplicateId =
            typeof msg === 'string' &&
            (msg.includes('already exists') || msg.includes('project_id') && msg.includes('exists'));

          if (!isDuplicateId) {
            throw e;
          }
          console.warn('⚠️ project_id重複エラーを検知:', msg);
        }
      }

      if (!created) {
        throw lastError || new Error('Failed to create project after retries');
      }
    } else {
      // project_idが明示指定された場合は、そのまま作成（重複はエラーとして返す）
      await getBqService().createProject(projectData);
    }
    
    // 作成されたプロジェクトを取得して返す
    const createdProject = await getBqService().getProjectById(projectData.project_id);
    if (!createdProject) {
      throw new Error('Failed to retrieve created project');
    }
    
    res.status(201).json({ 
      message: 'Project created successfully',
      project_id: projectData.project_id,
      project: createdProject
    });
  } catch (error: any) {
    console.error('Error creating project:', error);
    console.error('Error stack:', error.stack);
    console.error('Environment variables:', {
      GCP_PROJECT_ID: process.env.GCP_PROJECT_ID ? 'SET' : 'NOT SET',
      BQ_DATASET: process.env.BQ_DATASET || 'NOT SET',
    });
    
    // BigQueryエラーの詳細をログ出力
    if (error.errors) {
      console.error('[BQ insert projects] errors:', JSON.stringify(error.errors, null, 2));
    }
    console.error('[BQ insert projects] message:', error?.message);
    console.error('[BQ insert projects] name:', error?.name);
    console.error('[BQ insert projects] code:', error?.code);
    console.error('[BQ insert projects] response:', JSON.stringify(error?.response?.body ?? error?.response, null, 2));
    
    // BigQueryの元のエラー情報を保持したままレスポンスを構築
    const errorDetails: any = {
      error: error.message || 'プロジェクトの作成に失敗しました',
      type: error.name || 'UnknownError',
    };
    
    // BigQueryエラーの詳細を必ず含める
    if (error.errors) {
      errorDetails.errors = error.errors; // BigQueryのerrors配列をそのまま含める
      errorDetails.bigqueryErrors = error.errors; // 後方互換性のため
      
      // 最初のエラーメッセージを抽出してメインメッセージに追加
      if (Array.isArray(error.errors) && error.errors.length > 0) {
        const firstError = error.errors[0];
        if (firstError && firstError.message) {
          errorDetails.error = `${errorDetails.error}: ${firstError.message}`;
        }
      }
    }
    
    // BigQueryのresponse情報を含める
    if (error.response) {
      errorDetails.response = error.response;
    }
    
    // エラーコードを含める
    if (error.code) {
      errorDetails.code = error.code;
    }
    
    // cause（元例外）の情報を含める（可能な場合）
    if (error.cause) {
      errorDetails.cause = {
        message: error.cause.message,
        name: error.cause.name,
        code: error.cause.code,
      };
    }
    
    // hint（補足説明）を含める
    if (error.hint) {
      errorDetails.hint = error.hint;
    }
    
    // GCP_PROJECT_IDが設定されていない場合の詳細情報
    if (errorDetails.error.includes('GCP_PROJECT_ID') || !process.env.GCP_PROJECT_ID) {
      errorDetails.details = errorDetails.details || 'GCP_PROJECT_ID環境変数が正しく設定されていません。Cloud Runの環境変数設定を確認してください。';
      errorDetails.configuration = {
        GCP_PROJECT_ID: process.env.GCP_PROJECT_ID || 'NOT SET',
        BQ_DATASET: process.env.BQ_DATASET || 'NOT SET',
      };
    }
    
    // リクエストボディの情報を追加（デバッグ用）
    if (process.env.NODE_ENV !== 'production') {
      errorDetails.stack = error.stack;
      errorDetails.requestBody = req.body;
    }
    
    res.status(500).json(errorDetails);
  }
});

app.put('/api/projects/:project_id', async (req, res) => {
  try {
    await getBqService().updateProject(req.params.project_id, req.body);
    res.json({ message: 'Project updated successfully' });
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:project_id', async (req, res) => {
  try {
    await getBqService().deleteProject(req.params.project_id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== セグメント ====================

app.get('/api/segments', async (req, res) => {
  try {
    const segments = await getBqService().getSegments();
    res.json(segments);
  } catch (error: any) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/segments/project/:project_id', async (req, res) => {
  try {
    const segments = await getBqService().getSegmentsByProject(req.params.project_id);
    res.json(segments);
  } catch (error: any) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/segments', async (req, res) => {
  try {
    const segmentId = req.body?.segment_id;
    if (segmentId) {
      const existing = await getBqService().getSegmentById(segmentId);
      if (existing) {
        return res.status(409).json({
          error: 'このセグメントIDは既に存在します。再度登録できません。',
          code: 'SEGMENT_ALREADY_EXISTS',
        });
      }
    }
    await getBqService().createSegment(req.body);
    res.status(201).json({ message: 'Segment created successfully' });
  } catch (error: any) {
    console.error('Error creating segment:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/segments/:segment_id', async (req, res) => {
  try {
    await getBqService().updateSegment(req.params.segment_id, req.body);
    res.json({ message: 'Segment updated successfully' });
  } catch (error: any) {
    console.error('Error updating segment:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/segments/:segment_id', async (req, res) => {
  try {
    await getBqService().deleteSegment(req.params.segment_id);
    res.json({ message: 'Segment deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting segment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== POI ====================

app.get('/api/pois', async (req, res) => {
  try {
    const pois = await getBqService().getPois();
    res.json(pois);
  } catch (error: any) {
    console.error('Error fetching POIs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pois/project/:project_id', async (req, res) => {
  try {
    const pois = await getBqService().getPoisByProject(req.params.project_id);
    res.json(pois);
  } catch (error: any) {
    console.error('Error fetching POIs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pois', async (req, res) => {
  try {
    const poiId = req.body?.poi_id;
    if (poiId) {
      const existing = await getBqService().getPoiById(poiId);
      if (existing) {
        return res.status(409).json({
          error: 'この地点IDは既に存在します。再度登録できません。',
          code: 'POI_ALREADY_EXISTS',
        });
      }
    }
    await getBqService().createPoi(req.body);
    res.status(201).json({ message: 'POI created successfully' });
  } catch (error: any) {
    console.error('Error creating POI:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pois/bulk', async (req, res) => {
  try {
    await getBqService().createPoisBulk(req.body.pois);
    res.status(201).json({ message: 'POIs created successfully' });
  } catch (error: any) {
    console.error('Error creating POIs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pois/:poi_id', async (req, res) => {
  try {
    await getBqService().updatePoi(req.params.poi_id, req.body);
    res.json({ message: 'POI updated successfully' });
  } catch (error: any) {
    console.error('Error updating POI:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pois/:poi_id', async (req, res) => {
  try {
    await getBqService().deletePoi(req.params.poi_id);
    res.json({ message: 'POI deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting POI:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ユーザー ====================

app.get('/api/users', async (req, res) => {
  try {
    const users = await getBqService().getUsers();
    res.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/email/:email', async (req, res) => {
  try {
    const user = await getBqService().getUserByEmail(req.params.email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    await getBqService().createUser(req.body);
    res.status(201).json({ message: 'User created successfully' });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:user_id', async (req, res) => {
  try {
    await getBqService().updateUser(req.params.user_id, req.body);
    res.json({ message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:user_id', async (req, res) => {
  try {
    await getBqService().deleteUser(req.params.user_id);
    res.json({ message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ユーザー登録申請 ====================

app.get('/api/user-requests', async (req, res) => {
  try {
    const requests = await getBqService().getUserRequests();
    res.json(requests);
  } catch (error: any) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user-requests', wrapAsync(async (req, res) => {
  console.log('📥 POST /api/user-requests リクエスト受信:');
  console.log('  Body:', JSON.stringify(req.body, null, 2));
  
  const request = await getBqService().createUserRequest(req.body);
  res.status(201).json(request);
}));

app.post('/api/user-requests/:request_id/approve', async (req, res) => {
  try {
    const { request_id } = req.params;
    const { reviewed_by, comment } = req.body;
    await getBqService().approveUserRequest(request_id, reviewed_by, comment);
    res.json({ message: 'User request approved successfully' });
  } catch (error: any) {
    console.error('Error approving user request:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/user-requests/:request_id/reject', async (req, res) => {
  try {
    const { request_id } = req.params;
    const { reviewed_by, comment } = req.body;
    if (!comment) {
      return res.status(400).json({ error: 'Comment is required for rejection' });
    }
    await getBqService().rejectUserRequest(request_id, reviewed_by, comment);
    res.json({ message: 'User request rejected successfully' });
  } catch (error: any) {
    console.error('Error rejecting user request:', error);
    res.status(400).json({ error: error.message });
  }
});

// ==================== パスワードリセット ====================

app.post('/api/password-reset/request', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    await getBqService().requestPasswordReset(email);
    // セキュリティ上の理由で、ユーザーが存在しない場合でも成功メッセージを返す
    res.json({ message: 'If the email exists, a password reset link has been sent' });
  } catch (error: any) {
    console.error('Error requesting password reset:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/password-reset/reset', async (req, res) => {
  try {
    const { token, new_password } = req.body;
    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    if (new_password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    await getBqService().resetPassword(token, new_password);
    res.json({ message: 'Password reset successfully' });
  } catch (error: any) {
    console.error('Error resetting password:', error);
    res.status(400).json({ error: error.message });
  }
});

// ==================== メッセージ ====================

app.get('/api/messages/:project_id', async (req, res) => {
  try {
    const messages = await getBqService().getMessages(req.params.project_id);
    res.json(messages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const messages = await getBqService().getAllMessages();
    res.json(messages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    await getBqService().createMessage(req.body);
    res.status(201).json({ message: 'Message created successfully' });
  } catch (error: any) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages/mark-read', async (req, res) => {
  try {
    await getBqService().markMessagesAsRead(req.body.message_ids);
    res.json({ message: 'Messages marked as read' });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 編集依頼 ====================
app.get('/api/edit-requests', async (req, res) => {
  try {
    const rows = await getBqService().getEditRequests();
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching edit requests:', error);
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/edit-requests', async (req, res) => {
  try {
    await getBqService().createEditRequest(req.body);
    res.status(201).json({ message: 'Edit request created successfully' });
  } catch (error: any) {
    console.error('Error creating edit request:', error);
    res.status(500).json({ error: error.message });
  }
});
app.put('/api/edit-requests/:request_id', async (req, res) => {
  try {
    await getBqService().updateEditRequest(req.params.request_id, req.body);
    res.json({ message: 'Edit request updated successfully' });
  } catch (error: any) {
    console.error('Error updating edit request:', error);
    res.status(500).json({ error: error.message });
  }
});
app.delete('/api/edit-requests/:request_id', async (req, res) => {
  try {
    await getBqService().deleteEditRequest(req.params.request_id);
    res.json({ message: 'Edit request deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting edit request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 来店計測地点グループ ====================
app.get('/api/visit-measurement-groups/project/:project_id', async (req, res) => {
  try {
    const rows = await getBqService().getVisitMeasurementGroups(req.params.project_id);
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching visit measurement groups:', error);
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/visit-measurement-groups', async (req, res) => {
  try {
    await getBqService().createVisitMeasurementGroup(req.body);
    res.status(201).json({ message: 'Visit measurement group created successfully' });
  } catch (error: any) {
    console.error('Error creating visit measurement group:', error);
    res.status(500).json({ error: error.message });
  }
});
app.put('/api/visit-measurement-groups/:group_id', async (req, res) => {
  try {
    await getBqService().updateVisitMeasurementGroup(req.params.group_id, req.body);
    res.json({ message: 'Visit measurement group updated successfully' });
  } catch (error: any) {
    console.error('Error updating visit measurement group:', error);
    res.status(500).json({ error: error.message });
  }
});
app.delete('/api/visit-measurement-groups/:group_id', async (req, res) => {
  try {
    await getBqService().deleteVisitMeasurementGroup(req.params.group_id);
    res.json({ message: 'Visit measurement group deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting visit measurement group:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 機能リクエスト ====================
app.get('/api/feature-requests', async (req, res) => {
  try {
    const rows = await getBqService().getFeatureRequests();
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching feature requests:', error);
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/feature-requests', async (req, res) => {
  try {
    await getBqService().createFeatureRequest(req.body);
    res.status(201).json({ message: 'Feature request created successfully' });
  } catch (error: any) {
    console.error('Error creating feature request:', error);
    res.status(500).json({ error: error.message });
  }
});
app.put('/api/feature-requests/:request_id', async (req, res) => {
  try {
    await getBqService().updateFeatureRequest(req.params.request_id, req.body);
    res.json({ message: 'Feature request updated successfully' });
  } catch (error: any) {
    console.error('Error updating feature request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== レポート作成依頼 ====================
app.get('/api/report-requests', async (req, res) => {
  try {
    const project_id = req.query.project_id as string | undefined;
    const status = req.query.status as string | undefined;
    const rows = await getBqService().getReportRequests(project_id, status);
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching report requests:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/report-requests/:request_id', async (req, res) => {
  try {
    const { request_id } = req.params;
    const reportRequest = await getBqService().getReportRequestById(request_id);
    if (!reportRequest) {
      return res.status(404).json({ error: 'Report request not found' });
    }
    res.json(reportRequest);
  } catch (error: any) {
    console.error('Error fetching report request:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/report-requests', async (req, res) => {
  try {
    await getBqService().createReportRequest(req.body);
    res.status(201).json({ message: 'Report request created successfully' });
  } catch (error: any) {
    console.error('Error creating report request:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/report-requests/:request_id', async (req, res) => {
  try {
    const { request_id } = req.params;
    await getBqService().updateReportRequest(request_id, req.body);
    res.json({ message: 'Report request updated successfully' });
  } catch (error: any) {
    console.error('Error updating report request:', error);
    res.status(500).json({ error: error.message });
  }
});

// レポート作成依頼の承認
app.post('/api/report-requests/:request_id/approve', async (req, res) => {
  try {
    const { request_id } = req.params;
    const { reviewed_by, review_comment } = req.body;
    await getBqService().updateReportRequest(request_id, {
      status: 'approved',
      reviewed_by,
      reviewed_at: new Date().toISOString(),
      review_comment,
    });
    res.json({ message: 'Report request approved successfully' });
  } catch (error: any) {
    console.error('Error approving report request:', error);
    res.status(500).json({ error: error.message });
  }
});

// レポート作成依頼の却下
app.post('/api/report-requests/:request_id/reject', async (req, res) => {
  try {
    const { request_id } = req.params;
    const { reviewed_by, review_comment } = req.body;
    await getBqService().updateReportRequest(request_id, {
      status: 'rejected',
      reviewed_by,
      reviewed_at: new Date().toISOString(),
      review_comment,
    });
    res.json({ message: 'Report request rejected successfully' });
  } catch (error: any) {
    console.error('Error rejecting report request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== 変更履歴 ====================
app.get('/api/change-history', async (req, res) => {
  try {
    const project_id = req.query.project_id as string | undefined;
    const rows = await getBqService().getChangeHistories(project_id);
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching change history:', error);
    res.status(500).json({ error: error.message });
  }
});
app.post('/api/change-history', async (req, res) => {
  try {
    await getBqService().insertChangeHistory(req.body);
    res.status(201).json({ message: 'Change history recorded successfully' });
  } catch (error: any) {
    console.error('Error recording change history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== Google Sheets ====================

app.post('/api/sheets/export', async (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: 'rows must be an array' });
    }
    const result = await getBqService().exportToGoogleSheets(rows);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('Error exporting to Google Sheets:', error);
    res.status(500).json({ error: error.message });
  }
});

// エクスポート（テーブル蓄積付き）
app.post('/api/sheets/export-with-accumulation', async (req, res) => {
  try {
    const { rows, projectId, segmentId, exportedBy, exportedByName } = req.body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'rows配列が必要です' });
    }

    if (!projectId) {
      return res.status(400).json({ error: 'projectIdが必要です' });
    }

    const result = await getBqService().exportToGoogleSheetsWithAccumulation(
      rows,
      projectId,
      segmentId,
      exportedBy,
      exportedByName
    );

    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({ error: result.message });
    }
  } catch (error: any) {
    console.error('エクスポートエラー:', error);
    res.status(500).json({ error: error.message || 'エクスポート処理中にエラーが発生しました' });
  }
});

// エクスポート履歴取得
app.get('/api/sheets/exports', async (req, res) => {
  try {
    const { projectId, status, limit } = req.query;
    const exports = await getBqService().getSheetExports(
      projectId as string,
      status as string,
      limit ? parseInt(limit as string) : 100
    );
    res.json(exports);
  } catch (error: any) {
    console.error('エクスポート履歴取得エラー:', error);
    res.status(500).json({ error: error.message || 'エクスポート履歴の取得に失敗しました' });
  }
});

// エクスポートデータ取得
app.get('/api/sheets/exports/:exportId/data', async (req, res) => {
  try {
    const { exportId } = req.params;
    const exportData = await getBqService().getSheetExportData(exportId);
    res.json(exportData);
  } catch (error: any) {
    console.error('エクスポートデータ取得エラー:', error);
    res.status(500).json({ error: error.message || 'エクスポートデータの取得に失敗しました' });
  }
});

// 再エクスポート
app.post('/api/sheets/exports/:exportId/reexport', async (req, res) => {
  try {
    const { exportId } = req.params;
    const exportData = await getBqService().getSheetExportData(exportId);

    if (exportData.length === 0) {
      return res.status(404).json({ error: 'エクスポートデータが見つかりません' });
    }

    // データをスプレッドシート形式に変換
    const rows = exportData.map(data => ({
      category_id: data.category_id,
      brand_id: data.brand_id,
      brand_name: data.brand_name,
      poi_id: data.poi_id,
      poi_name: data.poi_name,
      latitude: data.latitude,
      longitude: data.longitude,
      prefecture: data.prefecture,
      city: data.city,
      radius: data.radius,
      polygon: data.polygon,
      setting_flag: data.setting_flag,
      created: data.created,
    }));

    // 元のエクスポート履歴を取得
    const exports = await getBqService().getSheetExports();
    const exportRecord = exports.find((e: any) => e.export_id === exportId);

    if (!exportRecord) {
      return res.status(404).json({ error: 'エクスポート履歴が見つかりません' });
    }

    // 新しいエクスポートとして実行
    const result = await getBqService().exportToGoogleSheetsWithAccumulation(
      rows,
      exportRecord.project_id,
      exportRecord.segment_id,
      exportRecord.exported_by,
      exportRecord.exported_by_name
    );

    res.json(result);
  } catch (error: any) {
    console.error('再エクスポートエラー:', error);
    res.status(500).json({ error: error.message || '再エクスポート処理中にエラーが発生しました' });
  }
});

// エラーハンドリングミドルウェア（404ハンドラーの前に配置）
// すべてのルートで発生したエラーをここでキャッチして統一的なレスポンスを返す
app.use(errorHandler);

// 404ハンドラー（定義されていないルート）
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    request_id: (req as any).request_id,
    availableEndpoints: {
      root: '/',
      health: '/health',
      projects: '/api/projects',
      segments: '/api/segments',
      pois: '/api/pois',
      users: '/api/users',
      userRequests: '/api/user-requests',
      messages: '/api/messages',
      sheets: '/api/sheets/export',
    }
  });
});

// サーバー起動（エラーハンドリング付き）
try {
  app.listen(PORT, () => {
    console.log(`🚀 Backend API server running on port ${PORT}`);
    console.log(`📊 BigQuery Project: ${process.env.GCP_PROJECT_ID || 'NOT SET'}`);
    console.log(`📊 BigQuery Dataset: ${process.env.BQ_DATASET || 'NOT SET'}`);
    console.log(`🌐 Frontend URL: ${FRONTEND_URL}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 Service Account: ${process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'SET' : 'Using default (Cloud Run)'}`);
    console.log('');
    console.log('📋 環境変数の確認:');
    console.log(`  GCP_PROJECT_ID: ${process.env.GCP_PROJECT_ID ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`  BQ_DATASET: ${process.env.BQ_DATASET ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`  GOOGLE_SPREADSHEET_ID: ${process.env.GOOGLE_SPREADSHEET_ID ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`  GOOGLE_SHEET_NAME: ${process.env.GOOGLE_SHEET_NAME || 'シート1 (デフォルト)'}`);
    console.log(`  ⚠️ 注意: Google Sheets APIはサービスアカウント認証を使用します（APIキーは不要）`);
    
    // 環境変数が設定されていない場合の警告
    if (!process.env.GCP_PROJECT_ID) {
      console.error('');
      console.error('❌ 警告: GCP_PROJECT_ID環境変数が設定されていません！');
      console.error('   Cloud Runの環境変数設定を確認してください。');
      console.error('   ただし、サーバーは起動します（実際のAPI呼び出し時にエラーが発生します）。');
    }
  });
} catch (error: any) {
  console.error('❌ サーバー起動エラー:', error);
  console.error('Error details:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });
  process.exit(1);
}

// 未処理のエラーをキャッチ
process.on('uncaughtException', (error: Error) => {
  console.error('❌ 未処理の例外:', error);
  console.error('Error details:', {
    message: error.message,
    stack: error.stack,
    name: error.name,
  });
  // サーバーを終了せずに続行（Cloud Runが再起動する）
});

process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  console.error('❌ 未処理のPromise拒否:', reason);
  console.error('Promise:', promise);
  // サーバーを終了せずに続行（Cloud Runが再起動する）
});

