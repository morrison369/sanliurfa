/**
 * Unit Tests — seo/seo.ts SEO config + structured data + sitemap + score helpers
 *
 * - generateMetaTags (OG + Twitter + defaults + Türkçe lang)
 * - generateOrganizationSchema / generateLocalBusinessSchema (geo, rating, optional fields)
 * - generateArticleSchema (mainEntityOfPage + author Person)
 * - generateBreadcrumbSchema / generateFAQSchema
 * - generateSitemapUrl (XML escape + optional fields) + generateSitemap (XML wrapper)
 * - generateRobotsTxt (Allow/Disallow + Sitemap + Crawl-delay)
 * - calculateSEOScore (0-100 graded)
 * - socialMediaMeta + keywordSuggestions exports
 */

import { describe, it, expect } from 'vitest';
import {
  generateMetaTags,
  generateOrganizationSchema,
  generateLocalBusinessSchema,
  generateArticleSchema,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateSitemapUrl,
  generateSitemap,
  generateRobotsTxt,
  calculateSEOScore,
  socialMediaMeta,
  keywordSuggestions,
} from '../seo/seo';

describe('generateMetaTags', () => {
  it('temel og + twitter alanları', () => {
    const m = generateMetaTags({ title: 'T', description: 'D' });
    expect(m['og:title']).toBe('T');
    expect(m['twitter:title']).toBe('T');
    expect(m['og:type']).toBe('website');
    expect(m['twitter:card']).toBe('summary_large_image');
  });

  it('language SABİT Turkish (i18n yasak HARD RULE #25)', () => {
    expect(generateMetaTags({ title: 'X', description: 'Y' })['language']).toBe('Turkish');
  });

  it('robots default "index, follow"', () => {
    expect(generateMetaTags({ title: 'X', description: 'Y' })['robots']).toBe('index, follow');
  });

  it('tags → keywords comma-join', () => {
    const m = generateMetaTags({ title: 'X', description: 'Y', tags: ['a', 'b', 'c'] });
    expect(m['keywords']).toBe('a, b, c');
  });
});

describe('generateOrganizationSchema', () => {
  it('schema.org Organization + addressCountry TR', () => {
    const sd = generateOrganizationSchema('https://sanliurfa.com');
    expect(sd['@type']).toBe('Organization');
    expect(sd.address.addressCountry).toBe('TR');
    expect(sd.address.addressRegion).toBe('Şanlıurfa');
  });
});

describe('generateLocalBusinessSchema', () => {
  it('LocalBusiness — temel zorunlu alanlar', () => {
    const sd = generateLocalBusinessSchema({
      name: 'Cafe',
      description: 'desc',
      address: 'Adres',
    });
    expect(sd['@type']).toBe('LocalBusiness');
    expect(sd.name).toBe('Cafe');
  });

  it('lat+lon ikisi de varsa geo eklenir', () => {
    const sd = generateLocalBusinessSchema({
      name: 'X',
      description: 'd',
      address: 'a',
      latitude: 37.5,
      longitude: 39,
    });
    expect(sd.geo?.latitude).toBe(37.5);
    expect(sd.geo?.longitude).toBe(39);
  });

  it('rating + reviewCount ikisi varsa aggregateRating eklenir', () => {
    const sd = generateLocalBusinessSchema({
      name: 'X', description: 'd', address: 'a',
      rating: 4.5, reviewCount: 100,
    });
    expect(sd.aggregateRating?.ratingValue).toBe(4.5);
  });

  it('phone yoksa telephone field eklenmez', () => {
    const sd = generateLocalBusinessSchema({ name: 'X', description: 'd', address: 'a' });
    expect(sd.telephone).toBeUndefined();
  });
});

describe('generateArticleSchema', () => {
  it('BlogPosting + author Person + mainEntityOfPage', () => {
    const sd = generateArticleSchema({
      headline: 'H',
      description: 'D',
      author: 'Ali',
      publishedTime: new Date('2026-05-05T10:00:00Z'),
      url: 'https://x.com/p',
    });
    expect(sd['@type']).toBe('BlogPosting');
    expect(sd.author.name).toBe('Ali');
    expect(sd.mainEntityOfPage['@id']).toBe('https://x.com/p');
  });

  it('modifiedTime yoksa dateModified = publishedTime', () => {
    const date = new Date('2026-05-05T10:00:00Z');
    const sd = generateArticleSchema({
      headline: 'X', description: 'D', author: 'A',
      publishedTime: date, url: 'u',
    });
    expect(sd.dateModified).toBe(date.toISOString());
  });
});

