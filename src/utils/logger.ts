export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.INFO;
  private prefix = '[Journal Plugin]';

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  debug(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      console.debug(`${this.prefix} [DEBUG]`, message, ...args);
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      console.info(`${this.prefix} [INFO]`, message, ...args);
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      console.warn(`${this.prefix} [WARN]`, message, ...args);
    }
  }

  error(message: string, error?: any, ...args: any[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      console.error(`${this.prefix} [ERROR]`, message, error, ...args);
    }
  }

  logAIRequest(provider: string, model: string, inputLength: number): void {
    this.debug(`AI Request: ${provider}/${model}, input length: ${inputLength} chars`);
  }

  logAIResponse(provider: string, outputLength: number, duration: number): void {
    this.debug(`AI Response: ${provider}, output length: ${outputLength} chars, duration: ${duration}ms`);
  }

  logFileOperation(operation: string, filePath: string): void {
    this.debug(`File ${operation}: ${filePath}`);
  }

  logProcessingStats(processed: number, skipped: number, errors: number): void {
    this.info(`Processing complete: ${processed} processed, ${skipped} skipped, ${errors} errors`);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();