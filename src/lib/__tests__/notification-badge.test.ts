import { describe, expect, it } from 'vitest';

import {
  formatNotificationBadgeCount,
  shouldShowNotificationBadge,
} from '../notification-badge';

describe('notification badge helpers', () => {
  it('formats unread count with 9+ cap', () => {
    expect(formatNotificationBadgeCount(0)).toBe('');
    expect(formatNotificationBadgeCount(3)).toBe('3');
    expect(formatNotificationBadgeCount(12)).toBe('9+');
  });

  it('only shows badge for positive counts', () => {
    expect(shouldShowNotificationBadge(0)).toBe(false);
    expect(shouldShowNotificationBadge(-1)).toBe(false);
    expect(shouldShowNotificationBadge(1)).toBe(true);
  });
});
