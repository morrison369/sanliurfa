import { describe, it, expect, vi } from 'vitest';
import { getPlaces, getPlaceBySlug, searchPlaces } from '../places/db';

const { queryReadMock, queryReadOneMock } = vi.hoisted(() => ({
  queryReadMock: vi.fn(),
  queryReadOneMock: vi.fn(),
}));

// Mock postgres
vi.mock('../postgres', () => ({
  query: vi.fn().mockResolvedValue({
    rows: [
      {
        id: 'place-1',
        name: 'Göbeklitepe',
        slug: 'gobeklitepe',
        category_name: 'Tarihi Yerler',
        rating: 4.8,
        review_count: 150,
      },
    ],
  }),
  queryOne: vi.fn().mockResolvedValue(null),
  queryRead: queryReadMock,
  queryReadOne: queryReadOneMock,
}));

// Mock cache
vi.mock('../cache', () => ({
  getCache: vi.fn().mockResolvedValue(null),
  setCache: vi.fn().mockResolvedValue(undefined),
  deleteCache: vi.fn().mockResolvedValue(undefined),
}));

describe('Places Module', () => {
  describe('getPlaces', () => {
    it('should return places with filters', async () => {
      queryReadOneMock.mockResolvedValueOnce({ count: 1 });
      queryReadMock.mockResolvedValueOnce({
        rows: [
          {
            id: 'place-1',
            name: 'Göbeklitepe',
            slug: 'gobeklitepe',
            category_name: 'Tarihi Yerler',
            rating: 4.8,
            review_count: 150,
          },
        ],
      });
      const result = await getPlaces({ category: 'tarihi-yerler' });
      expect(result.places).toHaveLength(1);
      expect(result.places[0].name).toBe('Göbeklitepe');
    });

    it('should return total count', async () => {
      queryReadOneMock.mockResolvedValueOnce({ count: 1 });
      queryReadMock.mockResolvedValueOnce({ rows: [] });
      const result = await getPlaces({});
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getPlaceBySlug', () => {
    it('should return place by slug', async () => {
      queryReadOneMock.mockResolvedValueOnce({
        id: 'place-1',
        name: 'Göbeklitepe',
        slug: 'gobeklitepe',
        category_name: 'Tarihi Yerler',
      });
      const place = await getPlaceBySlug('gobeklitepe');
      expect(place).toBeDefined();
      expect(place?.slug).toBe('gobeklitepe');
    });

    it('should handle slug lookup', async () => {
      queryReadOneMock.mockResolvedValueOnce(null);
      const place = await getPlaceBySlug('any-slug');
      expect(place).toBeNull();
    });
  });

  describe('searchPlaces', () => {
    it('should search places by query', async () => {
      queryReadMock.mockResolvedValueOnce({
        rows: [
          {
            id: 'place-1',
            name: 'Göbeklitepe',
            slug: 'gobeklitepe',
            category_name: 'Tarihi Yerler',
            rating: 4.8,
            review_count: 150,
          },
        ],
      });
      const result = await searchPlaces('göbekli');
      expect(result.places).toHaveLength(1);
    });
  });
});
