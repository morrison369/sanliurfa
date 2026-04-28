import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { verifyInternalToken } from '../auth/internal-token';

function mkRequest(authHeader?: string): Request {
  const headers = new Headers();
  if (authHeader !== undefined) headers.set('authorization', authHeader);
  return new Request('http://localhost/api/x', { method: 'POST', headers });
}

describe('verifyInternalToken', () => {
  const originalInternal = process.env.INTERNAL_API_TOKEN;
  const originalMetrics = process.env.METRICS_API_TOKEN;

  beforeEach(() => {
    delete process.env.INTERNAL_API_TOKEN;
    delete process.env.METRICS_API_TOKEN;
  });

  afterEach(() => {
    if (originalInternal !== undefined) process.env.INTERNAL_API_TOKEN = originalInternal;
    else delete process.env.INTERNAL_API_TOKEN;
    if (originalMetrics !== undefined) process.env.METRICS_API_TOKEN = originalMetrics;
    else delete process.env.METRICS_API_TOKEN;
  });

  it('rejects when authorization header is missing', () => {
    process.env.INTERNAL_API_TOKEN = 'secret';
    const result = verifyInternalToken(mkRequest());
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('missing_header');
  });

  it('rejects when header lacks Bearer prefix', () => {
    process.env.INTERNAL_API_TOKEN = 'secret';
    const result = verifyInternalToken(mkRequest('secret'));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('invalid_format');
  });

  it('rejects when no token is configured (security-by-default)', () => {
    const result = verifyInternalToken(mkRequest('Bearer anything'));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no_token_configured');
  });

  it('rejects when configured token is empty string', () => {
    process.env.INTERNAL_API_TOKEN = '   ';
    const result = verifyInternalToken(mkRequest('Bearer something'));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('no_token_configured');
  });

  it('rejects token mismatch', () => {
    process.env.INTERNAL_API_TOKEN = 'real-secret';
    const result = verifyInternalToken(mkRequest('Bearer wrong-secret'));
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('token_mismatch');
  });

  it('accepts matching INTERNAL_API_TOKEN', () => {
    process.env.INTERNAL_API_TOKEN = 'real-secret';
    const result = verifyInternalToken(mkRequest('Bearer real-secret'));
    expect(result.ok).toBe(true);
  });

  it('accepts legacy METRICS_API_TOKEN as fallback', () => {
    process.env.METRICS_API_TOKEN = 'legacy-secret';
    const result = verifyInternalToken(mkRequest('Bearer legacy-secret'));
    expect(result.ok).toBe(true);
  });

  it('prefers INTERNAL_API_TOKEN over METRICS_API_TOKEN when both set', () => {
    process.env.INTERNAL_API_TOKEN = 'new-token';
    process.env.METRICS_API_TOKEN = 'old-token';
    const matchNew = verifyInternalToken(mkRequest('Bearer new-token'));
    const matchOld = verifyInternalToken(mkRequest('Bearer old-token'));
    expect(matchNew.ok).toBe(true);
    expect(matchOld.ok).toBe(false);
    expect(matchOld.reason).toBe('token_mismatch');
  });

  it('strips trailing whitespace from provided token', () => {
    process.env.INTERNAL_API_TOKEN = 'real-secret';
    const result = verifyInternalToken(mkRequest('Bearer real-secret  '));
    expect(result.ok).toBe(true);
  });
});
