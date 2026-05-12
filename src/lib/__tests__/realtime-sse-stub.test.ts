/**
 * Unit Tests - realtime-sse.ts (root) SSEManager stub + helpers
 *
 * - SSEManager.connect (id randomBytes hex 12-char + connectedAt + userId optional spread)
 * - SSEManager.disconnect (Map.delete)
 * - SSEManager.broadcast / sendToUser (logger no-throw stubs)
 * - SSEManager.getConnectionCount (channel filter)
 * - getOnlineUsers / subscribeToOnlineUsers / getUnreadNotificationCount / subscribeToNotifications stubs
 * - sseManager === realtimeManager singleton (alias)
 */

import { describe, it, expect } from 'vitest';
import {
  SSEManager,
  sseManager,
  realtimeManager,
  getOnlineUsers,
  subscribeToOnlineUsers,
  getUnreadNotificationCount,
  subscribeToNotifications,
} from '../realtime-sse';

describe('SSEManager.connect', () => {
  it('connect - id 12-char hex + connectedAt Date + channel', () => {
    const c = sseManager.connect('test-channel');
    expect(c.id.length).toBe(12);
    expect(c.connectedAt).toBeInstanceOf(Date);
    expect(c.channel).toBe('test-channel');
  });

  it('connect - userId optional (yoksa undefined)', () => {
    const c = sseManager.connect('ch');
    expect(c.userId).toBeUndefined();
  });

  it('connect - userId verildiğinde set edilir', () => {
    const c = sseManager.connect('ch', 'u-1');
    expect(c.userId).toBe('u-1');
  });

  it('connect - her çağrı unique id (randomBytes)', () => {
    const c1 = sseManager.connect('ch');
    const c2 = sseManager.connect('ch');
    expect(c1.id).not.toBe(c2.id);
  });
});

describe('SSEManager.disconnect / getConnectionCount', () => {
  it('disconnect - Map.delete', () => {
    const c = sseManager.connect('disc-channel');
    const before = sseManager.getConnectionCount('disc-channel');
    sseManager.disconnect(c.id);
    const after = sseManager.getConnectionCount('disc-channel');
    expect(after).toBe(before - 1);
  });

  it('getConnectionCount - channel verme → tüm connections', () => {
    const total = sseManager.getConnectionCount();
    expect(typeof total).toBe('number');
    expect(total).toBeGreaterThanOrEqual(0);
  });

  it('getConnectionCount - channel filter', () => {
    const fresh = new SSEManager();
    fresh.connect('a');
    fresh.connect('a');
    fresh.connect('b');
    expect(fresh.getConnectionCount('a')).toBe(2);
    expect(fresh.getConnectionCount('b')).toBe(1);
  });
});

describe('SSEManager.broadcast / sendToUser (stub)', () => {
  it('broadcast - no throw smoke', () => {
    expect(() => sseManager.broadcast('ch', 'event', { foo: 'bar' })).not.toThrow();
  });

  it('sendToUser - no throw smoke', () => {
    expect(() => sseManager.sendToUser('u-1', 'event', { foo: 'bar' })).not.toThrow();
  });
});

describe('helper exports', () => {
  it('getOnlineUsers - empty array stub', () => {
    expect(getOnlineUsers()).toEqual([]);
  });

  it('subscribeToOnlineUsers - callback(0) sync + unsubscribe function', () => {
    let called = 0;
    let lastValue = -1;
    const unsub = subscribeToOnlineUsers((count) => {
      called++;
      lastValue = count;
    });
    expect(called).toBe(1);
    expect(lastValue).toBe(0);
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('getUnreadNotificationCount - 0 stub', () => {
    expect(getUnreadNotificationCount('any-user')).toBe(0);
  });

  it('subscribeToNotifications - callback(0) sync + unsubscribe', () => {
    let lastValue = -1;
    const unsub = subscribeToNotifications('u-1', (count) => {
      lastValue = count;
    });
    expect(lastValue).toBe(0);
    expect(() => unsub()).not.toThrow();
  });
});

describe('singleton alias', () => {
  it('sseManager === realtimeManager (backward compat alias)', () => {
    expect(sseManager).toBe(realtimeManager);
  });
});
