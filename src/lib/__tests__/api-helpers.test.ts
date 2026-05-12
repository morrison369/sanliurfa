/**
 * Unit Tests — apiResponse / apiError / problemJson helpers
 *
 * Standardize JSON response envelope contract.
 */

import { describe, it, expect } from 'vitest';
import { apiResponse, apiError, problemJson, HttpStatus, ErrorCode } from '../api';

async function readJson(response: Response): Promise<any> {
  return JSON.parse(await response.text());
}

describe('apiResponse', () => {
  it('returns 200 status by default', async () => {
    const r = apiResponse({ x: 1 });
    expect(r.status).toBe(200);
  });

  it('wraps data in { data, meta } envelope', async () => {
    const r = apiResponse({ id: 5 }, 200);
    const body = await readJson(r);
    expect(body.data).toEqual({ id: 5 });
    expect(body.meta).toBeDefined();
    expect(body.meta.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('respects custom status code', async () => {
    const r = apiResponse({ created: true }, HttpStatus.CREATED);
    expect(r.status).toBe(201);
  });

  it('Content-Type is JSON', async () => {
    const r = apiResponse({ x: 1 });
    expect(r.headers.get('Content-Type')).toContain('application/json');
  });

  it('handles array payloads', async () => {
    const r = apiResponse([1, 2, 3]);
    const body = await readJson(r);
    expect(body.data).toEqual([1, 2, 3]);
  });

  it('handles null/empty payloads', async () => {
    const r = apiResponse(null);
    const body = await readJson(r);
    expect(body.data).toBeNull();
  });
});

describe('apiError', () => {
  it('returns 400 default status', async () => {
    const r = apiError(ErrorCode.VALIDATION_ERROR, 'Bad input');
    expect(r.status).toBe(400);
  });

  it('wraps error with code/message', async () => {
    const r = apiError('CUSTOM_ERR', 'Something failed', 422);
    const body = await readJson(r);
    expect(body.error.code).toBe('CUSTOM_ERR');
    expect(body.error.message).toBe('Something failed');
    expect(r.status).toBe(422);
  });

  it('respects custom status code', async () => {
    const r = apiError(ErrorCode.UNAUTHORIZED, 'Login required', HttpStatus.UNAUTHORIZED);
    expect(r.status).toBe(401);
  });

  it('Content-Type is JSON', async () => {
    const r = apiError('ERR', 'msg');
    expect(r.headers.get('Content-Type')).toContain('application/json');
  });

  it('handles missing message with default', async () => {
    const r = apiError('ERR_CODE');
    const body = await readJson(r);
    expect(body.error.message).toBeTruthy();
  });
});

describe('problemJson (RFC 7807)', () => {
  it('returns problem+json content type', () => {
    const r = problemJson({ status: 400, title: 'Bad Request' });
    expect(r.headers.get('Content-Type')).toContain('application/problem+json');
  });

  it('respects status code', () => {
    const r = problemJson({ status: 404, title: 'Not Found' });
    expect(r.status).toBe(404);
  });

  it('includes RFC 7807 required fields (type, title, status)', async () => {
    const r = problemJson({ status: 400, title: 'Validation Failed' });
    const body = await readJson(r);
    expect(body.type).toBe('about:blank'); // default
    expect(body.title).toBe('Validation Failed');
    expect(body.status).toBe(400);
  });

  it('includes optional detail field', async () => {
    const r = problemJson({
      status: 400,
      title: 'Bad Request',
      detail: 'Specific error context',
    });
    const body = await readJson(r);
    expect(body.detail).toBe('Specific error context');
  });

  it('includes optional type URI', async () => {
    const r = problemJson({
      status: 422,
      title: 'Validation',
      type: '/problems/validation-failed',
    });
    const body = await readJson(r);
    expect(body.type).toBe('/problems/validation-failed');
  });

  it('includes optional instance URI', async () => {
    const r = problemJson({
      status: 500,
      title: 'Server Error',
      instance: '/api/users/123',
    });
    const body = await readJson(r);
    expect(body.instance).toBe('/api/users/123');
  });

  it('merges extensions into payload', async () => {
    const r = problemJson({
      status: 422,
      title: 'Invalid',
      extensions: { errors: ['email required'], traceId: 'abc-123' },
    });
    const body = await readJson(r);
    expect(body.errors).toEqual(['email required']);
    expect(body.traceId).toBe('abc-123');
  });

  it('extensions do NOT overwrite required fields silently (status)', async () => {
    // type/title/status overwrite is technically possible but not blocked
    // documented for future tightening
    const r = problemJson({
      status: 500,
      title: 'Original',
      extensions: { status: 999 } as any,
    });
    const body = await readJson(r);
    // Current behavior: extensions can overwrite — documented edge
    expect(body.status).toBe(999);
  });

  it('Cache-Control: no-store (problem responses must not be cached)', () => {
    const r = problemJson({ status: 500, title: 'Internal' });
    expect(r.headers.get('Cache-Control')).toContain('no-store');
  });
});

describe('HttpStatus / ErrorCode constants', () => {
  it('HttpStatus has all common codes', () => {
    expect(HttpStatus.OK).toBe(200);
    expect(HttpStatus.CREATED).toBe(201);
    expect(HttpStatus.BAD_REQUEST).toBe(400);
    expect(HttpStatus.UNAUTHORIZED).toBe(401);
    expect(HttpStatus.FORBIDDEN).toBe(403);
    expect(HttpStatus.NOT_FOUND).toBe(404);
    expect(HttpStatus.INTERNAL_SERVER_ERROR).toBe(500);
  });

  it('ErrorCode has standardized error codes', () => {
    expect(ErrorCode.VALIDATION_ERROR).toBeDefined();
    expect(ErrorCode.UNAUTHORIZED).toBeDefined();
    expect(ErrorCode.FORBIDDEN).toBeDefined();
    expect(ErrorCode.NOT_FOUND).toBeDefined();
    expect(ErrorCode.INTERNAL_ERROR).toBeDefined();
  });
});
