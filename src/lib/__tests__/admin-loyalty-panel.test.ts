import { describe, expect, it } from 'vitest';

import { extractAdminLoyaltyRewards, renderAdminLoyaltyPanel } from '../admin-loyalty-panel';

describe('admin loyalty panel helpers', () => {
  it('extracts nested rewards payload', () => {
    const rewards = extractAdminLoyaltyRewards({
      data: {
        data: [{ id: 'r1', reward_name: 'Ücretsiz Kahve', category: 'İçecek', points_cost: 250 }],
      },
    });

    expect(rewards).toHaveLength(1);
    expect(rewards[0].reward_name).toBe('Ücretsiz Kahve');
  });

  it('renders loyalty rewards content', () => {
    const html = renderAdminLoyaltyPanel({
      activeTab: 'rewards',
      rewards: [{ id: 'r1', reward_name: 'Ücretsiz Kahve', category: 'İçecek', points_cost: 250 }],
      error: null,
    });

    expect(html).toContain('Ödül listesi');
    expect(html).toContain('Ücretsiz Kahve');
    expect(html).toContain('Ödül kategorisi');
  });
});
