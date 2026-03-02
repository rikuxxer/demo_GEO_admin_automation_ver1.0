import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

dotenv.config();

import simRoutes from './sim-routes';
import qaRoutes from './qa-routes';

import projectsRouter from './routes/projects';
import segmentsRouter from './routes/segments';
import poisRouter from './routes/pois';
import usersRouter from './routes/users';
import userRequestsRouter from './routes/userRequests';
import passwordResetRouter from './routes/passwordReset';
import messagesRouter from './routes/messages';
import miscRouter from './routes/misc';
import sheetsRouter from './routes/sheets';

import { requestContext } from './middleware/request-context';
import { wrapAsync } from './middleware/async-wrapper';
import { errorHandler } from './middleware/error-handler';

const app = express();
const PORT = process.env.PORT || 8080;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const isProduction = process.env.NODE_ENV === 'production';

// CORS設定
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:3000',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  /^https:\/\/universegeo.*\.run\.app$/,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // 本番環境ではOriginなしのリクエストを拒否（Postman等の直接アクセスを防ぐ）
    if (!origin) {
      if (isProduction) {
        callback(new Error('Not allowed by CORS'));
      } else {
        callback(null, true);
      }
      return;
    }

    // file:// からの fetch は "null" 文字列になることがある
    if (origin === 'null') {
      if (isProduction) {
        callback(new Error('Not allowed by CORS'));
      } else {
        callback(null, true);
      }
      return;
    }

    const isDevelopment = !isProduction;
    if (isDevelopment && process.env.ALLOW_ALL_ORIGINS === 'true') {
      callback(null, true);
      return;
    }

    if (allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return origin === allowed;
      if (allowed instanceof RegExp) return allowed.test(origin);
      return false;
    })) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Preflight
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(requestContext);

// レート制限
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', globalLimiter);
app.use('/api/password-reset', passwordResetLimiter);

// ルートパス
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
    },
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
    },
  });
}));

// APIルート
app.use('/api/projects', projectsRouter);
app.use('/api/segments', segmentsRouter);
app.use('/api/pois', poisRouter);
app.use('/api/users', usersRouter);
app.use('/api/user-requests', userRequestsRouter);
app.use('/api/password-reset', passwordResetRouter);
app.use('/api/messages', messagesRouter);
app.use('/api', miscRouter);
app.use('/api/sheets', sheetsRouter);
app.use('/api/sim', simRoutes);
app.use('/api/qa', qaRoutes);

// エラーハンドリング
app.use(errorHandler);

// 404ハンドラー
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
    },
  });
});

// サーバー起動
try {
  app.listen(PORT, () => {
    if (!isProduction) {
      console.log(`Backend API server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    }
    if (!process.env.GCP_PROJECT_ID) {
      console.error('WARNING: GCP_PROJECT_ID is not set');
    }
  });
} catch (error: any) {
  console.error('Server startup error:', error.message);
  process.exit(1);
}

process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught exception:', error.message);
});

process.on('unhandledRejection', (reason: any) => {
  console.error('Unhandled rejection:', reason);
});
