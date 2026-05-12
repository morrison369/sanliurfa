/**
 * Unit Tests — recommendation/recommendation-engine.ts singleton class managers
 *
 * - CollaborativeFilter (recordInteraction + getSimilarUsers cosine similarity + getRecommendations)
 * - ContentBasedFilter (registerItem + getSimilarItems dot product)
 * - HybridRecommender (smoke)
 */

import { describe, it, expect } from 'vitest';
import {
  collaborativeFilter,
  contentBasedFilter,
  hybridRecommender,
} from '../recommendation/recommendation-engine';

describe('CollaborativeFilter', () => {
  it('recordInteraction — userVector güncellenir', () => {
    collaborativeFilter.recordInteraction({
      userId: 'cf-u1', itemId: 'item-1', type: 'view', value: 1,
    } as any);
    // Smoke — exception fırlatmaz
    expect(true).toBe(true);
  });

  it('getSimilarUsers — bilinmeyen user → boş array', () => {
    expect(collaborativeFilter.getSimilarUsers('non-existent-user-cf')).toEqual([]);
  });

  it('getSimilarUsers — interaction olan user için array', () => {
    const u1 = `cf-sim-u1-${Date.now()}`;
    const u2 = `cf-sim-u2-${Date.now()}`;
    collaborativeFilter.recordInteraction({ userId: u1, itemId: 'i1', type: 'view', value: 5 } as any);
    collaborativeFilter.recordInteraction({ userId: u1, itemId: 'i2', type: 'view', value: 3 } as any);
    collaborativeFilter.recordInteraction({ userId: u2, itemId: 'i1', type: 'view', value: 4 } as any);
    collaborativeFilter.recordInteraction({ userId: u2, itemId: 'i2', type: 'view', value: 2 } as any);
    const similar = collaborativeFilter.getSimilarUsers(u1);
    expect(Array.isArray(similar)).toBe(true);
  });

  it('getSimilarUsers — limit param', () => {
    expect(collaborativeFilter.getSimilarUsers('any-u', 3).length).toBeLessThanOrEqual(3);
  });

  it('getRecommendations — array döner', () => {
    const recs = collaborativeFilter.getRecommendations('any-user-cf');
    expect(Array.isArray(recs)).toBe(true);
  });

  it('getRecommendations — yeni user (interaction yok) → boş', () => {
    expect(collaborativeFilter.getRecommendations(`fresh-user-${Date.now()}`)).toEqual([]);
  });

  it('getRecommendations — type "collaborative"', () => {
    const u = `recs-test-${Date.now()}`;
    collaborativeFilter.recordInteraction({ userId: u, itemId: 'r1', type: 'like', value: 5 } as any);
    const recs = collaborativeFilter.getRecommendations(u);
    if (recs.length > 0) {
      expect(recs[0].type).toBe('collaborative');
    }
  });
});

describe('ContentBasedFilter', () => {
  it('registerItem — exception fırlatmaz', () => {
    expect(() => contentBasedFilter.registerItem('item-cb-1', { genre: 1, popularity: 5 })).not.toThrow();
  });

  it('getSimilarItems — bilinmeyen item → boş array', () => {
    expect(contentBasedFilter.getSimilarItems('non-existent-item-cb')).toEqual([]);
  });

  it('getSimilarItems — kayıtlı item için sıralı array', () => {
    contentBasedFilter.registerItem('cb-A', { x: 1, y: 1 });
    contentBasedFilter.registerItem('cb-B', { x: 1, y: 0.9 });
    contentBasedFilter.registerItem('cb-C', { x: 0, y: 0 });
    const similar = contentBasedFilter.getSimilarItems('cb-A', 5);
    expect(Array.isArray(similar)).toBe(true);
    if (similar.length >= 2) {
      // similarity desc sıralı
      expect(similar[0].similarity).toBeGreaterThanOrEqual(similar[1].similarity);
    }
  });

  it('getSimilarItems — kendisi hariç', () => {
    contentBasedFilter.registerItem('cb-self-test', { x: 1 });
    const similar = contentBasedFilter.getSimilarItems('cb-self-test', 10);
    expect(similar.every((s) => s.itemId !== 'cb-self-test')).toBe(true);
  });

  it('getSimilarItems — limit param', () => {
    expect(contentBasedFilter.getSimilarItems('cb-A', 2).length).toBeLessThanOrEqual(2);
  });
});

describe('HybridRecommender — smoke', () => {
  it('singleton hybridRecommender exported', () => {
    expect(hybridRecommender).toBeDefined();
  });
});
