import * as Sentry from '@sentry/astro';

const dsn = import.meta.env.PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.PUBLIC_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release:
      import.meta.env.PUBLIC_SENTRY_RELEASE ||
      `sanliurfa@${import.meta.env.PUBLIC_APP_VERSION || '0.0.0'}`,
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    initialScope: {
      tags: {
        app: 'sanliurfa',
        runtime: 'astro-browser',
      },
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
