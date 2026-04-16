import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initHashtagExplorer } from '../hashtag-explorer';

function createRoot() {
  const content = {
    innerHTML: '',
    querySelectorAll: vi.fn(() => []),
  } as unknown as HTMLElement;

  const root = {
    dataset: { initialSlug: '' } as DOMStringMap,
    querySelector: vi.fn((selector: string) => {
      if (selector === '[data-hashtag-explorer-content]') return content;
      return null;
    }),
  } as unknown as HTMLElement & { dataset: DOMStringMap };

  return { root, content };
}

describe('initHashtagExplorer', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads hashtag list and renders content shell', async () => {
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
            data: [{ id: 'h1', tag_name: 'urfa', tag_slug: 'urfa', usage_count: 12 }],
          },
        }),
      }))
    );

    initHashtagExplorer();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('#urfa');
    expect(root.dataset.initialized).toBe('true');
  });
});
