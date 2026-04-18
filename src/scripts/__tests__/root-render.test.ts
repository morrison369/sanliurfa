import { describe, expect, it, vi } from 'vitest';

import { getRootContent, getRootPanels, renderRootContent } from '../shared/root-render';

function createElement() {
  return {
    className: '',
    innerHTML: '',
    dataset: {},
    querySelector: vi.fn(),
  } as unknown as HTMLElement & { dataset: DOMStringMap };
}

describe('root render helpers', () => {
  it('returns content and loading panels', () => {
    const loading = createElement();
    const content = createElement();
    const root = {
      dataset: {},
      querySelector: vi.fn((selector: string) => {
        if (selector === '[data-loading]') return loading;
        if (selector === '[data-content]') return content;
        return null;
      }),
    } as unknown as HTMLElement & { dataset: DOMStringMap };

    expect(getRootContent(root, '[data-content]')).toBe(content);
    expect(getRootPanels(root, '[data-loading]', '[data-content]')).toEqual({ loading, content });
  });

  it('renders html, binds actions and reveals content', () => {
    const loading = createElement();
    const content = createElement();
    const bind = vi.fn();
    const root = {
      dataset: {},
      querySelector: vi.fn((selector: string) => {
        if (selector === '[data-loading]') return loading;
        if (selector === '[data-content]') return content;
        return null;
      }),
    } as unknown as HTMLElement & { dataset: DOMStringMap };

    renderRootContent({
      root,
      contentSelector: '[data-content]',
      loadingSelector: '[data-loading]',
      html: '<p>Hazır</p>',
      bind,
    });

    expect(content.innerHTML).toBe('<p>Hazır</p>');
    expect(loading.className).toBe('hidden');
    expect(content.className).toBe('');
    expect(bind).toHaveBeenCalledWith(content);
  });
});
