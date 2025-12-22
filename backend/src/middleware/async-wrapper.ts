import type { Request, Response, NextFunction } from "express";

/**
 * 非同期関数をラップして、例外を確実にキャッチする
 * これにより、async/await関数内でthrowされたエラーが
 * エラーハンドリングミドルウェアに確実に渡される
 */
export const wrapAsync =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);

