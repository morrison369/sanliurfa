import { describe, expect, it } from 'vitest';

import {
  extractBillingHistory,
  renderBillingHistory,
} from '../billing-history';

describe('billing history helpers', () => {
  it('unwraps api response envelope', () => {
    const records = extractBillingHistory({
      data: {
        success: true,
        billing: [{ id: 'billing-1', amount: 99 }],
      },
    });

    expect(records).toHaveLength(1);
    expect(records[0]?.id).toBe('billing-1');
  });

  it('renders billing rows', () => {
    const html = renderBillingHistory({
      records: [
        {
          id: 'billing-1',
          subscriptionId: 'sub-1',
          amount: 99,
          currency: 'TRY',
          billingCycle: 'monthly',
          status: 'paid',
          createdAt: '2026-04-16T00:00:00.000Z',
        },
      ],
      selectedStatus: '',
    });

    expect(html).toContain('₺99.00');
    expect(html).toContain('Ödendi');
    expect(html).toContain('Aylık');
    expect(html).toContain('Tüm kayıtlar');
  });
});
