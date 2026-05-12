/**
 * Unit Tests — SEO helpers
 *
 * generateCanonicalUrl, generateOGTags, generateTwitterCard,
 * generateSchemaOrg, generateSEOMeta — kullanıldıkları her sayfada
 * doğru URL/meta/JSON-LD üretilmesini garantiler.
 */

import { describe, it, expect } from 'vitest';
import {
  generateCanonicalUrl,
  generateOGTags,
  generateTwitterCard,
  generateSchemaOrg,
  generateSEOMeta,
} from '../seo-helpers';
import { SITE } from '../../data/site';

describe('generateCanonicalUrl', () => {
  it('appends path to site URL', () => {
    expect(generateCanonicalUrl('/isletme/gobeklitepe')).toBe(
      `${SITE.url}/isletme/gobeklitepe`,
    );
  });

  it('adds leading slash if missing', () => {
    expect(generateCanonicalUrl('about')).toBe(`${SITE.url}/about`);
  });

  it('strips trailing slash from path', () => {
    expect(generateCanonicalUrl('/about/')).toBe(`${SITE.url}/about`);
  });

  it('strips trailing slash from base URL too', () => {
    // SITE.url should not contain trailing slash, but helper handles it
    expect(generateCanonicalUrl('/x')).not.toContain('//x');
  });

  it('handles root path', () => {
    expect(generateCanonicalUrl('/')).toBe(SITE.url);
  });

  it('preserves query strings', () => {
    expect(generateCanonicalUrl('/search?q=test')).toBe(`${SITE.url}/search?q=test`);
  });
});

describe('generateOGTags', () => {
  it('produces minimum required OG tags', () => {
    const tags = generateOGTags({
      title: 'Test Page',
      description: 'A test description',
      url: '/test',
    });
    expect(tags['og:title']).toBe('Test Page');
    expect(tags['og:description']).toBe('A test description');
    expect(tags['og:url']).toBe(`${SITE.url}/test`);
    expect(tags['og:type']).toBe('website'); // default
    expect(tags['og:site_name']).toBe(SITE.name);
    expect(tags['og:locale']).toBe(SITE.locale);
  });

  it('uses custom type/siteName/locale', () => {
    const tags = generateOGTags({
      title: 'Article',
      description: 'desc',
      url: '/blog/post-1',
      type: 'article',
      siteName: 'Custom Site',
      locale: 'en_US',
    });
    expect(tags['og:type']).toBe('article');
    expect(tags['og:site_name']).toBe('Custom Site');
    expect(tags['og:locale']).toBe('en_US');
  });

  it('uses provided absolute image URL as-is', () => {
    const tags = generateOGTags({
      title: 'X',
      description: 'Y',
      url: '/x',
      image: 'https://cdn.example.com/img.jpg',
    });
    expect(tags['og:image']).toBe('https://cdn.example.com/img.jpg');
  });

  it('prefixes relative image with site URL', () => {
    const tags = generateOGTags({
      title: 'X',
      description: 'Y',
      url: '/x',
      image: '/uploads/photo.jpg',
    });
    expect(tags['og:image']).toBe(`${SITE.url}/uploads/photo.jpg`);
  });

  it('falls back to SITE.ogImage when image not provided', () => {
    const tags = generateOGTags({ title: 'X', description: 'Y', url: '/x' });
    expect(tags['og:image']).toBe(`${SITE.url}${SITE.ogImage}`);
  });

  it('includes 1200x630 image dimensions (Facebook recommended)', () => {
    const tags = generateOGTags({ title: 'X', description: 'Y', url: '/x' });
    expect(tags['og:image:width']).toBe('1200');
    expect(tags['og:image:height']).toBe('630');
  });

  it('image alt combines title + siteName', () => {
    const tags = generateOGTags({
      title: 'Göbeklitepe',
      description: 'd',
      url: '/x',
      siteName: 'Test',
    });
    expect(tags['og:image:alt']).toBe('Göbeklitepe - Test');
  });
});

