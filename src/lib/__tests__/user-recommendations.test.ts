import { describe, expect, it } from 'vitest';

import { renderUserRecommendations } from '../user-recommendations';

describe('user recommendations helpers', () => {
  it('renders users and follow state', () => {
    const html = renderUserRecommendations(
      [
        {
          id: 'user-1',
          full_name: 'Ali Veli',
          avatar_url: null,
          level: 5,
          review_count: 12,
        },
      ],
      new Set(['user-1']),
    );

    expect(html).toContain('/kullanici/user-1');
    expect(html).toContain('Ali Veli');
    expect(html).toContain('Takibi bırak');
  });
});
