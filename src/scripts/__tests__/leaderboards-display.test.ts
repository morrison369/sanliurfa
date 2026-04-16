import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  textContent: string;
  className: string;
  innerHTML: string;
  dataset: Record<string, string>;
  listeners?: Record<string, Array<() => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => void) => void;
};

function makeButton(sortBy: string): FakeElement {
  return {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset: { sortBy },
    listeners: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(event: string, handler: () => void) {
      this.listeners ??= {};
      this.listeners[event] ??= [];
      this.listeners[event].push(handler);
    },
  };
}

function createLeaderboardsRoot() {
  const loading = makeButton('');
  const content = makeButton('');
  const buttons = ['points', 'level', 'activity', 'recent'].map(makeButton);

  const root: FakeElement = {
    textContent: '',
    className: '',
    innerHTML: '',
    dataset: {},
    querySelector: (selector: string) => {
      if (selector === '[data-leaderboards-loading]') return loading;
      if (selector === '[data-leaderboards-content]') return content;
      return null;
    },
    querySelectorAll: (selector: string) =>
      selector === '[data-sort-by]' ? buttons : [],
    addEventListener: () => {},
  };

  return { root, loading, content, buttons };
}

describe('leaderboards display script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads leaderboard and updates active sort state', async () => {
    const { root, loading, content, buttons } = createLeaderboardsRoot();

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'user-1',
            rank: 1,
            avatar_url: null,
            full_name: 'Ali Veli',
            username: 'aliveli',
            points: 250,
            level: 7,
          },
        ],
      }),
    });

    const { initLeaderboardsDisplays } = await import('../leaderboards-display');
    initLeaderboardsDisplays();
    await Promise.resolve();
    await Promise.resolve();

    expect(content.innerHTML).toContain('Ali Veli');
    expect(loading.className).toBe('hidden');
    expect(content.className).toContain('space-y-2');
    expect(buttons[0].className).toContain('bg-blue-500');
    expect(root.dataset.initialized).toBe('true');
  });
});
