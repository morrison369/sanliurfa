import { describe, expect, it } from 'vitest';
import { setElementClassName, setElementHtml, setLinkHref, setTextContent } from '../admin-dom';

function withDocument(elements: Record<string, any>, fn: () => void) {
  const originalDocument = globalThis.document;
  globalThis.document = {
    getElementById: (id: string) => elements[id] ?? null,
  } as any;

  try {
    fn();
  } finally {
    globalThis.document = originalDocument;
  }
}

describe('admin-dom', () => {
  it('sets text content when element exists', () => {
    const element = { textContent: '' };

    withDocument({ target: element }, () => {
      setTextContent('target', 'merhaba');
    });

    expect(element.textContent).toBe('merhaba');
  });

  it('sets link href when anchor exists', () => {
    const element = { href: '' };

    withDocument({ link: element }, () => {
      setLinkHref('link', '/admin/runtime-monitor');
    });

    expect(element.href).toBe('/admin/runtime-monitor');
  });

  it('sets class name when element exists', () => {
    const element = { className: '' };

    withDocument({ badge: element }, () => {
      setElementClassName('badge', 'text-red-600');
    });

    expect(element.className).toBe('text-red-600');
  });

  it('sets inner html when element exists', () => {
    const element = { innerHTML: '' };

    withDocument({ list: element }, () => {
      setElementHtml('list', '<li>drift</li>');
    });

    expect(element.innerHTML).toBe('<li>drift</li>');
  });
});
