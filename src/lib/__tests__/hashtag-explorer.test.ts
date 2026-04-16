import { describe, expect, it } from 'vitest';
import {
  extractHashtags,
  extractTaggedContent,
  renderHashtagExplorer,
} from '../hashtag-explorer';

describe('hashtag-explorer', () => {
  it('extracts hashtag list from nested api envelope', () => {
    const hashtags = extractHashtags({
      data: {
        success: true,
        data: [{ id: 'h1', tag_name: 'urfa', tag_slug: 'urfa', usage_count: 12 }],
      },
    });

    expect(hashtags).toHaveLength(1);
    expect(hashtags[0]?.tag_slug).toBe('urfa');
  });

  it('extracts tagged content from nested api envelope', () => {
    const content = extractTaggedContent({
      data: {
        success: true,
        hashtag: { id: 'h1', tag_name: 'urfa', tag_slug: 'urfa', usage_count: 12, is_trending: true, created_at: '2026-01-01' },
        places: [{ id: 'p1', name: 'Balıklıgöl', slug: 'balikligol', category: 'Tarihi', rating_avg: 4.8, address: 'Merkez', tagged_at: '2026-01-01' }],
        reviews: [],
        places_count: 1,
        reviews_count: 0,
      },
    });

    expect(content?.places_count).toBe(1);
    expect(content?.hashtag.tag_slug).toBe('urfa');
  });

  it('renders hashtags and tagged content', () => {
    const html = renderHashtagExplorer({
      hashtags: [{ id: 'h1', tag_name: 'urfa', tag_slug: 'urfa', usage_count: 12 }],
      selectedHashtag: 'urfa',
      taggedContent: {
        hashtag: { id: 'h1', tag_name: 'urfa', tag_slug: 'urfa', usage_count: 12, is_trending: true, created_at: '2026-01-01' },
        places: [{ id: 'p1', name: 'Balıklıgöl', slug: 'balikligol', category: 'Tarihi', rating_avg: 4.8, address: 'Merkez', tagged_at: '2026-01-01' }],
        reviews: [],
        places_count: 1,
        reviews_count: 0,
      },
      isLoadingHashtags: false,
      isLoadingContent: false,
      error: null,
    });

    expect(html).toContain('#urfa');
    expect(html).toContain('Balıklıgöl');
    expect(html).toContain('İşaretlenen Mekanlar');
  });
});
