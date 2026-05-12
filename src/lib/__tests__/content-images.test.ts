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

    it('returns null for invalid segments (uppercase + Turkish chars)', () => {
      expect(buildSlugImagePath('Blog', 'Geçersiz')).toBeNull();
    });

    it('returns null for special chars in slug', () => {
      expect(buildSlugImagePath('blog', 'foo bar')).toBeNull(); // space
      expect(buildSlugImagePath('blog', 'foo/bar')).toBeNull(); // slash (path traversal vector)
      expect(buildSlugImagePath('blog', 'foo.bar')).toBeNull(); // dot
      expect(buildSlugImagePath('blog', 'foo!bar')).toBeNull(); // special
    });

    it('returns null for special chars in category', () => {
      expect(buildSlugImagePath('blog/path', 'slug')).toBeNull();
      expect(buildSlugImagePath('../etc', 'slug')).toBeNull(); // path traversal
    });

    it('returns null for empty slug or category', () => {
      expect(buildSlugImagePath('', 'slug')).toBeNull();
      expect(buildSlugImagePath('blog', '')).toBeNull();
    });

    it('accepts hyphen-separated lowercase alphanumeric', () => {
      expect(buildSlugImagePath('places-cafe', 'gobekli-tepe-2024')).toBe(
        '/images/places-cafe/gobekli-tepe-2024.jpg'
      );
    });

    it('trims whitespace + lowercases inputs', () => {
      // sanitizeSegment trims + lowercases → SAFE_RE passes
      expect(buildSlugImagePath('  blog  ', '  test  ')).toBe('/images/blog/test.jpg');
    });

    it('thumb default is false', () => {
      expect(buildSlugImagePath('blog', 'test')).toBe('/images/blog/test.jpg');
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

    it('accepts /uploads/ explicit path', () => {
      expect(
        resolveContentImage({
          category: 'blog',
          slug: 'post',
          explicit: '/uploads/photos/abc.jpg',
          placeholder: '/images/placeholder.jpg',
        })
      ).toBe('/uploads/photos/abc.jpg');
    });

    it('accepts https:// explicit URL', () => {
      expect(
        resolveContentImage({
          category: 'blog',
          slug: 'post',
          explicit: 'https://cdn.example.com/photo.jpg',
          placeholder: '/images/placeholder.jpg',
        })
      ).toBe('https://cdn.example.com/photo.jpg');
    });

    it('accepts http:// explicit URL', () => {
      expect(
        resolveContentImage({
          category: 'blog',
          slug: 'post',
          explicit: 'http://images.example.com/x.jpg',
          placeholder: '/images/placeholder.jpg',
        })
      ).toBe('http://images.example.com/x.jpg');
    });

    it('rejects external explicit URLs when local-only is requested', () => {
      expect(
        resolveContentImage({
          category: 'blog',
          slug: 'post',
          explicit: 'https://cdn.example.com/photo.jpg',
          placeholder: '/images/placeholder.jpg',
          allowExternalExplicit: false,
        })
      ).toBe('/images/blog/post.jpg');
    });

    it('still accepts local explicit paths when local-only is requested', () => {
      expect(
        resolveContentImage({
          category: 'blog',
          slug: 'post',
          explicit: '/uploads/photos/abc.jpg',
          placeholder: '/images/placeholder.jpg',
          allowExternalExplicit: false,
        })
      ).toBe('/uploads/photos/abc.jpg');
    });

    it('rejects unsafe explicit paths (relative, javascript:, data:)', () => {
      expect(
        resolveContentImage({
          category: 'blog',
          slug: 'post',
          explicit: 'javascript:alert(1)',
          placeholder: '/images/safe.jpg',
        })
      ).toBe('/images/blog/post.jpg'); // falls back to slug
    });

    it('rejects /etc/passwd path traversal explicit', () => {
      const result = resolveContentImage({
        category: 'blog',
        slug: 'post',
        explicit: '/etc/passwd',
        placeholder: '/images/safe.jpg',
      });
      // Falls back to slug-based path
      expect(result).toBe('/images/blog/post.jpg');
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

    it('falls back to placeholder when slug is unavailable', () => {
      expect(
        resolveContentImage({
          category: 'places',
          slug: null,
          explicit: null,
          placeholder: '/images/placeholder-place.jpg',
        })
      ).toBe('/images/placeholder-place.jpg');
    });

    it('falls back to placeholder when slug is invalid (special chars)', () => {
      expect(
        resolveContentImage({
          category: 'blog',
          slug: 'invalid slug with spaces',
          placeholder: '/images/placeholder.jpg',
        })
      ).toBe('/images/placeholder.jpg');
    });

    it('respects thumb=true flag', () => {
      expect(
        resolveContentImage({
          category: 'places',
          slug: 'gobeklitepe',
          placeholder: '/images/placeholder.jpg',
          thumb: true,
        })
      ).toBe('/images/places/gobeklitepe-thumb.jpg');
    });

    it('explicit URL bypasses thumb flag (caller chooses)', () => {
      expect(
        resolveContentImage({
          category: 'places',
          slug: 'gobeklitepe',
          explicit: '/images/custom/full-size.jpg',
          placeholder: '/images/placeholder.jpg',
          thumb: true,
        })
      ).toBe('/images/custom/full-size.jpg');
    });

    it('returns placeholder for empty string slug + no explicit', () => {
      expect(
        resolveContentImage({
          category: 'places',
          slug: '',
          placeholder: '/images/ph.jpg',
        })
      ).toBe('/images/ph.jpg');
    });
  });
});
