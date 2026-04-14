import { describe, it, expect, beforeEach } from 'vitest';
import {
  indexDocument,
  search,
  getDocument,
  deleteDocument,
  getSuggestions,
  getSearchStats,
  SearchDocument,
} from '../search/advanced-search';

describe('Advanced Search', () => {
  beforeEach(async () => {
    // Clear and re-index test data
    const testDoc: SearchDocument = {
      id: 'test_1',
      type: 'place',
      title: 'Balıklıgöl',
      description: 'Şanlıurfa\'nın tarihi gölü',
      content: 'Kutsal balıklarıyla ünlü.',
      tags: ['tarihi', 'dini'],
      category: 'religious',
      location: { lat: 37.1591, lon: 38.7969 },
      rating: 4.8,
      reviewCount: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await indexDocument(testDoc);
  });

  describe('indexDocument', () => {
    it('should index a document', async () => {
      const doc: SearchDocument = {
        id: 'test_2',
        type: 'place',
        title: 'Göbeklitepe',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await indexDocument(doc);
      const retrieved = await getDocument('test_2');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.title).toBe('Göbeklitepe');
    });
  });

  describe('search', () => {
    it('should search by query', async () => {
      const results = await search({ q: 'Balıklıgöl' });
      expect(results.total).toBeGreaterThan(0);
    });

    it('should filter by type', async () => {
      const results = await search({ type: 'place' });
      expect(results.documents.every(d => d.type === 'place')).toBe(true);
    });

    it('should filter by category', async () => {
      const results = await search({ category: 'religious' });
      expect(results.documents.every(d => d.category === 'religious')).toBe(true);
    });

    it('should filter by tags', async () => {
      const results = await search({ tags: ['tarihi'] });
      expect(results.total).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const results = await search({ page: 1, pageSize: 1 });
      expect(results.page).toBe(1);
      expect(results.pageSize).toBe(1);
    });

    it('should sort by rating', async () => {
      const results = await search({ sort: 'rating' });
      if (results.documents.length > 1) {
        expect(results.documents[0].rating || 0).toBeGreaterThanOrEqual(results.documents[1].rating || 0);
      }
    });
  });

  describe('getDocument', () => {
    it('should return null for non-existent document', async () => {
      const doc = await getDocument('non_existent');
      expect(doc).toBeNull();
    });

    it('should return document by id', async () => {
      const doc = await getDocument('test_1');
      expect(doc).not.toBeNull();
      expect(doc?.id).toBe('test_1');
    });
  });

  describe('deleteDocument', () => {
    it('should delete document', async () => {
      const deleted = await deleteDocument('test_1');
      expect(deleted).toBe(true);
      const doc = await getDocument('test_1');
      expect(doc).toBeNull();
    });

    it('should return false for non-existent document', async () => {
      const deleted = await deleteDocument('non_existent');
      expect(deleted).toBe(false);
    });
  });

  describe('getSuggestions', () => {
    it('should return suggestions', async () => {
      const suggestions = await getSuggestions('Balık');
      expect(Array.isArray(suggestions)).toBe(true);
    });
  });

  describe('getSearchStats', () => {
    it('should return stats', () => {
      const stats = getSearchStats();
      expect(stats).toHaveProperty('totalDocuments');
      expect(stats).toHaveProperty('indexSize');
      expect(stats).toHaveProperty('types');
    });
  });
});
