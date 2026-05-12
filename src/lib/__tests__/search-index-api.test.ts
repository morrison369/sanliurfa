/**
 * API Contract Tests - GET /api/search
 *
 * - q (query) min 2 chars → 422 + max 500 chars → 422 (DoS guard)
 * - 3-type dispatch (places default / reviews / events) → different helper
 * - sort allowlist (rating default / newest / name / distance) — invalid → fallback rating
 * - safeIntParam limit 1..100 default 20 + offset 0..1M default 0
 * - safeFloatParam minRating 0..5 (HARD RULE #17 float variant)
 * - Filters: category + city substring(0,100) DoS guard + placeId
 * - Analytics fire-and-forget: recordSearchQuery, updateAutocompleteIndex, recordZeroResultSearch (only if 0 results), recordSuggestionImpression
 *
 * vi.hoisted - search-engine + suggestions + metrics mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createApiContext, parseJson } from './helpers/api-test-helpers';

const {
  searchPlacesMock, searchReviewsMock, searchEventsMock, recordSearchQueryMock,
  recordSuggestionImpressionMock, updateAutocompleteIndexMock, recordZeroResultSearchMock,
} = vi.hoisted(() => ({
  searchPlacesMock: vi.fn(),
  searchReviewsMock: vi.fn(),
  searchEventsMock: vi.fn(),
  recordSearchQueryMock: vi.fn(),
  recordSuggestionImpressionMock: vi.fn(),
  updateAutocompleteIndexMock: vi.fn(),
  recordZeroResultSearchMock: vi.fn(),
}));

vi.mock('../search/search-engine', () => ({
  searchPlaces: searchPlacesMock,
  searchReviews: searchReviewsMock,
  searchEvents: searchEventsMock,
  recordSearchQuery: recordSearchQueryMock,
}));

vi.mock('../search/search-suggestions', () => ({
  recordSuggestionImpression: recordSuggestionImpressionMock,
  updateAutocompleteIndex: updateAutocompleteIndexMock,
  recordZeroResultSearch: recordZeroResultSearchMock,
}));

vi.mock('../metrics', () => ({
  recordRequest: vi.fn(),
}));

beforeEach(() => {
  searchPlacesMock.mockReset();
  searchPlacesMock.mockResolvedValue([]);
  searchReviewsMock.mockReset();
  searchReviewsMock.mockResolvedValue([]);
  searchEventsMock.mockReset();
  searchEventsMock.mockResolvedValue([]);
  recordSearchQueryMock.mockReset();
  recordSearchQueryMock.mockResolvedValue(undefined);
  recordSuggestionImpressionMock.mockReset();
  recordSuggestionImpressionMock.mockResolvedValue(undefined);
  updateAutocompleteIndexMock.mockReset();
  updateAutocompleteIndexMock.mockResolvedValue(undefined);
  recordZeroResultSearchMock.mockReset();
  recordZeroResultSearchMock.mockResolvedValue(undefined);
});

import { GET } from '../../pages/api/search';

describe('GET /api/search', () => {
  it('missing q → 422', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/search' });
    const resp = await GET(ctx);
    expect(resp.status).toBe(422);
  });

  it('q < 2 chars → 422', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/search?q=a' });
    const resp = await GET(ctx);
    expect(resp.status).toBe(422);
  });

  it('q > 500 chars → 422 DoS guard', async () => {
    const longQ = 'a'.repeat(501);
    const ctx = createApiContext({ url: `http://localhost/api/search?q=${longQ}` });
    const resp = await GET(ctx);
    expect(resp.status).toBe(422);
    expect(searchPlacesMock).not.toHaveBeenCalled();
  });

  it('default type=places + sort=rating', async () => {
    searchPlacesMock.mockResolvedValueOnce([{ id: 'p-1' }]);
    const ctx = createApiContext({ url: 'http://localhost/api/search?q=urfa' });
    const resp = await GET(ctx);
    expect(resp.status).toBe(200);
    expect(searchPlacesMock).toHaveBeenCalledWith('urfa', expect.any(Object), 'rating', 20, 0);
  });

  it('type=reviews dispatches searchReviews', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/search?q=tasty&type=reviews' });
    await GET(ctx);
    expect(searchReviewsMock).toHaveBeenCalled();
    expect(searchPlacesMock).not.toHaveBeenCalled();
  });

  it('type=events dispatches searchEvents', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/search?q=festival&type=events' });
    await GET(ctx);
    expect(searchEventsMock).toHaveBeenCalled();
  });

  it('invalid sort → fallback "rating"', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/search?q=test&sort=evil' });
    await GET(ctx);
    expect(searchPlacesMock.mock.calls[0][2]).toBe('rating');
  });

  it('valid sort allowlist (newest/name/distance) passes through', async () => {
    for (const sort of ['newest', 'name', 'distance']) {
      searchPlacesMock.mockClear();
      const ctx = createApiContext({ url: `http://localhost/api/search?q=test&sort=${sort}` });
      await GET(ctx);
      expect(searchPlacesMock.mock.calls[0][2]).toBe(sort);
    }
  });

  it('safeIntParam limit clamp max 100', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/search?q=test&limit=999' });
    await GET(ctx);
    expect(searchPlacesMock.mock.calls[0][3]).toBe(100);
  });

  it('safeFloatParam minRating clamp 0..5', async () => {
    const ctx = createApiContext({ url: 'http://localhost/api/search?q=test&minRating=8.5' });
    await GET(ctx);
    const filters = searchPlacesMock.mock.calls[0][1];
    expect(filters.minRating).toBe(5); // clamped
  });

  it('category + city DoS guard substring(0,100)', async () => {
    const longCat = 'c'.repeat(150);
    const ctx = createApiContext({
      url: `http://localhost/api/search?q=test&category=${longCat}&city=İstanbul`,
    });
    await GET(ctx);
    const filters = searchPlacesMock.mock.calls[0][1];
    expect(filters.category.length).toBe(100);
    expect(filters.city).toBe('İstanbul');
  });

  it('analytics fire-and-forget called per request (non-zero results)', async () => {
    searchPlacesMock.mockResolvedValueOnce([{ id: 'p-1' }, { id: 'p-2' }]);
    const ctx = createApiContext({ url: 'http://localhost/api/search?q=urfa' });
    await GET(ctx);
    expect(recordSearchQueryMock).toHaveBeenCalled();
    expect(updateAutocompleteIndexMock).toHaveBeenCalled();
    expect(recordSuggestionImpressionMock).toHaveBeenCalled();
    expect(recordZeroResultSearchMock).not.toHaveBeenCalled(); // had results
  });

  it('zero results → recordZeroResultSearch called (extra analytics)', async () => {
    searchPlacesMock.mockResolvedValueOnce([]);
    const ctx = createApiContext({ url: 'http://localhost/api/search?q=nonexistent' });
    await GET(ctx);
    expect(recordZeroResultSearchMock).toHaveBeenCalled();
  });

  it('hasMore = (resultCount === limit) — exact-match → true', async () => {
    const fullPage = Array.from({ length: 20 }, (_, i) => ({ id: `p-${i}` }));
    searchPlacesMock.mockResolvedValueOnce(fullPage);
    const ctx = createApiContext({ url: 'http://localhost/api/search?q=urfa' });
    const resp = await GET(ctx);
    const data = await parseJson(resp);
    expect(data.data.data.hasMore).toBe(true);
  });

  it('hasMore = false when results < limit', async () => {
    searchPlacesMock.mockResolvedValueOnce([{ id: 'p-1' }, { id: 'p-2' }]);
    const ctx = createApiContext({ url: 'http://localhost/api/search?q=urfa&limit=20' });
    const resp = await GET(ctx);
    const data = await parseJson(resp);
    expect(data.data.data.hasMore).toBe(false);
  });
});
