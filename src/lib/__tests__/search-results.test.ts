import { describe, expect, it } from 'vitest';
import {
  createSearchResultsState,
  extractCollectionResults,
  extractPlaceResults,
  extractUserResults,
  renderSearchResults,
} from '../search-results';

describe('search-results helpers', () => {
  it('extracts places, users and filters collections from envelopes', () => {
    const places = extractPlaceResults({
      data: {
        success: true,
        data: {
          results: [{ id: 'p1', name: 'Göbeklitepe', category: 'Tarihi Yer' }],
        },
      },
    });
    const users = extractUserResults({
      data: {
        success: true,
        data: [{ id: 'u1', full_name: 'Ali Kaya', username: 'ali' }],
      },
    });
    const collections = extractCollectionResults(
      {
        data: {
          success: true,
          data: [
            { id: 'c1', name: 'Urfa Favorileri', description: 'Şehir içi gezi' },
            { id: 'c2', name: 'İstanbul', description: 'Başka şehir' },
          ],
        },
      },
      'urfa',
    );

    expect(places).toHaveLength(1);
    expect(users).toHaveLength(1);
    expect(collections).toHaveLength(1);
    expect(collections[0]?.id).toBe('c1');
  });

  it('renders results and empty state', () => {
    const empty = renderSearchResults(createSearchResultsState('a'));
    const filled = renderSearchResults({
      query: 'urfa',
      isLoading: false,
      hasSearched: true,
      error: null,
      places: [{ id: 'p1', name: 'Balıklıgöl', category: 'Tarihi Yer', rating: 4.5 }],
      users: [{ id: 'u1', full_name: 'Ayşe Demir', username: 'ayse' }],
      collections: [{ id: 'c1', name: 'Urfa Gezi', description: 'En iyi rotalar' }],
    });

    expect(empty).toContain('En az 2 karakter girin');
    expect(filled).toContain('Balıklıgöl');
    expect(filled).toContain('Ayşe Demir');
    expect(filled).toContain('Urfa Gezi');
  });
});
