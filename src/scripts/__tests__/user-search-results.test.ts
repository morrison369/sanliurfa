import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initUserSearchResults } from '../user-search-results';

function createRoot() {
  const content = {
    innerHTML: '',
    querySelector: vi.fn(),
    querySelectorAll: vi.fn(() => []),
  } as unknown as HTMLElement;

  const root = {
    dataset: { currentUserId: 'u2' } as DOMStringMap,
    querySelector: vi.fn((selector: string) => {
      if (selector === '[data-user-search-content]') return content;
      return null;
    }),
  } as unknown as HTMLElement & { dataset: DOMStringMap };

  return { root, content };
}

describe('initUserSearchResults', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders initial empty search state', () => {
    const { root, content } = createRoot();

    vi.stubGlobal(
      'document',
      {
        querySelectorAll: vi.fn(() => [root]),
      } as unknown as Document
    );

    initUserSearchResults();

    expect(content.innerHTML).toContain('Kullanıcı aramak için arama kutusunu kullanın');
    expect(root.dataset.initialized).toBe('true');
    expect(root.dataset.sortBy).toBe('relevance');
  });
});
