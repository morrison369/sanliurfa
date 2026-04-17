export interface NotificationsCenterItem {
  id: string;
  type: string;
  message: string;
  created_at: string;
  read_at?: string | null;
}

export interface NotificationsCenterState {
  notifications: NotificationsCenterItem[];
  filter: 'all' | 'unread';
  actionInProgress: string | null;
  bulkActionInProgress: boolean;
  error: string | null;
}

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    const nestedData = 'data' in outerData ? (outerData as { data?: unknown }).data : undefined;
    if (nestedData && typeof nestedData === 'object') return nestedData as Record<string, unknown>;
    return outerData as Record<string, unknown>;
  }

  return payload as Record<string, unknown>;
}

export function extractNotificationsCenterData(payload: unknown): {
  notifications: NotificationsCenterItem[];
  count: number;
  filter: 'all' | 'unread';
} {
  const data = resolveEnvelopeData(payload);
  const notifications = Array.isArray(data.data)
    ? (data.data as NotificationsCenterItem[])
    : Array.isArray(data.notifications)
      ? (data.notifications as NotificationsCenterItem[])
      : [];

  const filter = data.filter === 'unread' ? 'unread' : 'all';

  return {
    notifications,
    count: typeof data.count === 'number' ? data.count : notifications.length,
    filter,
  };
}

export function extractNotificationsCenterMessage(payload: unknown, fallback: string): string {
  const data = resolveEnvelopeData(payload);

  if (typeof data.message === 'string' && data.message.trim().length > 0) {
    return data.message;
  }

  if (payload && typeof payload === 'object') {
    const error = 'error' in payload ? (payload as { error?: unknown }).error : undefined;
    if (typeof error === 'string' && error.trim().length > 0) return error;
    if (error && typeof error === 'object') {
      const message = 'message' in error ? (error as { message?: unknown }).message : undefined;
      if (typeof message === 'string' && message.trim().length > 0) return message;
    }
  }

  return fallback;
}

function formatNotificationDate(value: string): string {
  return new Date(value).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatNotificationType(type: string): string {
  const normalized = type.trim().toLowerCase();

  if (normalized === 'message' || normalized === 'new_message') return 'Yeni mesaj';
  if (normalized === 'comment' || normalized === 'new_comment') return 'Yeni yorum';
  if (normalized === 'like' || normalized === 'new_like') return 'Yeni beğeni';
  if (normalized === 'follow' || normalized === 'new_follower') return 'Yeni takipçi';
  if (normalized === 'mention') return 'Bahsedilme';
  if (normalized === 'system') return 'Sistem bildirimi';
  if (normalized === 'verification') return 'Doğrulama bildirimi';
  if (normalized === 'subscription') return 'Abonelik bildirimi';
  if (normalized === 'warning') return 'Uyarı';
  if (normalized === 'security') return 'Güvenlik bildirimi';
  if (normalized === 'reply') return 'Yanıt';
  if (normalized === 'admin') return 'Yönetici bildirimi';

  return type;
}

function renderError(message: string): string {
  return `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <h3 class="font-medium text-red-900">İşlem hatası</h3>
      <p class="text-sm text-red-700">${message}</p>
    </div>
  `;
}

function renderFilters(filter: 'all' | 'unread'): string {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium transition-colors';
  return `
    <div class="flex gap-2">
      <button type="button" data-notifications-center-filter="all" class="${base} ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">Tüm bildirimlerim</button>
      <button type="button" data-notifications-center-filter="unread" class="${base} ${filter === 'unread' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}">Okunmamış bildirimler</button>
    </div>
  `;
}

function renderNotificationItem(state: NotificationsCenterState, item: NotificationsCenterItem): string {
  const isUnread = !item.read_at;
  const busy = state.actionInProgress === item.id;
  const cardClass = isUnread ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200';

  return `
    <div class="rounded-lg border p-4 ${cardClass}">
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0 flex-1">
          <p class="font-medium text-gray-900">${formatNotificationType(item.type)}</p>
          <p class="mt-1 text-sm text-gray-600">${item.message}</p>
          <p class="mt-2 text-xs text-gray-500">${formatNotificationDate(item.created_at)}</p>
        </div>
        <div class="flex flex-shrink-0 items-center gap-2">
          ${isUnread ? `
            <button type="button" data-notifications-center-action="read:${item.id}" ${busy ? 'disabled' : ''} class="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-50">
              ${busy ? 'İşleniyor...' : 'Okundu olarak işaretle'}
            </button>
          ` : ''}
          <button type="button" data-notifications-center-action="delete:${item.id}" ${busy ? 'disabled' : ''} class="text-xs text-red-600 hover:text-red-700 disabled:opacity-50">
            ${busy ? 'İşleniyor...' : 'Kaldır'}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderNotificationsCenter(state: NotificationsCenterState): string {
  const unreadCount = state.notifications.filter((item) => !item.read_at).length;
  const canMarkAll = state.filter === 'all' && unreadCount > 0;

  const list = state.notifications.length === 0
    ? `
      <div class="py-12 text-center text-gray-500">
        <p>${state.filter === 'unread' ? 'Henüz okunmamış bildirim bulunmuyor.' : 'Henüz gösterilecek bildirim bulunmuyor.'}</p>
      </div>
    `
    : `<div class="space-y-2">${state.notifications.map((item) => renderNotificationItem(state, item)).join('')}</div>`;

  return `
    <div class="space-y-4">
      ${state.error ? renderError(state.error) : ''}
      <div class="mb-6 flex items-center justify-between gap-3">
        <div class="flex items-center gap-3">
          <h2 class="text-2xl font-bold text-gray-900">Bildirim merkezi</h2>
          ${unreadCount > 0 ? `<span class="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">${unreadCount}</span>` : ''}
        </div>
        ${canMarkAll ? `
          <button type="button" data-notifications-center-mark-all ${state.bulkActionInProgress ? 'disabled' : ''} class="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-50">
            ${state.bulkActionInProgress ? 'İşleniyor...' : 'Tümünü okundu olarak işaretle'}
          </button>
        ` : ''}
      </div>
      ${renderFilters(state.filter)}
      ${list}
    </div>
  `;
}
