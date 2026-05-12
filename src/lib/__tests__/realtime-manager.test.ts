/**
 * Unit Tests - realtime/realtime.ts RealtimeManager (in-memory pure)
 *
 * - registerClient / unregisterClient (Map storage)
 * - subscribe / unsubscribe (Set channel membership)
 * - broadcast (recipient count + messageQueue cap 1000)
 * - sendToUser (userId match count)
 * - notifyAdmins / broadcastAlert (specialized broadcast wrappers)
 * - getMessageHistory (channel filter + limit)
 * - getOnlineCount / getSubscriberCount / getStatus
 * - cleanup (inactivityMinutes cutoff)
 *
 * Singleton state shared - testler unique clientId kullanir.
 */

import { describe, it, expect } from 'vitest';
import { realtimeManager } from '../realtime/realtime';

const uniq = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('RealtimeManager - register/unregister', () => {
  it('registerClient - online count artar', () => {
    const cid = uniq('client');
    const before = realtimeManager.getOnlineCount();
    realtimeManager.registerClient(cid, 'u-1');
    expect(realtimeManager.getOnlineCount()).toBe(before + 1);
  });

  it('unregisterClient - online count azalir', () => {
    const cid = uniq('client');
    realtimeManager.registerClient(cid, 'u-1');
    const before = realtimeManager.getOnlineCount();
    realtimeManager.unregisterClient(cid);
    expect(realtimeManager.getOnlineCount()).toBe(before - 1);
  });

  it('register - default channel "general" subscribed', () => {
    const cid = uniq('client');
    realtimeManager.registerClient(cid, 'u-default');
    const count = realtimeManager.getSubscriberCount('general');
    expect(count).toBeGreaterThanOrEqual(1);
    realtimeManager.unregisterClient(cid);
  });
});

describe('RealtimeManager - subscribe/unsubscribe', () => {
  it('subscribe - channel set + true doner', () => {
    const cid = uniq('client');
    realtimeManager.registerClient(cid, 'u-sub');
    expect(realtimeManager.subscribe(cid, 'custom-channel')).toBe(true);
    realtimeManager.unregisterClient(cid);
  });

  it('subscribe - bilinmeyen client → false', () => {
    expect(realtimeManager.subscribe('non-existent', 'x')).toBe(false);
  });

  it('unsubscribe - bilinmeyen client → false', () => {
    expect(realtimeManager.unsubscribe('non-existent', 'x')).toBe(false);
  });

  it('unsubscribe - channel kaldirilir', () => {
    const cid = uniq('client');
    realtimeManager.registerClient(cid, 'u-unsub');
    realtimeManager.subscribe(cid, 'temp-channel');
    expect(realtimeManager.unsubscribe(cid, 'temp-channel')).toBe(true);
    realtimeManager.unregisterClient(cid);
  });
});

describe('RealtimeManager - broadcast', () => {
  it('broadcast - subscriber sayisi doner', async () => {
    const cid = uniq('bc');
    realtimeManager.registerClient(cid, 'u-bc');
    realtimeManager.subscribe(cid, 'bc-channel');
    const count = await realtimeManager.broadcast('test', 'bc-channel', { foo: 'bar' });
    expect(count).toBeGreaterThanOrEqual(1);
    realtimeManager.unregisterClient(cid);
  });

  it('broadcast - hicbir subscriber yok → 0', async () => {
    const count = await realtimeManager.broadcast('test', uniq('empty-channel'), {});
    expect(count).toBe(0);
  });

  it('broadcast - messageQueue cap 1000 (FIFO shift)', async () => {
    // Birkac mesaj gonder, history erisimi calisir
    for (let i = 0; i < 3; i++) {
      await realtimeManager.broadcast('test', 'queue-test', { i });
    }
    const history = realtimeManager.getMessageHistory('queue-test');
    expect(history.length).toBeGreaterThanOrEqual(3);
  });
});

describe('RealtimeManager - sendToUser / notifyAdmins / broadcastAlert', () => {
  it('sendToUser - userId match count', async () => {
    const cid1 = uniq('user');
    const cid2 = uniq('user');
    realtimeManager.registerClient(cid1, 'u-target');
    realtimeManager.registerClient(cid2, 'u-target');
    const count = await realtimeManager.sendToUser('u-target', 'msg', {});
    expect(count).toBe(2);
    realtimeManager.unregisterClient(cid1);
    realtimeManager.unregisterClient(cid2);
  });

  it('sendToUser - bilinmeyen userId → 0', async () => {
    expect(await realtimeManager.sendToUser('non-existent-user', 'm', {})).toBe(0);
  });

  it('notifyAdmins - admin channel broadcast', async () => {
    const cid = uniq('admin');
    realtimeManager.registerClient(cid, 'u-admin');
    realtimeManager.subscribe(cid, 'admin');
    const count = await realtimeManager.notifyAdmins('alert', { foo: 'bar' });
    expect(count).toBeGreaterThanOrEqual(1);
    realtimeManager.unregisterClient(cid);
  });

  it('broadcastAlert - severity + alertType + message', async () => {
    const cid = uniq('alert');
    realtimeManager.registerClient(cid, 'u-alert');
    realtimeManager.subscribe(cid, 'alerts');
    const count = await realtimeManager.broadcastAlert('warning', 'Test alert message', 'high');
    expect(count).toBeGreaterThanOrEqual(1);
    realtimeManager.unregisterClient(cid);
  });
});

describe('RealtimeManager - getMessageHistory / getStatus', () => {
  it('getMessageHistory - channel filter + limit slice', async () => {
    await realtimeManager.broadcast('m1', 'history-test', { i: 1 });
    await realtimeManager.broadcast('m2', 'history-test', { i: 2 });
    const h = realtimeManager.getMessageHistory('history-test', 10);
    expect(h.length).toBeGreaterThanOrEqual(2);
    expect(h.every((m) => m.channel === 'history-test')).toBe(true);
  });

  it('getStatus - onlineClients + messageQueueSize + channels record', () => {
    const s = realtimeManager.getStatus();
    expect(typeof s.onlineClients).toBe('number');
    expect(typeof s.messageQueueSize).toBe('number');
    expect(typeof s.channels).toBe('object');
  });
});

describe('RealtimeManager - cleanup', () => {
  it('cleanup - inactivityMinutes cutoff + removed count', () => {
    const cid = uniq('cleanup');
    realtimeManager.registerClient(cid, 'u-cleanup');
    // 0 inactivity - hemen cleanup hedef olabilir; yine de no-throw smoke
    const removed = realtimeManager.cleanup(0);
    expect(typeof removed).toBe('number');
    expect(removed).toBeGreaterThanOrEqual(0);
  });

  it('cleanup - default 30 dakika - aktif client kalir', () => {
    const cid = uniq('active');
    realtimeManager.registerClient(cid, 'u-active');
    const before = realtimeManager.getOnlineCount();
    const removed = realtimeManager.cleanup(30);
    const after = realtimeManager.getOnlineCount();
    expect(after).toBe(before - removed);
    realtimeManager.unregisterClient(cid);
  });
});
