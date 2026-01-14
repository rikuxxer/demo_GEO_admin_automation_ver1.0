/**
 * 本番環境用バックエンド設定
 */
export const prodConfig = {
  port: 8080,
  frontendUrl: process.env.FRONTEND_URL || 'https://universegeo-i5xw76aisq-an.a.run.app',
  nodeEnv: 'production' as const,
  logLevel: 'info' as const,
  enableCors: true,
  enableDebug: false,
  corsOrigins: [
    process.env.FRONTEND_URL || 'https://universegeo-i5xw76aisq-an.a.run.app',
    /^https:\/\/universegeo.*\.run\.app$/,
  ],
};
