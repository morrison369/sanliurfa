/**
 * Unit Tests — sanitize.ts
 *
 * XSS defense via HTML entity escaping:
 * - sanitize(): escapes & < > " ' / ` =
 * - sanitizeObj(): recursive object value sanitization (string fields only)
 * - sanitizeHtml(): allowed-tag whitelist + script/style strip + event handler strip
 */

import { describe, it, expect } from 'vitest';
import { sanitize, sanitizeObj, sanitizeHtml } from '../sanitize';

describe('sanitize', () => {
  it('null/undefined → boş string', () => {
    expect(sanitize(null)).toBe('');
    expect(sanitize(undefined)).toBe('');
  });

  it('boş string → boş string', () => {
    expect(sanitize('')).toBe('');
  });

  it('& → &amp;', () => {
    expect(sanitize('a & b')).toBe('a &amp; b');
  });

  it('< → &lt;', () => {
    expect(sanitize('<script>')).toBe('&lt;script&gt;');
  });

  it('> → &gt;', () => {
    expect(sanitize('a > b')).toBe('a &gt; b');
  });

  it('" → &quot;', () => {
    expect(sanitize('say "hi"')).toBe('say &quot;hi&quot;');
  });

  it("' → &#39;", () => {
    expect(sanitize("don't")).toBe('don&#39;t');
  });

  it('/ → &#x2F;', () => {
    expect(sanitize('a/b')).toBe('a&#x2F;b');
  });

  it('` → &#x60;', () => {
    expect(sanitize('back`tick')).toBe('back&#x60;tick');
  });

  it('= → &#x3D;', () => {
    expect(sanitize('a=b')).toBe('a&#x3D;b');
  });

  it('XSS payload tam escape (script tag)', () => {
    const payload = '<script>alert("XSS")</script>';
    const result = sanitize(payload);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('XSS img onerror payload escape', () => {
    const payload = '<img src=x onerror="alert(1)">';
    const result = sanitize(payload);
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
    // Quote da escape edilmiş
    expect(result).toContain('&quot;');
  });

  it('düz Türkçe metin değişmez', () => {
    expect(sanitize('Şanlıurfa Göbeklitepe')).toBe('Şanlıurfa Göbeklitepe');
  });

  it('non-string input → String() coerce', () => {
    expect(sanitize(12345 as any)).toBe('12345');
  });

  it('& zaten escape edilmişse double-escape (idempotent değil)', () => {
    // & ilk char escape edildiği için &amp; → &amp;amp;
    expect(sanitize('&amp;')).toBe('&amp;amp;');
  });
});

describe('sanitizeObj', () => {
  it('string field-ler escape edilir', () => {
    const input = { name: '<b>X</b>', bio: 'a & b' };
    const result = sanitizeObj(input);
    expect(result.name).toBe('&lt;b&gt;X&lt;&#x2F;b&gt;');
    expect(result.bio).toBe('a &amp; b');
  });

  it('non-string field-ler dokunulmaz', () => {
    const input = { age: 25, active: true, tags: ['a', 'b'], meta: { k: 'v' } };
    const result = sanitizeObj(input);
    expect(result.age).toBe(25);
    expect(result.active).toBe(true);
    expect(result.tags).toEqual(['a', 'b']);
    expect(result.meta).toEqual({ k: 'v' });
  });

  it('karışık tipler — sadece string sanitize', () => {
    const input = { name: '<x>', age: 42, link: 'http://a/b' };
    const result = sanitizeObj(input);
    expect(result.name).toBe('&lt;x&gt;');
    expect(result.age).toBe(42);
    expect(result.link).toBe('http:&#x2F;&#x2F;a&#x2F;b');
  });

  it('boş object → boş object', () => {
    expect(sanitizeObj({})).toEqual({});
  });

  it('null değerli field → dokunulmaz (null string değil)', () => {
    const input = { name: null as any };
    expect(sanitizeObj(input).name).toBeNull();
  });
});

describe('sanitizeHtml', () => {
  it('script tag tamamen kaldırılır', () => {
    const input = 'before <script>alert(1)</script> after';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert(1)');
    expect(result).toBe('before  after');
  });

  it('style tag tamamen kaldırılır', () => {
    const input = 'a <style>body{color:red}</style> b';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<style>');
    expect(result).not.toContain('color:red');
  });

  it('default whitelist: b/i/u/br opening tag korunur, text içeriği geçer', () => {
    // Implementation note: closing tags backtracking ile silinir (best-effort whitelist).
    const input = '<b>bold</b> <i>italic</i> <u>under</u> <br>';
    const result = sanitizeHtml(input);
    expect(result).toContain('<b>');
    expect(result).toContain('<i>');
    expect(result).toContain('<u>');
    expect(result).toContain('<br>');
    expect(result).toContain('bold');
    expect(result).toContain('italic');
  });

  it('whitelist dışı tag kaldırılır, text içeriği kalır', () => {
    const input = '<p>para</p> <div>div</div> <b>bold</b>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<p>');
    expect(result).not.toContain('<div>');
    expect(result).toContain('<b>'); // b opening korunur
    expect(result).toContain('bold');
    expect(result).toContain('para'); // text içeriği kalır
    expect(result).toContain('div');
  });

  it('event handler (onclick/onload/onerror) kaldırılır', () => {
    const input = '<b onclick="alert(1)">click</b>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('alert(1)');
  });

  it('multiple event handlers temizlenir', () => {
    const input = '<b onmouseover="x" onclick="y" onfocus="z">hover</b>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('onmouseover');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onfocus');
    expect(result).toContain('hover');
  });

  it('custom whitelist: opening tag korunur, allowlist dışı tag silinir', () => {
    const input = '<p>para</p> <b>bold</b>';
    const result = sanitizeHtml(input, ['p']);
    // Implementation note: closing </p> de regex backtracking ile silinir;
    // bu davranışın test ile dökümantasyonu — opening kept, b/i tags removed.
    expect(result).toContain('<p>');
    expect(result).toContain('para');
    expect(result).toContain('bold');
    expect(result).not.toContain('<b>');
    expect(result).not.toContain('</b>');
  });

  it('non-default whitelist: sadece span kalır', () => {
    const input = '<span>x</span> <p>y</p>';
    const result = sanitizeHtml(input, ['span']);
    expect(result).toContain('<span>');
    expect(result).not.toContain('<p>');
  });

  it('case-insensitive: <SCRIPT> de kaldırılır', () => {
    const input = '<SCRIPT>alert(1)</SCRIPT>';
    expect(sanitizeHtml(input)).not.toContain('alert');
  });

  it('self-closing tag (br) korunur', () => {
    expect(sanitizeHtml('a<br>b')).toContain('<br>');
    expect(sanitizeHtml('a<br/>b')).toContain('<br/>');
  });

  it('düz metin değişmez', () => {
    expect(sanitizeHtml('Sadece düz Türkçe metin')).toBe('Sadece düz Türkçe metin');
  });

  it('XSS img onerror payload — img tag whitelist dışı + onerror temizlenir', () => {
    const input = '<img src="x" onerror="alert(1)">';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<img');
    expect(result).not.toContain('onerror');
  });
});
