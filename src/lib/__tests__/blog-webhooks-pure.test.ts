/**
 * Unit Tests - blog/blog-webhooks.ts pure helpers + signature
 *
 * - listWebhooks (REGISTERED_WEBHOOKS shallow copy)
 * - unregisterWebhook (array splice + true/false)
 * - registerWebhook (validateExternalUrl güvensiz URL → false; güvenli URL → true)
 * - WebhookEvent type structure
 *
 * vi.mock node:crypto + safe-url + global fetch için partial.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { validateMock } = vi.hoisted(() => ({ validateMock: vi.fn() }));

vi.mock('../security/safe-url', () => ({
  validateExternalUrl: validateMock,
}));

const originalFetch = global.fetch;

beforeEach(() => {
  validateMock.mockReset();
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
  } as any);
  process.env.BLOG_WEBHOOK_SECRET = 'test-secret';
});

afterEach(() => {
  global.fetch = originalFetch;
});

import {
  listWebhooks,
  unregisterWebhook,
  registerWebhook,
} from '../blog/blog-webhooks';

describe('listWebhooks', () => {
  it('return array (initial empty if no env)', () => {
    const r = listWebhooks();
    expect(Array.isArray(r)).toBe(true);
  });

  it('shallow copy (mutating result does not affect internal)', () => {
    const r1 = listWebhooks();
    r1.push('https://malicious.com/webhook');
    const r2 = listWebhooks();
    // r2 should not contain the malicious URL added to r1's copy
    expect(r2).not.toContain('https://malicious.com/webhook');
  });
});

describe('unregisterWebhook', () => {
  it('bilinmeyen URL → false', () => {
    expect(unregisterWebhook('https://non-existent.com/webhook')).toBe(false);
  });

  it('kayıtlı URL → true + listWebhooks\'tan çıkarılır', async () => {
    validateMock.mockReturnValue({ ok: true });
    const url = 'https://hook.example.com/safe';
    await registerWebhook(url);
    expect(listWebhooks()).toContain(url);
    expect(unregisterWebhook(url)).toBe(true);
    expect(listWebhooks()).not.toContain(url);
  });
});

describe('registerWebhook', () => {
  it('validateExternalUrl güvensiz → false (no register)', async () => {
    validateMock.mockReturnValue({ ok: false, reason: 'private IP' });
    const r = await registerWebhook('http://10.0.0.1/webhook');
    expect(r).toBe(false);
    expect(listWebhooks()).not.toContain('http://10.0.0.1/webhook');
  });

  it('validateExternalUrl güvenli → true + listWebhooks içinde', async () => {
    validateMock.mockReturnValue({ ok: true });
    const url = 'https://safe.example.com/webhook';
    const r = await registerWebhook(url);
    expect(r).toBe(true);
    expect(listWebhooks()).toContain(url);
    // cleanup
    unregisterWebhook(url);
  });

  it('register sonrası test webhook gönderilir (fetch çağrılır)', async () => {
    validateMock.mockReturnValue({ ok: true });
    const url = 'https://fetch-test.example.com/hook';
    await registerWebhook(url);
    expect(global.fetch).toHaveBeenCalled();
    unregisterWebhook(url);
  });
});
