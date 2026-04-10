import { describe, expect, it } from 'vitest';
import { AppError, ensureUuid, parseBoundedInt, parseJsonBody } from '../api';

describe('api contract utils', () => {
  it('parses bounded integers with defaults and max clamp', () => {
    expect(parseBoundedInt(null, { defaultValue: 50, min: 1, max: 100 })).toBe(50);
    expect(parseBoundedInt('200', { defaultValue: 50, min: 1, max: 100 })).toBe(100);
    expect(parseBoundedInt('12', { defaultValue: 50, min: 1, max: 100 })).toBe(12);
    expect(parseBoundedInt('0', { defaultValue: 50, min: 1, max: 100 })).toBeNull();
  });

  it('parses json body with content-type guard', async () => {
    const badContentTypeReq = new Request('https://example.com', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hello'
    });
    const badJsonReq = new Request('https://example.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{bad-json'
    });
    const validReq = new Request('https://example.com', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: true })
    });

    expect((await parseJsonBody(badContentTypeReq)).error).toBe('UNSUPPORTED_CONTENT_TYPE');
    expect((await parseJsonBody(badJsonReq)).error).toBe('INVALID_JSON');
    expect((await parseJsonBody(validReq)).body).toEqual({ ok: true });
  });

  it('throws AppError for invalid UUID', () => {
    expect(() => ensureUuid('not-a-uuid', 'id')).toThrow(AppError);
    expect(ensureUuid('11111111-1111-1111-1111-111111111111', 'id')).toBe('11111111-1111-1111-1111-111111111111');
  });
});
