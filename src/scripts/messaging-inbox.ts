import {
  applyMessagingInboxSelection,
  createMessagingInboxState,
  extractMessagingInboxConversations,
  extractMessagingInboxMessages,
  renderMessagingInbox,
  type MessagingInboxState,
} from '../lib/messaging-inbox';
import { setElementClassName, setElementHtml } from '../lib/admin-dom';

type MessagingInboxRoot = HTMLElement & { dataset: DOMStringMap };

type MessagingInboxTimers = {
  conversations: ReturnType<typeof setInterval> | null;
  messages: ReturnType<typeof setInterval> | null;
};

const timers = new WeakMap<MessagingInboxRoot, MessagingInboxTimers>();
const MESSAGING_SELECTED_KEY = 'sanliurfa:messaging-inbox:selected-conversation';
const MESSAGING_SEARCH_KEY = 'sanliurfa:messaging-inbox:search-query';

function readStorage(key: string): string {
  try {
    return window.localStorage?.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeStorage(key: string, value: string) {
  try {
    if (value) {
      window.localStorage?.setItem(key, value);
    } else {
      window.localStorage?.removeItem(key);
    }
  } catch {
    // no-op
  }
}

function readState(root: MessagingInboxRoot): MessagingInboxState {
  const raw = root.dataset.state;
  if (!raw) {
    const initial = createMessagingInboxState();
    initial.selectedConversationId = readStorage(MESSAGING_SELECTED_KEY) || null;
    initial.searchQuery = readStorage(MESSAGING_SEARCH_KEY);
    return initial;
  }

  try {
    const parsed = JSON.parse(raw) as MessagingInboxState;
    parsed.selectedConversationId ||= readStorage(MESSAGING_SELECTED_KEY) || null;
    parsed.searchQuery ||= readStorage(MESSAGING_SEARCH_KEY);
    return parsed;
  } catch {
    const initial = createMessagingInboxState();
    initial.selectedConversationId = readStorage(MESSAGING_SELECTED_KEY) || null;
    initial.searchQuery = readStorage(MESSAGING_SEARCH_KEY);
    return initial;
  }
}

function writeState(root: MessagingInboxRoot, state: MessagingInboxState) {
  root.dataset.state = JSON.stringify(state);
  writeStorage(MESSAGING_SELECTED_KEY, state.selectedConversationId ?? '');
  writeStorage(MESSAGING_SEARCH_KEY, state.searchQuery);
}

function clearFeedback(root: MessagingInboxRoot) {
  writeState(root, { ...readState(root), error: null, notice: null });
}

function readCurrentUserId(root: MessagingInboxRoot): string {
  return root.dataset.currentUserId || '';
}

async function fetchConversations(root: MessagingInboxRoot) {
  const response = await fetch('/api/messages?limit=50', { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Konuşma listesi yüklenemedi');

  const payload = await response.json();
  const nextState = applyMessagingInboxSelection({
    ...readState(root),
    conversations: extractMessagingInboxConversations(payload),
    loading: false,
    error: null,
    notice: readState(root).notice,
  });
  writeState(root, nextState);
}

async function fetchMessages(root: MessagingInboxRoot) {
  const state = readState(root);
  if (!state.selectedConversationId) {
    writeState(root, { ...state, messages: [] });
    return;
  }

  const response = await fetch(`/api/messages/${state.selectedConversationId}?limit=100`, { credentials: 'same-origin' });
  if (!response.ok) throw new Error('Mesajlar yüklenemedi');

  const payload = await response.json();
  writeState(root, {
    ...readState(root),
    messages: extractMessagingInboxMessages(payload),
    error: null,
    notice: readState(root).notice,
  });
}

async function refreshRoot(root: MessagingInboxRoot) {
  const loading = root.querySelector<HTMLElement>('[data-messaging-inbox-loading]');
  const content = root.querySelector<HTMLElement>('[data-messaging-inbox-content]');
  if (!loading || !content) return;

  setElementClassName(loading, 'flex items-center justify-center p-8');
  setElementClassName(content, 'hidden');

  try {
    const initial = readState(root);
    if (initial.loading) {
      await fetchConversations(root);
      await fetchMessages(root);
    }

    setElementHtml(content, renderMessagingInbox(readState(root), readCurrentUserId(root)));
    bindInteractions(root, content);
  } catch (error) {
    const nextState = { ...readState(root), loading: false, error: error instanceof Error ? error.message : 'Mesajlar yuklenemedi' };
    nextState.notice = null;
    writeState(root, nextState);
    setElementHtml(content, renderMessagingInbox(nextState, readCurrentUserId(root)));
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

function ensureTimers(root: MessagingInboxRoot) {
  const existing = timers.get(root);
  if (existing) return existing;

  const created = { conversations: null, messages: null };
  timers.set(root, created);
  return created;
}

async function reloadInbox(root: MessagingInboxRoot) {
  await fetchConversations(root);
  await fetchMessages(root);
  await refreshRoot(root);
}

function bindInteractions(root: MessagingInboxRoot, content: HTMLElement) {
  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-message-conversation-id]'))) {
    button.addEventListener('click', async () => {
      const nextId = button.dataset.messageConversationId || null;
      const state = readState(root);
      if (!nextId || nextId === state.selectedConversationId) return;
      writeState(root, { ...state, selectedConversationId: nextId, messages: [], draft: '' });
      await fetchMessages(root);
      await fetchConversations(root);
      await refreshRoot(root);
    });
  }

  const searchInput = content.querySelector<HTMLInputElement>('[data-message-search-input]');
  if (searchInput) {
    searchInput.addEventListener('input', async () => {
      writeState(root, { ...readState(root), searchQuery: searchInput.value, error: null, notice: null });
      await refreshRoot(root);
    });
  }

  const clearSearchButton = content.querySelector<HTMLElement>('[data-message-clear-search]');
  if (clearSearchButton) {
    clearSearchButton.addEventListener('click', async () => {
      writeState(root, { ...readState(root), searchQuery: '', error: null, notice: null });
      await refreshRoot(root);
    });
  }

  const draftInput = content.querySelector<HTMLInputElement>('[data-message-draft-input]');
  if (draftInput) {
    draftInput.addEventListener('input', () => {
      writeState(root, { ...readState(root), draft: draftInput.value });
    });
  }

  const sendForm = content.querySelector<HTMLFormElement>('[data-message-send-form]');
  if (sendForm) {
    sendForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const state = readState(root);
      if (!state.selectedConversationId || !state.draft.trim()) return;

      const response = await fetch(`/api/messages/${state.selectedConversationId}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ content: state.draft.trim() }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error?.message || payload?.error || 'Mesaj gönderilemedi';
        writeState(root, { ...state, error: message, notice: null, loading: false });
        await refreshRoot(root);
        return;
      }

      writeState(root, { ...state, draft: '', error: null, notice: 'Mesaj gönderildi.' });
      await reloadInbox(root);
    });
  }

  const deleteButton = content.querySelector<HTMLElement>('[data-message-delete]');
  if (deleteButton) {
    deleteButton.addEventListener('click', async () => {
      const state = readState(root);
      if (!state.selectedConversationId) return;

      const response = await fetch(`/api/messages/${state.selectedConversationId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error?.message || payload?.error || 'Konuşma gizlenemedi';
        writeState(root, { ...state, error: message, notice: null, loading: false });
        await refreshRoot(root);
        return;
      }

      const nextConversations = state.conversations.filter((conversation) => conversation.id !== state.selectedConversationId);
      writeState(root, applyMessagingInboxSelection({
        ...state,
        conversations: nextConversations,
        selectedConversationId: null,
        messages: [],
        error: null,
        notice: 'Konuşma gizlendi.',
      }));
      await refreshRoot(root);
    });
  }

  const retryButton = content.querySelector<HTMLElement>('[data-message-retry]');
  if (retryButton) {
    retryButton.addEventListener('click', async () => {
      clearFeedback(root);
      await reloadInbox(root);
    });
  }
}

function startPolling(root: MessagingInboxRoot) {
  const entry = ensureTimers(root);
  if (!entry.conversations) {
    entry.conversations = setInterval(async () => {
      try {
        await fetchConversations(root);
        await refreshRoot(root);
      } catch {
        // no-op
      }
    }, 30000);
  }

  if (!entry.messages) {
    entry.messages = setInterval(async () => {
      try {
        if (readState(root).selectedConversationId) {
          await fetchMessages(root);
          await fetchConversations(root);
          await refreshRoot(root);
        }
      } catch {
        // no-op
      }
    }, 10000);
  }
}

export function initMessagingInbox() {
  const roots = Array.from(document.querySelectorAll<MessagingInboxRoot>('[data-messaging-inbox]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    writeState(root, createMessagingInboxState());
    startPolling(root);
    void refreshRoot(root);
  }
}
