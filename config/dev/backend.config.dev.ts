/**
 * 開発環境用バックエンド設定
 */
export const devConfig = {
  port: 8080,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  nodeEnv: 'development' as const,
  logLevel: 'debug' as const,
  enableCors: true,
  enableDebug: true,
  corsOrigins: [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL || 'http://localhost:5173',
  ],
};
