import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isValidAnalyticsId,
  isValidResendKey,
  verifyRuntimeIntegrationSettings
} from '../runtime-integration-settings';

describe('runtime integration setting validators', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('accepts valid resend key', () => {
    expect(isValidResendKey('re_liveabc123')).toBe(true);
  });

  it('rejects resend placeholders and malformed keys', () => {
    expect(isValidResendKey('re_xxxxx')).toBe(false);
    expect(isValidResendKey('your_resend_key')).toBe(false);
    expect(isValidResendKey('invalid')).toBe(false);
  });

  it('accepts valid analytics id', () => {
    expect(isValidAnalyticsId('G-ABC123XYZ')).toBe(true);
  });

  it('rejects analytics placeholders and malformed ids', () => {
    expect(isValidAnalyticsId('G-XXXXXXXXXX')).toBe(false);
    expect(isValidAnalyticsId('your_analytics_id')).toBe(false);
    expect(isValidAnalyticsId('UA-12345')).toBe(false);
    expect(isValidAnalyticsId('g-abc123')).toBe(true);
  });

  it('returns verified summary when resend provider check succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200
      })
    );

    const result = await verifyRuntimeIntegrationSettings({
      resendApiKey: 're_liveabc123',
      analyticsId: 'G-ABC123XYZ',
      source: {
        resendApiKey: 'admin',
        analyticsId: 'admin'
      }
    });

    expect(result.resend.status).toBe('verified');
    expect(result.analytics.status).toBe('verified');
    expect(result.summary.healthy).toBe(true);
  });

  it('returns invalid or not_configured statuses for missing integrations', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401
      })
    );

    const invalidResult = await verifyRuntimeIntegrationSettings({
      resendApiKey: 're_liveabc123',
      analyticsId: '',
      source: {
        resendApiKey: 'admin',
        analyticsId: 'none'
      }
    });

    expect(invalidResult.resend.status).toBe('invalid');
    expect(invalidResult.analytics.status).toBe('not_configured');
    expect(invalidResult.summary.healthy).toBe(false);
  });
});
