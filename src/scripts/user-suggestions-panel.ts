import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractUserSuggestions,
  renderUserSuggestionsPanel,
  type SuggestedUser,
} from '../lib/user-suggestions-panel';

type UserSuggestionsRoot = HTMLElement & { dataset: DOMStringMap };

function readUsers(root: UserSuggestionsRoot): SuggestedUser[] {
  try {
    return JSON.parse(root.dataset.users || '[]') as SuggestedUser[];
  } catch {
    return [];
  }
}

function writeUsers(root: UserSuggestionsRoot, users: SuggestedUser[]) {
  root.dataset.users = JSON.stringify(users);
}

async function loadSuggestions(root: UserSuggestionsRoot) {
  const response = await fetch('/api/users/suggestions?limit=6');
  const payload = await response.json();

  if (!response.ok) {
    throw new Error('Öneriler yüklenemedi');
  }

  return extractUserSuggestions(payload);
}

async function updateFollowing(root: UserSuggestionsRoot, userId: string, isFollowing: boolean) {
  const endpoint = isFollowing ? '/api/following/unfollow' : '/api/following';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ followed_id: userId }),
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (payload &&
        typeof payload === 'object' &&
        'message' in payload &&
        typeof payload.message === 'string' &&
        payload.message) ||
      'İşlem başarısız';
    throw new Error(message);
  }

  const users = readUsers(root).map((user) =>
    user.id === userId ? { ...user, isFollowing: !isFollowing } : user
  );
  writeUsers(root, users);
}

function bindActions(root: UserSuggestionsRoot, content: HTMLElement) {
  const refresh = content.querySelector<HTMLElement>('[data-user-suggestions-refresh]');
  refresh?.addEventListener('click', () => {
    void renderUserSuggestionsRoot(root, true);
  });

  content.querySelectorAll<HTMLElement>('[data-user-suggestion-follow]').forEach((button) => {
    button.addEventListener('click', async () => {
      if (root.dataset.followingInProgress === 'true') return;
      const userId = button.dataset.userSuggestionFollow;
      if (!userId) return;
      const isFollowing = button.dataset.userSuggestionFollowing === 'true';

      root.dataset.followingInProgress = 'true';
      try {
        await updateFollowing(root, userId, isFollowing);
        delete root.dataset.error;
      } catch (error) {
        root.dataset.error =
          error instanceof Error ? error.message : 'Takip işlemi başarısız';
      } finally {
        delete root.dataset.followingInProgress;
        await renderUserSuggestionsRoot(root, false);
      }
    });
  });
}

async function renderUserSuggestionsRoot(root: UserSuggestionsRoot, reload: boolean) {
  const loading = root.querySelector<HTMLElement>('[data-user-suggestions-loading]');
  const content = root.querySelector<HTMLElement>('[data-user-suggestions-content]');
  if (!loading || !content) return;

  if (reload) {
    setElementClassName(loading, 'py-8 text-center text-gray-600 dark:text-gray-300');
    setElementClassName(content, 'hidden');
  }

  try {
    if (reload || !root.dataset.users) {
      const suggestions = await loadSuggestions(root);
      writeUsers(root, suggestions);
    }

    setElementHtml(
      content,
      renderUserSuggestionsPanel(readUsers(root), root.dataset.error || null)
    );
    bindActions(root, content);
  } catch (error) {
    setElementHtml(
      content,
      renderUserSuggestionsPanel(
        [],
        error instanceof Error ? error.message : 'Öneriler yüklenemedi'
      )
    );
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, 'space-y-4');
  }
}

export function initUserSuggestionsPanel() {
  const roots = Array.from(
    document.querySelectorAll<UserSuggestionsRoot>('[data-user-suggestions-panel]')
  );

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    void renderUserSuggestionsRoot(root, true);
  }
}
