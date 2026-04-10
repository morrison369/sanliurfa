import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ListenerMap = Record<string, Array<(event?: { data?: string }) => void>>;

class FakeEventSource {
  static instances: FakeEventSource[] = [];

  public listeners: ListenerMap = {};
  public closed = false;
  public readonly url: string;

  constructor(url: string) {
    this.url = url;
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, callback: (event?: { data?: string }) => void) {
    this.listeners[type] ||= [];
    this.listeners[type].push(callback);
  }

  emit(type: string, event?: { data?: string }) {
    for (const callback of this.listeners[type] || []) {
      callback(event);
    }
  }

  close() {
    this.closed = true;
  }

  static reset() {
    FakeEventSource.instances = [];
  }
}

describe('Realtime SSE lifecycle hardening', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    FakeEventSource.reset();
    vi.stubGlobal('EventSource', FakeEventSource as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('should schedule only one reconnect per stream and stop reconnecting after disconnect', async () => {
    const { realtimeManager } = await import('../realtime-sse');

    realtimeManager.connect();
    expect(FakeEventSource.instances).toHaveLength(1);

    const first = FakeEventSource.instances[0];
    first.emit('error');
    first.emit('error');

    await vi.advanceTimersByTimeAsync(2999);
    expect(FakeEventSource.instances).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(FakeEventSource.instances).toHaveLength(2);

    const second = FakeEventSource.instances[1];
    second.emit('error');
    realtimeManager.disconnect();

    await vi.runAllTimersAsync();
    expect(FakeEventSource.instances).toHaveLength(2);
    expect(second.closed).toBe(true);
  });

  it('should emit current online user count immediately to subscribers', async () => {
    const { realtimeManager } = await import('../realtime-sse');
    const counts: number[] = [];

    const unsubscribe = realtimeManager.subscribeToOnlineUsers(count => counts.push(count));
    realtimeManager.connect();

    const source = FakeEventSource.instances[0];
    source.emit('message', {
      data: JSON.stringify({
        type: 'update',
        onlineUsers: 7
      })
    });

    unsubscribe();
    realtimeManager.disconnect();

    expect(counts).toEqual([0, 7]);
  });

  it('should not duplicate callback delivery when the same listener subscribes twice', async () => {
    const { realtimeManager } = await import('../realtime-sse');
    const counts: number[] = [];
    const listener = (count: number) => counts.push(count);

    const unsubscribeA = realtimeManager.subscribeToOnlineUsers(listener);
    const unsubscribeB = realtimeManager.subscribeToOnlineUsers(listener);

    realtimeManager.connect();
    FakeEventSource.instances[0].emit('message', {
      data: JSON.stringify({
        type: 'update',
        onlineUsers: 11
      })
    });

    unsubscribeA();
    unsubscribeB();
    realtimeManager.disconnect();

    expect(counts).toEqual([0, 0, 11]);
  });

  it('should replay the latest notification snapshot to new subscribers', async () => {
    const { realtimeManager } = await import('../realtime-sse');
    const payloads: Array<{ count: number; notifications: Array<{ id: string }> }> = [];

    realtimeManager.connectToNotifications();
    FakeEventSource.instances[0].emit('message', {
      data: JSON.stringify({
        type: 'update',
        notificationCount: 2,
        notifications: [{ id: 'n-1' }, { id: 'n-2' }]
      })
    });

    const unsubscribe = realtimeManager.subscribeToNotifications(data => {
      payloads.push({
        count: data.count,
        notifications: data.notifications.map(item => ({ id: item.id }))
      });
    });

    unsubscribe();
    realtimeManager.disconnect();

    expect(payloads).toEqual([
      {
        count: 2,
        notifications: [{ id: 'n-1' }, { id: 'n-2' }]
      }
    ]);
  });

  it('should replay the latest analytics and feed snapshots to late subscribers', async () => {
    const { realtimeManager } = await import('../realtime-sse');
    const metricsPayloads: Array<{ errorRate: number }> = [];
    const feedPayloads: Array<{ count: number }> = [];

    realtimeManager.connectToAnalytics();
    realtimeManager.connectToFeed();

    FakeEventSource.instances[0].emit('message', {
      data: JSON.stringify({
        type: 'metrics',
        metricsPayload: { errorRate: 1.5 }
      })
    });
    FakeEventSource.instances[1].emit('message', {
      data: JSON.stringify({
        type: 'feed_update',
        feedPayload: { activities: [{ id: 'a-1' }], count: 1 }
      })
    });

    const unsubscribeMetrics = realtimeManager.onAnalyticsMetrics(metrics => {
      metricsPayloads.push({ errorRate: metrics.errorRate });
    });
    const unsubscribeFeed = realtimeManager.onFeedUpdate(feed => {
      feedPayloads.push({ count: feed.count });
    });

    unsubscribeMetrics();
    unsubscribeFeed();
    realtimeManager.disconnect();

    expect(metricsPayloads).toEqual([{ errorRate: 1.5 }]);
    expect(feedPayloads).toEqual([{ count: 1 }]);
  });

  it('should enforce listener cap and avoid opening duplicate event sources', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { realtimeManager } = await import('../realtime-sse');
    const deliveries: number[] = [];
    const unsubscribers: Array<() => void> = [];

    realtimeManager.connectToAnalytics();
    realtimeManager.connectToAnalytics();
    expect(FakeEventSource.instances).toHaveLength(1);

    for (let index = 0; index < 30; index++) {
      unsubscribers.push(
        realtimeManager.onAnalyticsMetrics(() => {
          deliveries.push(index);
        })
      );
    }

    FakeEventSource.instances[0].emit('message', {
      data: JSON.stringify({
        type: 'metrics',
        metricsPayload: { errorRate: 2.1 }
      })
    });

    unsubscribers.forEach(unsubscribe => unsubscribe());
    realtimeManager.disconnect();

    expect(deliveries).toHaveLength(25);
    expect(warnSpy).toHaveBeenCalledWith('Listener cap reached for analyticsMetrics');
    warnSpy.mockRestore();
  });
});
