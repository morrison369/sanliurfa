import { describe, expect, it } from 'vitest';
import {
  extractUserSearchResults,
  getLevelBadgeColor,
  renderUserSearchResults,
} from '../user-search-results';

describe('user-search-results', () => {
  it('extracts nested users from api envelope', () => {
    const users = extractUserSearchResults({
      data: {
        success: true,
        data: [{ id: 'u1', full_name: 'Ali Kaya', points: 10, level: 2, created_at: '2026-01-01' }],
      },
    });

    expect(users).toHaveLength(1);
    expect(users[0]?.id).toBe('u1');
  });

  it('returns correct level badge color', () => {
    expect(getLevelBadgeColor(1)).toContain('bg-gray-100');
    expect(getLevelBadgeColor(6)).toContain('bg-purple-100');
  });

  it('renders searched users and sort buttons', () => {
    const html = renderUserSearchResults({
      query: 'ali',
      sortBy: 'points',
      users: [{ id: 'u1', full_name: 'Ali Kaya', username: 'alikaya', points: 15, level: 3, created_at: '2026-01-01' }],
      isLoading: false,
      error: null,
      hasSearched: true,
      currentUserId: 'u2',
    });

    expect(html).toContain('Ali Kaya');
    expect(html).toContain('İlgililik');
    expect(html).toContain('💬 Mesaj');
  });
});
