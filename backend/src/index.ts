import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { bqService } from './bigquery-client';

// 環境変数を読み込み
dotenv.config();

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
    // originが未設定（同一オリジンリクエスト）の場合
    if (!origin) {
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
app.use(express.json({ limit: '10mb' }));

// ヘルスチェック
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: {
      GCP_PROJECT_ID: process.env.GCP_PROJECT_ID ? 'SET' : 'NOT SET',
      BQ_DATASET: process.env.BQ_DATASET || 'NOT SET',
    }
  });
});

// ==================== プロジェクト ====================

app.get('/api/projects', async (req, res) => {
  try {
    // 環境変数の確認
    if (!process.env.GCP_PROJECT_ID) {
      console.error('❌ GCP_PROJECT_ID環境変数が設定されていません');
      return res.status(500).json({
        error: 'GCP_PROJECT_ID環境変数が設定されていません',
        type: 'ConfigurationError',
        details: 'Cloud Runの環境変数設定を確認してください。GitHub SecretsのGCP_PROJECT_IDが正しく設定されているか確認してください。',
      });
    }
    
    const projects = await bqService.getProjects();
    res.json(projects);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    console.error('Error stack:', error.stack);
    console.error('Environment variables:', {
      GCP_PROJECT_ID: process.env.GCP_PROJECT_ID ? 'SET' : 'NOT SET',
      BQ_DATASET: process.env.BQ_DATASET || 'NOT SET',
    });
    
    // より詳細なエラーメッセージを返す
    const errorMessage = error.message || 'プロジェクトの取得に失敗しました';
    const errorDetails: any = {
      error: errorMessage,
      type: error.name || 'UnknownError',
    };
    
    // GCP_PROJECT_IDが設定されていない場合の詳細情報
    if (errorMessage.includes('universegeo-project') || !process.env.GCP_PROJECT_ID) {
      errorDetails.details = 'GCP_PROJECT_ID環境変数が正しく設定されていません。Cloud Runの環境変数設定を確認してください。';
      errorDetails.configuration = {
        GCP_PROJECT_ID: process.env.GCP_PROJECT_ID || 'NOT SET',
        BQ_DATASET: process.env.BQ_DATASET || 'NOT SET',
      };
    }
    
    if (process.env.NODE_ENV !== 'production') {
      errorDetails.stack = error.stack;
    }
    
    res.status(500).json(errorDetails);
  }
});

app.get('/api/projects/:project_id', async (req, res) => {
  try {
    const project = await bqService.getProjectById(req.params.project_id);
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
    await bqService.createProject(req.body);
    res.status(201).json({ message: 'Project created successfully' });
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/projects/:project_id', async (req, res) => {
  try {
    await bqService.updateProject(req.params.project_id, req.body);
    res.json({ message: 'Project updated successfully' });
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/projects/:project_id', async (req, res) => {
  try {
    await bqService.deleteProject(req.params.project_id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== セグメント ====================

app.get('/api/segments', async (req, res) => {
  try {
    const segments = await bqService.getSegments();
    res.json(segments);
  } catch (error: any) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/segments/project/:project_id', async (req, res) => {
  try {
    const segments = await bqService.getSegmentsByProject(req.params.project_id);
    res.json(segments);
  } catch (error: any) {
    console.error('Error fetching segments:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/segments', async (req, res) => {
  try {
    await bqService.createSegment(req.body);
    res.status(201).json({ message: 'Segment created successfully' });
  } catch (error: any) {
    console.error('Error creating segment:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/segments/:segment_id', async (req, res) => {
  try {
    await bqService.updateSegment(req.params.segment_id, req.body);
    res.json({ message: 'Segment updated successfully' });
  } catch (error: any) {
    console.error('Error updating segment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== POI ====================

app.get('/api/pois', async (req, res) => {
  try {
    const pois = await bqService.getPois();
    res.json(pois);
  } catch (error: any) {
    console.error('Error fetching POIs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/pois/project/:project_id', async (req, res) => {
  try {
    const pois = await bqService.getPoisByProject(req.params.project_id);
    res.json(pois);
  } catch (error: any) {
    console.error('Error fetching POIs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pois', async (req, res) => {
  try {
    await bqService.createPoi(req.body);
    res.status(201).json({ message: 'POI created successfully' });
  } catch (error: any) {
    console.error('Error creating POI:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/pois/bulk', async (req, res) => {
  try {
    await bqService.createPoisBulk(req.body.pois);
    res.status(201).json({ message: 'POIs created successfully' });
  } catch (error: any) {
    console.error('Error creating POIs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/pois/:poi_id', async (req, res) => {
  try {
    await bqService.updatePoi(req.params.poi_id, req.body);
    res.json({ message: 'POI updated successfully' });
  } catch (error: any) {
    console.error('Error updating POI:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/pois/:poi_id', async (req, res) => {
  try {
    await bqService.deletePoi(req.params.poi_id);
    res.json({ message: 'POI deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting POI:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ユーザー ====================

app.get('/api/users', async (req, res) => {
  try {
    const users = await bqService.getUsers();
    res.json(users);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/email/:email', async (req, res) => {
  try {
    const user = await bqService.getUserByEmail(req.params.email);
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
    await bqService.createUser(req.body);
    res.status(201).json({ message: 'User created successfully' });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:user_id', async (req, res) => {
  try {
    await bqService.updateUser(req.params.user_id, req.body);
    res.json({ message: 'User updated successfully' });
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ユーザー登録申請 ====================

app.get('/api/user-requests', async (req, res) => {
  try {
    const requests = await bqService.getUserRequests();
    res.json(requests);
  } catch (error: any) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/user-requests', async (req, res) => {
  try {
    const request = await bqService.createUserRequest(req.body);
    res.status(201).json(request);
  } catch (error: any) {
    console.error('Error creating user request:', error);
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/user-requests/:request_id/approve', async (req, res) => {
  try {
    const { request_id } = req.params;
    const { reviewed_by, comment } = req.body;
    await bqService.approveUserRequest(request_id, reviewed_by, comment);
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
    await bqService.rejectUserRequest(request_id, reviewed_by, comment);
    res.json({ message: 'User request rejected successfully' });
  } catch (error: any) {
    console.error('Error rejecting user request:', error);
    res.status(400).json({ error: error.message });
  }
});

// ==================== メッセージ ====================

app.get('/api/messages/:project_id', async (req, res) => {
  try {
    const messages = await bqService.getMessages(req.params.project_id);
    res.json(messages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const messages = await bqService.getAllMessages();
    res.json(messages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    await bqService.createMessage(req.body);
    res.status(201).json({ message: 'Message created successfully' });
  } catch (error: any) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages/mark-read', async (req, res) => {
  try {
    await bqService.markMessagesAsRead(req.body.message_ids);
    res.json({ message: 'Messages marked as read' });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
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
    const result = await bqService.exportToGoogleSheets(rows);
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

// サーバー起動
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
  console.log(`  GOOGLE_SHEETS_API_KEY: ${process.env.GOOGLE_SHEETS_API_KEY ? '✅ SET' : '❌ NOT SET'}`);
  
  // 環境変数が設定されていない場合の警告
  if (!process.env.GCP_PROJECT_ID) {
    console.error('');
    console.error('❌ 警告: GCP_PROJECT_ID環境変数が設定されていません！');
    console.error('   Cloud Runの環境変数設定を確認してください。');
  }
});

