/**
 * Logger - デバッグモード対応のロガー
 */

// ANSI color codes
const GRAY = "\x1b[90m";
const RESET = "\x1b[0m";

class Logger {
  private debugMode: boolean;

  constructor(debugMode: boolean = false) {
    this.debugMode = debugMode;
  }

  /**
   * デバッグログ（デバッグモード時のみグレーで表示）
   */
  debug(...args: any[]): void {
    if (this.debugMode) {
      console.log(GRAY + args.join(" ") + RESET);
    }
  }

  /**
   * 情報ログ（常に表示）
   */
  info(...args: any[]): void {
    console.log(...args);
  }

  /**
   * エラーログ（常に表示）
   */
  error(...args: any[]): void {
    console.error(...args);
  }

  /**
   * デバッグモードの設定
   */
  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  /**
   * デバッグモードの取得
   */
  isDebugMode(): boolean {
    return this.debugMode;
  }
}

// シングルトンインスタンス
export const logger = new Logger();

// デバッグモードを外部から設定
export function setDebugMode(enabled: boolean): void {
  logger.setDebugMode(enabled);
}
