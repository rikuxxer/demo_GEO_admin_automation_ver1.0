import crypto from "crypto";
import type { Request, Response, NextFunction } from "express";

/**
 * リクエストコンテキストミドルウェア
 * - x-request-idヘッダーから相関IDを取得、または新規生成
 * - Cloud Traceと紐付け（任意）
 */
export function requestContext(req: Request, res: Response, next: NextFunction) {
  const reqId = (req.headers["x-request-id"] as string) || crypto.randomUUID();
  (req as any).request_id = reqId;
  res.setHeader("x-request-id", reqId);

  // Cloud Trace と紐付けたい場合（任意）
  const trace = req.headers["x-cloud-trace-context"];
  (req as any).trace = trace;

  next();
}

