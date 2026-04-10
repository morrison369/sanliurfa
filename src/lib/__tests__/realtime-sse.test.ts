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
});