describe('generateBreadcrumbSchema / generateFAQSchema', () => {
  it('BreadcrumbList — position 1-indexed', () => {
    const sd = generateBreadcrumbSchema([
      { name: 'A', url: '/a' },
      { name: 'B', url: '/b' },
    ]);
    expect(sd.itemListElement[0].position).toBe(1);
    expect(sd.itemListElement[1].position).toBe(2);
  });

  it('FAQPage — Question/Answer mapping', () => {
    const sd = generateFAQSchema([{ question: 'Q', answer: 'A' }]);
    expect(sd['@type']).toBe('FAQPage');
    expect(sd.mainEntity[0].acceptedAnswer.text).toBe('A');
  });
});

describe('generateSitemapUrl', () => {
  it('basic loc → <url><loc> wrap', () => {
    const xml = generateSitemapUrl('https://sanliurfa.com/');
    expect(xml).toContain('<loc>https://sanliurfa.com/</loc>');
  });

  it('XML escape — & → &amp;', () => {
    const xml = generateSitemapUrl('https://x.com/?a=1&b=2');
    expect(xml).toContain('&amp;');
  });

  it('lastmod + changefreq + priority eklenir', () => {
    const xml = generateSitemapUrl(
      'https://x.com/',
      new Date('2026-05-05'),
      'daily',
      0.8
    );
    expect(xml).toContain('<lastmod>2026-05-05</lastmod>');
    expect(xml).toContain('<changefreq>daily</changefreq>');
    expect(xml).toContain('<priority>0.8</priority>');
  });

  it('opsiyonel field yoksa eklenmez', () => {
    const xml = generateSitemapUrl('https://x.com/');
    expect(xml).not.toContain('<lastmod>');
    expect(xml).not.toContain('<changefreq>');
  });
});

describe('generateSitemap', () => {
  it('XML root <urlset> + xmlns', () => {
    const xml = generateSitemap(['<url><loc>x</loc></url>']);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('</urlset>');
  });
});

describe('generateRobotsTxt', () => {
  it('User-agent: * + Allow + Disallow + Sitemap + Crawl-delay', () => {
    const txt = generateRobotsTxt();
    expect(txt).toContain('User-agent: *');
    expect(txt).toContain('Allow: /');
    expect(txt).toContain('Disallow: /api/');
    expect(txt).toContain('Disallow: /admin/');
    expect(txt).toContain('Sitemap: https://sanliurfa.com/sitemap.xml');
    expect(txt).toContain('Crawl-delay: 1');
  });
});

describe('calculateSEOScore', () => {
  it('boş config → 0', () => {
    expect(calculateSEOScore({ title: '', description: '' })).toBe(0);
  });

  it('full config → 90 (breakdown max: 15+15+10+10+10+20+10)', () => {
    const score = calculateSEOScore({
      title: 'A solid title length 30-60 char yeterli ',
      description: 'A '.repeat(70).slice(0, 140), // 120-160 char
      canonical: 'https://x.com',
      ogImage: 'https://x.com/img.jpg',
      author: 'Ali',
      tags: ['a', 'b', 'c', 'd', 'e'],
      publishedTime: new Date(),
    });
    // Function breakdown sums to max 90 — Math.min(score, 100) sadece safety cap
    expect(score).toBe(90);
  });

  it('title too short — 10 puan only (no length bonus)', () => {
    const score = calculateSEOScore({ title: 'Short', description: '' });
    expect(score).toBe(10); // base only, no length bonus
  });

  it('title 30-60 char → +5 length bonus', () => {
    const score = calculateSEOScore({
      title: 'This title has between 30 and 60 char',
      description: '',
    });
    expect(score).toBeGreaterThanOrEqual(15);
  });

  it('cap 100 (Math.min)', () => {
    const score = calculateSEOScore({
      title: 'A solid title length 30-60 char yeterli ',
      description: 'A '.repeat(70).slice(0, 140),
      canonical: 'x', ogImage: 'y', author: 'z',
      tags: ['1', '2', '3', '4', '5', '6'],
      publishedTime: new Date(), modifiedTime: new Date(),
    });
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('socialMediaMeta + keywordSuggestions', () => {
  it('socialMediaMeta.facebook — og:url/title/description/image', () => {
    const m = socialMediaMeta.facebook('u', 't', 'd', 'i');
    expect(m['og:url']).toBe('u');
    expect(m['og:type']).toBe('website');
  });

  it('socialMediaMeta.twitter — twitter:site handle', () => {
    const m = socialMediaMeta.twitter('@x', 't', 'd', 'i');
    expect(m['twitter:site']).toBe('@x');
  });

  it('socialMediaMeta.linkedin — sadece linkedin:url', () => {
    expect(socialMediaMeta.linkedin('u')).toEqual({ 'linkedin:url': 'u' });
  });

  it('keywordSuggestions — 4 grup', () => {
    expect(Object.keys(keywordSuggestions).sort()).toEqual(['dining', 'local', 'places', 'tourism']);
    expect(keywordSuggestions.places).toContain('Göbekli Tepe');
  });
});
