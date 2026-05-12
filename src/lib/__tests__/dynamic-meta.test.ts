/**
 * Unit Tests — seo/dynamic-meta.ts SEO meta tags & structured data builders
 *
 * - generateMetaTags (defaults + title suffix + custom override)
 * - generatePlaceMeta (TouristAttraction structured data + canonical)
 * - generateBlogMeta (BlogPosting structured data + Person/Organization author)
 * - generateBreadcrumbStructuredData (BreadcrumbList + position 1-indexed)
 * - generateOrganizationStructuredData (Organization + ContactPoint)
 * - generateFAQStructuredData (FAQPage + Question/Answer mapping)
 */

import { describe, it, expect } from 'vitest';
import {
  generateMetaTags,
  generatePlaceMeta,
  generateBlogMeta,
  generateBreadcrumbStructuredData,
  generateOrganizationStructuredData,
  generateFAQStructuredData,
} from '../seo/dynamic-meta';

describe('generateMetaTags', () => {
  it('defaults — site title + description fallback', () => {
    const m = generateMetaTags();
    expect(m.title).toBe('Sanliurfa.com - Şehrin Rehberi');
    expect(m.description).toContain('Şanlıurfa');
    expect(m.ogType).toBe('website');
    expect(Array.isArray(m.keywords)).toBe(true);
  });

  it('custom title — suffix " | Sanliurfa.com" eklenir', () => {
    const m = generateMetaTags({ title: 'Test' });
    expect(m.title).toBe('Test | Sanliurfa.com');
  });

  it('custom description override', () => {
    const m = generateMetaTags({ description: 'Custom desc' });
    expect(m.description).toBe('Custom desc');
  });

  it('canonical optional → field eklenmiyor (undefined)', () => {
    const m = generateMetaTags();
    expect(m.canonical).toBeUndefined();
  });

  it('canonical verildiğinde → field eklenir', () => {
    const m = generateMetaTags({ canonical: 'https://sanliurfa.com/test' });
    expect(m.canonical).toBe('https://sanliurfa.com/test');
  });

  it('noindex true override', () => {
    const m = generateMetaTags({ noindex: true });
    expect(m.noindex).toBe(true);
  });
});

describe('generatePlaceMeta', () => {
  it('TouristAttraction structured data + canonical /mekan/{slug}', () => {
    const m = generatePlaceMeta({
      name: 'Balıklıgöl',
      category: 'tarihi',
      slug: 'baliklgol',
    });
    expect(m.title).toContain('Balıklıgöl');
    expect(m.canonical).toContain('/mekan/baliklgol');
    expect(m.structuredData?.['@type']).toBe('TouristAttraction');
    expect(m.structuredData?.address.addressLocality).toBe('Şanlıurfa');
  });

  it('rating verildiğinde → aggregateRating eklenir', () => {
    const m = generatePlaceMeta({
      name: 'Test',
      category: 'cafe',
      slug: 'test',
      rating: 4.5,
    });
    expect(m.structuredData?.aggregateRating?.ratingValue).toBe(4.5);
    expect(m.structuredData?.aggregateRating?.bestRating).toBe(5);
  });

  it('rating yok → aggregateRating eklenmez', () => {
    const m = generatePlaceMeta({
      name: 'Test',
      category: 'cafe',
      slug: 'test',
    });
    expect(m.structuredData?.aggregateRating).toBeUndefined();
  });

  it('image verildiğinde → ogImage + structuredData.image', () => {
    const m = generatePlaceMeta({
      name: 'Test',
      category: 'cafe',
      slug: 'test',
      image: 'https://example.com/img.jpg',
    });
    expect(m.ogImage).toBe('https://example.com/img.jpg');
    expect(m.structuredData?.image).toBe('https://example.com/img.jpg');
  });
});

describe('generateBlogMeta', () => {
  it('BlogPosting + canonical /blog/{slug}', () => {
    const m = generateBlogMeta({ title: 'Yazı', slug: 'yazi' });
    expect(m.canonical).toContain('/blog/yazi');
    expect(m.structuredData?.['@type']).toBe('BlogPosting');
  });

  it('author yok → Organization Sanliurfa.com', () => {
    const m = generateBlogMeta({ title: 'X', slug: 'x' });
    expect(m.structuredData?.author?.['@type']).toBe('Organization');
    expect(m.structuredData?.author?.name).toBe('Sanliurfa.com');
  });

  it('author verildiğinde → Person', () => {
    const m = generateBlogMeta({ title: 'X', slug: 'x', author: 'Ali' });
    expect(m.structuredData?.author?.['@type']).toBe('Person');
    expect(m.structuredData?.author?.name).toBe('Ali');
  });

  it('publishedAt → datePublished ISO', () => {
    const date = new Date('2026-05-05T10:00:00Z');
    const m = generateBlogMeta({ title: 'X', slug: 'x', publishedAt: date });
    expect(m.structuredData?.datePublished).toBe(date.toISOString());
  });
});

describe('generateBreadcrumbStructuredData', () => {
  it('BreadcrumbList + position 1-indexed', () => {
    const sd = generateBreadcrumbStructuredData([
      { name: 'Home', url: '/' },
      { name: 'Mekanlar', url: '/mekan' },
    ]);
    expect(sd['@type']).toBe('BreadcrumbList');
    expect(sd.itemListElement[0].position).toBe(1);
    expect(sd.itemListElement[1].position).toBe(2);
  });

  it('item URL → BASE_URL prefix', () => {
    const sd = generateBreadcrumbStructuredData([{ name: 'Home', url: '/' }]);
    expect(sd.itemListElement[0].item).toMatch(/^https?:\/\//);
  });
});

describe('generateOrganizationStructuredData', () => {
  it('Organization + ContactPoint email', () => {
    const sd = generateOrganizationStructuredData();
    expect(sd['@type']).toBe('Organization');
    expect(sd.name).toBe('Sanliurfa.com');
    expect(sd.contactPoint.email).toBe('info@sanliurfa.com');
  });
});

describe('generateFAQStructuredData', () => {
  it('FAQPage + Question/Answer mapping', () => {
    const sd = generateFAQStructuredData([
      { question: 'Soru 1', answer: 'Cevap 1' },
    ]);
    expect(sd['@type']).toBe('FAQPage');
    expect(sd.mainEntity[0]['@type']).toBe('Question');
    expect(sd.mainEntity[0].name).toBe('Soru 1');
    expect(sd.mainEntity[0].acceptedAnswer.text).toBe('Cevap 1');
  });

  it('boş array → mainEntity boş array', () => {
    const sd = generateFAQStructuredData([]);
    expect(sd.mainEntity).toEqual([]);
  });
});
