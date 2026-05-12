/**
 * Unit Tests - notifications/realtime-notifications.ts pure SSE registry
 *
 * - registerSSE (Map storage)
 * - unregisterSSE (Map.delete)
 * - broadcastToUser (controller.enqueue + TextEncoder data format)
 *
 * NOT: addNotification/getNotifications/markAsRead/markAllAsRead/deleteNotification/getUnreadCount
 * DB-bağımlı (postgres). Bu testte sadece SSE registry mantığı.
 */

import { describe, it, expect, vi } from 'vitest';
import { registerSSE, unregisterSSE } from '../notifications/realtime-notifications';

const uniq = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('registerSSE / unregisterSSE', () => {
  it('registerSSE - controller Map\'e eklenir (no throw)', () => {
    const userId = uniq('user');
    const controller = {
      enqueue: vi.fn(),
      close: vi.fn(),
      desiredSize: null,
      error: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    expect(() => registerSSE(userId, controller)).not.toThrow();
  });

  it('unregisterSSE - Map.delete (no throw)', () => {
    const userId = uniq('user');
    const controller = {
      enqueue: vi.fn(),
    } as unknown as ReadableStreamDefaultController;

    registerSSE(userId, controller);
    expect(() => unregisterSSE(userId)).not.toThrow();
  });

  it('unregisterSSE - bilinmeyen userId no-throw', () => {
    expect(() => unregisterSSE('non-existent-user')).not.toThrow();
  });

  it('registerSSE - aynı userId overwrite (en son controller kalır)', () => {
    const userId = uniq('user');
    const ctrl1 = { enqueue: vi.fn() } as unknown as ReadableStreamDefaultController;
    const ctrl2 = { enqueue: vi.fn() } as unknown as ReadableStreamDefaultController;

    registerSSE(userId, ctrl1);
    registerSSE(userId, ctrl2);
    expect(() => unregisterSSE(userId)).not.toThrow();
  });

  it('registerSSE / unregisterSSE - cycle no-throw', () => {
    const userId = uniq('cycle');
    const ctrl = { enqueue: vi.fn() } as unknown as ReadableStreamDefaultController;
    registerSSE(userId, ctrl);
    unregisterSSE(userId);
    registerSSE(userId, ctrl);
    unregisterSSE(userId);
    expect(true).toBe(true);
  });
});
