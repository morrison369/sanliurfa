import { describe, expect, it } from 'vitest';
import { resolveSeoOgImage } from '../seo-image';

describe('resolveSeoOgImage', () => {
  it('keeps a valid explicit city image', () => {
    expect(resolveSeoOgImage({ ogImage: '/images/blog/gobeklitepe.jpg', pathname: '/blog/x' })).toBe(
      '/images/blog/gobeklitepe.jpg',
    );
  });

  it('replaces legacy hero-home image with route-specific food image', () => {
    expect(resolveSeoOgImage({ ogImage: '/images/hero/hero-home.webp', pathname: '/yeme-icme' })).toBe(
      '/images/foods/homepage/urfa-kebabi-card.png',
    );
  });

  it('replaces placeholder images with route-specific historical image', () => {
    expect(resolveSeoOgImage({ ogImage: '/images/placeholder.jpg', pathname: '/gezilecek-yerler' })).toBe(
      '/images/places/gobeklitepe.jpg',
    );
  });

  it('falls back to Balıklıgöl for generic public routes', () => {
    expect(resolveSeoOgImage({ pathname: '/iletisim' })).toBe('/images/places/balikligol.jpg');
  });
});
