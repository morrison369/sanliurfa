import { describe, expect, it, vi } from 'vitest';
import { bindRefreshButton, startAutoRefreshPage } from '../admin-page-bootstrap';

function createButton() {
  return {
    listeners: {} as Record<string, Array<() => void>>,
    addEventListener(event: string, handler: () => void) {
      this.listeners[event] ??= [];
      this.listeners[event].push(handler);
    },
  };
}

function withDom(buttons: Record<string, any>, fn: (setIntervalMock: ReturnType<typeof vi.fn>) => void) {
  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const setIntervalMock = vi.fn(() => 1);

  globalThis.document = {
    getElementById: (id: string) => buttons[id] ?? null,
  } as any;

  globalThis.window = {
    setInterval: setIntervalMock,
  } as any;

  try {
    fn(setIntervalMock);
  } finally {
    globalThis.document = originalDocument;
    globalThis.window = originalWindow;
  }
}

describe('admin-page-bootstrap', () => {
  it('binds click handler to refresh button', () => {
    const button = createButton();
    const refresh = vi.fn();

    withDom({ refresh: button }, () => {
      bindRefreshButton('refresh', refresh);
    });

    button.listeners.click[0]?.();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('runs initial render, refresh, and interval setup', () => {
    const button = createButton();
    const initialRender = vi.fn();
    const refresh = vi.fn();

    withDom({ refresh: button }, (setIntervalMock) => {
      startAutoRefreshPage({
        refreshButtonId: 'refresh',
        initialRender,
        refresh,
      });

      expect(initialRender).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(setIntervalMock).toHaveBeenCalledWith(expect.any(Function), 60000);
    });
  });
});
