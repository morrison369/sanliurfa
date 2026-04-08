/**
 * Sentry Error Tracking Initialization
 * Monitors errors, performance, and user sessions
 */

import { logger } from './logging';

interface SentryConfig {
  dsn: string;
  environment: string;
  tracesSampleRate: number;
  attachStacktrace: boolean;
}

let sentryInitialized = false;

/**
 * Initialize Sentry for error tracking
 */
export async function initializeSentry(): Promise<void> {
  if (sentryInitialized) return;

  try {
    const config: SentryConfig = {
      dsn: process.env.SENTRY_DSN || '',
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      attachStacktrace: true
    };

    if (!config.dsn) {
      logger.warn('Sentry DSN not configured, error tracking disabled');
      return;
    }

    // In a real implementation, you would initialize the Sentry SDK
    // import * as Sentry from '@sentry/node';
    // Sentry.init(config);

    sentryInitialized = true;
    logger.info('Sentry initialized', { environment: config.environment });
  } catch (error) {
    logger.error('Sentry initialization failed', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Capture exception in Sentry
 */
export function captureException(error: Error, context?: Record<string, any>): void {
  try {
    logger.error('Error captured', error, context);
    // Sentry.captureException(error, { contexts: { additional: context } });
  } catch (e) {
    logger.error('Failed to capture exception', e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * Capture message in Sentry
 */
export function captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' = 'info'): void {
  try {
    logger.log(`${level.toUpperCase()}: ${message}`);
    // Sentry.captureMessage(message, level);
  } catch (e) {
    logger.error('Failed to capture message', e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, username?: string): void {
  try {
    // Sentry.setUser({ id: userId, email, username });
    logger.debug('User context set', { userId });
  } catch (e) {
    logger.error('Failed to set user context', e instanceof Error ? e : new Error(String(e)));
  }
}

/**
 * Clear user context
 */
export function clearUserContext(): void {
  try {
    // Sentry.setUser(null);
    logger.debug('User context cleared');
  } catch (e) {
    logger.error('Failed to clear user context', e instanceof Error ? e : new Error(String(e)));
  }
}
