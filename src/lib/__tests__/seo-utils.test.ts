import { describe, it, expect } from 'vitest';
import {
  getCanonicalUrl,
  generateMetaDescription,
  generateSlug,
  validateSlug,
  calculateReadingTime,
  getSEOScore,
  generateBreadcrumbSchema,
  generateFAQSchema,
  generateLocalBusinessSchema,
} from '../seo-utils';

describe('SEO Utils', () => {
  describe('getCanonicalUrl', () => {
    it('should generate canonical URL for home page', () => {
      expect(getCanonicalUrl('/')).toBe('https://sanliurfa.com');
    });

    it('should generate canonical URL for path', () => {
      expect(getCanonicalUrl('/mekanlar/balikligol')).toBe('https://sanliurfa.com/mekanlar/balikligol');
    });

    it('should remove trailing slash', () => {
      expect(getCanonicalUrl('/mekanlar/')).toBe('https://sanliurfa.com/mekanlar');
    });
  });

  describe('generateMetaDescription', () => {
    it('should return short description as is', () => {
      const desc = 'Kısa açıklama';
      expect(generateMetaDescription(desc)).toBe(desc);
    });

    it('should truncate long description', () => {
      const longDesc = 'a'.repeat(200);
      const result = generateMetaDescription(longDesc);
      expect(result.length).toBeLessThanOrEqual(160);
      expect(result.endsWith('...')).toBe(true);
    });
  });

  describe('generateSlug', () => {
    it('should convert title to slug', () => {
      expect(generateSlug('Şanlıurfa Gezi Rehberi')).toBe('sanliurfa-gezi-rehberi');
    });

    it('should handle multiple spaces', () => {
      expect(generateSlug('Balıklıgöl   Tarihi')).toBe('balikligol-tarihi');
    });

    it('should remove special characters', () => {
      expect(generateSlug('Göbeklitepe! @ # $')).toBe('gobeklitepe');
    });
  });

  describe('validateSlug', () => {
    it('should validate correct slug', () => {
      expect(validateSlug('valid-slug')).toBe(true);
    });

    it('should reject uppercase', () => {
      expect(validateSlug('Invalid-Slug')).toBe(false);
    });

    it('should reject double hyphens', () => {
      expect(validateSlug('invalid--slug')).toBe(false);
    });
  });

  describe('calculateReadingTime', () => {
    it('should calculate reading time for short text', () => {
      const content = 'word '.repeat(100);
      expect(calculateReadingTime(content)).toBe(1);
    });

    it('should calculate reading time for long text', () => {
      const content = 'word '.repeat(500);
      expect(calculateReadingTime(content)).toBe(3);
    });
  });

  describe('getSEOScore', () => {
    it('should return high score for good content', () => {
      const content = '<h1>Title</h1>' + '<p>word '.repeat(400) + '</p>';
      const result = getSEOScore(content);
      expect(result.score).toBeGreaterThan(70);
    });

    it('should detect missing h1', () => {
      const content = '<p>word '.repeat(400) + '</p>';
      const result = getSEOScore(content);
      expect(result.issues.some(i => i.includes('H1'))).toBe(true);
    });

    it('should detect short content', () => {
      const content = '<h1>Title</h1><p>Short</p>';
      const result = getSEOScore(content);
      expect(result.issues.some(i => i.includes('kısa'))).toBe(true);
    });
  });

  describe('generateBreadcrumbSchema', () => {
    it('should generate valid breadcrumb schema', () => {
      const breadcrumbs = [
        { name: 'Ana Sayfa', url: 'https://sanliurfa.com' },
        { name: 'Mekanlar', url: 'https://sanliurfa.com/mekanlar' },
      ];
      const schema = generateBreadcrumbSchema(breadcrumbs);
      
      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema.itemListElement).toHaveLength(2);
      expect(schema.itemListElement[0].position).toBe(1);
    });
  });

  describe('generateFAQSchema', () => {
    it('should generate valid FAQ schema', () => {
      const faqs = [
        { question: 'Soru 1?', answer: 'Cevap 1' },
        { question: 'Soru 2?', answer: 'Cevap 2' },
      ];
      const schema = generateFAQSchema(faqs);
      
      expect(schema['@type']).toBe('FAQPage');
      expect(schema.mainEntity).toHaveLength(2);
      expect(schema.mainEntity[0]['@type']).toBe('Question');
    });
  });

  describe('generateLocalBusinessSchema', () => {
    it('should generate valid local business schema', () => {
      const schema = generateLocalBusinessSchema();
      
      expect(schema['@type']).toBe('TravelAgency');
      expect(schema.name).toBe('Sanliurfa.com');
      expect(schema.geo).toBeDefined();
    });
  });

});
