import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initUserSuggestionsPanel } from '../user-suggestions-panel';

function createRoot() {
  const loading = { className: '', textContent: 'Yükleniyor...' } as unknown as HTMLElement;
  const content = {
    className: 'hidden',
    innerHTML: '',
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
  } as unknown as HTMLElement;

  const root = {
    dataset: {} as DOMStringMap,
    querySelector: vi.fn((selector: string) => {
      if (selector === '[data-user-suggestions-loading]') return loading;
      if (selector === '[data-user-suggestions-content]') return content;
      return null;
    }),
  } as unknown as HTMLElement & { dataset: DOMStringMap };

  return { root, loading, content };
}

describe('initUserSuggestionsPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads and renders user suggestions', async () => {
    const { root, loading, content } = createRoot();

    vi.stubGlobal(
      'document',
      {
        querySelectorAll: vi.fn(() => [root]),
      } as unknown as Document
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            suggestions: [
              {
                id: 'u1',
                name: 'Ali Kaya',
                username: 'alikaya',
                isFollowing: false,
                activityCount: 4,
                matchingInterests: 1,
              },
            ],
          },
        }),
      }))
    );

    initUserSuggestionsPanel();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Ali Kaya');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('space-y-4');
    expect(root.dataset.initialized).toBe('true');
  });
});
