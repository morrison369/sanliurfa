import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getPublicAppUrl } from '../public-app-url';

describe('getPublicAppUrl', () => {
  // Snapshot env so each test starts clean.
  const originalEnv = { ...process.env };
  beforeEach(() => {
    delete process.env.PUBLIC_APP_URL;
    delete process.env.SITE_URL;
    delete process.env.PUBLIC_SITE_URL;
  });
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns the canonical production URL when no env vars are set', () => {
    expect(getPublicAppUrl()).toBe('https://sanliurfa.com');
  });

  it('prefers PUBLIC_APP_URL above all other sources', () => {
    process.env.PUBLIC_APP_URL = 'http://localhost:4321';
    process.env.SITE_URL = 'https://staging.example.com';
    process.env.PUBLIC_SITE_URL = 'https://other.example.com';
    expect(getPublicAppUrl()).toBe('http://localhost:4321');
  });

  it('falls back to SITE_URL when PUBLIC_APP_URL is missing', () => {
    process.env.SITE_URL = 'https://staging.sanliurfa.com';
    expect(getPublicAppUrl()).toBe('https://staging.sanliurfa.com');
  });

  it('falls back to PUBLIC_SITE_URL when both PUBLIC_APP_URL and SITE_URL are missing', () => {
    process.env.PUBLIC_SITE_URL = 'https://canary.sanliurfa.com';
    expect(getPublicAppUrl()).toBe('https://canary.sanliurfa.com');
  });

  it('strips trailing slash so callers can safely append paths', () => {
    process.env.PUBLIC_APP_URL = 'https://sanliurfa.com/';
    expect(getPublicAppUrl()).toBe('https://sanliurfa.com');
    expect(`${getPublicAppUrl()}/sifre-sifirla`).toBe('https://sanliurfa.com/sifre-sifirla');
  });
});
