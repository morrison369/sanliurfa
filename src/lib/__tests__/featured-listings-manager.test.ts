import { describe, expect, it } from 'vitest';

import {
  createEmptyFeaturedListingFormData,
  extractFeaturedListings,
  renderFeaturedListingsManager,
} from '../featured-listings-manager';

describe('featured listings manager helpers', () => {
  it('extracts nested listings payload', () => {
    const listings = extractFeaturedListings({
      success: true,
      data: {
        success: true,
        data: [{ id: 'l1', title: 'Öne Çıkan', place_id: 'p1', position_tier: 'featured', start_date: '2026-04-01', end_date: '2026-04-10', status: 'active', views_count: 10, clicks_count: 4, conversions_count: 1, cost_per_day: 12, total_cost: 120 }],
      },
    });

    expect(listings).toHaveLength(1);
    expect(listings[0].title).toBe('Öne Çıkan');
  });

  it('renders manager content', () => {
    const html = renderFeaturedListingsManager({
      listings: [{ id: 'l1', title: 'Öne Çıkan', place_id: 'p1', position_tier: 'featured', start_date: '2026-04-01', end_date: '2026-04-10', status: 'active', views_count: 10, clicks_count: 4, conversions_count: 1, cost_per_day: 12, total_cost: 120 }],
      loading: false,
      error: null,
      showForm: true,
      form: createEmptyFeaturedListingFormData('p1'),
    });

    expect(html).toContain('Öne çıkarılan listeler');
    expect(html).toContain('Yeni öne çıkarılan liste oluştur');
    expect(html).toContain('Öne Çıkan');
  });
});
