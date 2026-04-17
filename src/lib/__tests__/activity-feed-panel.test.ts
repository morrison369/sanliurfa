import { describe, expect, it } from 'vitest';

import {
  createActivityFeedState,
  extractActivityFeedItems,
  formatActivityTime,
  getActivityDescription,
  renderActivityFeed,
} from '../activity-feed-panel';

describe('activity feed panel helpers', () => {
  it('extracts activity items from payload', () => {
    const items = extractActivityFeedItems({
      success: true,
      data: [
        {
          id: 'act-1',
          user_id: 'user-1',
          user_name: 'Ali Kaya',
          user_username: 'alikaya',
          user_avatar: 'https://example.com/a.jpg',
          user_level: 3,
          action_type: 'review_created',
          reference_type: 'place',
          reference_id: 'place-1',
          metadata: { placeName: 'Gumruk Han' },
          created_at: '2026-04-17T00:00:00.000Z',
        },
      ],
    });

    expect(items).toHaveLength(1);
    expect(items[0]?.userName).toBe('Ali Kaya');
    expect(items[0]?.actionType).toBe('review_created');
  });

  it('renders html and descriptions', () => {
    const state = createActivityFeedState();
    state.loading = false;
    state.items = [
      {
        id: 'act-1',
        userId: 'user-1',
        userName: 'Ali Kaya',
        userUsername: 'alikaya',
        userAvatar: null,
        userLevel: 3,
        actionType: 'review_created',
        referenceType: 'place',
        referenceId: 'place-1',
        metadata: { placeName: 'Gumruk Han' },
        createdAt: '2026-04-17T00:00:00.000Z',
      },
    ];

    expect(getActivityDescription(state.items[0]!)).toContain('Gumruk Han');
    expect(formatActivityTime('2026-04-17T00:00:00.000Z', new Date('2026-04-17T00:30:00.000Z'))).toBe('30d');

    const html = renderActivityFeed(state);
    expect(html).toContain('Ali Kaya');
    expect(html).toContain('data-activity-filter="reviews"');
    expect(html).toContain('Gumruk Han');
  });
});
