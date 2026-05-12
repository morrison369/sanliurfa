/**
 * Unit Tests - analytics.ts (root) vi.mock postgres + ANALYTICS_ENABLED env
 *
 * - trackPageView (insert + skip if !isEnabled + UA truncation 255)
 * - trackEvent (engagement_events insert + JSON.stringify properties)
 * - trackSearch (delegate trackEvent with query+results_count)
 * - trackPlaceView (delegate trackEvent with place_id+place_name)
 *
 * vi.hoisted - postgres mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { queryMock } = vi.hoisted(() => ({
  queryMock: vi.fn(),
}));

vi.mock('../postgres', () => ({
  query: queryMock,
}));

beforeEach(() => {
  queryMock.mockReset();
  queryMock.mockResolvedValue({ rows: [], rowCount: 1 });
});

import { trackPageView, trackEvent, trackSearch, trackPlaceView } from '../analytics';

describe('trackPageView', () => {
  it('insert with path + userId + referrer + UA', async () => {
    await trackPageView('/test', 'u-1', 'https://google.com', 'Mozilla/5.0');
    expect(queryMock).toHaveBeenCalled();
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[0]).toContain('INSERT INTO page_views');
    expect(sqlCall[1]).toEqual(['/test', 'u-1', 'https://google.com', 'Mozilla/5.0']);
  });

  it('userAgent truncation - .slice(0, 255)', async () => {
    const longUA = 'A'.repeat(500);
    await trackPageView('/test', 'u-1', 'ref', longUA);
    const sqlCall = queryMock.mock.calls[0];
    expect((sqlCall[1][3] as string).length).toBe(255);
  });

  it('userId optional - null fallback', async () => {
    await trackPageView('/test');
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1][1]).toBeNull();
  });

  it('referrer optional - null fallback', async () => {
    await trackPageView('/test', 'u-1');
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1][2]).toBeNull();
  });

  it('exception - swallow (no throw)', async () => {
    queryMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(trackPageView('/test')).resolves.toBeUndefined();
  });
});

describe('trackEvent', () => {
  it('engagement_events insert + JSON.stringify properties', async () => {
    await trackEvent('button_click', { button: 'submit' }, 'u-1');
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[0]).toContain('engagement_events');
    expect(sqlCall[1][1]).toBe('button_click');
    expect(sqlCall[1][2]).toBe(JSON.stringify({ button: 'submit' }));
  });

  it('properties default empty object', async () => {
    await trackEvent('event-name');
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1][2]).toBe('{}');
  });

  it('userId optional - null', async () => {
    await trackEvent('event-name');
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1][0]).toBeNull();
  });

  it('exception - swallow', async () => {
    queryMock.mockRejectedValueOnce(new Error('DB error'));
    await expect(trackEvent('e')).resolves.toBeUndefined();
  });
});

describe('trackSearch / trackPlaceView delegates', () => {
  it('trackSearch - delegates to trackEvent with "search" + query+results_count', async () => {
    await trackSearch('kebap', 5, 'u-1');
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1][1]).toBe('search');
    const payload = JSON.parse(sqlCall[1][2]);
    expect(payload.query).toBe('kebap');
    expect(payload.results_count).toBe(5);
  });

  it('trackPlaceView - delegates with "place_view" + place_id+place_name', async () => {
    await trackPlaceView('p-1', 'Test Mekan', 'u-1');
    const sqlCall = queryMock.mock.calls[0];
    expect(sqlCall[1][1]).toBe('place_view');
    const payload = JSON.parse(sqlCall[1][2]);
    expect(payload.place_id).toBe('p-1');
    expect(payload.place_name).toBe('Test Mekan');
  });
});
