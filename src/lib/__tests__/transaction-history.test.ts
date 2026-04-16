import { describe, expect, it } from 'vitest';

import {
  extractTransactionHistoryData,
  renderTransactionHistory,
} from '../transaction-history';

describe('transaction history helpers', () => {
  it('unwraps nested api envelope', () => {
    const result = extractTransactionHistoryData({
      data: {
        success: true,
        data: {
          transactions: [{ id: '1', transaction_type: 'earn' }],
          pagination: { limit: 20, offset: 0, total: 1 },
        },
      },
    });

    expect(result.transactions).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('renders transaction list and pagination', () => {
    const html = renderTransactionHistory({
      transactions: [
        {
          id: '1',
          transaction_type: 'earn',
          points_amount: 15,
          transaction_reason: 'Mekan ziyareti',
          balance_before: 10,
          balance_after: 25,
          created_at: '2026-04-16T00:00:00.000Z',
          is_expired: false,
        },
      ],
      pagination: { limit: 20, offset: 0, total: 40 },
      selectedType: '',
    });

    expect(html).toContain('Mekan ziyareti');
    expect(html).toContain('data-transaction-page="next"');
    expect(html).toContain('data-transaction-type=""');
  });
});
