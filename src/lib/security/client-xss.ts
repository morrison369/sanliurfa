import { logger } from '../logging';
/**
 * Client-side XSS Protection with DOMPurify
 * For browser environments
 */

// DOMPurify will be loaded dynamically on client
let DOMPurify: any;

async function getDOMPurify() {
  if (typeof window === 'undefined') return null;
  
  if (!DOMPurify) {
    try {
      const module = await import('dompurify');
      DOMPurify = module.default || module;
    } catch (error) {
      logger.warn('DOMPurify not available');
      return null;
    }
  }
  return DOMPurify;
}

// Allowed HTML tags for rich text
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'code', 'pre',
  'a', 'img',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'div', 'span',
];

// Allowed attributes
const ALLOWED_ATTR = [
  'href', 'title', 'target', 'rel',
  'src', 'alt', 'width', 'height',
  'class', 'id',
  'data-*',
];

/**
 * Sanitize HTML content using DOMPurify
 */
export async function sanitizeClientHTML(dirty: string): Promise<string> {
  const purify = await getDOMPurify();
  if (!purify) {
    // Fallback: escape HTML
    return escapeHtml(dirty);
  }

  return purify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false,
    SANITIZE_DOM: true,
    USE_PROFILES: { html: true },
  });
}

/**
 * Sanitize URL
 */
export function sanitizeClientUrl(url: string): string {
  if (!url) return '';
  
  const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:'];
  
  try {
    const parsed = new URL(url, window.location.href);
    if (!allowedProtocols.includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Validate file upload
 */
export function validateClientFileUpload(file: File): { valid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024; // 5MB
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml',
  ];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Geçersiz dosya türü' };
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Dosya boyutu 5MB\'ı geçemez' };
  }

  return { valid: true };
}

/**
 * Escape HTML entities
 */
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Sanitize form input
 */
export function sanitizeFormInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 1000);
}

/**
 * Initialize XSS protection on page
 */
export function initXSSProtection(): void {
  if (typeof window === 'undefined') return;

  // Sanitize any user-generated content on page load
  document.querySelectorAll('[data-user-content]').forEach((el) => {
    const content = el.innerHTML;
    sanitizeClientHTML(content).then((clean) => {
      el.innerHTML = clean;
    });
  });

  // Add event listener for dynamic content
  document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement && node.dataset.userContent) {
            sanitizeClientHTML(node.innerHTML).then((clean) => {
              node.innerHTML = clean;
            });
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  });
}

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  initXSSProtection();
}
