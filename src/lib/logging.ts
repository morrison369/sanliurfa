// Structured logging with request ID tracking

enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  requestId?: string;
  context?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
  };
  userId?: string;
  duration?: number;
}

/**
 * Generate a unique request ID for tracking
 */
export function generateRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

class Logger {
  private isDevelopment = Boolean((import.meta as { env?: { DEV?: boolean } }).env?.DEV);
  private requestId: string | undefined;

  setRequestId(id: string): void {
    this.requestId = id;
  }

  getRequestId(): string | undefined {
    return this.requestId;
  }

  private formatLog(entry: LogEntry): string {
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`
    ];

    if (entry.requestId) {
      parts.push(`[${entry.requestId}]`);
    }

    if (entry.userId) {
      parts.push(`[user:${entry.userId}]`);
    }

    parts.push(entry.message);

    return parts.join(' ');
  }

  private log(entry: LogEntry) {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      requestId: this.requestId || entry.requestId
    };

    // In development, log to console
    if (this.isDevelopment) {
      const formatted = this.formatLog(logEntry);
      const consoleMethod = entry.level === LogLevel.ERROR ? 'error' :
                           entry.level === LogLevel.WARN ? 'warn' :
                           entry.level === LogLevel.INFO ? 'info' : 'debug';

      console[consoleMethod](formatted);
      if (logEntry.context) {
        console.log('  Context:', logEntry.context);
      }
      if (logEntry.error) {
        console.log('  Error:', logEntry.error);
      }
      return;
    }

    // In production, log to stdout (better for server deployments)
    const logOutput = JSON.stringify(logEntry);
    if (entry.level === LogLevel.ERROR) {
      console.error(logOutput);
    } else if (entry.level === LogLevel.WARN) {
      console.warn(logOutput);
    } else {
      console.log(logOutput);
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log({ level: LogLevel.DEBUG, message, context, timestamp: new Date().toISOString() });
  }

  info(message: string, context?: Record<string, any>) {
    this.log({ level: LogLevel.INFO, message, context, timestamp: new Date().toISOString() });
  }

  warn(message: string, context?: Record<string, any>) {
    this.log({ level: LogLevel.WARN, message, context, timestamp: new Date().toISOString() });
  }

  error(message: string, error?: Error | string, context?: Record<string, any>) {
    const errorData = typeof error === 'string'
      ? { message: error }
      : error
      ? { message: error.message, stack: error.stack }
      : undefined;

    this.log({
      level: LogLevel.ERROR,
      message,
      error: errorData,
      context,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Log HTTP request
   */
  logRequest(method: string, url: string, status: number, duration: number, userId?: string, context?: Record<string, any>) {
    this.info(`${method} ${url} ${status} ${duration}ms`, {
      method,
      url,
      status,
      duration,
      userId,
      ...context
    });
  }

  /**
   * Log authentication event
   */
  logAuth(action: 'login' | 'logout' | 'register' | 'password_change', userId: string, success: boolean, context?: Record<string, any>) {
    this.info(`Auth ${action}`, {
      action,
      userId,
      success,
      ...context
    });
  }

  /**
   * Log data mutation (create, update, delete)
   */
  logMutation(operation: 'create' | 'update' | 'delete', table: string, recordId: string, userId?: string, context?: Record<string, any>) {
    this.info(`${operation.toUpperCase()} ${table} ${recordId}`, {
      operation,
      table,
      recordId,
      userId,
      ...context
    });
  }

  /**
   * Log slow operation (query, request, cache)
   */
  logSlowOperation(type: 'query' | 'request' | 'cache', message: string, duration: number, context?: Record<string, any>) {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.DEBUG;
    this.log({
      level,
      message: `${type.toUpperCase()} slow: ${message} (${duration}ms)`,
      context: {
        type,
        duration,
        ...context
      },
      timestamp: new Date().toISOString()
    });
  }
}

export const logger = new Logger();
