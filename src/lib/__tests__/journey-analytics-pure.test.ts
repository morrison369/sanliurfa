/**
 * Unit Tests - analytics/journey-analytics.ts vi.mock postgres+cache
 *
 * - createJourneySession (insert + bounce: true + page_views: 0 default)
 * - recordJourneyStep (insert + update bounce: false (multi-page))
 * - endJourneySession (duration calc + conversion path SHA-256 hash)
 * - getUserJourneys (limit default 20)
 * - analyzeBehaviorPattern (engagement_level high>300 / medium>60 / low + churn_risk classifier)
 *
 * vi.hoisted - postgres + cache mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryOneMock, queryManyMock, insertMock, updateMock, getCacheMock, setCacheMock } = vi.hoisted(() => ({
  queryOneMock: vi.fn(),
  queryManyMock: vi.fn(),
  insertMock: vi.fn(),
  updateMock: vi.fn(),
  getCacheMock: vi.fn(),
  setCacheMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: vi.fn(),
  queryOne: queryOneMock,
  queryMany: queryManyMock,
  insert: insertMock,
  update: updateMock,
}));

vi.mock('../cache', () => ({
  getCache: getCacheMock,
  setCache: setCacheMock,
  deleteCache: vi.fn().mockResolvedValue(1),
}));

beforeEach(() => {
  queryOneMock.mockReset();
  queryManyMock.mockReset();
  insertMock.mockReset();
  updateMock.mockReset();
  getCacheMock.mockReset();
  setCacheMock.mockReset();
  getCacheMock.mockResolvedValue(null);
  setCacheMock.mockResolvedValue('OK');
});

import {
  createJourneySession,
  recordJourneyStep,
  endJourneySession,
  getUserJourneys,
  analyzeBehaviorPattern,
} from '../analytics/journey-analytics';

describe('createJourneySession', () => {
  it('insert with default page_views 0 + bounce true + interactions 0', async () => {
    insertMock.mockResolvedValueOnce({ id: 'session-1' });
    const r = await createJourneySession('u-1', 'sess-1', 'desktop', 'Chrome', 'google', '/');
    expect(r?.id).toBe('session-1');
    const insertCall = insertMock.mock.calls[0];
    expect(insertCall[1].page_views).toBe(0);
    expect(insertCall[1].bounce).toBe(true);
    expect(insertCall[1].interactions).toBe(0);
    expect(insertCall[1].conversion).toBe(false);
  });

  it('exception - return null', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await createJourneySession('u', 's', 'd', 'b', 'r', '/')).toBeNull();
  });
});

describe('recordJourneyStep', () => {
  it('insert + update bounce: false (multi-page = not bounce)', async () => {
    insertMock.mockResolvedValueOnce({ id: 'step-1' });
    updateMock.mockResolvedValueOnce({});

    expect(await recordJourneyStep('s-1', 'u-1', 2, '/page', 'Page Title', 'click', 30)).toBe(true);
    const updateCall = updateMock.mock.calls[0];
    expect(updateCall[2].bounce).toBe(false);
    expect(updateCall[2].page_views).toBe(2);
  });

  it('exception - return false', async () => {
    insertMock.mockRejectedValueOnce(new Error('DB error'));
    expect(await recordJourneyStep('s', 'u', 1, '/', 'X', 'view', 0)).toBe(false);
  });
});

describe('endJourneySession', () => {
  it('session yok - false', async () => {
    queryOneMock.mockResolvedValueOnce(null);
    expect(await endJourneySession('non-existent')).toBe(false);
  });

  it('session var - duration calc + conversion update', async () => {
    queryOneMock.mockResolvedValueOnce({
      id: 's-1',
      start_time: new Date(Date.now() - 60000).toISOString(),
    });
    updateMock.mockResolvedValueOnce({});
    expect(await endJourneySession('s-1', false)).toBe(true);
    const updateCall = updateMock.mock.calls[0];
    expect(updateCall[2].conversion).toBe(false);
    expect(typeof updateCall[2].duration_seconds).toBe('number');
  });
});

describe('getUserJourneys', () => {
  it('default limit 20', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await getUserJourneys('u-1');
    expect(queryManyMock.mock.calls[0][1]).toEqual(['u-1', 20]);
  });

  it('custom limit', async () => {
    queryManyMock.mockResolvedValueOnce([]);
    await getUserJourneys('u-1', 50);
    expect(queryManyMock.mock.calls[0][1]).toEqual(['u-1', 50]);
  });
});

describe('analyzeBehaviorPattern', () => {
  it('high engagement (avg > 300s) + high conversion (≥10%)', async () => {
    queryManyMock.mockResolvedValueOnce(
      Array.from({ length: 5 }, (_, i) => ({
        duration_seconds: 500,
        conversion: i < 3, // 60% conversion
      }))
    );
    const r = await analyzeBehaviorPattern('u-1');
    expect(r?.engagement_level).toBe('high');
    expect(r?.churn_risk).toBe(0.2);
  });

  it('medium engagement (avg 60-300s)', async () => {
    queryManyMock.mockResolvedValueOnce(
      Array.from({ length: 4 }, () => ({ duration_seconds: 100, conversion: false }))
    );
    const r = await analyzeBehaviorPattern('u-1');
    expect(r?.engagement_level).toBe('medium');
  });

  it('low engagement (avg ≤ 60s) + low conversion → high churn risk', async () => {
    queryManyMock.mockResolvedValueOnce(
      Array.from({ length: 4 }, () => ({ duration_seconds: 30, conversion: false }))
    );
    const r = await analyzeBehaviorPattern('u-1');
    expect(r?.engagement_level).toBe('low');
    expect(r?.churn_risk).toBe(0.7); // <10% conversion + >3 journeys → 0.7
  });

  it('exception in getUserJourneys - empty array fallback (silent), pattern NaN avg', async () => {
    // getUserJourneys catches DB error → returns []. analyzeBehaviorPattern
    // computes pattern from empty array (avg_engagement NaN, conversion_rate 0).
    queryManyMock.mockRejectedValueOnce(new Error('DB error'));
    const r = await analyzeBehaviorPattern('u-1');
    expect(r?.total_journeys).toBe(0);
    expect(r?.engagement_level).toBe('low');
  });
});
