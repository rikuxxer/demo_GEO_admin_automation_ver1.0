/**
 * Logger Utility
 * 
 * 開発環境と本番環境でログ出力を制御するためのユーティリティ
 * 本番環境では不要なログを出力しないようにする
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
  enableInProduction: boolean;
  prefix?: string;
}

class Logger {
  private isDevelopment: boolean;
  
  constructor() {
    this.isDevelopment = import.meta.env.DEV || process.env.NODE_ENV === 'development';
  }

  /**
   * 情報ログ（開発環境のみ）
   */
  info(...args: any[]): void {
    if (this.isDevelopment) {
      console.log(...args);
    }
  }

  /**
   * 警告ログ（開発環境のみ）
   */
  warn(...args: any[]): void {
    if (this.isDevelopment) {
      console.warn(...args);
    }
  }

  /**
   * エラーログ（常に出力）
   */
  error(...args: any[]): void {
    console.error(...args);
  }

  /**
   * デバッグログ（開発環境のみ）
   */
  debug(...args: any[]): void {
    if (this.isDevelopment) {
      console.debug(...args);
    }
  }

  /**
   * 条件付きログ
   * @param condition - trueの場合のみログを出力
   * @param level - ログレベル
   * @param args - ログメッセージ
   */
  conditional(condition: boolean, level: LogLevel = 'info', ...args: any[]): void {
    if (condition) {
      this[level](...args);
    }
  }

  /**
   * グループログ（開発環境のみ）
   */
  group(label: string, callback: () => void): void {
    if (this.isDevelopment) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  }

  /**
   * テーブルログ（開発環境のみ）
   */
  table(data: any): void {
    if (this.isDevelopment) {
      console.table(data);
    }
  }

  /**
   * 時間計測開始
   */
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  /**
   * 時間計測終了
   */
  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }
}

// シングルトンインスタンス
export const logger = new Logger();

// デフォルトエクスポート
export default logger;
