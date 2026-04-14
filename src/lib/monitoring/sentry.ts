// @ts-nocheck
/**
 * Sentry Error Tracking and Performance Monitoring
 */

import * as Sentry from '@sentry/astro';

const SENTRY_DSN = import.meta.env.SENTRY_DSN;
const ENVIRONMENT = import.meta.env.NODE_ENV || 'development';

export function initSentry(): void {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    release: import.meta.env.npm_package_version,
    
    // Performance monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
    
    // Session replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Before sending event
    beforeSend(event) {
      // Filter out sensitive data
      if (event.request?.headers) {
        delete event.request.headers['Authorization'];
        delete event.request.headers['Cookie'];
      }
      
      // Filter out PII from user
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      
      return event;
    },
    
    // Ignore certain errors
    ignoreErrors: [
      // Browser extensions
      /^Non-Error promise rejection/,
      /^ResizeObserver loop/,
      // Network errors
      /^Network request failed/,
      /^Failed to fetch/,
      // Known issues
      /^Cannot read property 'xxx' of undefined/,
    ],
    
    // Deny URLs
    denyUrls: [
      // Extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^chrome-extension:\/\//i,
      /^moz-extension:\/\//i,
      // Third-party scripts
      /googletagmanager\.com/i,
      /google-analytics\.com/i,
      /facebook\.net/i,
    ],
  });
}

/**
 * Set user context for error tracking
 */
export function setUser(user: { id: string; email?: string; username?: string } | null): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      // Hash email for privacy
      email: user.email ? hashEmail(user.email) : undefined,
      username: user.username,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Set tags for filtering
 */
export function setTags(tags: Record<string, string>): void {
  Sentry.setTags(tags);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level: Sentry.SeverityLevel = 'info',
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    data,
  });
}

/**
 * Capture exception
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  Sentry.captureException(error, {
    contexts: context ? { extra: context } : undefined,
  });
}

/**
 * Capture message
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level);
}

/**
 * Create a transaction for performance monitoring
 */
export function startTransaction(name: string, op: string): ReturnType<typeof Sentry.startTransaction> {
  return Sentry.startTransaction({ name, op });
}

/**
 * Hash email for privacy
 */
function hashEmail(email: string): string {
  // Simple hash - in production use a proper hashing function
  return email.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0).toString(16);
}

export default Sentry;
