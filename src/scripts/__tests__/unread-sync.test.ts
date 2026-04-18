import { describe, expect, it, vi } from 'vitest';

import {
  emitMessageUnreadCount,
  emitNotificationUnreadCount,
  getConversationUnreadCount,
} from '../shared/unread-sync';

describe('unread sync helpers', () => {
  it('calculates total unread count from conversations', () => {
    expect(
      getConversationUnreadCount([
        { unreadCount: 2 },
        { unreadCount: 0 },
        { unreadCount: 3 },
      ]),
    ).toBe(5);
  });

  it('emits notification unread event', () => {
    const dispatchEvent = vi.fn();
    (globalThis as any).window = { dispatchEvent };
    (globalThis as any).CustomEvent = class {
      type: string;
      detail: unknown;
      constructor(type: string, init: { detail: unknown }) {
        this.type = type;
        this.detail = init.detail;
      }
    };

    emitNotificationUnreadCount(4);

    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0][0].type).toBe('sanliurfa:notifications-unread-change');
  });

  it('emits message unread event', () => {
    const dispatchEvent = vi.fn();
    (globalThis as any).window = { dispatchEvent };
    (globalThis as any).CustomEvent = class {
      type: string;
      detail: unknown;
      constructor(type: string, init: { detail: unknown }) {
        this.type = type;
        this.detail = init.detail;
      }
    };

    emitMessageUnreadCount(7);

    expect(dispatchEvent).toHaveBeenCalledOnce();
    expect(dispatchEvent.mock.calls[0][0].type).toBe('sanliurfa:messages-unread-change');
  });
});
