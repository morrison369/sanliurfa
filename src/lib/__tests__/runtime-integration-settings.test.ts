import { describe, expect, it } from 'vitest';
import { isValidAnalyticsId, isValidResendKey } from '../runtime-integration-settings';

describe('runtime integration setting validators', () => {
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
});
