import { describe, expect, it } from 'vitest';
import { buildSlugImagePath, resolveContentImage } from '../content-images';

describe('content-images', () => {
  describe('buildSlugImagePath', () => {
    it('builds main image path with slug rule', () => {
      expect(buildSlugImagePath('blog', 'tarihi-yerler-rehberi')).toBe(
        '/images/blog/tarihi-yerler-rehberi.jpg'
      );
    });

    it('builds thumb path when requested', () => {
      expect(buildSlugImagePath('places', 'gobeklitepe', true)).toBe(
        '/images/places/gobeklitepe-thumb.jpg'
      );
    });

    it('returns null for invalid segments', () => {
      expect(buildSlugImagePath('Blog', 'Geçersiz')).toBeNull();
    });
  });

  describe('resolveContentImage', () => {
    it('prefers explicit /images path when provided', () => {
      expect(
        resolveContentImage({
          category: 'blog',
          slug: 'tarihi-yerler-rehberi',
          explicit: '/images/custom/hero.jpg',
          placeholder: '/images/placeholder.jpg',
        })
      ).toBe('/images/custom/hero.jpg');
    });

    it('falls back to slug rule when explicit is missing', () => {
      expect(
        resolveContentImage({
          category: 'etkinlikler',
          slug: 'sanliurfa-kultur-festivali',
          placeholder: '/images/placeholder-event.jpg',
        })
      ).toBe('/images/etkinlikler/sanliurfa-kultur-festivali.jpg');
    });

    it('returns placeholder when slug is unavailable', () => {
      expect(
        resolveContentImage({
          category: 'places',
          slug: null,
          explicit: null,
          placeholder: '/images/placeholder-place.jpg',
        })
      ).toBe('/images/placeholder-place.jpg');
    });
  });
});
