/**
 * Unit tests for `safeRedirectTarget()` — HARD RULE #32 helper.
 *
 * Validates that user-controlled redirect targets cannot escape the application's
 * origin (open redirect mitigation).
 */

import { describe, it, expect } from 'vitest';
import { safeRedirectTarget } from '../auth/safe-redirect';

describe('safeRedirectTarget()', () => {
  describe('safe inputs (returns as-is)', () => {
    it('accepts root path', () => {
      expect(safeRedirectTarget('/')).toBe('/');
    });

    it('accepts simple path', () => {
      expect(safeRedirectTarget('/profil')).toBe('/profil');
    });

    it('accepts deep path with query string', () => {
      expect(safeRedirectTarget('/admin/blog?status=published')).toBe('/admin/blog?status=published');
    });

    it('accepts path with hash fragment', () => {
      expect(safeRedirectTarget('/blog/post-1#yorum-3')).toBe('/blog/post-1#yorum-3');
    });

    it('accepts path with encoded chars', () => {
      expect(safeRedirectTarget('/mekan/g%C3%B6bekli-tepe')).toBe('/mekan/g%C3%B6bekli-tepe');
    });
  });

  describe('falsy / invalid inputs (returns fallback)', () => {
    it('returns default fallback for null', () => {
      expect(safeRedirectTarget(null)).toBe('/');
    });

    it('returns default fallback for undefined', () => {
      expect(safeRedirectTarget(undefined)).toBe('/');
    });

    it('returns default fallback for empty string', () => {
      expect(safeRedirectTarget('')).toBe('/');
    });

    it('respects custom fallback', () => {
      expect(safeRedirectTarget(null, '/giris')).toBe('/giris');
      expect(safeRedirectTarget('', '/profil')).toBe('/profil');
    });
  });

  describe('open redirect attacks (rejected)', () => {
    it('rejects absolute http URL', () => {
      expect(safeRedirectTarget('http://evil.com/path')).toBe('/');
    });

    it('rejects absolute https URL', () => {
      expect(safeRedirectTarget('https://evil.com/phish')).toBe('/');
    });

    it('rejects protocol-relative URL', () => {
      expect(safeRedirectTarget('//evil.com/x')).toBe('/');
    });

    it('rejects backslash-tricked protocol-relative URL', () => {
      // Some browsers normalize `/\evil.com` → `//evil.com`
      expect(safeRedirectTarget('/\\evil.com/path')).toBe('/');
    });

    it('rejects javascript: URI', () => {
      expect(safeRedirectTarget('javascript:alert(1)')).toBe('/');
    });

    it('rejects data: URI', () => {
      expect(safeRedirectTarget('data:text/html,<script>alert(1)</script>')).toBe('/');
    });

    it('rejects relative path without leading slash', () => {
      // `../admin` could escape via redirect normalization
      expect(safeRedirectTarget('../admin')).toBe('/');
      expect(safeRedirectTarget('admin/dashboard')).toBe('/');
    });
  });

  describe('CRLF injection (header smuggling)', () => {
    it('rejects path with carriage return', () => {
      expect(safeRedirectTarget('/path\r\nSet-Cookie: evil=1')).toBe('/');
    });

    it('rejects path with line feed', () => {
      expect(safeRedirectTarget('/path\nLocation: https://evil.com')).toBe('/');
    });

    it('rejects path with null byte', () => {
      expect(safeRedirectTarget('/path\0/etc/passwd')).toBe('/');
    });
  });
});
