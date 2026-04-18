import { describe, expect, it, vi } from 'vitest';

import {
  emitMessageUnreadCount,
  emitNotificationUnreadCount,
  getConversationUnreadCount,
  subscribeToMessageUnread,
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

  it('subscribes to message unread event', () => {
    const listeners = new Map<string, (event: Event) => void>();
    (globalThis as any).window = {
      addEventListener: vi.fn((name: string, handler: (event: Event) => void) => {
        listeners.set(name, handler);
      }),
      removeEventListener: vi.fn((name: string) => {
        listeners.delete(name);
      }),
    };
    (globalThis as any).CustomEvent = class extends Event {
      detail: unknown;
      constructor(type: string, init: { detail: unknown }) {
        super(type);
        this.detail = init.detail;
      }
    };

    const handler = vi.fn();
    const unsubscribe = subscribeToMessageUnread(handler);
    listeners.get('sanliurfa:messages-unread-change')?.(
      new CustomEvent('sanliurfa:messages-unread-change', { detail: { count: 6 } }),
    );

    expect(handler).toHaveBeenCalledWith(6);

    unsubscribe();
    expect((globalThis as any).window.removeEventListener).toHaveBeenCalledWith(
      'sanliurfa:messages-unread-change',
      expect.any(Function),
    );
  });
});
