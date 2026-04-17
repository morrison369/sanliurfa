import { describe, expect, it } from 'vitest';
import {
  extractCollections,
  extractCreatedCollection,
  renderCollectionsManager,
} from '../collections-manager';

describe('collections-manager', () => {
  it('extracts collections from nested or legacy payload', () => {
    const nested = extractCollections({
      data: {
        data: [{ id: 'c1', user_id: 'u1', name: 'Favoriler', is_public: false, place_count: 2, created_at: '2026-01-01', updated_at: '2026-01-01' }],
      },
    });

    const legacy = extractCollections({
      data: [{ id: 'c2', user_id: 'u1', name: 'Gezilecek', is_public: true, place_count: 3, created_at: '2026-01-01', updated_at: '2026-01-01' }],
    });

    expect(nested[0]?.id).toBe('c1');
    expect(legacy[0]?.id).toBe('c2');
  });

  it('extracts created collection from payload', () => {
    const created = extractCreatedCollection({
      data: {
        data: { id: 'c1', user_id: 'u1', name: 'Favoriler', is_public: false, place_count: 2, created_at: '2026-01-01', updated_at: '2026-01-01' },
      },
    });

    expect(created?.id).toBe('c1');
  });

  it('renders collection cards', () => {
    const html = renderCollectionsManager({
      collections: [{ id: 'c1', user_id: 'u1', name: 'Favoriler', icon: '📍', is_public: true, place_count: 2, follower_count: 5, created_at: '2026-01-01', updated_at: '2026-01-01' }],
      isLoading: false,
      isCreating: false,
      error: null,
      form: { name: '', description: '', icon: '📍', is_public: false },
    });

    expect(html).toContain('Yeni koleksiyon oluştur');
    expect(html).toContain('Favoriler');
    expect(html).toContain('🌍 Herkese açık');
  });
});
