export interface SearchUser {
  id: string;
  full_name: string;
  username?: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  points: number;
  level: number;
  created_at: string;
}

export interface UserSearchState {
  query: string;
  sortBy: 'relevance' | 'points' | 'level' | 'recent';
  users: SearchUser[];
  isLoading: boolean;
  error: string | null;
  hasSearched: boolean;
  currentUserId?: string;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function extractUserSearchResults(payload: unknown): SearchUser[] {
  if (!payload || typeof payload !== 'object') return [];

  const root = payload as {
    data?: {
      data?: unknown;
    };
  };

  const users = root.data?.data ?? [];
  return Array.isArray(users) ? (users as SearchUser[]) : [];
}

export function getLevelBadgeColor(level: number) {
  if (level <= 1) return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white';
  if (level <= 5) return 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100';
  if (level <= 10) return 'bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100';
  return 'bg-amber-100 dark:bg-amber-900 text-amber-900 dark:text-amber-100';
}

function renderSortButtons(sortBy: UserSearchState['sortBy']) {
  const options: Array<{ value: UserSearchState['sortBy']; label: string }> = [
    { value: 'relevance', label: 'İlgililik' },
    { value: 'points', label: 'Puan' },
    { value: 'level', label: 'Seviye' },
    { value: 'recent', label: 'Yeni' },
  ];

  return `
    <div class="mb-6 flex flex-wrap gap-2">
      ${options
        .map(
          (option) => `
            <button
              type="button"
              data-user-search-sort="${option.value}"
              class="rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                sortBy === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600'
              }"
            >
              ${option.label}
            </button>
          `
        )
        .join('')}
    </div>
  `;
}

function renderUsers(users: SearchUser[], currentUserId?: string) {
  return `
    <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      ${users
        .map((user) => {
          const name = escapeHtml(user.full_name);
          const username = user.username ? escapeHtml(user.username) : '';
          const bio = user.bio ? escapeHtml(user.bio) : '';

          const avatar = user.avatar_url
            ? `<img src="${escapeHtml(user.avatar_url)}" alt="${name}" class="h-16 w-16 rounded-lg object-cover -mt-12 border-4 border-white dark:border-gray-800" />`
            : `<div class="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-300 text-2xl dark:bg-gray-600 -mt-12 border-4 border-white dark:border-gray-800">👤</div>`;

          const messageButton =
            currentUserId && currentUserId !== user.id
              ? `
                <button
                  type="button"
                  data-user-search-message="${user.id}"
                  class="flex-1 py-1 text-center text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  💬 Mesaj gönder
                </button>
              `
              : '';

          return `
            <a
              href="/kullanıcı/${user.id}"
              class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
            >
              <div class="h-24 bg-gradient-to-r from-blue-400 to-purple-400"></div>
              <div class="px-4 py-4">
                <div class="mb-4 flex gap-4">
                  ${avatar}
                  <div class="h-fit rounded-lg px-3 py-1 text-sm font-bold ${getLevelBadgeColor(user.level)}">
                    Lv ${user.level}
                  </div>
                </div>

                <h3 class="truncate font-bold text-gray-900 dark:text-white">${name}</h3>
                ${username ? `<p class="truncate text-sm text-gray-600 dark:text-gray-400">@${username}</p>` : ''}
                ${bio ? `<p class="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">${bio}</p>` : ''}

                <div class="mt-4 flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-700">
                  <div class="flex-1 text-center">
                    <p class="text-sm font-bold text-gray-900 dark:text-white">${user.points}</p>
                    <p class="text-xs text-gray-600 dark:text-gray-400">Puan</p>
                  </div>
                  <div class="w-px self-stretch bg-gray-200 dark:bg-gray-700"></div>
                  ${messageButton}
                </div>
              </div>
            </a>
          `;
        })
        .join('')}
    </div>
  `;
}

export function renderUserSearchResults(state: UserSearchState) {
  const query = escapeHtml(state.query);

  return `
    <form data-user-search-form class="mb-8">
      <div class="flex flex-col gap-4 sm:flex-row">
        <div class="flex-1">
          <input
            type="text"
            name="query"
            value="${query}"
            placeholder="Kullanıcı adı veya adı ara..."
            class="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
          />
        </div>
        <button
          type="submit"
          ${state.isLoading ? 'disabled' : ''}
          class="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ${state.isLoading ? '⟳' : '🔍'} Ara
        </button>
      </div>
    </form>

    ${state.hasSearched ? renderSortButtons(state.sortBy) : ''}

    ${
      state.error
        ? `<div class="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">${escapeHtml(state.error)}</div>`
        : ''
    }

    ${
      state.isLoading
        ? '<div class="flex justify-center py-12"><p class="text-gray-600 dark:text-gray-400">Kullanıcılar aranıyor...</p></div>'
        : !state.hasSearched
          ? '<div class="text-center py-16"><p class="mb-4 text-4xl">🔍</p><p class="text-lg text-gray-600 dark:text-gray-400">Kullanıcı aramak için arama kutusunu kullanın.</p><p class="mt-2 text-sm text-gray-500 dark:text-gray-500">En az 2 karakter girin.</p></div>'
          : state.users.length === 0
            ? '<div class="text-center py-12"><p class="mb-2 text-gray-600 dark:text-gray-400">😕</p><p class="text-gray-600 dark:text-gray-400">Sonuç bulunamadı.</p></div>'
            : renderUsers(state.users, state.currentUserId)
    }
  `;
}
