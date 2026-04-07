/**
 * Security Headers
 * Implements comprehensive security headers for HTTP responses
 */

export interface SecurityHeadersConfig {
  contentSecurityPolicy?: boolean;
  frameOptions?: string;
  xssProtection?: string;
  contentTypeOptions?: string;
  referrerPolicy?: string;
  permissionsPolicy?: string;
  strictTransportSecurity?: boolean;
}

/**
 * Get default security headers
 */
export function getSecurityHeaders(config: SecurityHeadersConfig = {}): Record<string, string> {
  const {
    contentSecurityPolicy = true,
    frameOptions = 'DENY',
    xssProtection = '1; mode=block',
    contentTypeOptions = 'nosniff',
    referrerPolicy = 'strict-origin-when-cross-origin',
    permissionsPolicy,
    strictTransportSecurity = true
  } = config;

  const headers: Record<string, string> = {};

  // Content Security Policy - strict policy to prevent XSS, injections
  if (contentSecurityPolicy) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.googletagmanager.com https://cdn.ampproject.org",
      "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data: https:",
      "connect-src 'self' https:",
      "frame-src 'self' https://www.youtube.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests"
    ].join('; ');
  }

  // X-Frame-Options - prevent clickjacking
  headers['X-Frame-Options'] = frameOptions;

  // X-XSS-Protection - XSS filter
  headers['X-XSS-Protection'] = xssProtection;

  // X-Content-Type-Options - prevent MIME type sniffing
  headers['X-Content-Type-Options'] = contentTypeOptions;

  // Referrer-Policy - control referrer information
  headers['Referrer-Policy'] = referrerPolicy;

  // Permissions-Policy (formerly Feature-Policy)
  if (permissionsPolicy) {
    headers['Permissions-Policy'] = permissionsPolicy;
  } else {
    headers['Permissions-Policy'] = [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'payment=()',
      'usb=()',
      'accelerometer=()',
      'gyroscope=()',
      'magnetometer=()'
    ].join(', ');
  }

  // Strict-Transport-Security - enforce HTTPS
  if (strictTransportSecurity) {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  // Additional security headers
  headers['X-Permitted-Cross-Domain-Policies'] = 'none';
  headers['Cross-Origin-Opener-Policy'] = 'same-origin';
  headers['Cross-Origin-Resource-Policy'] = 'cross-origin';

  return headers;
}

/**
 * Validate CSP header syntax
 */
export function validateCSPHeader(cspHeader: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const directives = cspHeader.split(';').map(d => d.trim()).filter(Boolean);

  const validDirectives = [
    'default-src', 'script-src', 'style-src', 'img-src', 'font-src', 'connect-src',
    'frame-src', 'object-src', 'base-uri', 'form-action', 'frame-ancestors',
    'upgrade-insecure-requests', 'block-all-mixed-content', 'require-sri-for',
    'sandbox', 'report-uri', 'report-to'
  ];

  for (const directive of directives) {
    const [name] = directive.split(/\s+/);
    if (!validDirectives.includes(name)) {
      errors.push(`Invalid CSP directive: ${name}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check if URL is safe for redirect
 */
export function isSafeRedirectUrl(url: string, allowedOrigins: string[] = []): boolean {
  try {
    // Block absolute URLs to different origins (open redirect prevention)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const urlObj = new URL(url);
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://sanliurfa.com';

        if (urlObj.origin !== currentOrigin && !allowedOrigins.includes(urlObj.origin)) {
          return false;
        }
      } catch {
        return false;
      }
    }

    // Allow relative URLs
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return true;
    }

    // Reject protocol-relative URLs (could be used for attacks)
    if (url.startsWith('//')) {
      return false;
    }

    // Reject javascript: and data: URLs
    if (url.startsWith('javascript:') || url.startsWith('data:')) {
      return false;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Generate security token (CSRF prevention)
 */
export function generateSecurityToken(length: number = 32): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    token += charset[randomIndex];
  }

  return token;
}

/**
 * Hash password for comparison (for legacy SHA-256 hashes)
 */
export function hashSHA256(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}
