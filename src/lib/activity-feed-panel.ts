import { formatAdminDateTime } from './admin-format';

export interface ActivityFeedItem {
  id: string;
  userId: string;
  userName: string;
  userUsername: string | null;
  userAvatar: string | null;
  userLevel: number;
  actionType: string;
  referenceType: string | null;
  referenceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export type ActivityFeedFilter = 'all' | 'reviews' | 'favorites' | 'comments' | 'badges';

export interface ActivityFeedState {
  items: ActivityFeedItem[];
  filter: ActivityFeedFilter;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  offset: number;
  hasMore: boolean;
}

const FILTER_OPTIONS: Array<{ value: ActivityFeedFilter; label: string }> = [
  { value: 'all', label: 'Tumu' },
  { value: 'reviews', label: 'Yorumlar' },
  { value: 'favorites', label: 'Favoriler' },
  { value: 'comments', label: 'Yorum Yanitlari' },
  { value: 'badges', label: 'Rozetler' },
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNumber(value: unknown): number {
  return typeof value === 'number' ? value : 0;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getMetaString(activity: ActivityFeedItem, key: string): string {
  const value = activity.metadata?.[key];
  return typeof value === 'string' ? value : '';
}

function getMetaNumber(activity: ActivityFeedItem, key: string): number {
  const value = activity.metadata?.[key];
  return typeof value === 'number' ? value : 0;
}

export function createActivityFeedState(): ActivityFeedState {
  return {
    items: [],
    filter: 'all',
    loading: true,
    loadingMore: false,
    error: null,
    offset: 0,
    hasMore: true,
  };
}

export function extractActivityFeedItems(payload: unknown): ActivityFeedItem[] {
  const root = asRecord(payload);
  const data = Array.isArray(root?.data) ? (root?.data as unknown[]) : [];

  return data
    .map((entry) => {
      const item = asRecord(entry);
      if (!item) return null;
      return {
        id: asString(item.id),
        userId: asString(item.user_id),
        userName: asString(item.user_name),
        userUsername: asString(item.user_username) || null,
        userAvatar: asString(item.user_avatar) || null,
        userLevel: asNumber(item.user_level),
        actionType: asString(item.action_type),
        referenceType: asString(item.reference_type) || null,
        referenceId: asString(item.reference_id) || null,
        metadata: asRecord(item.metadata),
        createdAt: asString(item.created_at),
      } satisfies ActivityFeedItem;
    })
    .filter((item): item is ActivityFeedItem => Boolean(item?.id && item.userId && item.userName));
}

export function getActivityDescription(activity: ActivityFeedItem): string {
  switch (activity.actionType) {
    case 'review_created':
      return `\"${getMetaString(activity, 'placeName') || 'bir yere'}\" yorum yapti`;
    case 'favorite_added':
      return `\"${getMetaString(activity, 'placeName') || 'bir yeri'}\" favorilerine ekledi`;
    case 'badge_earned':
      return `\"${getMetaString(activity, 'badgeName') || 'Rozet'}\" rozeti kazandi`;
    case 'comment_posted':
      return 'Blog yazisina yorum yapti';
    case 'points_earned':
      return `${getMetaNumber(activity, 'points')} puan kazandi`;
    case 'level_up':
      return `Level ${getMetaNumber(activity, 'newLevel') || '?'} oldu`;
    default:
      return 'Bir eylem gerceklestirdi';
  }
}

export function getActivityIcon(actionType: string): string {
  switch (actionType) {
    case 'review_created':
      return '✍️';
    case 'favorite_added':
      return '❤️';
    case 'badge_earned':
      return '🏅';
    case 'comment_posted':
      return '💬';
    case 'level_up':
      return '⬆️';
    case 'points_earned':
      return '⭐';
    default:
      return '📌';
  }
}

export function formatActivityTime(dateString: string, now = new Date()): string {
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Az once';
  if (diffMins < 60) return `${diffMins}d`;
  if (diffHours < 24) return `${diffHours}s`;
  if (diffDays < 7) return `${diffDays}g`;
  return formatAdminDateTime(dateString, '-').split(' ')[0] || '-';
}

export function formatActivityDetailedTime(dateString: string): string {
  return formatAdminDateTime(dateString, '-');
}

export function renderActivityFeed(state: ActivityFeedState): string {
  if (state.loading && !state.items.length) {
    return '<div class="flex justify-center py-12"><p class="text-gray-600 dark:text-gray-400">Aktivite akisi yukleniyor...</p></div>';
  }

  const filterHtml = FILTER_OPTIONS.map((option) => {
    const active = state.filter === option.value;
    return `<button type="button" data-activity-filter="${option.value}" class="px-4 py-2 rounded-lg transition-colors font-medium text-sm ${active ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}">${option.label}</button>`;
  }).join('');

  const errorHtml = state.error
    ? `<div class="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400">${escapeHtml(state.error)}</div>`
    : '';

  let bodyHtml = '';
  if (!state.loading && !state.items.length) {
    bodyHtml = `
      <div class="text-center py-16">
        <p class="text-4xl mb-4">🌊</p>
        <p class="text-gray-600 dark:text-gray-400 text-lg">Aktivite yok</p>
        <p class="text-gray-500 dark:text-gray-500 text-sm mt-2">Takip ettiginiz kullanicilarin aktiviteleri burada gorunecek</p>
      </div>
    `;
  } else {
    const itemsHtml = state.items.map((activity) => `
      <a href="/kullanıcı/${activity.userId}" class="block p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all">
        <div class="flex gap-4">
          <div class="flex-shrink-0 flex gap-3">
            <div class="relative">
              ${activity.userAvatar
                ? `<img src="${escapeHtml(activity.userAvatar)}" alt="${escapeHtml(activity.userName)}" class="w-12 h-12 rounded-full object-cover" />`
                : `<div class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm">${escapeHtml(activity.userName.charAt(0))}</div>`}
              <span class="absolute -bottom-1 -right-1 text-lg">${getActivityIcon(activity.actionType)}</span>
            </div>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-start justify-between mb-2">
              <div>
                <div class="flex items-center gap-2">
                  <p class="font-semibold text-gray-900 dark:text-white">${escapeHtml(activity.userName)}</p>
                  ${activity.userUsername ? `<p class="text-sm text-gray-500 dark:text-gray-400">@${escapeHtml(activity.userUsername)}</p>` : ''}
                  ${activity.userLevel > 1 ? `<span class="px-2 py-0.5 text-xs font-bold rounded bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200">Lv${activity.userLevel}</span>` : ''}
                </div>
              </div>
              <p class="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">${escapeHtml(formatActivityTime(activity.createdAt))}</p>
            </div>
            <p class="text-gray-700 dark:text-gray-300 mb-2">${escapeHtml(getActivityDescription(activity))}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">${escapeHtml(formatActivityDetailedTime(activity.createdAt))}</p>
          </div>
        </div>
      </a>
    `).join('');

    const loadMore = state.hasMore
      ? `<div class="mt-8 flex justify-center"><button type="button" data-activity-load-more class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">${state.loadingMore ? 'Yukleniyor...' : 'Daha Fazla Yukle'}</button></div>`
      : '';

    bodyHtml = `<div class="space-y-4">${itemsHtml}</div>${loadMore}`;
  }

  return `<div><div class="mb-6 flex flex-wrap gap-2">${filterHtml}</div>${errorHtml}${bodyHtml}</div>`;
}
