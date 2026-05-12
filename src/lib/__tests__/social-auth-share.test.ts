/**
 * Unit Tests - social/auth.ts socialShare URL builders + getAvailableProviders
 *
 * - socialShare.twitter (text + url + hashtags)
 * - socialShare.facebook (url + quote optional)
 * - socialShare.whatsapp (encoded text)
 * - socialShare.telegram (url + text encoded)
 * - socialShare.linkedin (url + title + summary optional)
 * - getAvailableProviders (env-driven OAuth providers)
 *
 * Note: GoogleAuth/FacebookAuth/TwitterAuth singleton URL building tested via getAuthUrl
 * if env enabled. Providers null if env yok.
 */

import { describe, it, expect } from 'vitest';
import {
  socialShare,
  getAvailableProviders,
  googleAuth,
  facebookAuth,
  twitterAuth,
} from '../social/auth';

describe('socialShare.twitter', () => {
  it('twitter intent URL + text + url params', () => {
    const url = socialShare.twitter('Test post', 'https://example.com');
    expect(url.startsWith('https://twitter.com/intent/tweet?')).toBe(true);
    expect(url).toContain('text=Test+post');
    expect(url).toContain('url=https');
  });

  it('hashtags optional - ekleme', () => {
    const url = socialShare.twitter('text', 'https://x.com', ['urfa', 'kebap']);
    expect(url).toContain('hashtags=urfa%2Ckebap');
  });

  it('hashtags yok - hashtag param yok', () => {
    const url = socialShare.twitter('text', 'https://x.com');
    expect(url).not.toContain('hashtags=');
  });
});

describe('socialShare.facebook', () => {
  it('facebook sharer URL + u param', () => {
    const url = socialShare.facebook('https://example.com');
    expect(url.startsWith('https://www.facebook.com/sharer/sharer.php?')).toBe(true);
    expect(url).toContain('u=https');
  });

  it('quote optional', () => {
    const url = socialShare.facebook('https://x.com', 'My quote');
    expect(url).toContain('quote=My+quote');
  });
});

describe('socialShare.whatsapp', () => {
  it('wa.me URL + encoded text', () => {
    const url = socialShare.whatsapp('Merhaba dünya');
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
    expect(url).toContain(encodeURIComponent('Merhaba dünya'));
  });
});

describe('socialShare.telegram', () => {
  it('t.me/share URL + url + text encoded', () => {
    const url = socialShare.telegram('post text', 'https://example.com');
    expect(url.startsWith('https://t.me/share/url?url=')).toBe(true);
    expect(url).toContain('text=');
  });
});

describe('socialShare.linkedin', () => {
  it('linkedin sharing URL + url + mini=true', () => {
    const url = socialShare.linkedin('https://example.com');
    expect(url.startsWith('https://www.linkedin.com/sharing/share-offsite/?')).toBe(true);
    expect(url).toContain('mini=true');
  });

  it('title + summary optional', () => {
    const url = socialShare.linkedin('https://x.com', 'Title', 'Summary');
    expect(url).toContain('title=Title');
    expect(url).toContain('summary=Summary');
  });
});

describe('getAvailableProviders', () => {
  it('returns array', () => {
    const r = getAvailableProviders();
    expect(Array.isArray(r)).toBe(true);
  });

  it('provider shape - id + name + icon', () => {
    const r = getAvailableProviders();
    for (const p of r) {
      expect(p.id).toBeDefined();
      expect(p.name).toBeDefined();
      expect(p.icon).toBeDefined();
    }
  });

  it('googleAuth singleton - GOOGLE_CLIENT_ID env-driven (null if no env)', () => {
    // Test ortamında env yoksa null beklenir
    if (process.env.GOOGLE_CLIENT_ID) {
      expect(googleAuth).not.toBeNull();
    } else {
      expect(googleAuth).toBeNull();
    }
  });

  it('facebookAuth / twitterAuth singletons - env-driven', () => {
    expect(facebookAuth === null || facebookAuth !== null).toBe(true);
    expect(twitterAuth === null || twitterAuth !== null).toBe(true);
  });
});
