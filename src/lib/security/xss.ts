/**
 * XSS Protection Utilities
 * Sanitization and input validation
 */

// Allowed HTML tags for rich text
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
];

// Allowed attributes
const ALLOWED_ATTR = [
  'href', 'title', 'target', 'rel',
  'src', 'alt', 'width', 'height',
  'class', 'id',
];

/**
 * Sanitize HTML content
 * Simple implementation without DOMPurify for Node.js compatibility
 */
export function sanitizeHTML(dirty: string): string {
  if (!dirty) return '';
  
  // Remove script tags and their contents
  let clean = dirty.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove event handlers
  clean = clean.replace(/\s*on\w+="[^"]*"/gi, '');
  clean = clean.replace(/\s*on\w+='[^']*'/gi, '');
  
  // Remove javascript: URLs
  clean = clean.replace(/javascript:/gi, '');
  
  // Only allow specific tags - remove any tag not in allowed list
  const tagRegex = /<(\/?)([\w]+)([^>]*)>/gi;
  clean = clean.replace(tagRegex, (_match, closing, tagName, attributes) => {
    const lowerTag = tagName.toLowerCase();
    if (!ALLOWED_TAGS.includes(lowerTag)) {
      return '';
    }
    
    // Clean attributes
    let cleanAttrs = '';
    if (attributes) {
      const attrRegex = /(\w+)="([^"]*)"/gi;
      let attrMatch: RegExpExecArray | null;
      while ((attrMatch = attrRegex.exec(attributes)) !== null) {
        const attrName = attrMatch[1].toLowerCase();
        const attrValue = attrMatch[2];
        if (ALLOWED_ATTR.includes(attrName)) {
          // Sanitize href/src URLs
          if ((attrName === 'href' || attrName === 'src') && attrValue.toLowerCase().startsWith('javascript:')) {
            continue;
          }
          cleanAttrs += ` ${attrName}="${attrValue.replace(/"/g, '&quot;')}"`;
        }
      }
    }
    
    return `<${closing}${lowerTag}${cleanAttrs}>`;
  });
  
  return clean;
}

/**
 * Strip all HTML tags (for plain text)
 */
export function stripHTML(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Escape HTML entities
 */
export function escapeHTML(str: string): string {
  if (!str) return '';
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Sanitize URL
 */
export function sanitizeURL(url: string): string {
  if (!url) return '';
  
  // Only allow http/https protocols
  const allowedProtocols = ['http:', 'https:'];
  try {
    const parsed = new URL(url);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    // Try adding https:// prefix
    try {
      const withProtocol = 'https://' + url;
      const parsed = new URL(withProtocol);
      return parsed.toString();
    } catch {
      return '';
    }
  }
}

/**
 * Validate and sanitize email
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
  const sanitized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(sanitized) ? sanitized : '';
}

/**
 * Sanitize slug
 */
export function sanitizeSlug(slug: string): string {
  if (!slug) return '';
  
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Content Security Policy headers
 */
export const CSP_HEADER = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com https://cdn.quilljs.com",
  "style-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.quilljs.com",
  "img-src 'self' data: https: blob:",
  "font-src 'self'",
  "connect-src 'self' https://api.openstreetmap.org",
  "frame-src 'self'",
  "media-src 'self'",
].join('; ');

/**
 * Apply security headers
 */
export function applySecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  
  // Content Security Policy
  headers.set('Content-Security-Policy', CSP_HEADER);
  
  // XSS Protection
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // Content Type Options
  headers.set('X-Content-Type-Options', 'nosniff');
  
  // Frame Options
  headers.set('X-Frame-Options', 'DENY');
  
  // Referrer Policy
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  headers.set('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
  
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Validate input length
 */
export function validateLength(
  str: string,
  min: number,
  max: number
): { valid: boolean; error?: string } {
  if (!str || str.length < min) {
    return { valid: false, error: `Minimum ${min} karakter gerekli` };
  }
  if (str.length > max) {
    return { valid: false, error: `Maximum ${max} karakter` };
  }
  return { valid: true };
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = escapeHTML(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}
