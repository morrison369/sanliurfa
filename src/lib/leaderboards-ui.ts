export interface LeaderboardUser {
  id: string;
  rank: number;
  avatar_url?: string | null;
  full_name: string;
  username?: string | null;
  points: number;
  level: number;
}

export const leaderboardSortOptions = ['points', 'level', 'activity', 'recent'] as const;

export type LeaderboardSort = (typeof leaderboardSortOptions)[number];

export function getLeaderboardButtonClass(active: boolean): string {
  return active
    ? 'rounded bg-blue-500 px-4 py-2 text-white'
    : 'rounded border border-gray-300 px-4 py-2 hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-800';
}

export function renderLeaderboardUsers(users: LeaderboardUser[]): string {
  return users
    .map((user) => {
      const avatar = user.avatar_url
        ? `<img src="${user.avatar_url}" alt="${user.full_name}" class="h-12 w-12 rounded-full object-cover" />`
        : `<div class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-300 text-sm font-bold">${user.full_name.charAt(0)}</div>`;

      return `
        <a href="/kullanici/${user.id}" class="flex items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
          <div class="w-12 text-center text-2xl font-bold text-blue-600">#${user.rank}</div>
          ${avatar}
          <div class="flex-1">
            <p class="font-medium text-gray-900 dark:text-white">${user.full_name}</p>
            <p class="text-sm text-gray-600 dark:text-gray-400">@${user.username || 'kullanici'}</p>
          </div>
          <div class="text-right">
            <p class="text-lg font-bold text-gray-900 dark:text-white">${user.points}</p>
            <p class="text-xs text-gray-600 dark:text-gray-400">Seviye ${user.level}</p>
          </div>
        </a>
      `;
    })
    .join('');
}
