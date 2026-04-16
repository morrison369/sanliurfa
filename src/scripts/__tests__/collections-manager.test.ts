import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initCollectionsManager } from '../collections-manager';

function createRoot() {
  const content = {
    innerHTML: '',
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
  } as unknown as HTMLElement;

  const root = {
    dataset: { userId: 'u1' } as DOMStringMap,
    querySelector: vi.fn((selector: string) => {
      if (selector === '[data-collections-manager-content]') return content;
      return null;
    }),
  } as unknown as HTMLElement & { dataset: DOMStringMap };

  return { root, content };
}

describe('initCollectionsManager', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads collections and renders cards', async () => {
    const { root, content } = createRoot();

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
            data: [
              { id: 'c1', user_id: 'u1', name: 'Favoriler', is_public: false, place_count: 2, created_at: '2026-01-01', updated_at: '2026-01-01' },
            ],
          },
        }),
      }))
    );

    initCollectionsManager();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Favoriler');
    expect(root.dataset.initialized).toBe('true');
  });
});
