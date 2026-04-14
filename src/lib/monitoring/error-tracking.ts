/**
 * Error tracking and monitoring service
 */

import { generateId } from '../utils';

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface ErrorEvent {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  type?: string;
  url?: string;
  userAgent?: string;
  userId?: string;
  context?: Record<string, any>;
}

const errorStore: ErrorEvent[] = [];
const MAX_ERRORS = 1000;

export function captureException(
  error: Error | string,
  options?: {
    severity?: ErrorSeverity;
    context?: Record<string, any>;
    userId?: string;
  }
): string {
  const errorId = generateId();
  
  const errorEvent: ErrorEvent = {
    id: errorId,
    timestamp: new Date().toISOString(),
    severity: options?.severity || 'error',
    message: typeof error === 'string' ? error : error.message,
    stack: typeof error === 'string' ? undefined : error.stack,
    type: typeof error !== 'string' ? error.constructor.name : 'Error',
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    userId: options?.userId,
    context: options?.context,
  };

  errorStore.push(errorEvent);

  if (errorStore.length > MAX_ERRORS) {
    errorStore.splice(0, errorStore.length - MAX_ERRORS);
  }

  console.error('[ErrorTracking]', errorEvent);
  return errorId;
}

export function getRecentErrors(options?: { severity?: ErrorSeverity; limit?: number }): ErrorEvent[] {
  let filtered = [...errorStore];
  
  if (options?.severity) {
    filtered = filtered.filter(e => e.severity === options.severity);
  }
  
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return filtered.slice(0, options?.limit || 50);
}

export function getErrorStats(): { total: number; bySeverity: Record<ErrorSeverity, number>; last24h: number } {
  const bySeverity: Record<ErrorSeverity, number> = { fatal: 0, error: 0, warning: 0, info: 0, debug: 0 };
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  let last24h = 0;
  
  for (const error of errorStore) {
    bySeverity[error.severity]++;
    if (new Date(error.timestamp) >= oneDayAgo) last24h++;
  }
  
  return { total: errorStore.length, bySeverity, last24h };
}
