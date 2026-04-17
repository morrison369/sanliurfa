import { describe, expect, it } from 'vitest';
import {
  extractUserSuggestions,
  renderUserSuggestionsPanel,
} from '../user-suggestions-panel';

describe('user-suggestions-panel', () => {
  it('extracts nested suggestions from api envelope', () => {
    const suggestions = extractUserSuggestions({
      data: {
        success: true,
        suggestions: [{ id: 'u1', name: 'Ali', username: 'ali', isFollowing: false }],
      },
    });

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]?.id).toBe('u1');
  });

  it('renders suggestion cards and refresh action', () => {
    const html = renderUserSuggestionsPanel(
      [
        {
          id: 'u1',
          name: 'Ali Kaya',
          username: 'alikaya',
          isFollowing: false,
          activityCount: 7,
          matchingInterests: 2,
        },
      ],
      null
    );

    expect(html).toContain('Ali Kaya');
    expect(html).toContain('@alikaya');
    expect(html).toContain('Yeni öneriler yükle');
    expect(html).toContain('Takip et');
  });
});
