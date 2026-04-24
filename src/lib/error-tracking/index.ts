/**
 * Error Tracking Integration
 * Sentry-compatible error tracking
 */

import { query } from '../postgres';
import { logger } from '../logging';

// Sentry DSN from environment
const SENTRY_DSN = process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const RELEASE = process.env.npm_package_version || '1.0.0';

export interface ErrorEvent {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  stack?: string;
  context?: Record<string, any>;
  user?: { id?: string; email?: string; username?: string };
  tags?: Record<string, string>;
  url?: string;
  timestamp: Date;
}

export interface ErrorFingerprint {
  fingerprint: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  status: 'unresolved' | 'resolved' | 'ignored';
}

let sentryClient: any = null;

/**
 * Initialize error tracking
 */
export async function initErrorTracking(): Promise<void> {
  if (!SENTRY_DSN) {
    logger.info('[ErrorTracking] SENTRY_DSN not configured, using local error tracking only');
    return;
  }

  try {
    // Dynamic import to avoid issues if Sentry is not installed
    const Sentry = await import('@sentry/node');
    
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: ENVIRONMENT,
      release: RELEASE,
      tracesSampleRate: 0.1,
      beforeSend: (event: any) => {
        // Filter out sensitive data
        if (event.request?.headers) {
          delete event.request.headers.cookie;
          delete event.request.headers.authorization;
        }
        return event;
      },
    });

    sentryClient = Sentry;
    logger.info('[ErrorTracking] Sentry initialized');
  } catch {
    logger.info('[ErrorTracking] Sentry not available, using local error tracking');
  }
}

/**
 * Capture error
 */
export async function captureError(
  error: Error | string,
  options: {
    level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
    context?: Record<string, any>;
    user?: ErrorEvent['user'];
    tags?: Record<string, string>;
    url?: string;
  } = {}
): Promise<string> {
  const errorId = `err_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  
  const errorEvent: ErrorEvent = {
    id: errorId,
    message: error instanceof Error ? error.message : error,
    type: options.level === 'warning' ? 'warning' : options.level === 'info' ? 'info' : 'error',
    stack: error instanceof Error ? error.stack : undefined,
    context: options.context,
    user: options.user,
    tags: options.tags,
    url: options.url,
    timestamp: new Date(),
  };

  // Save to local database
  await saveErrorToDatabase(errorEvent);

  // Send to Sentry if available
  if (sentryClient) {
    const scope = new sentryClient.Scope();
    
    if (options.user) {
      scope.setUser(options.user);
    }
    
    if (options.tags) {
      Object.entries(options.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }

    if (options.context) {
      scope.setExtras(options.context);
    }

    if (error instanceof Error) {
      sentryClient.captureException(error, scope);
    } else {
      sentryClient.captureMessage(error, options.level || 'error', scope);
    }
  }

  // Console output in development
  if (ENVIRONMENT === 'development') {
    logger.error(`[Error] ${errorEvent.message}`, error instanceof Error ? error.stack : '');
  }

  return errorId;
}

/**
 * Capture exception shorthand
 */
export async function captureException(
  error: Error,
  context?: Record<string, any>
): Promise<string> {
  return captureError(error, { context, level: 'error' });
}

/**
 * Capture message
 */
export async function captureMessage(
  message: string,
  level: ErrorEvent['type'] = 'info',
  context?: Record<string, any>
): Promise<string> {
  return captureError(message, { context, level: level as any });
}

/**
 * Save error to database
 */
async function saveErrorToDatabase(error: ErrorEvent): Promise<void> {
  // Generate fingerprint for grouping
  const fingerprint = generateFingerprint(error);

  await query(
    `INSERT INTO error_logs (id, message, type, stack, context, user_id, tags, url, fingerprint, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
    [
      error.id,
      error.message,
      error.type,
      error.stack,
      JSON.stringify(error.context),
      error.user?.id,
      JSON.stringify(error.tags),
      error.url,
      fingerprint,
    ]
  );

  // Update fingerprint stats
  await query(
    `INSERT INTO error_fingerprints (fingerprint, count, first_seen, last_seen, status)
     VALUES ($1, 1, NOW(), NOW(), 'unresolved')
     ON CONFLICT (fingerprint) DO UPDATE SET
       count = error_fingerprints.count + 1,
       last_seen = NOW()`,
    [fingerprint]
  );
}

/**
 * Generate error fingerprint for grouping
 */
function generateFingerprint(error: ErrorEvent): string {
  // Simple fingerprint based on error message and first line of stack
  let fingerprint = error.message;
  
  if (error.stack) {
    const firstLine = error.stack.split('\n')[1]?.trim();
    if (firstLine) {
      fingerprint += `|${firstLine}`;
    }
  }

  // Hash the fingerprint
  return hashString(fingerprint);
}

/**
 * Simple hash function
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Get error details
 */
