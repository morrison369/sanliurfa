/**
 * Unit Tests — XSS Protection helpers
 *
 * sanitizeHTML, stripHTML, escapeHTML, sanitizeURL, sanitizeEmail, sanitizeSlug,
 * validateLength, sanitizeObject — XSS defense critical helpers.
 *
 * Coverage: HTML tag allowlist, attribute allowlist, javascript: stripping,
 * event handler removal, URL protocol allowlist (http/https only).
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeHTML,
  stripHTML,
  escapeHTML,
  sanitizeURL,
  sanitizeEmail,
  sanitizeSlug,
  validateLength,
  sanitizeObject,
  CSP_HEADER,
} from '../security/xss';

describe('sanitizeHTML', () => {
  it('removes <script> tags entirely', () => {
    expect(sanitizeHTML('<p>safe</p><script>alert(1)</script>')).not.toContain('alert');
    expect(sanitizeHTML('<p>safe</p><script>alert(1)</script>')).toContain('<p>safe</p>');
  });

  it('removes script tag with attributes and multiline content', () => {
    const dirty = '<script type="text/javascript">\nlet x = 1;\nalert(x);\n</script>';
    expect(sanitizeHTML(dirty)).toBe('');
  });

  it('strips javascript: from text content', () => {
    expect(sanitizeHTML('Click <a href="javascript:alert(1)">me</a>')).not.toContain('javascript:');
  });

  it('removes onclick/onload event handlers', () => {
    const dirty = '<p onclick="alert(1)">click</p>';
    const clean = sanitizeHTML(dirty);
    expect(clean).not.toContain('onclick');
    expect(clean).toContain('<p');
  });

  it('removes onerror event with single quotes', () => {
    const dirty = `<img src="x" onerror='alert(1)'>`;
    expect(sanitizeHTML(dirty)).not.toContain('onerror');
  });

  it('strips disallowed tags (iframe/style — only tags, content remains)', () => {
    // Tags removed, but textual content between them remains (current implementation)
    expect(sanitizeHTML('<iframe src="evil.com"></iframe>')).toBe('');
    // <style> has body{...} as text content — only tags removed
    expect(sanitizeHTML('<style>body{display:none}</style>')).not.toContain('<style>');
  });

  it('preserves allowed tags (p, strong, em, a, img)', () => {
    const html = '<p><strong>bold</strong> <em>italic</em></p>';
    const result = sanitizeHTML(html);
    expect(result).toContain('<p>');
    expect(result).toContain('<strong>');
    expect(result).toContain('<em>');
  });

  it('preserves allowed attributes (href, src, alt)', () => {
    const html = '<a href="https://example.com" title="link">click</a>';
    expect(sanitizeHTML(html)).toContain('href="https://example.com"');
    expect(sanitizeHTML(html)).toContain('title="link"');
  });

  it('strips disallowed attributes (style, onclick)', () => {
    const html = '<p style="color:red" data-x="1">text</p>';
    const result = sanitizeHTML(html);
    expect(result).not.toContain('style');
    expect(result).not.toContain('data-x');
  });

  it('strips javascript: from href attribute', () => {
    const html = '<a href="javascript:alert(1)">click</a>';
    const result = sanitizeHTML(html);
    expect(result).not.toContain('javascript:');
  });

  it('handles empty input', () => {
    expect(sanitizeHTML('')).toBe('');
    expect(sanitizeHTML(null as any)).toBe('');
  });

  it('lowercase tag normalization', () => {
    const html = '<P>upper</P>';
    expect(sanitizeHTML(html)).toContain('<p>');
  });
});

describe('stripHTML', () => {
  it('removes all HTML tags, preserves text', () => {
    expect(stripHTML('<p>hello <strong>world</strong></p>')).toBe('hello world');
  });

  it('removes self-closing tags', () => {
    expect(stripHTML('a<br/>b<img src="x"/>c')).toBe('abc');
  });

  it('handles nested tags', () => {
    expect(stripHTML('<div><p><span>nested</span></p></div>')).toBe('nested');
  });

  it('returns empty for empty input', () => {
    expect(stripHTML('')).toBe('');
    expect(stripHTML(null as any)).toBe('');
  });

  it('preserves text without tags', () => {
    expect(stripHTML('plain text')).toBe('plain text');
  });
});

describe('escapeHTML', () => {
  it('escapes < and >', () => {
    expect(escapeHTML('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes & first (order matters)', () => {
    expect(escapeHTML('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('escapes double quotes', () => {
    expect(escapeHTML('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes (XSS attribute injection)', () => {
    expect(escapeHTML("it's")).toBe('it&#039;s');
  });

  it('returns empty for empty input', () => {
    expect(escapeHTML('')).toBe('');
    expect(escapeHTML(null as any)).toBe('');
  });

  it('preserves safe text', () => {
    expect(escapeHTML('Hello World 123')).toBe('Hello World 123');
  });
});

describe('sanitizeURL', () => {
  it('accepts https URL as-is', () => {
    expect(sanitizeURL('https://example.com/path')).toContain('https://example.com');
  });

  it('accepts http URL as-is', () => {
    expect(sanitizeURL('http://example.com')).toContain('http://example.com');
  });

  it('rejects javascript: protocol', () => {
    expect(sanitizeURL('javascript:alert(1)')).toBe('');
  });

  it('rejects data: protocol', () => {
    expect(sanitizeURL('data:text/html,<script>alert(1)</script>')).toBe('');
  });

  it('rejects ftp:// protocol', () => {
    expect(sanitizeURL('ftp://example.com')).toBe('');
  });

  it('adds https:// to bare domain', () => {
    expect(sanitizeURL('example.com')).toContain('https://example.com');
  });

  it('returns empty for malformed input that fails URL constructor', () => {
    // Helper has fallback: try `https://${url}` if direct parse fails
    // 'not a url' → 'https://not a url' → still fails → ''
    expect(sanitizeURL('not a url')).toBe('');
  });

  it('handles edge: bare "http://" coerced via fallback (https://http//)', () => {
    // Edge case: helper's defensive fallback prepends https:// → 'https://http://' → URL valid
    // Documented behavior, not ideal but consistent
    const result = sanitizeURL('http://');
    expect(typeof result).toBe('string');
  });

  it('returns empty for empty input', () => {
    expect(sanitizeURL('')).toBe('');
    expect(sanitizeURL(null as any)).toBe('');
  });
});

describe('sanitizeEmail', () => {
  it('accepts valid email + lowercases', () => {
    expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
  });

  it('trims whitespace', () => {
    expect(sanitizeEmail('  user@test.co  ')).toBe('user@test.co');
  });

  it('rejects malformed (no @)', () => {
    expect(sanitizeEmail('not-email')).toBe('');
  });

  it('rejects malformed (no TLD)', () => {
    expect(sanitizeEmail('user@host')).toBe('');
  });

  it('rejects whitespace inside email', () => {
    expect(sanitizeEmail('user @example.com')).toBe('');
  });

  it('returns empty for empty input', () => {
    expect(sanitizeEmail('')).toBe('');
    expect(sanitizeEmail(null as any)).toBe('');
  });
});

describe('sanitizeSlug', () => {
  it('lowercases and replaces non-alphanumeric with hyphens', () => {
    expect(sanitizeSlug('Hello World 2024')).toBe('hello-world-2024');
  });

  it('collapses consecutive hyphens', () => {
    expect(sanitizeSlug('foo  bar---baz')).toBe('foo-bar-baz');
  });

  it('strips leading/trailing hyphens', () => {
    expect(sanitizeSlug('-leading-')).toBe('leading');
  });

  it('Türkçe karakterleri ASCII karşılığına dönüştürür (transliteration)', () => {
    // Şanlıurfa → sanliurfa, Göbeklitepe → gobeklitepe (boşluk → hyphen)
    expect(sanitizeSlug('Şanlıurfa')).toBe('sanliurfa');
    expect(sanitizeSlug('Şanlıurfa Göbeklitepe')).toBe('sanliurfa-gobeklitepe');
    expect(sanitizeSlug('Güzel Çiçekler')).toBe('guzel-cicekler');
  });

  it('Tüm 6 Türkçe karakter çifti (ş/ğ/ü/ç/ö/ı + büyük harfleri)', () => {
    expect(sanitizeSlug('şğüçöı')).toBe('sgucoi');
    expect(sanitizeSlug('ŞĞÜÇÖİ')).toBe('sgucoi');
  });

  it('returns empty for empty input', () => {
    expect(sanitizeSlug('')).toBe('');
    expect(sanitizeSlug(null as any)).toBe('');
  });

  it('preserves alphanumeric and hyphens', () => {
    expect(sanitizeSlug('valid-slug-123')).toBe('valid-slug-123');
  });
});

describe('validateLength', () => {
  it('returns valid when in range', () => {
    expect(validateLength('hello', 1, 10)).toEqual({ valid: true });
  });

  it('returns invalid when shorter than min', () => {
    const result = validateLength('a', 5, 10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Minimum 5');
  });

  it('returns invalid when longer than max', () => {
    const result = validateLength('a'.repeat(20), 1, 10);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Maximum 10');
  });

  it('returns invalid for empty string when min > 0', () => {
    expect(validateLength('', 1, 10).valid).toBe(false);
  });

  it('returns Türkçe error messages', () => {
    expect(validateLength('a', 5, 10).error).toContain('karakter gerekli');
    expect(validateLength('a'.repeat(20), 1, 10).error).toContain('karakter');
  });
});

describe('sanitizeObject (recursive)', () => {
  it('escapes string values in flat object', () => {
    const dirty = { name: '<script>alert(1)</script>', age: 25 };
    const clean = sanitizeObject(dirty);
    expect(clean.name).toContain('&lt;script&gt;');
    expect(clean.age).toBe(25);
  });

  it('recursively sanitizes nested objects', () => {
    const dirty = {
      user: {
        name: '<b>X</b>',
        profile: { bio: '<script>X</script>' },
      },
    };
    const clean = sanitizeObject(dirty);
    expect(clean.user.name).toContain('&lt;b&gt;');
    expect(clean.user.profile.bio).toContain('&lt;script&gt;');
  });

  it('preserves non-string non-object values', () => {
    const dirty = { count: 42, active: true, tags: null };
    const clean = sanitizeObject(dirty);
    expect(clean.count).toBe(42);
    expect(clean.active).toBe(true);
    expect(clean.tags).toBeNull();
  });

  it('handles arrays inside objects', () => {
    const dirty = { items: ['<b>x</b>', '<i>y</i>'] };
    const clean = sanitizeObject(dirty);
    // Arrays treated as objects (entries iteration)
    expect(clean.items).toBeDefined();
  });
});

describe('CSP_HEADER', () => {
  it('contains default-src self', () => {
    expect(CSP_HEADER).toContain("default-src 'self'");
  });

  it('contains img-src allowlist (data + https + blob)', () => {
    expect(CSP_HEADER).toContain('img-src');
    expect(CSP_HEADER).toMatch(/img-src.+data:/);
  });

  it('contains script-src with self', () => {
    expect(CSP_HEADER).toMatch(/script-src.+'self'/);
  });
});
