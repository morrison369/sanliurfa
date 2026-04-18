import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  dataset: Record<string, string>;
  querySelector: (selector: string) => FakeElement | null;
};

function createBadgeRoot() {
  const badge: FakeElement = {
    textContent: '',
    className: '',
    dataset: {},
    querySelector: () => null,
  };

  const root: FakeElement = {
    textContent: '',
    className: '',
    dataset: {},
    querySelector: (selector: string) =>
      selector === '[data-notification-badge-count]' ? badge : null,
  };

  return { root, badge };
}

describe('notification badge script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads unread count and updates badge text', async () => {
    const { root, badge } = createBadgeRoot();
    const setIntervalMock = vi.fn();
    const eventListeners = new Map<string, Array<(event: any) => void>>();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    (globalThis as any).window = {
      setInterval: setIntervalMock,
      addEventListener: vi.fn((name: string, handler: (event: any) => void) => {
        eventListeners.set(name, [...(eventListeners.get(name) ?? []), handler]);
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn((event: CustomEvent) => {
        for (const handler of eventListeners.get(event.type) ?? []) {
          handler(event);
        }
        return true;
      }),
    };

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ count: 12 }),
    });

    const { initNotificationBadges } = await import('../notification-badge');
    initNotificationBadges();
    await Promise.resolve();
    await Promise.resolve();

    expect(badge.textContent).toBe('9+');
    expect(badge.className).toContain('flex');
    expect(setIntervalMock).toHaveBeenCalledOnce();
    expect(root.dataset.initialized).toBe('true');

    (globalThis as any).window.dispatchEvent(
      new CustomEvent('sanliurfa:notifications-unread-change', {
        detail: { count: 3 },
      }),
    );

    expect(badge.textContent).toBe('3');
  });
});
