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
  private isDevelopment = import.meta.env.DEV;
  private requestId: string | undefined;

  private normalizeLogValue(value: unknown, depth = 0): unknown {
    if (depth > 3) {
      return '[MaxDepth]';
    }

    if (value instanceof Error) {
      return {
        name: value.name,
        message: value.message,
        stack: value.stack
      };
    }

    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (Array.isArray(value)) {
      return value.map(item => this.normalizeLogValue(item, depth + 1));
    }

    if (value && typeof value === 'object') {
      const objectWithErrorShape = value as { name?: unknown; message?: unknown; stack?: unknown };
      const hasErrorShape =
        typeof objectWithErrorShape.name === 'string' ||
        typeof objectWithErrorShape.message === 'string' ||
        typeof objectWithErrorShape.stack === 'string';
      if (hasErrorShape) {
        return {
          name: typeof objectWithErrorShape.name === 'string' ? objectWithErrorShape.name : 'Error',
          message:
            typeof objectWithErrorShape.message === 'string'
              ? objectWithErrorShape.message
              : String(value),
          stack: typeof objectWithErrorShape.stack === 'string' ? objectWithErrorShape.stack : undefined
        };
      }

      const entries = Object.entries(value as Record<string, unknown>);
      if (entries.length === 0) {
        return '[EmptyObject]';
      }

      const normalized: Record<string, unknown> = {};
      for (const [key, nested] of entries) {
        normalized[key] = this.normalizeLogValue(nested, depth + 1);
      }
      return normalized;
    }

    return value;
  }

  private normalizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) {
      return undefined;
    }

    return this.normalizeLogValue(context) as Record<string, any>;
  }

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
    const normalizedContext = this.normalizeContext(entry.context);
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      requestId: this.requestId || entry.requestId,
      context: normalizedContext
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

  warn(message: string, contextOrError?: Record<string, any> | Error, context?: Record<string, any>) {
    const errorContext =
      contextOrError instanceof Error
        ? { error: { message: contextOrError.message, stack: contextOrError.stack }, context }
        : { context: contextOrError };

    this.log({
      level: LogLevel.WARN,
      message,
      ...errorContext,
      timestamp: new Date().toISOString()
    });
  }

  error(message: string, error?: unknown, context?: Record<string, any>) {
    const errorData = this.normalizeError(error);

    this.log({
      level: LogLevel.ERROR,
      message,
      error: errorData,
      context,
      timestamp: new Date().toISOString()
    });
  }

  private normalizeError(error?: unknown): { message: string; stack?: string; name?: string } | undefined {
    if (error === undefined || error === null) {
      return undefined;
    }

    if (typeof error === 'string') {
      return { message: error };
    }

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    }

    if (typeof error === 'object') {
      const maybeError = error as { name?: unknown; message?: unknown; stack?: unknown };
      const name = typeof maybeError.name === 'string' ? maybeError.name : undefined;
      const serializedObject = (() => {
        try {
          return JSON.stringify(error);
        } catch {
          return String(error);
        }
      })();
      const message =
        typeof maybeError.message === 'string'
          ? maybeError.message
          : serializedObject === '{}'
          ? 'Unknown error object'
          : serializedObject;
      const stack = typeof maybeError.stack === 'string' ? maybeError.stack : undefined;

      return {
        ...(name ? { name } : {}),
        message,
        ...(stack ? { stack } : {})
      };
    }

    return { message: String(error) };
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
  logAuth(action: string, userId: string, success: boolean, context?: Record<string, any>) {
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
  logMutation(operation: string, table: string, recordId: unknown, userId?: string | null, context?: Record<string, any>) {
    const recordIdText = typeof recordId === 'string' ? recordId : JSON.stringify(recordId);
    this.info(`${operation.toUpperCase()} ${table} ${recordIdText}`, {
      operation,
      table,
      recordId: recordIdText,
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
