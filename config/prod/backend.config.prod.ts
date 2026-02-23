/**
 * 本番環境用バックエンド設定
 */
export const prodConfig = {
  port: 8080,
  frontendUrl: process.env.FRONTEND_URL || '',
  nodeEnv: 'production' as const,
  logLevel: 'info' as const,
  enableCors: true,
  enableDebug: false,
  corsOrigins: [
    process.env.FRONTEND_URL || '',
    /^https:\/\/universegeo.*\.run\.app$/,
  ],
};
