import { describe, it, expect } from 'vitest';
import {
  escapeHTML,
  stripHTML,
  sanitizeURL,
  sanitizeEmail,
  sanitizeSlug,
  validateLength,
} from '../xss';

describe('XSS Protection', () => {
  describe('escapeHTML', () => {
    it('should escape HTML tags', () => {
      expect(escapeHTML('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
    });

    it('should escape ampersands', () => {
      expect(escapeHTML('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should handle empty strings', () => {
      expect(escapeHTML('')).toBe('');
    });
  });

  describe('stripHTML', () => {
    it('should remove HTML tags', () => {
      expect(stripHTML('<p>Hello <strong>World</strong></p>')).toBe('Hello World');
    });

    it('should handle nested tags', () => {
      expect(stripHTML('<div><p>Text</p></div>')).toBe('Text');
    });

    it('should handle empty strings', () => {
      expect(stripHTML('')).toBe('');
    });
  });

  describe('sanitizeURL', () => {
    it('should allow valid HTTP URLs', () => {
      expect(sanitizeURL('http://example.com')).toBe('http://example.com/');
    });

    it('should allow valid HTTPS URLs', () => {
      expect(sanitizeURL('https://example.com/path')).toBe('https://example.com/path');
    });

    it('should add https:// to URLs without protocol', () => {
      expect(sanitizeURL('example.com')).toBe('https://example.com/');
    });

    it('should reject javascript: URLs', () => {
      expect(sanitizeURL('javascript:alert("xss")')).toBe('');
    });

    it('should reject data: URLs', () => {
      expect(sanitizeURL('data:text/html,<script>alert("xss")</script>')).toBe('');
    });
  });

  describe('sanitizeEmail', () => {
    it('should validate correct emails', () => {
      expect(sanitizeEmail('user@example.com')).toBe('user@example.com');
    });

    it('should lowercase emails', () => {
      expect(sanitizeEmail('User@Example.COM')).toBe('user@example.com');
    });

    it('should trim whitespace', () => {
      expect(sanitizeEmail('  user@example.com  ')).toBe('user@example.com');
    });

    it('should reject invalid emails', () => {
      expect(sanitizeEmail('not-an-email')).toBe('');
      expect(sanitizeEmail('@example.com')).toBe('');
      expect(sanitizeEmail('user@')).toBe('');
    });
  });

  describe('sanitizeSlug', () => {
    it('should convert to lowercase', () => {
      expect(sanitizeSlug('HelloWorld')).toBe('helloworld');
    });

    it('should replace spaces with hyphens', () => {
      expect(sanitizeSlug('hello world')).toBe('hello-world');
    });

    it('should replace special characters with hyphens', () => {
      // Special characters are replaced with hyphens and trailing hyphens are removed
      expect(sanitizeSlug('hello@world!')).toBe('hello-world');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(sanitizeSlug('-hello-world-')).toBe('hello-world');
    });

    it('should collapse multiple hyphens', () => {
      expect(sanitizeSlug('hello---world')).toBe('hello-world');
    });
  });

  describe('validateLength', () => {
    it('should validate string within range', () => {
      const result = validateLength('hello', 3, 10);
      expect(result.valid).toBe(true);
    });

    it('should reject string too short', () => {
      const result = validateLength('hi', 3, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Minimum');
    });

    it('should reject string too long', () => {
      const result = validateLength('hello world this is too long', 3, 10);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Maximum');
    });

    it('should handle empty string', () => {
      const result = validateLength('', 1, 10);
      expect(result.valid).toBe(false);
    });
  });
});
