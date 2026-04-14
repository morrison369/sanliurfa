/**
 * Content Security Policy (CSP) Implementation
 * Security Layer for XSS Protection
 */

import crypto from 'crypto';

export interface CSPConfig {
  nonce?: string;
  reportOnly?: boolean;
  reportUri?: string;
}

// CSP Directives Configuration
const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Astro hydration
    "https://analytics.sanliurfa.com",
    "https://maps.googleapis.com",
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for styled-components/inline styles
    "https://fonts.googleapis.com",
  ],
  'img-src': [
    "'self'",
    "data:",
    "blob:",
    "https://images.sanliurfa.com",
    "https://maps.gstatic.com",
    "https://*.googleusercontent.com",
  ],
  'font-src': [
    "'self'",
    "https://fonts.gstatic.com",
  ],
  'connect-src': [
    "'self'",
    "https://api.sanliurfa.com",
    "wss://realtime.sanliurfa.com",
    "https://analytics.sanliurfa.com",
  ],
  'media-src': ["'self'", "https://videos.sanliurfa.com"],
  'object-src': ["'none'"],
  'frame-ancestors': ["'self'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': [],
};

/**
 * Generate CSP nonce
 */
export function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64');
}

/**
 * Build CSP header value
 */
export function buildCSP(config: CSPConfig = {}): string {
  const directives = { ...CSP_DIRECTIVES };
  
  // Add nonce to script-src if provided
  if (config.nonce) {
    directives['script-src'] = [
      ...directives['script-src'].filter(s => !s.includes('unsafe-inline')),
      `'nonce-${config.nonce}'`,
    ];
  }

  // Build directive string
  const directiveStrings = Object.entries(directives)
    .filter(([, values]) => values.length > 0)
    .map(([key, values]) => `${key} ${values.join(' ')}`);

  let csp = directiveStrings.join('; ');

  // Add report-uri if specified
  if (config.reportUri) {
    csp += `; report-uri ${config.reportUri}`;
  }

  return csp;
}

/**
 * Get CSP header name based on mode
 */
export function getCSPHeaderName(reportOnly: boolean = false): string {
  return reportOnly 
    ? 'Content-Security-Policy-Report-Only' 
    : 'Content-Security-Policy';
}

/**
 * CSP Violation Report Handler
 */
export interface CSPViolationReport {
  'csp-report': {
    'document-uri': string;
    referrer: string;
    'blocked-uri': string;
    'violated-directive': string;
    'original-policy': string;
    disposition: string;
  };
}

export async function handleCSPViolation(report: CSPViolationReport): Promise<void> {
  const { 'csp-report': violation } = report;
  
  console.error('[CSP Violation]', {
    document: violation['document-uri'],
    blocked: violation['blocked-uri'],
    directive: violation['violated-directive'],
    time: new Date().toISOString(),
  });

  // Store in database for analysis
  // await db.execute(sql`INSERT INTO csp_violations ...`);
}

/**
 * Middleware for Astro
 */
export function cspMiddleware(reportOnly: boolean = false) {
  return async (context: any, next: any) => {
    const nonce = generateNonce();
    context.locals.cspNonce = nonce;
    
    const csp = buildCSP({ nonce, reportOnly });
    context.response.headers.set(getCSPHeaderName(reportOnly), csp);
    
    // Additional security headers
    context.response.headers.set('X-Content-Type-Options', 'nosniff');
    context.response.headers.set('X-Frame-Options', 'DENY');
    context.response.headers.set('X-XSS-Protection', '1; mode=block');
    context.response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    context.response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
    
    return next();
  };
}
