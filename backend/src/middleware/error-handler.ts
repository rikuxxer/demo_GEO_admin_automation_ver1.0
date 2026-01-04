import type { Request, Response, NextFunction } from "express";

/**
 * エラーハンドリングミドルウェア
 * - 構造化ログを出力（Cloud Loggingで拾いやすい形式）
 * - 統一エラーレスポンスを返す
 * - request_idを含めて追跡可能にする
 */
export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const request_id = (req as any).request_id;
  const trace = (req as any).trace;

  // ステータスコードを決定
  // 明示的にstatusCodeが設定されている場合はそれを使用
  // それ以外は500（Internal Server Error）
  const status = err?.statusCode || err?.status || 500;

  // Cloud Logging で拾いやすい "構造化ログ"
  const logData: any = {
    severity: status >= 500 ? "ERROR" : "WARNING",
    request_id,
    trace,
    route: req.originalUrl,
    method: req.method,
    status,
    error_name: err?.name,
    error_message: err?.message,
  };

  // BigQuery 系のエラー情報を追加
  if (err?.code || err?.errors || err?.response) {
    logData.bq = {
      code: err?.code,
      errors: err?.errors,
      insertErrors: err?.response?.body?.insertErrors ?? err?.response?.insertErrors,
    };
    
    // location情報（欠けている列名）を抽出
    if (err.errors && Array.isArray(err.errors)) {
      const locations: string[] = [];
      err.errors.forEach((error: any) => {
        if (error.location) {
          locations.push(error.location);
        }
      });
      if (locations.length > 0) {
        logData.bq.missingColumns = locations;
      }
    }
  }

  // ヒント情報
  if (err?.hint) {
    logData.hint = err.hint;
  }

  // スタックトレース（本番環境では制限する場合がある）
  if (err?.stack) {
    logData.stack = err.stack;
  }

  // 構造化ログを出力
  console.error(JSON.stringify(logData));

  // 統一エラーレスポンス
  const errorResponse: any = {
    error: status >= 500 ? "サーバーエラーが発生しました" : err.message || "エラーが発生しました",
    type: err?.name || "Error",
    request_id,
  };

  // 開発環境、4xxエラー、またはBigQueryエラーの場合は詳細情報を含める
  const shouldIncludeDetails = 
    process.env.NODE_ENV !== "production" || 
    status < 500 || 
    err?.code || 
    err?.errors || 
    err?.name === "BigQueryError";
  
  if (shouldIncludeDetails) {
    // BigQueryエラーの詳細
    if (err?.errors) {
      errorResponse.errors = err.errors;
      
      // missingColumnsを追加
      if (logData.bq?.missingColumns) {
        errorResponse.missingColumns = logData.bq.missingColumns;
        errorResponse.hint = err.hint || `以下の列がBigQueryスキーマに存在しません: ${logData.bq.missingColumns.join(", ")}。UPDATE_BIGQUERY_SCHEMA.mdのaddfieldコマンドで追加してください。`;
      }
    }
    
    // エラーコード
    if (err?.code) {
      errorResponse.code = err.code;
    }
    
    // ヒント
    if (err?.hint) {
      errorResponse.hint = err.hint;
    }
    
    // BigQueryエラーの場合、より詳細なメッセージを返す
    if (err?.name === "BigQueryError" || err?.code) {
      errorResponse.error = err.message || errorResponse.error;
      errorResponse.type = err.name || "BigQueryError";
    }
  }

  res.status(status).json(errorResponse);
}

