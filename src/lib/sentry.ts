/**
 * Sentry error tracking integration
 */

export interface SentryConfig {
  dsn?: string;
  environment?: 'production' | 'staging' | 'development';
  tracesSampleRate?: number;
  beforeSend?: (event: any) => any;
}

/**
 * Initialize Sentry
 */
export async function initializeSentry(config: SentryConfig = {}): Promise<void> {
  const {
    dsn = import.meta.env.PUBLIC_SENTRY_DSN || '',
    environment = import.meta.env.MODE as any || 'development',
    tracesSampleRate = environment === 'production' ? 0.1 : 1.0,
    beforeSend
  } = config;

  if (!dsn) {
    console.log('[Sentry] Not initialized (missing DSN)');
    return;
  }

  try {
    const Sentry = await import('@sentry/astro');

    Sentry.init({
      dsn,
      environment,
      tracesSampleRate,
      integrations: [
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true
        })
      ],
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend: (event, hint) => {
        // Filter out errors based on custom logic
        if (event.exception) {
          const error = hint.originalException;

          // Ignore network errors from certain domains
          if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
            return null;
          }

          // Ignore 4xx errors (likely user errors)
          if (event.tags?.['http.status_code']) {
            const status = parseInt(event.tags['http.status_code']);
            if (status >= 400 && status < 500) {
              return null;
            }
          }
        }

        return beforeSend ? beforeSend(event) : event;
      }
    });

    console.log('[Sentry] Initialized with DSN:', dsn);
  } catch (error) {
    console.error('[Sentry] Initialization failed:', error);
  }
}

/**
 * Capture exception
 */
export function captureException(error: Error | string, context?: Record<string, any>): void {
  try {
    const Sentry = require('@sentry/astro');

    if (typeof error === 'string') {
      Sentry.captureMessage(error, 'error');
    } else {
      Sentry.captureException(error, {
        contexts: context ? { app: context } : undefined
      });
    }
  } catch (e) {
    console.error('[Sentry] Failed to capture exception:', e);
  }
}

/**
 * Capture message
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'error',
  context?: Record<string, any>
): void {
  try {
    const Sentry = require('@sentry/astro');

    Sentry.captureMessage(message, level, {
      contexts: context ? { app: context } : undefined
    });
  } catch (e) {
    console.error('[Sentry] Failed to capture message:', e);
  }
}

/**
 * Set user context
 */
export function setUser(userId: string, email?: string, username?: string): void {
  try {
    const Sentry = require('@sentry/astro');

    Sentry.setUser({
      id: userId,
      email,
      username
    });
  } catch (e) {
    console.error('[Sentry] Failed to set user:', e);
  }
}

/**
 * Clear user context
 */
export function clearUser(): void {
  try {
    const Sentry = require('@sentry/astro');
    Sentry.setUser(null);
  } catch (e) {
    console.error('[Sentry] Failed to clear user:', e);
  }
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  data?: Record<string, any>
): void {
  try {
    const Sentry = require('@sentry/astro');

    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000
    });
  } catch (e) {
    console.error('[Sentry] Failed to add breadcrumb:', e);
  }
}

/**
 * Set tags for filtering
 */
export function setTags(tags: Record<string, string>): void {
  try {
    const Sentry = require('@sentry/astro');

    Object.entries(tags).forEach(([key, value]) => {
      Sentry.setTag(key, value);
    });
  } catch (e) {
    console.error('[Sentry] Failed to set tags:', e);
  }
}

/**
 * Wrap async function with error handling
 */
export async function withSentry<T>(
  fn: () => Promise<T>,
  context?: { operation?: string; [key: string]: any }
): Promise<T | null> {
  try {
    const Sentry = require('@sentry/astro');
    const transaction = Sentry.startTransaction({
      op: context?.operation || 'operation',
      name: context?.name || 'Unknown'
    });

    try {
      const result = await fn();
      transaction.finish();
      return result;
    } catch (error) {
      transaction.setStatus('error');
      transaction.finish();
      throw error;
    }
  } catch (error) {
    if (context?.operation) {
      addBreadcrumb(`Failed: ${context.operation}`, 'error');
    }
    captureException(error instanceof Error ? error : new Error(String(error)), context);
    return null;
  }
}

/**
 * Performance monitoring
 */
export function profileOperation<T>(
  operationName: string,
  fn: () => T
): T {
  try {
    const Sentry = require('@sentry/astro');
    const transaction = Sentry.startTransaction({
      op: 'operation',
      name: operationName
    });

    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    transaction.finish();

    if (duration > 1000) {
      addBreadcrumb(
        `Slow operation: ${operationName}`,
        'performance',
        'warning',
        { duration_ms: Math.round(duration) }
      );
    }

    return result;
  } catch (error) {
    captureException(error instanceof Error ? error : new Error(String(error)), {
      operation: operationName
    });
    throw error;
  }
}

/**
 * Setup global error handler
 */
export function setupGlobalErrorHandler(): void {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    captureException(event.error, {
      type: 'uncaught_error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    captureException(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { type: 'unhandled_rejection' }
    );
  });
}
