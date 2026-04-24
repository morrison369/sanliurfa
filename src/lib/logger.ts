/**
 * Logger System
 * Structured logging with multiple levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

interface LogContext {
  userId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  [key: string]: any;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  metadata?: Record<string, any>;
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = this.getTimestamp();
    const contextStr = entry.context ? JSON.stringify(entry.context) : '';
    const errorStr = entry.error ? `\n${entry.error.stack}` : '';
    
    return `[${timestamp}] ${entry.level.toUpperCase()}: ${entry.message} ${contextStr}${errorStr}`;
  }

  private log(entry: LogEntry): void {
    const formatted = this.formatMessage(entry);

    // Console output
    switch (entry.level) {
      case 'debug':
        if (!this.isProduction) console.debug(formatted);
        break;
      case 'info':
        console.info(formatted);
        break;
      case 'warn':
        console.warn(formatted);
        break;
      case 'error':
      case 'fatal':
        console.error(formatted);
        break;
    }

    // Database log persistence intentionally disabled to keep logger client-safe.
    // Persistent logs should be routed through dedicated server-only audit modules.
  }

  private normalizeContext(context?: LogContext | string): LogContext | undefined {
    if (!context) return undefined;
    if (typeof context === 'string') return { detail: context };
    return context;
  }

  debug(message: string, context?: LogContext | string, metadata?: Record<string, any>): void {
    this.log({ level: 'debug', message, context: this.normalizeContext(context), metadata });
  }

  info(message: string, context?: LogContext | string, metadata?: Record<string, any>): void {
    this.log({ level: 'info', message, context: this.normalizeContext(context), metadata });
  }

  warn(message: string, context?: LogContext | string, metadata?: Record<string, any>): void {
    this.log({ level: 'warn', message, context: this.normalizeContext(context), metadata });
  }

  error(
    message: string,
    errorOrContext?: unknown,
    contextOrMetadata?: LogContext | Record<string, any> | string,
    metadata?: Record<string, any>
  ): void {
    let normalizedError: Error | undefined;
    let normalizedContext: LogContext | undefined;
    let normalizedMetadata = metadata;

    if (errorOrContext instanceof Error) {
      normalizedError = errorOrContext;
    } else if (typeof errorOrContext === 'string') {
      normalizedError = new Error(errorOrContext);
    } else if (errorOrContext && typeof errorOrContext === 'object') {
      normalizedContext = errorOrContext as LogContext;
    }

    if (typeof contextOrMetadata === 'string') {
      normalizedContext = { ...(normalizedContext || {}), detail: contextOrMetadata };
    } else if (contextOrMetadata && typeof contextOrMetadata === 'object') {
      if (!normalizedContext) {
        normalizedContext = contextOrMetadata as LogContext;
      } else {
        normalizedMetadata = {
          ...(contextOrMetadata as Record<string, any>),
          ...(normalizedMetadata || {})
        };
      }
    }

    this.log({
      level: 'error',
      message,
      error: normalizedError,
      context: normalizedContext,
      metadata: normalizedMetadata
    });
  }

  fatal(
    message: string,
    errorOrContext?: unknown,
    contextOrMetadata?: LogContext | Record<string, any> | string,
    metadata?: Record<string, any>
  ): void {
    let normalizedError: Error | undefined;
    let normalizedContext: LogContext | undefined;
    let normalizedMetadata = metadata;

    if (errorOrContext instanceof Error) {
      normalizedError = errorOrContext;
    } else if (typeof errorOrContext === 'string') {
      normalizedError = new Error(errorOrContext);
    } else if (errorOrContext && typeof errorOrContext === 'object') {
      normalizedContext = errorOrContext as LogContext;
    }

    if (typeof contextOrMetadata === 'string') {
      normalizedContext = { ...(normalizedContext || {}), detail: contextOrMetadata };
    } else if (contextOrMetadata && typeof contextOrMetadata === 'object') {
      if (!normalizedContext) {
        normalizedContext = contextOrMetadata as LogContext;
      } else {
        normalizedMetadata = {
          ...(contextOrMetadata as Record<string, any>),
          ...(normalizedMetadata || {})
        };
      }
    }

    this.log({
      level: 'fatal',
      message,
      error: normalizedError,
      context: normalizedContext,
      metadata: normalizedMetadata
    });
  }

  // Request logging
  request(method: string, path: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    this.log({
      level,
      message: `${method} ${path} ${statusCode} - ${duration}ms`,
      context,
      metadata: { statusCode, duration, method, path }
    });
  }

  // Performance logging
  performance(operation: string, duration: number, context?: LogContext | string): void {
    this.log({
      level: duration > 1000 ? 'warn' : 'info',
      message: `Performance: ${operation} took ${duration}ms`,
      context: this.normalizeContext(context),
      metadata: { operation, duration }
    });
  }

  // Compat methods used across API endpoints (no-op implementations)
  setRequestId(_requestId: string): void { /* request-scoped logging not needed at module level */ }
  logMutation(action: string, table: string, id: string, userId?: string, meta?: Record<string, any>): void {
    this.info(`Mutation: ${action} ${table} ${id}`, { userId, ...meta });
  }
  logQuery(sql: string, duration: number): void {
    if (duration > 500) this.warn(`Slow query (${duration}ms): ${sql.slice(0, 200)}`);
  }
  logError(message: string, error?: Error): void {
    this.error(message, error);
  }
  logAuth(event: string, userId: string, success: boolean, meta?: Record<string, any>): void {
    this.info(`Auth: ${event} user=${userId} success=${success}`, meta);
  }
}

export const logger = new Logger();

// Request context logger
export function createRequestLogger(requestId: string, ip: string, userAgent: string) {
  return {
    debug: (message: string, metadata?: Record<string, any>) => 
      logger.debug(message, { requestId, ip, userAgent }, metadata),
    info: (message: string, metadata?: Record<string, any>) => 
      logger.info(message, { requestId, ip, userAgent }, metadata),
    warn: (message: string, metadata?: Record<string, any>) => 
      logger.warn(message, { requestId, ip, userAgent }, metadata),
    error: (message: string, error?: Error, metadata?: Record<string, any>) => 
      logger.error(message, error, { requestId, ip, userAgent }, metadata),
    request: (method: string, path: string, statusCode: number, duration: number) =>
      logger.request(method, path, statusCode, duration, { requestId, ip, userAgent })
  };
}
