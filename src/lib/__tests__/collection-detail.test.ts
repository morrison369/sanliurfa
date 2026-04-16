import { describe, expect, it } from 'vitest';
import {
  extractCollectionDetail,
  extractCollectionMessage,
  renderCollectionDetail,
  type CollectionData,
  type CollectionItem,
} from '../collection-detail';

const sampleCollection: CollectionData = {
  id: 'c1',
  user_id: 'u1',
  name: 'Favoriler',
  description: 'En iyi yerler',
  icon: '📍',
  is_public: true,
  place_count: 2,
  follower_count: 5,
  created_at: '2026-04-17T00:00:00.000Z',
  updated_at: '2026-04-17T00:00:00.000Z',
};

const sampleItems: CollectionItem[] = [
  {
    id: 'i1',
    place_id: 'p1',
    place_name: 'Göbeklitepe',
    place_category: 'Tarihi',
    place_rating: 4.8,
    position: 1,
    added_at: '2026-04-17T00:00:00.000Z',
  },
];

describe('collection-detail helpers', () => {
  it('extracts nested detail payload and message', () => {
    expect(extractCollectionDetail({ data: { success: true, data: { collection: sampleCollection, items: sampleItems } } })).toEqual({
      collection: sampleCollection,
      items: sampleItems,
    });
    expect(extractCollectionMessage({ error: { message: 'Hata' } }, 'fallback')).toBe('Hata');
  });

  it('renders collection detail with actions', () => {
    const html = renderCollectionDetail({
      collection: sampleCollection,
      items: sampleItems,
      error: null,
      currentUserId: 'u2',
      isFollowing: false,
      isFollowingLoading: false,
    });

    expect(html).toContain('Favoriler');
    expect(html).toContain('Takip Et');
    expect(html).toContain('Göbeklitepe');
  });
});
