/**
 * Unit Tests — getValidatedBody, validators, sanitizeInput, getRequestId
 *
 * Input/output sanitization helpers used across all API endpoints.
 */

import { describe, it, expect } from 'vitest';
import { getValidatedBody, validators, sanitizeInput, getRequestId } from '../api';

describe('getValidatedBody', () => {
  it('parses valid JSON body', async () => {
    const req = new Request('http://test.local', {
      method: 'POST',
      body: JSON.stringify({ name: 'X', age: 30 }),
    });
    const result = await getValidatedBody(req);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: 'X', age: 30 });
  });

  it('returns error for invalid JSON', async () => {
    const req = new Request('http://test.local', { method: 'POST', body: '{invalid' });
    const result = await getValidatedBody(req);
    expect(result.error).toBe('Invalid JSON');
    expect(result.data).toBeNull();
  });

  it('returns error for empty body', async () => {
    const req = new Request('http://test.local', { method: 'POST', body: '' });
    const result = await getValidatedBody(req);
    expect(result.error).toBe('Invalid JSON');
    expect(result.data).toBeNull();
  });

  it('runs validator and passes if valid', async () => {
    const req = new Request('http://test.local', {
      method: 'POST',
      body: JSON.stringify({ email: 'a@b.co' }),
    });
    const result = await getValidatedBody<{ email: string }>(req, (data) =>
      typeof data.email === 'string' ? data : null,
    );
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ email: 'a@b.co' });
  });

  it('returns "Validation failed" if validator returns null', async () => {
    const req = new Request('http://test.local', {
      method: 'POST',
      body: JSON.stringify({ email: 123 }),
    });
    const result = await getValidatedBody(req, () => null);
    expect(result.error).toBe('Validation failed');
    expect(result.data).toBeNull();
  });
});

describe('validators.email', () => {
  it('accepts simple valid emails', () => {
    expect(validators.email('a@b.co')).toBe(true);
    expect(validators.email('user.name+tag@example.com')).toBe(true);
  });

  it('rejects missing @', () => {
    expect(validators.email('not-email')).toBe(false);
    expect(validators.email('user.example.com')).toBe(false);
  });

  it('rejects missing domain TLD', () => {
    expect(validators.email('a@b')).toBe(false);
  });

  it('rejects whitespace', () => {
    expect(validators.email('a @b.co')).toBe(false);
    expect(validators.email('a@b .co')).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(validators.email(null)).toBe(false);
    expect(validators.email(undefined)).toBe(false);
    expect(validators.email(123)).toBe(false);
    expect(validators.email({})).toBe(false);
  });

  it('rejects empty string', () => {
    expect(validators.email('')).toBe(false);
  });
});

describe('validators.string', () => {
  it('accepts string within length range', () => {
    expect(validators.string('hello', 1, 10)).toBe(true);
    expect(validators.string('a', 1, 100)).toBe(true);
  });

  it('uses defaults (min=1, max=255)', () => {
    expect(validators.string('valid')).toBe(true);
    expect(validators.string('')).toBe(false); // below min=1
    expect(validators.string('x'.repeat(256))).toBe(false); // above max=255
  });

  it('rejects when shorter than min', () => {
    expect(validators.string('ab', 5, 10)).toBe(false);
  });

  it('rejects when longer than max', () => {
    expect(validators.string('abcdef', 1, 5)).toBe(false);
  });

  it('exact boundary inclusive', () => {
    expect(validators.string('abc', 3, 3)).toBe(true);
    expect(validators.string('abcd', 3, 3)).toBe(false);
  });

  it('rejects non-string types', () => {
    expect(validators.string(null)).toBe(false);
    expect(validators.string(123)).toBe(false);
    expect(validators.string({})).toBe(false);
  });
});

describe('validators.number', () => {
  it('accepts number without bounds', () => {
    expect(validators.number(42)).toBe(true);
    expect(validators.number(0)).toBe(true);
    expect(validators.number(-100)).toBe(true);
  });

  it('respects min bound', () => {
    expect(validators.number(5, 1)).toBe(true);
    expect(validators.number(0, 1)).toBe(false);
  });

  it('respects max bound', () => {
    expect(validators.number(5, 0, 10)).toBe(true);
    expect(validators.number(15, 0, 10)).toBe(false);
  });

  it('rejects NaN (Number.isFinite guard)', () => {
    expect(validators.number(NaN)).toBe(false);
    expect(validators.number(NaN, 0, 10)).toBe(false);
  });

  it('rejects Infinity / -Infinity', () => {
    expect(validators.number(Infinity)).toBe(false);
    expect(validators.number(-Infinity, -100, 100)).toBe(false);
  });

  it('rejects non-number types', () => {
    expect(validators.number('5')).toBe(false);
    expect(validators.number(null)).toBe(false);
    expect(validators.number(undefined)).toBe(false);
  });

  it('exact boundary inclusive', () => {
    expect(validators.number(5, 5, 5)).toBe(true);
    expect(validators.number(4, 5, 5)).toBe(false);
  });
});

