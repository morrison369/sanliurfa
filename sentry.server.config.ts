import * as Sentry from '@sentry/astro';
import { createHash } from 'node:crypto';

const dsn = process.env.SENTRY_DSN || process.env.PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release:
      process.env.SENTRY_RELEASE ||
      process.env.PUBLIC_SENTRY_RELEASE ||
      process.env.COMMIT_SHA ||
      `sanliurfa@${process.env.npm_package_version || '0.0.0'}`,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    initialScope: {
      tags: {
        app: 'sanliurfa',
        runtime: 'astro-node',
      },
    },
    beforeSend(event) {
      if (event.request?.headers) {
        const headers = event.request.headers as Record<string, string>;
        delete headers.authorization;
        delete headers.Authorization;
        delete headers.cookie;
        delete headers.Cookie;
        delete headers['x-csrf-token'];
      }

      if (event.user) {
        const user = event.user as Record<string, unknown>;
        if (typeof user.email === 'string') {
          user.email = hashEmail(user.email);
        }
        delete user.ip_address;
      }

      return event;
    },
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

function hashEmail(email: string): string {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 16);
}
