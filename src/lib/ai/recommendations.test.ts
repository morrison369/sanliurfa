import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as recommendations from './recommendations';
import { query } from '../postgres';

vi.mock('../postgres', () => ({
  query: vi.fn(),
}));

describe('AI Recommendations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPersonalizedRecommendations', () => {
    it('should return popular items for new users without profile', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] } as any);

      const result = await recommendations.getPersonalizedRecommendations('user-123');

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it('should handle user with interactions', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [
            { entity_type: 'place', entity_id: 'place-1', action: 'view', created_at: new Date() },
            { entity_type: 'place', entity_id: 'place-2', action: 'like', created_at: new Date() },
          ],
        } as any)
        .mockResolvedValueOnce({
          rows: [{ category_id: 'restaurant', count: '5' }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ id: 'place-1' }] } as any);

      const result = await recommendations.getPersonalizedRecommendations('user-123', { limit: 5 });

      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should exclude visited items when requested', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [{ entity_type: 'place', entity_id: 'place-1', action: 'view', created_at: new Date() }],
        } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [] } as any)
        .mockResolvedValueOnce({ rows: [{ entity_id: 'place-1' }] } as any);

      const result = await recommendations.getPersonalizedRecommendations('user-123', { excludeVisited: true });

      expect(result.every(r => r.itemId !== 'place-1')).toBe(true);
    });
  });

  describe('getSimilarItems', () => {
    it('should return empty array for non-existent item', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] } as any);

      const result = await recommendations.getSimilarItems('non-existent', 'place');

      expect(result).toEqual([]);
    });

    it('should find similar items by category', async () => {
      vi.mocked(query)
        .mockResolvedValueOnce({
          rows: [{ id: 'place-1', name: 'Test Place', description: 'A test place', category_id: 'restaurant' }],
        } as any)
        .mockResolvedValueOnce({
          rows: [
            { item_id: 'place-2', item_type: 'place', name: 'Similar Place', rating: 4.5, text_similarity: 0.8, category_match: 1 },
          ],
        } as any);

      const result = await recommendations.getSimilarItems('place-1', 'place', 5);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].itemId).toBe('place-2');
      expect(result[0].reason).toBe('Buna benzer');
    });
  });

  describe('recordRecommendationFeedback', () => {
    it('should record feedback successfully', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] } as any);

      const recommendation = {
        itemId: 'place-1',
        itemType: 'place' as const,
        score: 0.85,
        reason: 'Test reason',
      };

      await expect(
        recommendations.recordRecommendationFeedback('user-123', recommendation, 'clicked')
      ).resolves.not.toThrow();

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO recommendation_feedback'),
        expect.any(Array)
      );
    });

    it('should update model weights on positive feedback', async () => {
      vi.mocked(query).mockResolvedValue({ rows: [] } as any);

      const recommendation = {
        itemId: 'place-1',
        itemType: 'place' as const,
        score: 0.9,
        reason: 'Test reason',
      };

      await recommendations.recordRecommendationFeedback('user-123', recommendation, 'visited');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO recommendation_weights'),
        expect.arrayContaining([expect.any(String), expect.any(String), expect.any(Number)])
      );
    });
  });
});
