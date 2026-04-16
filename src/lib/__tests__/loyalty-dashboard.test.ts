import { describe, expect, it } from 'vitest';
import {
  extractLoyaltyDashboardData,
  extractLoyaltyMessage,
  renderLoyaltyDashboard,
  type LoyaltyDashboardData,
} from '../loyalty-dashboard';

const sampleData: LoyaltyDashboardData = {
  balance: {
    total_points: 1200,
    available_points: 900,
    current_tier: 'gümüş',
    lifetime_points: 2400,
  },
  tiers: [
    { tier_name: 'bronz', tier_level: 1, min_points: 0, point_multiplier: 0.1 },
    { tier_name: 'gümüş', tier_level: 2, min_points: 1000, point_multiplier: 0.2 },
    { tier_name: 'altın', tier_level: 3, min_points: 2000, point_multiplier: 0.3 },
  ],
  achievements: {
    total_unlocked: 3,
    total_available: 10,
    unlock_percentage: 30,
  },
};

describe('loyalty-dashboard helpers', () => {
  it('extracts nested loyalty data from api envelope', () => {
    expect(extractLoyaltyDashboardData({ data: { success: true, data: sampleData } })).toEqual(sampleData);
  });

  it('extracts envelope error message', () => {
    expect(extractLoyaltyMessage({ error: { message: 'Yetkisiz' } }, 'fallback')).toBe('Yetkisiz');
  });

  it('renders overview and rewards content', () => {
    const overview = renderLoyaltyDashboard({ data: sampleData, error: null, activeTab: 'overview' });
    const rewards = renderLoyaltyDashboard({ data: sampleData, error: null, activeTab: 'rewards' });

    expect(overview).toContain('Sadakat Programı');
    expect(overview).toContain('Seviye Avantajları');
    expect(rewards).toContain('/loyalty/rewards');
    expect(rewards).toContain('Ödülleri İncele');
  });
});
