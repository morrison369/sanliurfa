/**
 * Input Sanitization Utilities
 * Prevents XSS attacks by escaping dangerous characters
 */

const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

const HTML_REGEX = /[&<>"'/`=]/g;

/**
 * Escape HTML entities to prevent XSS
 * Usage: sanitize(userInput)
 */
export function sanitize(input: string | null | undefined): string {
  if (!input) return '';
  return String(input).replace(HTML_REGEX, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize object values
 * Usage: sanitizeObj({ name: user.name, bio: user.bio })
 */
export function sanitizeObj<T extends Record<string, any>>(obj: T): T {
  const result = {} as T;
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      result[key] = sanitize(obj[key]) as any;
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Allow specific HTML tags (Basic whitelist)
 * Note: For complex sanitization, use a dedicated library like 'sanitize-html'
 */
export function sanitizeHtml(input: string, allowedTags: string[] = ['b', 'i', 'u', 'br']): string {
  // Remove script/style tags first
  let clean = input.replace(/<(script|style)[^>]*>.*?<\/\1>/gis, '');
  
  // Remove tags not in whitelist
  const tagRegex = new RegExp(`<(/?)(?!(?:${allowedTags.join('|')})\\b)[^>]*>`, 'gi');
  clean = clean.replace(tagRegex, '');
  
  // Remove event handlers (onclick, onload, etc.)
  clean = clean.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '');
  
  return clean;
}
