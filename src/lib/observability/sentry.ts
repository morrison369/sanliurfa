/**
 * Sentry Observability — single source helper.
 *
 * Strategy: optional integration. `SENTRY_DSN` env yoksa silent skip — Sentry
 * SaaS bağımlılığı zorunlu değil, mevcut DB `error_logs` tablosu yedek.
 *
 * Usage:
 *   await initSentry();                           // boot-time'da lifecycle çağırır
 *   captureException(err, { userId: u.id });      // error tracking
 *   captureMessage('Migration done', 'info');     // info / warning event
 *   setUser({ id, email });                       // request context (PII hash)
 *   addBreadcrumb('cache miss', 'cache', 'debug');// trace breadcrumb
 *
 * Privacy: email hash'lenir (SHA-256 first 16 chars), Authorization/Cookie
 * header'ları beforeSend'de strip edilir, GA/FB/extension URL'leri ignore.
 */

import { createHash } from 'node:crypto';
import { logger } from '../logging';

let sentryClient: typeof import('@sentry/astro') | null = null;
let initialized = false;

/**
 * Boot-time init. SENTRY_DSN yoksa silent skip.
 * Lifecycle module-level dynamic import ile çağırır.
 */
export async function initSentry(): Promise<void> {
  if (initialized) return;
  initialized = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info('[sentry] SENTRY_DSN not set — error tracking disabled (DB error_logs fallback active)');
    return;
  }

  try {
    const Sentry = await import('@sentry/astro');
    const release = getSentryRelease();
    const environment = getSentryEnvironment();

    if (!Sentry.isInitialized()) {
      Sentry.init({
        dsn,
        environment,
        release,
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        initialScope: {
          tags: {
            app: 'sanliurfa',
            runtime: 'astro-node',
          },
        },

        // PII / sensitive header strip
        beforeSend(event) {
          if (event.request?.headers) {
            const h = event.request.headers as Record<string, string>;
            delete h.authorization;
            delete h.Authorization;
            delete h.cookie;
            delete h.Cookie;
            delete h['x-csrf-token'];
          }
          if (event.user) {
            const u = event.user as Record<string, unknown>;
            if (typeof u.email === 'string') {
              u.email = hashEmail(u.email);
            }
            delete u.ip_address;
          }
          return event;
        },

        // Browser/proxy noise
        ignoreErrors: [
          /^Non-Error promise rejection/,
          /^ResizeObserver loop/,
          /^Network request failed/,
          /^Failed to fetch/,
        ],
        denyUrls: [
          /extensions\//i,
          /^chrome:\/\//i,
          /^chrome-extension:\/\//i,
          /^moz-extension:\/\//i,
          /googletagmanager\.com/i,
          /google-analytics\.com/i,
          /facebook\.net/i,
        ],
      });
    }

    sentryClient = Sentry;
    logger.info('[sentry] Initialized', { environment, release });
  } catch (err) {
    logger.warn('[sentry] Init failed (package missing or DSN invalid)', { error: String(err) });
  }
}

/**
 * Capture exception. Sentry varsa hem oraya hem logger'a; yoksa sadece logger.
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  logger.error('Captured exception', error, context);
  if (sentryClient) {
    sentryClient.captureException(error, {
      contexts: context ? { extra: context } : undefined,
    });
  }
}

/**
 * Capture message (info/warning event).
 */
export function captureMessage(
  message: string,
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
): void {
  logger.info(`[${level.toUpperCase()}] ${message}`);
  if (sentryClient) {
    sentryClient.captureMessage(message, level);
  }
}

/**
 * Flush queued events. Test endpoints and short-lived jobs should call this
 * after capture so Sentry has a chance to deliver before the process/request ends.
 */
export async function flushSentry(timeoutMs = 2000): Promise<boolean> {
  if (!sentryClient) return false;
  try {
    return await sentryClient.flush(timeoutMs);
  } catch (err) {
    logger.warn('[sentry] Flush failed', { error: String(err) });
    return false;
  }
}

/**
 * Set user context for current request. Email hash'lenir (PII).
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  if (!sentryClient) return;
  if (user) {
    sentryClient.setUser({
      id: user.id,
      email: user.email ? hashEmail(user.email) : undefined,
      username: user.username,
    });
  } else {
    sentryClient.setUser(null);
  }
}

/**
 * Add breadcrumb for trace context.
 */
export function addBreadcrumb(
  message: string,
  category: string = 'app',
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info',
  data?: Record<string, unknown>,
): void {
  if (!sentryClient) return;
  sentryClient.addBreadcrumb({ message, category, level, data });
}

/**
 * Privacy hash for email (SHA-256 first 16 chars).
 */
function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 16);
}

function getSentryEnvironment(): string {
  return process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development';
}

function getSentryRelease(): string {
  const explicitRelease =
    process.env.SENTRY_RELEASE ||
    process.env.PUBLIC_SENTRY_RELEASE ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.GITHUB_SHA ||
    process.env.COMMIT_SHA;

  if (explicitRelease) return explicitRelease;

  const version = process.env.npm_package_version || '0.0.0';
  return `sanliurfa@${version}`;
}

/**
 * For testing — reset state.
 */
export function _resetSentryForTests(): void {
  initialized = false;
  sentryClient = null;
}
