/**
 * Unit Tests - promotions/promotions-management.ts vi.mock postgres+cache
 *
 * - getPromotion (cache hit + DB + 600s TTL)
 * - getPlacePromotions (active + end_date > NOW filter + 300s TTL)
 * - validatePromotion (coupon code uppercase normalization + min purchase + percentage discount)
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, queryManyMock, getCacheMock, setCacheMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: vi.fn(),
  queryOne: queryOneMock,
  queryMany: queryManyMock,
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
  deleteCache: vi.fn().mockResolvedValue(1),
}));

beforeEach(() => {
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  getCacheMock.mockReset();
  setCacheMock.mockReset();
  getCacheMock.mockResolvedValue(null);
  setCacheMock.mockResolvedValue('OK');
});

import { getPromotion, getPlacePromotions, validatePromotion } from '../promotions/promotions-management';

const mkPromotion = (overrides: any = {}) => ({
  id: 'promo-1',
  place_id: 'place-1',
  title: 'Spring Sale',
  description: 'Discount',
  discount_type: 'percentage',
  discount_value: 20,
  coupon_code: 'SPRING20',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  max_uses: 100,
  current_uses: 5,
  minimum_purchase: 50,
  applicable_categories: null,
  is_active: true,
  created_by: 'admin',
  created_at: 't',
  updated_at: 't',
  ...overrides,
});

describe('getPromotion', () => {
  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce(mkPromotion());
    const r = await getPromotion('promo-1');
    expect(r?.id).toBe('promo-1');
    expect(queryOneMock).not.toHaveBeenCalled();
  });

  it('cache miss + DB fetch + 600s TTL', async () => {
    queryOneMock.mockResolvedValueOnce(mkPromotion());
    const r = await getPromotion('promo-1');
    expect(r?.id).toBe('promo-1');
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(600);
  });

  it('not found - null', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await getPromotion('non-existent')).toBeNull();
  });

  it('exception - null', async () => {
    queryOneMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await getPromotion('p-1')).toBeNull();
  });
});

describe('getPlacePromotions', () => {
  it('active + end_date filter + 300s TTL', async () => {
    queryManyMock.mockResolvedValueOnce([mkPromotion(), mkPromotion({ id: 'promo-2' })]);
    const r = await getPlacePromotions('place-1');
    expect(r).toHaveLength(2);
    const sqlCall = queryManyMock.mock.calls[0];
    expect(sqlCall[0]).toContain('is_active = true');
    expect(sqlCall[0]).toContain('end_date > NOW()');
    const setCall = setCacheMock.mock.calls[0];
    expect(setCall[2]).toBe(300);
  });

  it('cache hit - DB skip', async () => {
    getCacheMock.mockResolvedValueOnce([mkPromotion()]);
    const r = await getPlacePromotions('place-1');
    expect(r).toHaveLength(1);
    expect(queryManyMock).not.toHaveBeenCalled();
  });
});

describe('validatePromotion', () => {
  it('valid coupon - percentage discount calc', async () => {
    queryOneMock.mockResolvedValueOnce(mkPromotion({ minimum_purchase: 50 }));
    const r = await validatePromotion('SPRING20', 100);
    expect(r.valid).toBe(true);
    expect(r.discount).toBe(20); // 100 * 20 / 100
  });

  it('coupon code uppercase normalization', async () => {
    queryOneMock.mockResolvedValueOnce(mkPromotion());
    await validatePromotion('spring20', 100);
    const sqlCall = queryOneMock.mock.calls[0];
    expect(sqlCall[1]).toEqual(['SPRING20']); // uppercase
  });

  it('coupon yok - "geçersiz veya süresi dolmuş"', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    const r = await validatePromotion('INVALID', 100);
    expect(r.valid).toBe(false);
    expect(r.message).toContain('geçersiz');
  });

  it('purchase < minimum - "Minimum X₺ alış gerekli"', async () => {
    queryOneMock.mockResolvedValueOnce(mkPromotion({ minimum_purchase: 100 }));
    const r = await validatePromotion('SPRING20', 50);
    expect(r.valid).toBe(false);
    expect(r.message).toContain('Minimum 100');
  });
});
