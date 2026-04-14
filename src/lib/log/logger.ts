/**
 * Structured Logger
 * Production-ready logging (placeholder)
 * 
 * Note: Install pino for full functionality:
 *   npm install pino pino-pretty
 */

// Simple console logger fallback
export const logger = {
  trace: (msg: string, obj?: Record<string, any>) => {
    console.trace(`[TRACE] ${msg}`, obj || '');
  },
  debug: (msg: string, obj?: Record<string, any>) => {
    console.debug(`[DEBUG] ${msg}`, obj || '');
  },
  info: (msg: string, obj?: Record<string, any>) => {
    console.info(`[INFO] ${msg}`, obj || '');
  },
  warn: (msg: string, obj?: Record<string, any>) => {
    console.warn(`[WARN] ${msg}`, obj || '');
  },
  error: (msg: string, error?: Error | any, obj?: Record<string, any>) => {
    console.error(`[ERROR] ${msg}`, error || '', obj || '');
  },
  fatal: (msg: string, error?: Error | any, obj?: Record<string, any>) => {
    console.error(`[FATAL] ${msg}`, error || '', obj || '');
  },
  request: (request: Request, response: Response, duration: number) => {
    console.log(`[HTTP] ${request.method} ${new URL(request.url).pathname} ${response.status} - ${duration}ms`);
  },
  performance: (operation: string, duration: number, metadata?: Record<string, any>) => {
    console.log(`[PERF] ${operation}: ${duration}ms`, metadata || '');
  },
  security: (event: string, details: Record<string, any>) => {
    console.warn(`[SECURITY] ${event}`, details);
  },
  audit: (action: string, userId: string | undefined, details: Record<string, any>) => {
    console.log(`[AUDIT] ${action} by ${userId}`, details);
  },
};

export default logger;
