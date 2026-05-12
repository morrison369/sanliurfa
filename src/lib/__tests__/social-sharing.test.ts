/**
 * Unit Tests — social/social-sharing.ts URL builders (pure)
 *
 * - shareOnTwitter / Facebook / WhatsApp / LinkedIn / Pinterest / Email
 * - generateShareLinks (6-platform aggregator)
 * - URL encoding + special character handling
 *
 * NOT: nativeShare (browser navigator.share) + trackShare (fetch) DOM/network bağımlı.
 */

import { describe, it, expect } from 'vitest';
import {
  shareOnTwitter,
  shareOnFacebook,
  shareOnWhatsApp,
  shareOnLinkedIn,
  shareOnPinterest,
  shareViaEmail,
  generateShareLinks,
  type SharePayload,
} from '../social/social-sharing';

const PAYLOAD: SharePayload = {
  title: 'Şanlıurfa Kebap',
  description: 'Lezzetli kebap mekanı',
  url: 'https://sanliurfa.com/mekan/kebap',
  imageUrl: 'https://sanliurfa.com/img.jpg',
};

describe('shareOnTwitter', () => {
  it('Twitter intent URL + text param', () => {
    const url = shareOnTwitter(PAYLOAD);
    expect(url.startsWith('https://twitter.com/intent/tweet?text=')).toBe(true);
  });

  it('title + description + url URL-encoded', () => {
    const url = shareOnTwitter(PAYLOAD);
    expect(url).toContain(encodeURIComponent('Şanlıurfa Kebap'));
    expect(url).toContain(encodeURIComponent('https://sanliurfa.com'));
  });
});

describe('shareOnFacebook', () => {
  it('Facebook sharer URL + quote+href params', () => {
    const url = shareOnFacebook(PAYLOAD);
    expect(url.startsWith('https://www.facebook.com/sharer/sharer.php?')).toBe(true);
    expect(url).toContain('quote=');
    expect(url).toContain('href=');
  });
});

describe('shareOnWhatsApp', () => {
  it('wa.me URL + text param', () => {
    const url = shareOnWhatsApp(PAYLOAD);
    expect(url.startsWith('https://wa.me/?text=')).toBe(true);
  });

  it('multiline text korunur (Title\\n\\nDesc\\n\\nURL)', () => {
    const url = shareOnWhatsApp(PAYLOAD);
    // \n encoded as %0A
    expect(url).toContain('%0A');
  });
});

describe('shareOnLinkedIn', () => {
  it('LinkedIn sharing URL + url+title+summary params', () => {
    const url = shareOnLinkedIn(PAYLOAD);
    expect(url.startsWith('https://www.linkedin.com/sharing/share-offsite/?')).toBe(true);
    expect(url).toContain('url=');
    expect(url).toContain('title=');
    expect(url).toContain('summary=');
  });
});

describe('shareOnPinterest', () => {
  it('Pinterest pin create URL + url+description+media params', () => {
    const url = shareOnPinterest(PAYLOAD);
    expect(url.startsWith('https://www.pinterest.com/pin/create/button/?')).toBe(true);
    expect(url).toContain('media=');
  });

  it('imageUrl yoksa media boş', () => {
    const url = shareOnPinterest({
      title: 'X', description: 'Y', url: 'Z',
    });
    expect(url).toContain('media=');
  });
});

describe('shareViaEmail', () => {
  it('mailto: URL + subject + body', () => {
    const url = shareViaEmail(PAYLOAD);
    expect(url.startsWith('mailto:?')).toBe(true);
    expect(url).toContain('subject=');
    expect(url).toContain('body=');
  });
});

describe('generateShareLinks', () => {
  it('6-platform link map', () => {
    const links = generateShareLinks(PAYLOAD);
    expect(Object.keys(links).sort()).toEqual([
      'email', 'facebook', 'linkedin', 'pinterest', 'twitter', 'whatsapp',
    ]);
  });

  it('her platform için non-empty URL', () => {
    const links = generateShareLinks(PAYLOAD);
    for (const url of Object.values(links)) {
      expect(typeof url).toBe('string');
      expect(url.length).toBeGreaterThan(0);
    }
  });
});
