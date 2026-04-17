import { describe, expect, it } from 'vitest';

import {
  createEmptyCampaignFormData,
  extractMarketingCampaigns,
  renderMarketingCampaignBuilder,
} from '../marketing-campaign-builder';

describe('marketing campaign builder helpers', () => {
  it('extracts nested campaigns payload', () => {
    const campaigns = extractMarketingCampaigns({
      success: true,
      data: {
        success: true,
        data: [{ id: 'c1', place_id: 'p1', name: 'İlk Kampanya', campaign_type: 'promotion', status: 'draft', budget: 1000, spent: 0, created_at: '2026-04-01T00:00:00.000Z' }],
      },
    });

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].name).toBe('İlk Kampanya');
  });

  it('renders builder content', () => {
    const html = renderMarketingCampaignBuilder({
      campaigns: [{ id: 'c1', place_id: 'p1', name: 'İlk Kampanya', campaign_type: 'promotion', status: 'draft', budget: 1000, spent: 0, created_at: '2026-04-01T00:00:00.000Z' }],
      loading: false,
      error: null,
      showForm: true,
      form: createEmptyCampaignFormData('p1'),
    });

    expect(html).toContain('Pazarlama kampanyaları');
    expect(html).toContain('Yeni reklam kampanyası oluştur');
    expect(html).toContain('İlk Kampanya');
  });
});
