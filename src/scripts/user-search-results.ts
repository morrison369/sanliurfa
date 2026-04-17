import { setElementHtml } from '../lib/admin-dom';
import {
  extractUserSearchResults,
  renderUserSearchResults,
  type UserSearchState,
} from '../lib/user-search-results';

type UserSearchRoot = HTMLElement & { dataset: DOMStringMap };

function readState(root: UserSearchRoot): UserSearchState {
  try {
    return {
      query: root.dataset.query || '',
      sortBy: (root.dataset.sortBy as UserSearchState['sortBy']) || 'relevance',
      users: JSON.parse(root.dataset.users || '[]'),
      isLoading: root.dataset.isLoading === 'true',
      error: root.dataset.error || null,
      hasSearched: root.dataset.hasSearched === 'true',
      currentUserId: root.dataset.currentUserId || undefined,
    };
  } catch {
    return {
      query: '',
      sortBy: 'relevance',
      users: [],
      isLoading: false,
      error: null,
      hasSearched: false,
      currentUserId: root.dataset.currentUserId || undefined,
    };
  }
}

function writeState(root: UserSearchRoot, state: Partial<UserSearchState>) {
  if (typeof state.query === 'string') root.dataset.query = state.query;
  if (state.sortBy) root.dataset.sortBy = state.sortBy;
  if (state.users) root.dataset.users = JSON.stringify(state.users);
  if (typeof state.isLoading === 'boolean') root.dataset.isLoading = String(state.isLoading);
  if (typeof state.hasSearched === 'boolean') root.dataset.hasSearched = String(state.hasSearched);
  if (state.error) root.dataset.error = state.error;
  if (state.error === null) delete root.dataset.error;
}

async function searchUsers(root: UserSearchRoot) {
  const state = readState(root);
  if (!state.query.trim() || state.query.trim().length < 2) {
    writeState(root, { error: 'Arama terimi en az 2 karakter olmalıdır.', users: [], hasSearched: false });
    renderRoot(root);
    return;
  }

  writeState(root, { isLoading: true, error: null });
  renderRoot(root);

  try {
    const response = await fetch(
      `/api/users/search?q=${encodeURIComponent(state.query.trim())}&sortBy=${state.sortBy}&limit=50`
    );
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        payload &&
        typeof payload === 'object' &&
        'error' in payload &&
        payload.error &&
        typeof payload.error === 'object' &&
        'message' in payload.error &&
        typeof payload.error.message === 'string'
          ? payload.error.message
          : 'Arama tamamlanamadı';
      throw new Error(message);
    }

    writeState(root, {
      users: extractUserSearchResults(payload),
      hasSearched: true,
      error: null,
    });
  } catch (error) {
    writeState(root, {
      users: [],
      hasSearched: true,
      error: error instanceof Error ? error.message : 'Bir hata oluştu',
    });
  } finally {
    writeState(root, { isLoading: false });
    renderRoot(root);
  }
}

function bindActions(root: UserSearchRoot, content: HTMLElement) {
  const form = content.querySelector<HTMLFormElement>('[data-user-search-form]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    const input = form.querySelector<HTMLInputElement>('input[name="query"]');
    writeState(root, { query: input?.value || '' });
    void searchUsers(root);
  });

  content.querySelectorAll<HTMLElement>('[data-user-search-sort]').forEach((button) => {
    button.addEventListener('click', () => {
      const sortBy = button.dataset.userSearchSort as UserSearchState['sortBy'];
      writeState(root, { sortBy });
      if (readState(root).query.trim()) {
        void searchUsers(root);
      } else {
        renderRoot(root);
      }
    });
  });

  content.querySelectorAll<HTMLElement>('[data-user-search-message]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      const userId = button.dataset.userSearchMessage;
      if (!userId) return;
      window.location.href = `/api/messages?recipientId=${userId}`;
    });
  });
}

function renderRoot(root: UserSearchRoot) {
  const content = root.querySelector<HTMLElement>('[data-user-search-content]');
  if (!content) return;
  const state = readState(root);
  setElementHtml(content, renderUserSearchResults(state));
  bindActions(root, content);
}

export function initUserSearchResults() {
  const roots = Array.from(document.querySelectorAll<UserSearchRoot>('[data-user-search-results]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.sortBy = 'relevance';
    root.dataset.query = '';
    root.dataset.users = '[]';
    root.dataset.isLoading = 'false';
    root.dataset.hasSearched = 'false';
    renderRoot(root);
  }
}
