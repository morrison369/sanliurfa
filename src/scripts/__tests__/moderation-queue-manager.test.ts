import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  listeners?: Record<string, Array<() => void>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: () => void) => void;
};

function createInteractiveElement(dataset: Record<string, string>): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
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

function createRoot() {
  let cachedHtml = '';
  let statusButtons: FakeElement[] = [];
  let assignButtons: FakeElement[] = [];
  let resolveButtons: FakeElement[] = [];

  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});
  content.querySelectorAll = (selector: string) => {
    if (cachedHtml !== content.innerHTML) {
      cachedHtml = content.innerHTML;
      statusButtons = Array.from(
        content.innerHTML.matchAll(/data-moderation-queue-status="([^"]+)"/g),
      ).map((match) => createInteractiveElement({ moderationQueueStatus: match[1] }));
      assignButtons = Array.from(
        content.innerHTML.matchAll(/data-moderation-queue-assign="([^"]+)"/g),
      ).map((match) => createInteractiveElement({ moderationQueueAssign: match[1] }));
      resolveButtons = Array.from(
        content.innerHTML.matchAll(/data-moderation-queue-resolve="([^"]+)"/g),
      ).map((match) => createInteractiveElement({ moderationQueueResolve: match[1] }));
    }

    if (selector === '[data-moderation-queue-status]') return statusButtons;
    if (selector === '[data-moderation-queue-assign]') return assignButtons;
    if (selector === '[data-moderation-queue-resolve]') return resolveButtons;
    return [];
  };

  const root = createInteractiveElement({ status: 'pending' });
  root.querySelector = (selector: string) => {
    if (selector === '[data-moderation-queue-loading]') return loading;
    if (selector === '[data-moderation-queue-content]') return content;
    return null;
  };

  return { root, loading, content };
}

describe('moderation queue manager script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('renders queue, changes status and resolves item', async () => {
    const { root, loading, content } = createRoot();

    const fetchAdminModerationQueue = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        data: {
          items: [
            {
              id: 'queue-1',
              queue_type: 'review',
              priority: 'high',
              status: 'pending',
              reason: 'Spam',
              content_type: 'review',
              content_id: 'review-1',
              submitted_count: 2,
              assigned_to: null,
              assigned_at: null,
              resolved_at: null,
              created_at: '2026-04-17T00:00:00.000Z',
              updated_at: '2026-04-17T00:00:00.000Z',
            },
          ],
          count: 1,
          status: 'pending',
          limit: 20,
          offset: 0,
        },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { items: [], count: 0, status: 'resolved', limit: 20, offset: 0 },
      })
      .mockResolvedValueOnce({
        success: true,
        data: { items: [], count: 0, status: 'resolved', limit: 20, offset: 0 },
      });

    const mutateAdminModerationQueue = vi.fn().mockResolvedValue({
      success: true,
      message: 'ok',
    });

    vi.doMock('../../lib/admin-browser-client', () => ({
      fetchAdminModerationQueue,
      mutateAdminModerationQueue,
    }));

    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };

    const { initModerationQueueManager } = await import('../moderation-queue-manager');
    initModerationQueueManager();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Spam');
    expect(loading.className).toBe('hidden');

    const resolveButton = content.querySelectorAll('[data-moderation-queue-resolve]')[0];
    resolveButton.listeners?.click?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mutateAdminModerationQueue).toHaveBeenCalledWith({
      queueItemId: 'queue-1',
      action: 'resolve',
      resolution: 'resolved',
    });

    const resolvedButton = content.querySelectorAll('[data-moderation-queue-status]')[2];
    resolvedButton.listeners?.click?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchAdminModerationQueue).toHaveBeenCalledWith({ status: 'pending', limit: 20 });
    expect(fetchAdminModerationQueue).toHaveBeenCalledWith({ status: 'resolved', limit: 20 });
    expect(content.innerHTML).toContain('Kuyruk boş');
  });
});
