import { describe, expect, it } from 'vitest';

import {
  getLeaderboardButtonClass,
  renderLeaderboardUsers,
} from '../leaderboards-ui';

describe('leaderboards helpers', () => {
  it('returns active and passive button classes', () => {
    expect(getLeaderboardButtonClass(true)).toContain('bg-blue-500');
    expect(getLeaderboardButtonClass(false)).toContain('border-gray-300');
  });

  it('renders leaderboard user html', () => {
    const html = renderLeaderboardUsers([
      {
        id: 'user-1',
        rank: 1,
        avatar_url: null,
        full_name: 'Ali Veli',
        username: 'aliveli',
        points: 250,
        level: 7,
      },
    ]);

    expect(html).toContain('/kullanici/user-1');
    expect(html).toContain('#1');
    expect(html).toContain('Ali Veli');
    expect(html).toContain('Level 7');
  });
});
