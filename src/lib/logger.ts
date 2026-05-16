/**
 * Logger System
 * Structured logging with multiple levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';
type RuntimeProfile = 'development' | 'test' | 'staging' | 'production' | 'release';

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  fatal: 50,
};

const PROFILE_DEFAULT_LEVEL: Record<RuntimeProfile, LogLevel> = {
  development: 'debug',
  test: 'debug',
  staging: 'info',
  production: 'info',
  release: 'warn',
};

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
  private runtimeProfile: RuntimeProfile = this.resolveRuntimeProfile();
  private minLevel: LogLevel = this.resolveMinLevel();

  private resolveRuntimeProfile(): RuntimeProfile {
    const raw = (process.env.LOG_PROFILE || process.env.APP_RUNTIME_PROFILE || '').toLowerCase();
    if (raw in PROFILE_DEFAULT_LEVEL) {
      return raw as RuntimeProfile;
    }

    if (process.env.NODE_ENV === 'test') {
      return 'test';
    }

    if (process.env.NODE_ENV === 'staging') {
      return 'staging';
    }

    if (process.env.RELEASE_MODE === '1' || process.env.CI_RELEASE === '1') {
      return 'release';
    }

    return this.isProduction ? 'production' : 'development';
  }

  private resolveMinLevel(): LogLevel {
    const raw = (process.env.LOG_LEVEL || '').toLowerCase();
    if (raw in LOG_LEVEL_PRIORITY) {
      return raw as LogLevel;
    }
    return PROFILE_DEFAULT_LEVEL[this.runtimeProfile];
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.minLevel];
  }

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
    if (!this.shouldLog(entry.level)) return;
    const formatted = this.formatMessage(entry);

    // Console output
    switch (entry.level) {
      case 'debug':
        console.debug(formatted);
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

  private buildLogEntry(
    level: LogLevel,
    message: string,
    options?: {
      context?: LogContext;
      error?: Error;
      metadata?: Record<string, any>;
    }
  ): LogEntry {
    return {
      level,
      message,
      ...(options?.context ? { context: options.context } : {}),
      ...(options?.error ? { error: options.error } : {}),
      ...(options?.metadata ? { metadata: options.metadata } : {}),
    };
  }

  debug(message: string, context?: LogContext | string | Error, metadata?: Record<string, any>): void {
    if (context instanceof Error) {
      this.log(this.buildLogEntry('debug', message, { error: context, ...(metadata ? { metadata } : {}) }));
      return;
    }
    const normalizedContext = this.normalizeContext(context);
    this.log(this.buildLogEntry('debug', message, {
      ...(normalizedContext ? { context: normalizedContext } : {}),
      ...(metadata ? { metadata } : {}),
    }));
  }

  info(message: string, context?: LogContext | string | Error, metadata?: Record<string, any>): void {
    if (context instanceof Error) {
      this.log(this.buildLogEntry('info', message, { error: context, ...(metadata ? { metadata } : {}) }));
      return;
    }
    const normalizedContext = this.normalizeContext(context);
    this.log(this.buildLogEntry('info', message, {
      ...(normalizedContext ? { context: normalizedContext } : {}),
      ...(metadata ? { metadata } : {}),
    }));
  }

  warn(message: string, context?: LogContext | string | Error, metadata?: Record<string, any>): void {
    if (context instanceof Error) {
      this.log(this.buildLogEntry('warn', message, { error: context, ...(metadata ? { metadata } : {}) }));
      return;
    }
    const normalizedContext = this.normalizeContext(context);
    this.log(this.buildLogEntry('warn', message, {
      ...(normalizedContext ? { context: normalizedContext } : {}),
      ...(metadata ? { metadata } : {}),
    }));
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

    this.log(this.buildLogEntry('error', message, {
      ...(normalizedError ? { error: normalizedError } : {}),
      ...(normalizedContext ? { context: normalizedContext } : {}),
      ...(normalizedMetadata ? { metadata: normalizedMetadata } : {}),
    }));
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

    this.log(this.buildLogEntry('fatal', message, {
      ...(normalizedError ? { error: normalizedError } : {}),
      ...(normalizedContext ? { context: normalizedContext } : {}),
      ...(normalizedMetadata ? { metadata: normalizedMetadata } : {}),
    }));
  }

  // Request logging
  request(method: string, path: string, statusCode: number, duration: number, context?: LogContext): void {
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    this.log(this.buildLogEntry(level, `${method} ${path} ${statusCode} - ${duration}ms`, {
      ...(context ? { context } : {}),
      metadata: { statusCode, duration, method, path }
    }));
  }

  // Performance logging
  performance(operation: string, duration: number, context?: LogContext | string): void {
    const normalizedContext = this.normalizeContext(context);
    this.log(this.buildLogEntry(duration > 1000 ? 'warn' : 'info', `Performance: ${operation} took ${duration}ms`, {
      ...(normalizedContext ? { context: normalizedContext } : {}),
      metadata: { operation, duration }
    }));
  }

  // Compat methods used across API endpoints (no-op implementations)
  setRequestId(_requestId: string): void { /* request-scoped logging not needed at module level */ }
  logMutation(action: string, table: string, id: string, userId?: string, meta?: Record<string, any>): void {
    const context: LogContext = {
      ...(userId ? { userId } : {}),
      ...(meta || {}),
    };
    this.info(`Mutation: ${action} ${table} ${id}`, Object.keys(context).length > 0 ? context : undefined);
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
