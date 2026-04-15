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

  private async saveToDatabase(entry: LogEntry): Promise<void> {
    if (!this.isProduction) return;

    try {
      // Lazy import to break circular dependency (logger <-> postgres)
      const { query } = await import('./postgres');
      await query(
        `INSERT INTO system_logs (level, message, context, metadata, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          entry.level,
          entry.message,
          entry.context ? JSON.stringify(entry.context) : null,
          entry.metadata ? JSON.stringify(entry.metadata) : null
        ]
      );
    } catch (err) {
      console.error('Failed to save log to database:', err);
    }
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

    // Save to database in production
    if (['error', 'fatal', 'warn'].includes(entry.level)) {
      this.saveToDatabase(entry);
    }
  }

  debug(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log({ level: 'debug', message, context, metadata });
  }

  info(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log({ level: 'info', message, context, metadata });
  }

  warn(message: string, context?: LogContext, metadata?: Record<string, any>): void {
    this.log({ level: 'warn', message, context, metadata });
  }

  error(message: string, error?: Error, context?: LogContext, metadata?: Record<string, any>): void {
    this.log({ level: 'error', message, error, context, metadata });
  }

  fatal(message: string, error?: Error, context?: LogContext, metadata?: Record<string, any>): void {
    this.log({ level: 'fatal', message, error, context, metadata });
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
  performance(operation: string, duration: number, context?: LogContext): void {
    this.log({
      level: duration > 1000 ? 'warn' : 'info',
      message: `Performance: ${operation} took ${duration}ms`,
      context,
      metadata: { operation, duration }
    });
  }

  // Compat methods used across API endpoints (no-op implementations)
  setRequestId(_requestId: string): void { /* request-scoped logging not needed at module level */ }
  logMutation(action: string, table: string, id: string, userId?: string): void {
    this.info(`Mutation: ${action} ${table} ${id}`, { userId });
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
