/**
 * Unit Tests - social/auth.ts OAuth provider getAuthUrl URL builders
 *
 * - GoogleAuth.getAuthUrl (response_type=code + scope openid email profile + access_type=offline)
 * - FacebookAuth.getAuthUrl (scope email,public_profile + response_type=code)
 * - TwitterAuth.getAuthUrl (scope tweet.read users.read + state + code_challenge)
 *
 * Provider singletons env-driven; test only checks URL structure when available,
 * skips gracefully if env not configured.
 */

import { describe, it, expect } from 'vitest';
import { googleAuth, facebookAuth, twitterAuth } from '../social/auth';

describe('GoogleAuth.getAuthUrl', () => {
  it('Google OAuth URL prefix + required params', () => {
    if (!googleAuth) {
      // env yok, skip
      expect(googleAuth).toBeNull();
      return;
    }
    const url = googleAuth.getAuthUrl();
    expect(url.startsWith('https://accounts.google.com/o/oauth2/v2/auth?')).toBe(true);
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=openid+email+profile');
    expect(url).toContain('access_type=offline');
    expect(url).toContain('prompt=consent');
  });

  it('redirect_uri is present', () => {
    if (!googleAuth) return;
    const url = googleAuth.getAuthUrl();
    expect(url).toContain('redirect_uri=');
    expect(url).toContain('%2Fapi%2Fauth%2Fgoogle%2Fcallback');
  });
});

describe('FacebookAuth.getAuthUrl', () => {
  it('Facebook OAuth URL prefix + required params', () => {
    if (!facebookAuth) {
      expect(facebookAuth).toBeNull();
      return;
    }
    const url = facebookAuth.getAuthUrl();
    expect(url.startsWith('https://www.facebook.com/v18.0/dialog/oauth?')).toBe(true);
    expect(url).toContain('response_type=code');
    expect(url).toContain('scope=email%2Cpublic_profile');
  });

  it('redirect_uri /api/auth/facebook/callback', () => {
    if (!facebookAuth) return;
    const url = facebookAuth.getAuthUrl();
    expect(url).toContain('%2Fapi%2Fauth%2Ffacebook%2Fcallback');
  });
});

describe('TwitterAuth.getAuthUrl', () => {
  it('Twitter OAuth 2.0 URL + state + code_challenge', () => {
    if (!twitterAuth) {
      expect(twitterAuth).toBeNull();
      return;
    }
    const url = twitterAuth.getAuthUrl('test-state');
    expect(url.startsWith('https://twitter.com/i/oauth2/authorize?')).toBe(true);
    expect(url).toContain('state=test-state');
    expect(url).toContain('code_challenge=');
    expect(url).toContain('code_challenge_method=plain');
  });

  it('scope tweet.read + users.read', () => {
    if (!twitterAuth) return;
    const url = twitterAuth.getAuthUrl('s');
    expect(url).toContain('scope=tweet.read+users.read');
  });
});

describe('OAuth provider singleton env-driven instantiation', () => {
  it('googleAuth - GOOGLE_CLIENT_ID env-driven (null if no env)', () => {
    if (process.env.GOOGLE_CLIENT_ID) {
      expect(googleAuth).not.toBeNull();
    } else {
      expect(googleAuth).toBeNull();
    }
  });

  it('facebookAuth - FACEBOOK_APP_ID env-driven', () => {
    if (process.env.FACEBOOK_APP_ID) {
      expect(facebookAuth).not.toBeNull();
    } else {
      expect(facebookAuth).toBeNull();
    }
  });

  it('twitterAuth - TWITTER_CLIENT_ID env-driven', () => {
    if (process.env.TWITTER_CLIENT_ID) {
      expect(twitterAuth).not.toBeNull();
    } else {
      expect(twitterAuth).toBeNull();
    }
  });
});
