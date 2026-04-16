import { describe, expect, it } from 'vitest';

import {
  extractUserPublicProfile,
  extractUserPublicProfileBlockedStatus,
  extractUserPublicProfileFollowStatus,
  extractUserPublicProfileMessage,
  renderUserPublicProfile,
} from '../user-public-profile';

describe('user public profile helpers', () => {
  it('unwraps nested profile payload', () => {
    const profile = extractUserPublicProfile({
      data: {
        success: true,
        data: {
          id: 'u1',
          full_name: 'Ali Veli',
          stats: { followers: 1, following: 2 },
        },
      },
    });

    expect(profile?.id).toBe('u1');
    expect(profile?.full_name).toBe('Ali Veli');
  });

  it('reads follow and blocked flags', () => {
    expect(extractUserPublicProfileFollowStatus({ data: { data: { is_following: true } } })).toBe(true);
    expect(extractUserPublicProfileBlockedStatus({ data: { data: { blocked_user: true } } })).toBe(true);
  });

  it('renders profile content', () => {
    const html = renderUserPublicProfile({
      profile: {
        id: 'u1',
        full_name: 'Ali Veli',
        stats: { followers: 1, following: 2 },
        recent_activity: [],
      },
      isLoading: false,
      isFollowing: false,
      isFollowingLoading: false,
      isBlocked: false,
      isBlocking: false,
      error: null,
      currentUserId: 'u2',
    });

    expect(html).toContain('Ali Veli');
    expect(html).toContain('Takip Et');
  });

  it('extracts nested message', () => {
    expect(extractUserPublicProfileMessage({ data: { message: 'Tamam' } }, 'Hata')).toBe('Tamam');
  });
});
