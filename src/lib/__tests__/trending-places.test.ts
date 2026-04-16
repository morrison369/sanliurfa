import { describe, expect, it } from 'vitest';

import { renderTrendingPlaces, renderTrendingStars } from '../trending-places';

describe('trending places helpers', () => {
  it('renders star markup by rating floor', () => {
    const html = renderTrendingStars(3.8);
    expect(html.match(/text-yellow-400/g)?.length).toBe(3);
    expect(html.match(/text-gray-300/g)?.length).toBe(2);
  });

  it('renders trending place list html', () => {
    const html = renderTrendingPlaces([
      {
        id: 'balikligol',
        name: 'Balıklıgöl',
        category: 'Tarihi Yer',
        rating: 5,
        review_count: 42,
        engagement_score: 100,
      },
    ]);

    expect(html).toContain('/mekanlari-bul/balikligol');
    expect(html).toContain('Balıklıgöl');
    expect(html).toContain('Tarihi Yer');
  });
});
