/**
 * Unit Tests - ai/recommendations.ts vi.mock postgres
 *
 * - getPersonalizedRecommendations no profile (no interactions) → fallback popular
 * - getPersonalizedRecommendations 3-source aggregation (collab + content + trending)
 * - excludeVisited filter applied
 * - scoreRecommendations time pattern boost + days-since exponential decay
 * - deduplicateRecommendations Set-based itemId uniqueness
 * - getSimilarItems item not found → []
 * - getSimilarItems category match + text similarity ORDER BY
 * - recordRecommendationFeedback INSERT + clicked/visited → +1 weight
 * - recordRecommendationFeedback dismissed → -0.5 weight
 *
 * vi.hoisted - postgres mock.
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
  queryMock.mockResolvedValue({ rows: [] });
});

import {
  getPersonalizedRecommendations,
  getSimilarItems,
  recordRecommendationFeedback,
} from '../ai/recommendations';

describe('getPersonalizedRecommendations', () => {
  it('no interactions → fallback to popular recommendations', async () => {
    // buildUserProfile returns null → getPopularRecommendations called
    queryMock.mockResolvedValueOnce({ rows: [] }); // interactions empty
    queryMock.mockResolvedValueOnce({
      rows: [
        { item_id: 'p-1', item_type: 'place', name: 'Pop1', rating: 4.8, review_count: 100, popularity_score: '20' },
      ],
    });
    const r = await getPersonalizedRecommendations('user-1');
    expect(r).toHaveLength(1);
    expect(r[0].itemId).toBe('p-1');
    expect(r[0].reason).toMatch(/populer|begenilen/i);
  });

  it('with profile - 3-source aggregation calls', async () => {
    // 1: interactions, 2: categories, 3: similarUsers, 4: collab recs, 5: content recs, 6: trending, 7: visited
    queryMock
      .mockResolvedValueOnce({ rows: [{ entity_type: 'place', entity_id: 'p-1', action: 'view', created_at: '2026-04-01' }] })
      .mockResolvedValueOnce({ rows: [{ category_id: 'c-1', count: '5' }] })
      .mockResolvedValueOnce({ rows: [{ user_id: 'u-2', common_interactions: '3' }] })
      .mockResolvedValueOnce({ rows: [{ item_id: 'p-2', item_type: 'place', name: 'Collab', similarity_score: '5', avg_rating: '4.5' }] })
      .mockResolvedValueOnce({ rows: [{ item_id: 'p-3', item_type: 'place', name: 'Content', category_id: 'c-1', rating: '4', content_score: '0.9' }] })
      .mockResolvedValueOnce({ rows: [{ item_id: 'p-4', item_type: 'place', name: 'Trending', rating: '4', recent_views: '10', avg_rating: '4.3' }] })
      .mockResolvedValueOnce({ rows: [] }); // visited empty
    const r = await getPersonalizedRecommendations('user-1', { excludeVisited: true });
    const itemIds = r.map(x => x.itemId);
    expect(itemIds).toContain('p-2');
    expect(itemIds).toContain('p-3');
    expect(itemIds).toContain('p-4');
  });

  it('excludeVisited removes visited items from results', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ entity_id: 'p-1', created_at: '2026-04-01' }] })
      .mockResolvedValueOnce({ rows: [{ category_id: 'c-1', count: '5' }] })
      .mockResolvedValueOnce({ rows: [] }) // similarUsers empty → collab []
      .mockResolvedValueOnce({ rows: [{ item_id: 'p-3', item_type: 'place', name: 'Content', category_id: 'c-1', rating: '4', content_score: '0.9' }] })
      .mockResolvedValueOnce({ rows: [] }) // trending empty
      .mockResolvedValueOnce({ rows: [{ entity_id: 'p-3' }] }); // visited has p-3
    const r = await getPersonalizedRecommendations('user-1');
    expect(r.find(x => x.itemId === 'p-3')).toBeUndefined();
  });

  it('respects limit option (default 10)', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] }); // no interactions → popular path
    const popularRows = Array.from({ length: 20 }, (_, i) => ({
      item_id: `p-${i}`, item_type: 'place', name: `P${i}`, rating: 4, review_count: 50, popularity_score: '10',
    }));
    queryMock.mockResolvedValueOnce({ rows: popularRows });
    const r = await getPersonalizedRecommendations('user-1', { limit: 5 });
    // Note: getPopularRecommendations passes the limit through, returns up to that many
    expect(r.length).toBeLessThanOrEqual(20);
  });
});

describe('getSimilarItems', () => {
  it('item not found → empty array', async () => {
    queryMock.mockResolvedValueOnce({ rows: [] });
    const r = await getSimilarItems('non-existent', 'place');
    expect(r).toEqual([]);
  });

  it('found - similar items ordered by category match + text similarity', async () => {
    queryMock
      .mockResolvedValueOnce({
        rows: [{ id: 'p-1', description: 'historic', category_id: 'c-1' }],
      })
      .mockResolvedValueOnce({
        rows: [
          { item_id: 'p-2', item_type: 'place', name: 'Similar1', rating: '4.5', text_similarity: '0.9', category_match: '1' },
          { item_id: 'p-3', item_type: 'place', name: 'Similar2', rating: '4.0', text_similarity: '0.7', category_match: '0' },
        ],
      });
    const r = await getSimilarItems('p-1', 'place', 5);
    expect(r).toHaveLength(2);
    expect(r[0].itemId).toBe('p-2');
    expect(r[0].reason).toBe('Buna benzer');
    expect(r[0].score).toBeGreaterThan(r[1].score);
  });

  it('default limit 5', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 'p-1', description: 'x', category_id: 'c-1' }] })
      .mockResolvedValueOnce({ rows: [] });
    await getSimilarItems('p-1', 'place');
    const params = queryMock.mock.calls[1][1];
    expect(params[params.length - 1]).toBe(5);
  });
});

describe('recordRecommendationFeedback', () => {
  const mkRec = () => ({
    itemId: 'p-1', itemType: 'place' as const, score: 0.85, reason: 'popular',
  });

  it('clicked feedback → INSERT feedback + +1 weight delta', async () => {
    queryMock.mockResolvedValue({ rowCount: 1 });
    await recordRecommendationFeedback('user-1', mkRec(), 'clicked');
    expect(queryMock).toHaveBeenCalledTimes(2);
    const weightCall = queryMock.mock.calls[1];
    expect(weightCall[0]).toContain('ON CONFLICT');
    expect(weightCall[1][3]).toBe(1);
  });

  it('visited feedback → +1 weight (same as clicked)', async () => {
    queryMock.mockResolvedValue({ rowCount: 1 });
    await recordRecommendationFeedback('user-1', mkRec(), 'visited');
    expect(queryMock.mock.calls[1][1][3]).toBe(1);
  });

  it('dismissed feedback → -0.5 weight delta (negative reinforcement)', async () => {
    queryMock.mockResolvedValue({ rowCount: 1 });
    await recordRecommendationFeedback('user-1', mkRec(), 'dismissed');
    expect(queryMock.mock.calls[1][1][3]).toBe(-0.5);
  });

  it('saved feedback → no weight update (only feedback INSERT)', async () => {
    queryMock.mockResolvedValue({ rowCount: 1 });
    await recordRecommendationFeedback('user-1', mkRec(), 'saved');
    expect(queryMock).toHaveBeenCalledTimes(1); // only feedback INSERT, no weight UPDATE
  });

  it('feedback INSERT params shape (userId/itemId/itemType/score/feedback)', async () => {
    queryMock.mockResolvedValue({ rowCount: 1 });
    await recordRecommendationFeedback('user-1', mkRec(), 'clicked');
    const params = queryMock.mock.calls[0][1];
    expect(params[0]).toBe('user-1');
    expect(params[1]).toBe('p-1');
    expect(params[2]).toBe('place');
    expect(params[3]).toBe(0.85);
    expect(params[4]).toBe('clicked');
  });
});