describe('validators.uuid', () => {
  it('accepts valid UUID v4', () => {
    expect(validators.uuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
  });

  it('accepts valid UUID v1', () => {
    expect(validators.uuid('a8098c1a-f86e-11da-bd1a-00112444be1e')).toBe(true);
  });

  it('case insensitive', () => {
    expect(validators.uuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true);
  });

  it('rejects malformed UUIDs', () => {
    expect(validators.uuid('not-a-uuid')).toBe(false);
    expect(validators.uuid('550e8400-e29b-41d4-a716')).toBe(false); // too short
    expect(validators.uuid('550e8400e29b41d4a716446655440000')).toBe(false); // no dashes
  });

  it('rejects non-string types', () => {
    expect(validators.uuid(123)).toBe(false);
    expect(validators.uuid(null)).toBe(false);
  });
});

describe('validators.required', () => {
  it('accepts truthy values', () => {
    expect(validators.required('value')).toBe(true);
    expect(validators.required(0)).toBe(true);
    expect(validators.required(false)).toBe(true);
    expect(validators.required([])).toBe(true);
    expect(validators.required({})).toBe(true);
  });

  it('rejects null/undefined/empty string', () => {
    expect(validators.required(null)).toBe(false);
    expect(validators.required(undefined)).toBe(false);
    expect(validators.required('')).toBe(false);
  });
});

describe('sanitizeInput (XSS escape)', () => {
  it('escapes HTML entities', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;',
    );
  });

  it('escapes ampersand first (order matters)', () => {
    expect(sanitizeInput('Tom & Jerry')).toBe('Tom &amp; Jerry');
    // & escape doesn't double-escape already-escaped entities (current behavior)
    expect(sanitizeInput('&amp;')).toBe('&amp;amp;');
  });

  it('escapes quotes', () => {
    expect(sanitizeInput(`"hello"`)).toBe('&quot;hello&quot;');
    expect(sanitizeInput(`'hello'`)).toBe('&#x27;hello&#x27;');
  });

  it('trims whitespace', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello');
  });

  it('returns empty string for non-string input', () => {
    expect(sanitizeInput(null as any)).toBe('');
    expect(sanitizeInput(undefined as any)).toBe('');
    expect(sanitizeInput(123 as any)).toBe('');
    expect(sanitizeInput({} as any)).toBe('');
  });

  it('handles empty string', () => {
    expect(sanitizeInput('')).toBe('');
  });

  it('preserves safe text', () => {
    expect(sanitizeInput('Hello World')).toBe('Hello World');
    expect(sanitizeInput('user_123-abc')).toBe('user_123-abc');
  });
});

describe('getRequestId', () => {
  it('extracts x-request-id header from Request', () => {
    const req = new Request('http://test.local', {
      headers: { 'x-request-id': 'custom-req-123' },
    });
    expect(getRequestId(req)).toBe('custom-req-123');
  });

  it('generates ID when no header (req- prefix + timestamp + hex)', () => {
    const req = new Request('http://test.local');
    const id = getRequestId(req);
    expect(id).toMatch(/^req-\d+-[0-9a-f]{12}$/);
  });

  it('generates ID when no request passed', () => {
    const id = getRequestId();
    expect(id).toMatch(/^req-\d+-[0-9a-f]{12}$/);
  });

  it('extracts header from APIContext-like object', () => {
    const req = new Request('http://test.local', {
      headers: { 'x-request-id': 'ctx-456' },
    });
    const ctx = { request: req };
    expect(getRequestId(ctx)).toBe('ctx-456');
  });

  it('handles null context', () => {
    const id = getRequestId(null);
    expect(id).toMatch(/^req-\d+-[0-9a-f]{12}$/);
  });

  it('generates unique IDs across calls', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(getRequestId());
    // 50 random IDs should be unique (cryptographically generated hex)
    expect(ids.size).toBe(50);
  });
});
