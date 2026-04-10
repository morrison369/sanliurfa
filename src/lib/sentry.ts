/**
 * Sentry error tracking integration.
 * This module stays compile-safe when `@sentry/astro` is not installed.
 */

type SentryLevel = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

type SentryUser = {
  id: string;
  email?: string;
  username?: string;
};

type SentryScopeContext = Record<string, unknown>;

type SentryEvent = {
  exception?: unknown;
  tags?: Record<string, string>;
};

type SentryHint = {
  originalException?: unknown;
};

type SentryBreadcrumb = {
  message: string;
  category?: string;
  level: SentryLevel;
  data?: SentryScopeContext;
  timestamp: number;
};

type SentryTransaction = {
  setStatus: (status: string) => void;
  finish: () => void;
};

type SentrySdk = {
  Replay?: new (config: Record<string, unknown>) => unknown;
  init?: (config: Record<string, unknown>) => void;
  captureMessage?: (message: string, level?: SentryLevel, context?: Record<string, unknown>) => void;
  captureException?: (error: Error, context?: Record<string, unknown>) => void;
  setUser?: (user: SentryUser | null) => void;
  addBreadcrumb?: (breadcrumb: SentryBreadcrumb) => void;
  setTag?: (key: string, value: string) => void;
  startTransaction?: (context: { op: string; name: string }) => SentryTransaction;
};

export interface SentryConfig {
  dsn?: string;
  environment?: 'production' | 'staging' | 'development';
  tracesSampleRate?: number;
  beforeSend?: (event: SentryEvent) => SentryEvent | null;
}

const loadSentryModule = new Function('specifier', 'return import(specifier);') as (specifier: string) => Promise<SentrySdk>;

let sentrySdkPromise: Promise<SentrySdk | null> | null = null;

function getEnvValue(name: string): string | undefined {
  if (typeof process !== 'undefined' && process.env[name]) {
    return process.env[name];
  }

  if (typeof import.meta !== 'undefined' && import.meta.env && name in import.meta.env) {
    const value = import.meta.env[name as keyof ImportMetaEnv];
    return typeof value === 'string' ? value : undefined;
  }

  return undefined;
}

function getRuntimeEnvironment(): 'production' | 'staging' | 'development' {
  const env = getEnvValue('NODE_ENV') ?? getEnvValue('MODE') ?? 'development';
  return env === 'production' || env === 'staging' ? env : 'development';
}

async function getSentrySdk(): Promise<SentrySdk | null> {
  if (!sentrySdkPromise) {
    sentrySdkPromise = loadSentryModule('@sentry/astro').catch(() => null);
  }

  return sentrySdkPromise;
}

function createNoopTransaction(): SentryTransaction {
  return {
    setStatus: () => undefined,
    finish: () => undefined
  };
}

/**
 * Initialize Sentry
 */
export async function initializeSentry(config: SentryConfig = {}): Promise<void> {
  const environment = config.environment ?? getRuntimeEnvironment();
  const dsn = config.dsn ?? getEnvValue('PUBLIC_SENTRY_DSN') ?? getEnvValue('SENTRY_DSN') ?? '';
  const tracesSampleRate = config.tracesSampleRate ?? (environment === 'production' ? 0.1 : 1.0);

  if (!dsn) {
    console.log('[Sentry] Not initialized (missing DSN)');
    return;
  }

  const sdk = await getSentrySdk();
  if (!sdk?.init) {
    console.warn('[Sentry] SDK not available, running without external tracking');
    return;
  }

  try {
    sdk.init({
      dsn,
      environment,
      tracesSampleRate,
      integrations: sdk.Replay
        ? [
            new sdk.Replay({
              maskAllText: true,
              blockAllMedia: true
            })
          ]
        : [],
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      beforeSend: (event: SentryEvent, hint: SentryHint) => {
        if (event.exception) {
          const originalError = hint.originalException;

          if (originalError instanceof TypeError && originalError.message.includes('Failed to fetch')) {
            return null;
          }

          const statusCode = event.tags?.['http.status_code'];
          if (statusCode) {
            const status = Number.parseInt(statusCode, 10);
            if (status >= 400 && status < 500) {
              return null;
            }
          }
        }

        return config.beforeSend ? config.beforeSend(event) : event;
      }
    });

    console.log('[Sentry] Initialized');
  } catch (error) {
    console.error('[Sentry] Initialization failed:', error);
  }
}

