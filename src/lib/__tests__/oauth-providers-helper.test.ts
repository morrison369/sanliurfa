import { describe, it, expect } from 'vitest';
import { OAUTH_PROVIDER_PRESETS } from '../oauth/oauth-providers-helper';

describe('OAUTH_PROVIDER_PRESETS', () => {
  it('exposes exactly the three supported providers', () => {
    expect(Object.keys(OAUTH_PROVIDER_PRESETS).sort()).toEqual(['facebook', 'google', 'twitter']);
  });

  it('every preset has the fields the OAuth library expects', () => {
    for (const [key, preset] of Object.entries(OAUTH_PROVIDER_PRESETS)) {
      expect(preset.provider_key, `${key}.provider_key`).toBe(key);
      expect(preset.provider_name, `${key}.provider_name`).toBeTruthy();
      expect(preset.auth_url, `${key}.auth_url`).toMatch(/^https:\/\//);
      expect(preset.token_url, `${key}.token_url`).toMatch(/^https:\/\//);
      expect(preset.userinfo_url, `${key}.userinfo_url`).toMatch(/^https:\/\//);
      expect(preset.scope, `${key}.scope`).toBeTruthy();
    }
  });

  it('uses Google OAuth 2.0 endpoints with openid scope', () => {
    const g = OAUTH_PROVIDER_PRESETS.google;
    expect(g.auth_url).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(g.token_url).toBe('https://oauth2.googleapis.com/token');
    expect(g.scope).toContain('openid');
    expect(g.scope).toContain('email');
  });

  it('uses Facebook v18 Graph API endpoints', () => {
    const f = OAUTH_PROVIDER_PRESETS.facebook;
    expect(f.auth_url).toContain('facebook.com/v18.0');
    expect(f.token_url).toContain('graph.facebook.com/v18.0');
    expect(f.scope).toContain('email');
  });

  it('uses Twitter OAuth 2.0 with PKCE-compatible scopes', () => {
    const t = OAUTH_PROVIDER_PRESETS.twitter;
    expect(t.auth_url).toContain('twitter.com/i/oauth2/authorize');
    expect(t.token_url).toBe('https://api.twitter.com/2/oauth2/token');
    expect(t.scope).toContain('users.read');
  });
});