export async function getError(errorId: string): Promise<ErrorEvent | null> {
  const result = await query('SELECT * FROM error_logs WHERE id = $1', [errorId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    message: row.message,
    type: row.type,
    stack: row.stack,
    context: row.context,
    user: row.user_id ? { id: row.user_id } : undefined,
    tags: row.tags,
    url: row.url,
    timestamp: new Date(row.created_at),
  };
}

/**
 * Get error list
 */
export async function getErrors(
  options: {
    status?: 'unresolved' | 'resolved' | 'ignored' | 'all';
    type?: 'error' | 'warning' | 'info';
    limit?: number;
    offset?: number;
    startDate?: Date;
    endDate?: Date;
  } = {}
): Promise<{ errors: ErrorFingerprint[]; total: number }> {
  const { status = 'all', type, limit = 50, offset = 0, startDate, endDate } = options;

  let sql = `
    SELECT ef.*, 
      (SELECT message FROM error_logs WHERE fingerprint = ef.fingerprint ORDER BY created_at DESC LIMIT 1) as last_message
    FROM error_fingerprints ef
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status !== 'all') {
    params.push(status);
    sql += ` AND ef.status = $${params.length}`;
  }

  if (startDate) {
    params.push(startDate);
    sql += ` AND ef.last_seen >= $${params.length}`;
  }

  if (endDate) {
    params.push(endDate);
    sql += ` AND ef.last_seen <= $${params.length}`;
  }

  const countResult = await query(`SELECT COUNT(*) FROM (${sql}) AS count_query`, params);

  sql += ` ORDER BY ef.last_seen DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

  const result = await query(sql, [...params, limit, offset]);

  return {
    errors: result.rows.map(row => ({
      fingerprint: row.fingerprint,
      count: parseInt(row.count),
      firstSeen: new Date(row.first_seen),
      lastSeen: new Date(row.last_seen),
      status: row.status,
      lastMessage: row.last_message,
    })),
    total: parseInt(countResult.rows[0].count),
  };
}

/**
 * Resolve error
 */
export async function resolveError(fingerprint: string): Promise<void> {
  await query(
    `UPDATE error_fingerprints SET status = 'resolved', resolved_at = NOW() WHERE fingerprint = $1`,
    [fingerprint]
  );
}

/**
 * Ignore error
 */
export async function ignoreError(fingerprint: string): Promise<void> {
  await query(
    `UPDATE error_fingerprints SET status = 'ignored' WHERE fingerprint = $1`,
    [fingerprint]
  );
}

/**
 * Get error statistics
 */
export async function getErrorStats(
  period: { start: Date; end: Date }
): Promise<{
  total: number;
  byType: Record<string, number>;
  byDay: Array<{ date: string; count: number }>;
  topErrors: Array<{ fingerprint: string; message: string; count: number }>;
}> {
  const totalResult = await query(
    `SELECT COUNT(*) FROM error_logs WHERE created_at >= $1 AND created_at <= $2`,
    [period.start, period.end]
  );

  const byTypeResult = await query(
    `SELECT type, COUNT(*) as count FROM error_logs 
    WHERE created_at >= $1 AND created_at <= $2
    GROUP BY type`,
    [period.start, period.end]
  );

  const byDayResult = await query(
    `SELECT DATE(created_at) as date, COUNT(*) as count FROM error_logs
    WHERE created_at >= $1 AND created_at <= $2
    GROUP BY DATE(created_at)
    ORDER BY date`,
    [period.start, period.end]
  );

  const topErrorsResult = await query(
    `SELECT fingerprint, message, COUNT(*) as count FROM error_logs
    WHERE created_at >= $1 AND created_at <= $2
    GROUP BY fingerprint, message
    ORDER BY count DESC
    LIMIT 10`,
    [period.start, period.end]
  );

  const byType: Record<string, number> = {};
  byTypeResult.rows.forEach(row => {
    byType[row.type] = parseInt(row.count);
  });

  return {
    total: parseInt(totalResult.rows[0].count),
    byType,
    byDay: byDayResult.rows.map(row => ({
      date: row.date,
      count: parseInt(row.count),
    })),
    topErrors: topErrorsResult.rows.map(row => ({
      fingerprint: row.fingerprint,
      message: row.message,
      count: parseInt(row.count),
    })),
  };
}

/**
 * Express/Node error handler middleware
 */
export function errorHandlerMiddleware() {
  return async (err: any, req: any, res: any, next: any) => {
    const errorId = await captureError(err, {
      level: 'error',
      context: {
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body,
      },
      user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
      url: req.url,
    });

    res.status(500).json({
      error: 'Internal Server Error',
      errorId,
      message: ENVIRONMENT === 'development' ? err.message : undefined,
    });
  };
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string }): void {
  if (sentryClient) {
    sentryClient.setUser(user);
  }
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info'
): void {
  if (sentryClient) {
    sentryClient.addBreadcrumb({
      message,
      category,
      level,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Clean old errors
 */
export async function cleanOldErrors(retentionDays: number = 90): Promise<number> {
  const result = await query(
    `DELETE FROM error_logs WHERE created_at < NOW() - ($1 * INTERVAL '1 day')
    RETURNING id`, [retentionDays]);

  // Clean up old resolved/ignored fingerprints
  await query(
    `DELETE FROM error_fingerprints 
    WHERE status IN ('resolved', 'ignored') 
    AND last_seen < NOW() - ($1 * INTERVAL '1 day')`, [retentionDays]);

  return result.rows.length;
}