describe('generateTwitterCard', () => {
  it('default card type is summary_large_image', () => {
    const tags = generateTwitterCard({ title: 'X', description: 'Y' });
    expect(tags['twitter:card']).toBe('summary_large_image');
    expect(tags['twitter:title']).toBe('X');
    expect(tags['twitter:description']).toBe('Y');
  });

  it('respects custom card type', () => {
    const tags = generateTwitterCard({
      title: 'X',
      description: 'Y',
      card: 'summary',
    });
    expect(tags['twitter:card']).toBe('summary');
  });

  it('omits twitter:image when image not provided', () => {
    const tags = generateTwitterCard({ title: 'X', description: 'Y' });
    expect(tags['twitter:image']).toBeUndefined();
  });

  it('prefixes relative image with site URL', () => {
    const tags = generateTwitterCard({
      title: 'X',
      description: 'Y',
      image: '/x.jpg',
    });
    expect(tags['twitter:image']).toBe(`${SITE.url}/x.jpg`);
  });

  it('uses absolute image URL as-is', () => {
    const tags = generateTwitterCard({
      title: 'X',
      description: 'Y',
      image: 'https://cdn.example.com/x.jpg',
    });
    expect(tags['twitter:image']).toBe('https://cdn.example.com/x.jpg');
  });

  it('includes creator handle when provided', () => {
    const tags = generateTwitterCard({
      title: 'X',
      description: 'Y',
      creator: '@author_x',
    });
    expect(tags['twitter:creator']).toBe('@author_x');
  });

  it('includes site handle when provided explicitly', () => {
    const tags = generateTwitterCard({
      title: 'X',
      description: 'Y',
      site: '@official_handle',
    });
    expect(tags['twitter:site']).toBe('@official_handle');
  });

  it('omits site when SITE.twitter empty and no explicit site', () => {
    // SITE.twitter = '' in fixture
    const tags = generateTwitterCard({ title: 'X', description: 'Y' });
    expect(tags['twitter:site']).toBeUndefined();
  });
});

describe('generateSchemaOrg', () => {
  it('produces JSON-LD with required fields (@context, @type, name, url)', () => {
    const json = generateSchemaOrg({
      type: 'WebPage',
      title: 'Page',
      description: 'Desc',
      url: '/page',
    });
    const parsed = JSON.parse(json);
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@type']).toBe('WebPage');
    expect(parsed.name).toBe('Page');
    expect(parsed.description).toBe('Desc');
    expect(parsed.url).toBe(`${SITE.url}/page`);
  });

  it('includes publisher org', () => {
    const json = generateSchemaOrg({
      type: 'Article',
      title: 'X',
      description: 'Y',
      url: '/x',
    });
    const parsed = JSON.parse(json);
    expect(parsed.publisher['@type']).toBe('Organization');
    expect(parsed.publisher.name).toBe(SITE.name);
    expect(parsed.publisher.logo['@type']).toBe('ImageObject');
  });

  it('Article fields: datePublished, dateModified, author', () => {
    const json = generateSchemaOrg({
      type: 'BlogPosting',
      title: 'X',
      description: 'Y',
      url: '/x',
      datePublished: '2026-01-01T00:00:00Z',
      dateModified: '2026-01-02T00:00:00Z',
      author: 'John Doe',
    });
    const parsed = JSON.parse(json);
    expect(parsed.datePublished).toBe('2026-01-01T00:00:00Z');
    expect(parsed.dateModified).toBe('2026-01-02T00:00:00Z');
    expect(parsed.author['@type']).toBe('Organization');
    expect(parsed.author.name).toBe('John Doe');
  });

  it('LocalBusiness fields: address with defaults', () => {
    const json = generateSchemaOrg({
      type: 'LocalBusiness',
      title: 'Cafe X',
      description: 'Y',
      url: '/x',
      address: { streetAddress: '123 Main St', postalCode: '63000' },
    });
    const parsed = JSON.parse(json);
    expect(parsed.address['@type']).toBe('PostalAddress');
    expect(parsed.address.addressLocality).toBe('Şanlıurfa');
    expect(parsed.address.addressRegion).toBe('Şanlıurfa');
    expect(parsed.address.addressCountry).toBe('TR');
    expect(parsed.address.streetAddress).toBe('123 Main St');
    expect(parsed.address.postalCode).toBe('63000');
  });

  it('geo coordinates', () => {
    const json = generateSchemaOrg({
      type: 'TouristAttraction',
      title: 'Göbeklitepe',
      description: 'World heritage',
      url: '/g',
      geo: { latitude: 37.2236, longitude: 38.9224 },
    });
    const parsed = JSON.parse(json);
    expect(parsed.geo['@type']).toBe('GeoCoordinates');
    expect(parsed.geo.latitude).toBe(37.2236);
    expect(parsed.geo.longitude).toBe(38.9224);
  });

  it('aggregateRating with bestRating/worstRating defaults', () => {
    const json = generateSchemaOrg({
      type: 'Restaurant',
      title: 'X',
      description: 'Y',
      url: '/x',
      aggregateRating: { ratingValue: 4.5, reviewCount: 120 },
    });
    const parsed = JSON.parse(json);
    expect(parsed.aggregateRating.ratingValue).toBe(4.5);
    expect(parsed.aggregateRating.reviewCount).toBe(120);
    expect(parsed.aggregateRating.bestRating).toBe(5); // default
    expect(parsed.aggregateRating.worstRating).toBe(1); // default
  });

  it('Event fields: startDate, endDate, location', () => {
    const json = generateSchemaOrg({
      type: 'Event',
      title: 'Festival',
      description: 'Y',
      url: '/e',
      startDate: '2026-06-01T18:00:00Z',
      endDate: '2026-06-03T22:00:00Z',
      location: 'Balıklıgöl',
    });
    const parsed = JSON.parse(json);
    expect(parsed.startDate).toBe('2026-06-01T18:00:00Z');
    expect(parsed.endDate).toBe('2026-06-03T22:00:00Z');
    expect(parsed.location['@type']).toBe('Place');
    expect(parsed.location.name).toBe('Balıklıgöl');
  });

  it('absolute image URL preserved as-is', () => {
    const json = generateSchemaOrg({
      type: 'WebPage',
      title: 'X',
      description: 'Y',
      url: '/x',
      image: 'https://cdn.example.com/x.jpg',
    });
    const parsed = JSON.parse(json);
    expect(parsed.image).toBe('https://cdn.example.com/x.jpg');
  });

  it('relative image prefixed with site URL', () => {
    const json = generateSchemaOrg({
      type: 'WebPage',
      title: 'X',
      description: 'Y',
      url: '/x',
      image: '/photo.jpg',
    });
    const parsed = JSON.parse(json);
    expect(parsed.image).toBe(`${SITE.url}/photo.jpg`);
  });
});

