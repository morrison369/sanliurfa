export interface SuggestedUser {
  id: string;
  name: string;
  username: string;
  avatar?: string | null;
  isFollowing: boolean;
  activityCount: number;
  matchingInterests: number;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function extractUserSuggestions(payload: unknown): SuggestedUser[] {
  if (!payload || typeof payload !== 'object') return [];

  const root = payload as {
    suggestions?: unknown;
    data?: {
      suggestions?: unknown;
      data?: {
        suggestions?: unknown;
      };
    };
  };

  const suggestions =
    root.data?.data?.suggestions ?? root.data?.suggestions ?? root.suggestions ?? [];

  return Array.isArray(suggestions) ? (suggestions as SuggestedUser[]) : [];
}

export function renderUserSuggestionsPanel(users: SuggestedUser[], error: string | null) {
  if (error) {
    return `
      <div class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300">
        ${escapeHtml(error)}
      </div>
    `;
  }

  if (users.length === 0) {
    return `
      <div class="py-8 text-center text-gray-500 dark:text-gray-400">
        Şu an için öneri yok
      </div>
    `;
  }

  return `
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      ${users
        .map((user) => {
          const name = escapeHtml(user.name);
          const username = escapeHtml(user.username);
          const avatar = user.avatar
            ? `<img src="${escapeHtml(user.avatar)}" alt="${name}" class="h-10 w-10 rounded-full object-cover" />`
            : `<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-sm font-bold text-white">${name.charAt(0)}</div>`;

          const matchingInterests =
            user.matchingInterests > 0
              ? `
                <div class="rounded bg-blue-50 p-2 text-center dark:bg-blue-900/30">
                  <p class="text-blue-600 dark:text-blue-400">Ortak İlgi</p>
                  <p class="font-bold text-blue-700 dark:text-blue-300">${user.matchingInterests}</p>
                </div>
              `
              : '';

          return `
            <div class="rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:hover:shadow-lg">
              <div class="mb-3 flex items-center gap-3">
                ${avatar}
                <div class="min-w-0 flex-1">
                  <h3 class="truncate font-medium text-gray-900 dark:text-white">${name}</h3>
                  <p class="truncate text-sm text-gray-600 dark:text-gray-400">@${username}</p>
                </div>
              </div>

              <div class="mb-3 grid grid-cols-2 gap-2 text-xs">
                <div class="rounded bg-gray-50 p-2 text-center dark:bg-gray-700">
                  <p class="text-gray-600 dark:text-gray-400">Aktivite</p>
                  <p class="font-bold text-gray-900 dark:text-white">${user.activityCount}</p>
                </div>
                ${matchingInterests || '<div></div>'}
              </div>

              <button
                type="button"
                data-user-suggestion-follow="${user.id}"
                data-user-suggestion-following="${String(user.isFollowing)}"
                class="w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors ${user.isFollowing ? 'bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600' : 'bg-blue-600 text-white hover:bg-blue-700'}"
              >
                ${user.isFollowing ? 'Takip Ediliyor' : 'Takip Et'}
              </button>

              <a
                href="/kullanıcı/${user.id}"
                class="mt-2 block py-1 text-center text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Profili Görüntüle
              </a>
            </div>
          `;
        })
        .join('')}
    </div>
    <button
      type="button"
      data-user-suggestions-refresh
      class="w-full rounded-lg border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 transition-colors hover:text-blue-700 dark:border-blue-400 dark:text-blue-400 dark:hover:text-blue-300"
    >
      Yeni Öneriler Yükle
    </button>
  `;
}
