import { describe, expect, it } from 'vitest';

import {
  extractRewardRedemption,
  extractRewardsCatalog,
  renderRewardsCatalog,
} from '../rewards-catalog-ui';

describe('rewards catalog helpers', () => {
  it('unwraps nested api response envelope', () => {
    const catalog = extractRewardsCatalog({
      data: {
        success: true,
        data: {
          rewards: [{ id: 'reward-1', reward_name: 'Kahve', points_cost: 150 }],
          promotionalOffers: [{ id: 'promo-1', offer_name: 'Hafta Sonu', valid_from: '2026-04-16', valid_until: '2026-04-20' }],
        },
      },
    });

    expect(catalog.rewards).toHaveLength(1);
    expect(catalog.promos).toHaveLength(1);
    expect(catalog.rewards[0]?.reward_name).toBe('Kahve');
  });

  it('extracts redemption code from nested response', () => {
    const redemption = extractRewardRedemption({
      data: {
        success: true,
        data: {
          redemptionCode: 'RWD-ABC-123',
          message: 'Ödül başarıyla kazanıldı',
        },
      },
    });

    expect(redemption.redemptionCode).toBe('RWD-ABC-123');
    expect(redemption.message).toBe('Ödül başarıyla kazanıldı');
  });

  it('renders reward cards and promo content', () => {
    const html = renderRewardsCatalog({
      rewards: [
        {
          id: 'reward-1',
          reward_name: 'Filtre Kahve',
          description: 'Bir adet ücretsiz içecek',
          category: 'içecek',
          points_cost: 250,
          available_stock: 3,
        },
      ],
      promos: [
        {
          id: 'promo-1',
          offer_name: 'Hafta Sonu İndirimi',
          discount_percent: 20,
          valid_from: '2026-04-16',
          valid_until: '2026-04-20',
        },
      ],
      selectedCategory: 'all',
      message: { type: 'success', text: 'Hazır' },
    });

    expect(html).toContain('Filtre Kahve');
    expect(html).toContain('250');
    expect(html).toContain('Hafta Sonu İndirimi');
    expect(html).toContain('Hazır');
  });
});