describe('generateSEOMeta', () => {
  it('builds complete meta tag set', () => {
    const meta = generateSEOMeta({
      title: 'Mekan',
      description: 'Açıklama',
      url: '/m',
    });
    expect(meta.title).toBe(`Mekan | ${SITE.name}`);
    expect(meta.description).toBe('Açıklama');
    expect(meta['og:title']).toBe('Mekan');
    expect(meta['og:description']).toBe('Açıklama');
    expect(meta['og:url']).toBe(`${SITE.url}/m`);
    expect(meta.canonical).toBe(`${SITE.url}/m`);
    expect(meta['twitter:card']).toBe('summary_large_image');
  });

  it('includes 1200x630 image meta', () => {
    const meta = generateSEOMeta({ title: 'X', description: 'Y', url: '/x' });
    expect(meta['og:image:width']).toBe('1200');
    expect(meta['og:image:height']).toBe('630');
    expect(meta['og:image']).toBe(`${SITE.url}${SITE.ogImage}`);
  });

  it('includes article timestamps when provided', () => {
    const meta = generateSEOMeta({
      title: 'X',
      description: 'Y',
      url: '/x',
      datePublished: '2026-01-01T00:00:00Z',
      dateModified: '2026-01-02T00:00:00Z',
      author: 'Editor',
    });
    expect(meta['article:published_time']).toBe('2026-01-01T00:00:00Z');
    expect(meta['article:modified_time']).toBe('2026-01-02T00:00:00Z');
    expect(meta['article:author']).toBe('Editor');
  });

  it('joins keywords array as comma-separated', () => {
    const meta = generateSEOMeta({
      title: 'X',
      description: 'Y',
      url: '/x',
      keywords: ['Şanlıurfa', 'Göbeklitepe', 'tarih'],
    });
    expect(meta.keywords).toBe('Şanlıurfa, Göbeklitepe, tarih');
  });

  it('omits keywords when empty array', () => {
    const meta = generateSEOMeta({
      title: 'X',
      description: 'Y',
      url: '/x',
      keywords: [],
    });
    expect(meta.keywords).toBeUndefined();
  });

  it('robots meta: noindex', () => {
    const meta = generateSEOMeta({ title: 'X', description: 'Y', url: '/x', noindex: true });
    expect(meta.robots).toBe('noindex');
  });

  it('robots meta: noindex + nofollow', () => {
    const meta = generateSEOMeta({
      title: 'X',
      description: 'Y',
      url: '/x',
      noindex: true,
      nofollow: true,
    });
    expect(meta.robots).toBe('noindex, nofollow');
  });

  it('omits robots meta when both false (allow indexing default)', () => {
    const meta = generateSEOMeta({ title: 'X', description: 'Y', url: '/x' });
    expect(meta.robots).toBeUndefined();
  });

  it('uses absolute image URL', () => {
    const meta = generateSEOMeta({
      title: 'X',
      description: 'Y',
      url: '/x',
      image: 'https://cdn.example.com/x.jpg',
    });
    expect(meta['og:image']).toBe('https://cdn.example.com/x.jpg');
    expect(meta['twitter:image']).toBe('https://cdn.example.com/x.jpg');
  });
});
