export interface RecommendedUser {
  id: string;
  avatar_url?: string | null;
  full_name: string;
  level: number;
  review_count: number;
}

export function renderUserRecommendations(users: RecommendedUser[], followingIds: Set<string>): string {
  if (users.length === 0) return '';

  return `
    <h3 class="text-lg font-bold text-gray-900 dark:text-white">Kimi takip etmelisiniz?</h3>
    <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
      ${users
        .map((user) => {
          const isFollowing = followingIds.has(user.id);
          const avatar = user.avatar_url
            ? `<img src="${user.avatar_url}" alt="${user.full_name}" class="h-10 w-10 rounded-full object-cover" />`
            : `<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 font-bold">${user.full_name.charAt(0)}</div>`;

          return `
            <div class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
              <a href="/kullanici/${user.id}" class="flex flex-1 items-center gap-3">
                ${avatar}
                <div class="flex-1">
                  <p class="font-medium text-gray-900 dark:text-white">${user.full_name}</p>
                  <p class="text-xs text-gray-600 dark:text-gray-400">Seviye ${user.level} • ${user.review_count} inceleme</p>
                </div>
              </a>
              <button
                data-user-follow="${user.id}"
                class="rounded px-3 py-1 text-sm font-medium text-white ${isFollowing ? 'bg-gray-500 hover:bg-gray-600' : 'bg-blue-500 hover:bg-blue-600'}"
              >
                ${isFollowing ? 'Takibi bırak' : 'Takip et'}
              </button>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}
