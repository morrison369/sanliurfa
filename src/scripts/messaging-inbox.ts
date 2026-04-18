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
const MESSAGING_RETRY_DELAY_MS = 250;

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

function applyConversationReadState(state: MessagingInboxState, conversationId: string | null): MessagingInboxState {
  if (!conversationId) return state;

  return {
    ...state,
    conversations: state.conversations.map((conversation) =>
      conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
    ),
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readCurrentUserId(root: MessagingInboxRoot): string {
  return root.dataset.currentUserId || '';
}

async function fetchConversations(root: MessagingInboxRoot, attempt = 0) {
  const response = await fetch('/api/messages?limit=50', { credentials: 'same-origin' });
  if (!response.ok) {
    if (attempt === 0) {
      await delay(MESSAGING_RETRY_DELAY_MS);
      return fetchConversations(root, attempt + 1);
    }
    throw new Error('Konuşma listesi yüklenemedi');
  }

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

async function fetchMessages(root: MessagingInboxRoot, attempt = 0) {
  const state = readState(root);
  if (!state.selectedConversationId) {
    writeState(root, { ...state, messages: [] });
    return;
  }

  const response = await fetch(`/api/messages/${state.selectedConversationId}?limit=100`, { credentials: 'same-origin' });
  if (!response.ok) {
    if (attempt === 0) {
      await delay(MESSAGING_RETRY_DELAY_MS);
      return fetchMessages(root, attempt + 1);
    }
    throw new Error('Mesajlar yüklenemedi');
  }

  const payload = await response.json();
  const nextState = applyConversationReadState(
    {
      ...readState(root),
      messages: extractMessagingInboxMessages(payload),
      error: null,
      notice: readState(root).notice,
    },
    state.selectedConversationId,
  );
  writeState(root, nextState);
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

function applyOptimisticConversationHide(state: MessagingInboxState) {
  const selectedConversationId = state.selectedConversationId;
  if (!selectedConversationId) return state;

  const nextConversations = state.conversations.filter((conversation) => conversation.id !== selectedConversationId);
  return applyMessagingInboxSelection({
    ...state,
    conversations: nextConversations,
    selectedConversationId: null,
    messages: [],
  });
}

function bindInteractions(root: MessagingInboxRoot, content: HTMLElement) {
  for (const button of Array.from(content.querySelectorAll<HTMLElement>('[data-message-conversation-id]'))) {
    button.addEventListener('click', async () => {
      const nextId = button.dataset.messageConversationId || null;
      const state = readState(root);
      if (!nextId || nextId === state.selectedConversationId) return;
      writeState(root, applyConversationReadState({ ...state, selectedConversationId: nextId, messages: [], draft: '' }, nextId));
      await fetchMessages(root);
      await fetchConversations(root);
      writeState(root, applyConversationReadState(readState(root), nextId));
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
      if (!state.selectedConversationId || !state.draft.trim() || state.actionInProgress) return;

      const draft = state.draft.trim();

      const optimisticMessage = {
        id: `temp-${Date.now()}`,
        content: draft,
        createdAt: new Date().toISOString(),
        senderId: readCurrentUserId(root),
      };
      const optimisticConversations = state.conversations.map((conversation) =>
        conversation.id === state.selectedConversationId
          ? {
              ...conversation,
              lastMessage: draft,
              lastMessageTime: optimisticMessage.createdAt,
            }
          : conversation,
      );
      writeState(root, {
        ...state,
        actionInProgress: 'send',
        conversations: optimisticConversations,
        messages: [...state.messages, optimisticMessage],
        draft: '',
        error: null,
        notice: 'Mesaj gönderiliyor...',
      });
      await refreshRoot(root);

      try {
        const response = await fetch(`/api/messages/${state.selectedConversationId}`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ content: draft }),
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const message = payload?.error?.message || payload?.error || 'Mesaj gönderilemedi';
          writeState(root, { ...state, error: message, notice: null, loading: false, actionInProgress: null });
          await refreshRoot(root);
          return;
        }

        writeState(root, { ...state, draft: '', error: null, notice: 'Mesaj gönderildi.', actionInProgress: null });
        await reloadInbox(root);
      } catch {
        writeState(root, { ...state, error: 'Mesaj gönderilemedi', notice: null, loading: false, actionInProgress: null });
        await refreshRoot(root);
      }
    });
  }

  const deleteButton = content.querySelector<HTMLElement>('[data-message-delete]');
  if (deleteButton) {
    deleteButton.addEventListener('click', async () => {
      const state = readState(root);
      if (!state.selectedConversationId || state.actionInProgress) return;

      const optimisticState = applyMessagingInboxSelection({
        ...applyOptimisticConversationHide(state),
        actionInProgress: 'delete',
        error: null,
        notice: 'Konuşma gizleniyor...',
      });
      writeState(root, optimisticState);
      await refreshRoot(root);

      try {
        const response = await fetch(`/api/messages/${state.selectedConversationId}`, {
          method: 'DELETE',
          credentials: 'same-origin',
        });

        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          const message = payload?.error?.message || payload?.error || 'Konuşma gizlenemedi';
          writeState(root, { ...state, error: message, notice: null, loading: false, actionInProgress: null });
          await refreshRoot(root);
          return;
        }

        writeState(root, {
          ...optimisticState,
          actionInProgress: null,
          notice: 'Konuşma gizlendi.',
        });
        await refreshRoot(root);
      } catch {
        writeState(root, { ...state, error: 'Konuşma gizlenemedi', notice: null, loading: false, actionInProgress: null });
        await refreshRoot(root);
      }
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
