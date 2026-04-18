import { beforeEach, describe, expect, it, vi } from 'vitest';

type FakeElement = {
  innerHTML: string;
  dataset: Record<string, string>;
  className: string;
  value?: string;
  listeners?: Record<string, Array<(event?: any) => void | Promise<void>>>;
  querySelector: (selector: string) => FakeElement | null;
  querySelectorAll: (selector: string) => FakeElement[];
  addEventListener: (event: string, handler: (event?: any) => void | Promise<void>) => void;
};

function createInteractiveElement(dataset: Record<string, string>, value = ''): FakeElement {
  return {
    innerHTML: '',
    dataset,
    className: '',
    value,
    listeners: {},
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(event: string, handler: (event?: any) => void | Promise<void>) {
      this.listeners ??= {};
      this.listeners[event] ??= [];
      this.listeners[event].push(handler);
    },
  };
}

function createMessagingRoot() {
  let cachedHtml = '';
  let conversationButtons: FakeElement[] = [];
  let searchInput: FakeElement | null = null;
  let clearSearchButton: FakeElement | null = null;
  let retryButton: FakeElement | null = null;
  let deleteButton: FakeElement | null = null;
  let sendForm: FakeElement | null = null;
  let draftInput: FakeElement | null = null;

  const loading = createInteractiveElement({});
  const content = createInteractiveElement({});
  content.querySelectorAll = (selector: string) => {
    hydrate();
    if (selector === '[data-message-conversation-id]') return conversationButtons;
    return [];
  };
  content.querySelector = (selector: string) => {
    hydrate();
    if (selector === '[data-message-search-input]') return searchInput;
    if (selector === '[data-message-clear-search]') return clearSearchButton;
    if (selector === '[data-message-retry]') return retryButton;
    if (selector === '[data-message-delete]') return deleteButton;
    if (selector === '[data-message-send-form]') return sendForm;
    if (selector === '[data-message-draft-input]') return draftInput;
    return null;
  };

  function hydrate() {
    if (cachedHtml === content.innerHTML) return;
    cachedHtml = content.innerHTML;

    conversationButtons = Array.from(content.innerHTML.matchAll(/data-message-conversation-id="([^"]+)"/g)).map(
      (match) => createInteractiveElement({ messageConversationId: match[1] }),
    );
    searchInput = content.innerHTML.includes('data-message-search-input') ? createInteractiveElement({}, '') : null;
    clearSearchButton = content.innerHTML.includes('data-message-clear-search') ? createInteractiveElement({}) : null;
    retryButton = content.innerHTML.includes('data-message-retry') ? createInteractiveElement({}) : null;
    deleteButton = content.innerHTML.includes('data-message-delete') ? createInteractiveElement({}) : null;
    sendForm = content.innerHTML.includes('data-message-send-form') ? createInteractiveElement({}) : null;
    draftInput = content.innerHTML.includes('data-message-draft-input') ? createInteractiveElement({}, '') : null;
  }

  const root = createInteractiveElement({ currentUserId: 'user-1' });
  root.querySelector = (selector: string) => {
    if (selector === '[data-messaging-inbox-loading]') return loading;
    if (selector === '[data-messaging-inbox-content]') return content;
    return null;
  };

  return { root, content, loading };
}

describe('messaging inbox script', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('loads conversations and messages, then switches conversation', async () => {
    const { root, content, loading } = createMessagingRoot();
    const localStorageStore = new Map<string, string>();

    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [{ id: 'conv-1', full_name: 'Ali', content: 'Selam', msg_time: '2026-04-17T08:10:00.000Z', unread: '1' }, { id: 'conv-2', full_name: 'Ayse', content: 'Merhaba', msg_time: '2026-04-17T08:12:00.000Z', unread: '0' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [{ id: 'msg-1', content: 'Selam', created_at: '2026-04-17T08:11:00.000Z', sender_id: 'user-2' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [{ id: 'msg-2', content: 'Merhaba', created_at: '2026-04-17T08:13:00.000Z', sender_id: 'user-2' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, data: [{ id: 'conv-1', full_name: 'Ali', content: 'Selam', msg_time: '2026-04-17T08:10:00.000Z', unread: '1' }, { id: 'conv-2', full_name: 'Ayse', content: 'Merhaba', msg_time: '2026-04-17T08:12:00.000Z', unread: '0' }] }) });

    (globalThis as any).fetch = fetchMock;
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };
    (globalThis as any).window = {
      localStorage: {
        getItem: (key: string) => localStorageStore.get(key) ?? null,
        setItem: (key: string, value: string) => localStorageStore.set(key, value),
        removeItem: (key: string) => localStorageStore.delete(key),
      },
    };
    (globalThis as any).setInterval = vi.fn(() => 1);

    const { initMessagingInbox } = await import('../messaging-inbox');
    initMessagingInbox();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Ali');
    expect(content.innerHTML).toContain('Selam');
    expect(loading.className).toBe('hidden');

    const secondConversation = content.querySelectorAll('[data-message-conversation-id]')[1];
    await secondConversation.listeners?.click?.[0]?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock).toHaveBeenCalledWith('/api/messages?limit=50', { credentials: 'same-origin' });
    expect(fetchMock).toHaveBeenCalledWith('/api/messages/conv-2?limit=100', { credentials: 'same-origin' });
    expect(content.innerHTML).toContain('Ayse');
    expect(content.innerHTML).toContain('Merhaba');
    expect(localStorageStore.get('sanliurfa:messaging-inbox:selected-conversation')).toBe('conv-2');
  });

  it('shows retry action when initial load fails', async () => {
    const { root, content } = createMessagingRoot();
    const localStorageStore = new Map<string, string>();

    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: 'Sunucu hatası' } }),
    });
    (globalThis as any).document = {
      querySelectorAll: () => [root],
    };
    (globalThis as any).window = {
      localStorage: {
        getItem: (key: string) => localStorageStore.get(key) ?? null,
        setItem: (key: string, value: string) => localStorageStore.set(key, value),
        removeItem: (key: string) => localStorageStore.delete(key),
      },
    };
    (globalThis as any).setInterval = vi.fn(() => 1);

    const { initMessagingInbox } = await import('../messaging-inbox');
    initMessagingInbox();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(content.innerHTML).toContain('Mesajlaşma alanı güncellenemedi.');
    expect(content.innerHTML).toContain('Tekrar dene');
  });
});
