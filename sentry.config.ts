import * as Sentry from '@sentry/astro';

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  
  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Session replay for debugging
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Before sending, filter sensitive data
  beforeSend(event) {
    // Remove sensitive information
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.authorization;
    }
    return event;
  },
  
  // Ignore common non-actionable errors
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network request failed',
    'Failed to fetch',
    'AbortError',
  ],
  
  // Tag settings
  initialScope: {
    tags: {
      site: 'sanliurfa.com',
      language: 'tr',
    },
  },
});

export default Sentry;