/**
 * Capture exception
 */
export function captureException(error: Error | string, context?: SentryScopeContext): void {
  void getSentrySdk().then((sdk) => {
    const normalizedError = typeof error === 'string' ? new Error(error) : error;

    if (sdk?.captureException) {
      sdk.captureException(normalizedError, {
        contexts: context ? { app: context } : undefined
      });
      return;
    }

    console.error('[Sentry] SDK unavailable, exception fallback:', normalizedError, context);
  });
}

/**
 * Capture message
 */
export function captureMessage(
  message: string,
  level: SentryLevel = 'error',
  context?: SentryScopeContext
): void {
  void getSentrySdk().then((sdk) => {
    if (sdk?.captureMessage) {
      sdk.captureMessage(message, level, {
        contexts: context ? { app: context } : undefined
      });
      return;
    }

    const logMethod = level === 'fatal' || level === 'error' ? console.error : console.info;
    logMethod('[Sentry] SDK unavailable, message fallback:', message, context);
  });
}

/**
 * Set user context
 */
export function setUser(userId: string, email?: string, username?: string): void {
  void getSentrySdk().then((sdk) => {
    if (!sdk?.setUser) {
      return;
    }

    sdk.setUser({
      id: userId,
      email,
      username
    });
  });
}

/**
 * Clear user context
 */
export function clearUser(): void {
  void getSentrySdk().then((sdk) => {
    sdk?.setUser?.(null);
  });
}

/**
 * Add breadcrumb
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: SentryLevel = 'info',
  data?: SentryScopeContext
): void {
  void getSentrySdk().then((sdk) => {
    sdk?.addBreadcrumb?.({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000
    });
  });
}

/**
 * Set tags for filtering
 */
export function setTags(tags: Record<string, string>): void {
  void getSentrySdk().then((sdk) => {
    if (!sdk?.setTag) {
      return;
    }

    Object.entries(tags).forEach(([key, value]) => {
      sdk.setTag?.(key, value);
    });
  });
}

/**
 * Wrap async function with error handling
 */
export async function withSentry<T>(
  fn: () => Promise<T>,
  context?: { operation?: string; name?: string; [key: string]: unknown }
): Promise<T | null> {
  const sdk = await getSentrySdk();
  const transaction = sdk?.startTransaction?.({
    op: context?.operation ?? 'operation',
    name: context?.name ?? 'Unknown'
  }) ?? createNoopTransaction();

  try {
    const result = await fn();
    transaction.finish();
    return result;
  } catch (error) {
    transaction.setStatus('error');
    transaction.finish();

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
export function profileOperation<T>(operationName: string, fn: () => T): T {
  const start = performance.now();

  return withProfileTransaction(operationName, () => {
    const result = fn();
    const duration = performance.now() - start;

    if (duration > 1000) {
      addBreadcrumb(`Slow operation: ${operationName}`, 'performance', 'warning', {
        duration_ms: Math.round(duration)
      });
    }

    return result;
  });
}

function withProfileTransaction<T>(operationName: string, fn: () => T): T {
  void getSentrySdk().then((sdk) => {
    sdk?.startTransaction?.({
      op: 'operation',
      name: operationName
    }).finish();
  });

  try {
    return fn();
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
  if (typeof window === 'undefined') {
    return;
  }

  window.addEventListener('error', (event) => {
    captureException(event.error instanceof Error ? event.error : new Error(String(event.message)), {
      type: 'uncaught_error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureException(
      event.reason instanceof Error ? event.reason : new Error(String(event.reason)),
      { type: 'unhandled_rejection' }
    );
  });
}
