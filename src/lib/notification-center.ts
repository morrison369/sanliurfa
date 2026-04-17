export interface NotificationCenterItem {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  is_archived: boolean;
  created_at: string;
  action_url?: string;
}

export interface NotificationCenterState {
  notifications: NotificationCenterItem[];
  unreadCount: number;
  showArchived: boolean;
  actionInProgress: string | null;
  error: string | null;
}

function resolveEnvelopeData(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object') return {};

  const outerData = 'data' in payload ? (payload as { data?: unknown }).data : undefined;
  if (outerData && typeof outerData === 'object') {
    const nestedData = 'data' in outerData ? (outerData as { data?: unknown }).data : undefined;
    if (nestedData && typeof nestedData === 'object') {
      return nestedData as Record<string, unknown>;
    }

    return outerData as Record<string, unknown>;
  }

  return payload as Record<string, unknown>;
}

export function extractNotificationCenterData(payload: unknown): {
  notifications: NotificationCenterItem[];
  unreadCount: number;
} {
  const data = resolveEnvelopeData(payload);
  return {
    notifications: Array.isArray(data.notifications)
      ? (data.notifications as NotificationCenterItem[])
      : [],
    unreadCount: typeof data.unreadCount === 'number' ? data.unreadCount : 0,
  };
}

export function extractNotificationCenterMessage(payload: unknown, fallback: string): string {
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

function renderError(message: string): string {
  return `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4">
      <h3 class="font-medium text-red-900">İşlem hatası</h3>
      <p class="text-sm text-red-700">${message}</p>
    </div>
  `;
}

function renderToggle(showArchived: boolean): string {
  const currentClass = !showArchived
    ? 'bg-blue-600 text-white'
    : 'bg-gray-200 text-gray-700 hover:bg-gray-300';
  const archivedClass = showArchived
    ? 'bg-blue-600 text-white'
    : 'bg-gray-200 text-gray-700 hover:bg-gray-300';

  return `
    <div class="flex gap-2">
      <button type="button" data-notifications-filter="current" class="rounded-lg px-4 py-2 text-sm font-medium transition-colors ${currentClass}">Güncel</button>
      <button type="button" data-notifications-filter="archived" class="rounded-lg px-4 py-2 text-sm font-medium transition-colors ${archivedClass}">Arşiv</button>
    </div>
  `;
}

function renderNotificationItem(state: NotificationCenterState, item: NotificationCenterItem): string {
  const containerClass = item.is_read
    ? 'bg-white border-gray-200'
    : 'bg-blue-50 border-blue-200';
  const titleClass = !item.is_read ? 'font-bold text-gray-900' : 'font-semibold text-gray-900';
  const busy = state.actionInProgress === item.id;

  return `
    <div class="flex items-start justify-between gap-4 rounded-lg border p-4 ${containerClass}">
      <div class="min-w-0 flex-1">
        <h3 class="${titleClass}">${item.title}</h3>
        <p class="mt-1 text-sm text-gray-600">${item.message}</p>
        <p class="mt-2 text-xs text-gray-500">${formatNotificationDate(item.created_at)}</p>
      </div>
      <div class="flex flex-shrink-0 items-center gap-2">
        ${!item.is_read && !state.showArchived ? `
          <button type="button" data-notification-action="read:${item.id}" ${busy ? 'disabled' : ''} class="rounded-lg p-2 transition-colors hover:bg-gray-200 disabled:opacity-50" title="Okundu olarak işaretle">
            ${busy ? 'İşleniyor...' : 'Okundu olarak işaretle'}
          </button>
        ` : ''}
        <button type="button" data-notification-action="archive:${item.id}" ${busy ? 'disabled' : ''} class="rounded-lg p-2 transition-colors hover:bg-gray-200 disabled:opacity-50" title="${state.showArchived ? 'Kaldır' : 'Arşive taşı'}">
          ${busy ? 'İşleniyor...' : state.showArchived ? 'Kaldır' : 'Arşive taşı'}
        </button>
      </div>
    </div>
  `;
}

export function renderNotificationCenter(state: NotificationCenterState): string {
  const badge = !state.showArchived && state.unreadCount > 0
    ? `<span class="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">${state.unreadCount}</span>`
    : '';

  const list = state.notifications.length === 0
    ? `
      <div class="py-12 text-center text-gray-500">
        <p>${state.showArchived ? 'Arşivlenmiş bildirim bulunmuyor.' : 'Yeni bildiriminiz bulunmuyor.'}</p>
      </div>
    `
    : `<div class="space-y-2">${state.notifications.map((item) => renderNotificationItem(state, item)).join('')}</div>`;

  return `
    <div class="space-y-4">
      ${state.error ? renderError(state.error) : ''}
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-gray-900">Bildirim merkezi</h1>
          ${badge}
        </div>
      </div>
      ${renderToggle(state.showArchived)}
      ${list}
    </div>
  `;
}
