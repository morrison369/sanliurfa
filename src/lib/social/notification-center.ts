import { renderEmptyState, renderErrorState } from '../shared/render-states';
import { UI_COPY_TR } from '../shared/ui-copy';

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
  notice: string | null;
  noticeAction: 'undo-bulk-archive' | null;
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

function renderToggle(showArchived: boolean): string {
  const currentClass = !showArchived
    ? 'bg-blue-600 text-white'
    : 'bg-gray-200 text-gray-700 hover:bg-gray-300';
  const archivedClass = showArchived
    ? 'bg-blue-600 text-white'
    : 'bg-gray-200 text-gray-700 hover:bg-gray-300';

  return `
    <div class="flex gap-2">
      <button type="button" data-notifications-filter="current" class="rounded-lg px-4 py-2 text-sm font-medium transition-colors ${currentClass}">Güncel bildirimler</button>
      <button type="button" data-notifications-filter="archived" class="rounded-lg px-4 py-2 text-sm font-medium transition-colors ${archivedClass}">Arşivlenen bildirimler</button>
    </div>
  `;
}

function renderBulkActions(state: NotificationCenterState): string {
  if (state.showArchived || state.notifications.length === 0) return '';

  const busy = state.actionInProgress === 'bulk:read-all';
  const archiveBusy = state.actionInProgress === 'bulk:archive-visible';

  return `
    <div class="flex flex-wrap gap-3">
      ${state.unreadCount > 0 ? `<button type="button" data-notification-center-mark-all ${busy || archiveBusy ? 'disabled' : ''} class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
        ${busy ? UI_COPY_TR.common.processing : UI_COPY_TR.notifications.markAllRead}
      </button>` : ''}
      <button type="button" data-notification-center-archive-visible ${busy || archiveBusy ? 'disabled' : ''} class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60">
        ${archiveBusy ? UI_COPY_TR.common.processing : 'Görünenleri arşivle'}
      </button>
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
          <button type="button" data-notification-action="read:${item.id}" ${busy ? 'disabled' : ''} class="rounded-lg p-2 transition-colors hover:bg-gray-200 disabled:opacity-50" title="${UI_COPY_TR.notifications.markRead}">
            ${busy ? UI_COPY_TR.common.processing : UI_COPY_TR.notifications.markRead}
          </button>
        ` : ''}
        <button type="button" data-notification-action="archive:${item.id}" ${busy ? 'disabled' : ''} class="rounded-lg p-2 transition-colors hover:bg-gray-200 disabled:opacity-50" title="${state.showArchived ? UI_COPY_TR.common.remove : UI_COPY_TR.notifications.archive}">
          ${busy ? UI_COPY_TR.common.processing : state.showArchived ? UI_COPY_TR.common.remove : UI_COPY_TR.notifications.archive}
        </button>
      </div>
    </div>
  `;
}

function renderNotificationError(message: string): string {
  return `
    <div class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
      <p class="mb-1 font-medium text-red-800 dark:text-red-200">Bildirim merkezi güncellenemedi.</p>
      <p class="text-red-700 dark:text-red-300">${message}</p>
      <div class="mt-3 flex flex-wrap gap-3 text-sm">
        <button type="button" data-notification-center-retry class="text-red-800 underline decoration-red-300 underline-offset-2 dark:text-red-200">Tekrar dene</button>
      </div>
    </div>
  `;
}

function renderNotificationNotice(message: string, action: NotificationCenterState['noticeAction']): string {
  return `
    <div class="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
      <p class="font-medium text-green-800 dark:text-green-200">Bildirim merkezi güncellendi.</p>
      <p class="mt-1 text-green-700 dark:text-green-300">${message}</p>
      ${action === 'undo-bulk-archive' ? '<div class="mt-3 flex flex-wrap gap-3 text-sm"><button type="button" data-notification-center-undo class="text-green-800 underline decoration-green-300 underline-offset-2 dark:text-green-200">Geri al</button></div>' : ''}
    </div>
  `;
}

export function renderNotificationCenter(state: NotificationCenterState): string {
  const badge = !state.showArchived && state.unreadCount > 0
    ? `<span class="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">${state.unreadCount}</span>`
    : '';

  const list = state.notifications.length === 0
    ? `
      ${renderEmptyState(state.showArchived ? 'Arşivlenmiş bildirim bulunmuyor.' : 'Gösterilecek yeni bildirim bulunmuyor.')}
      <div class="mt-4 flex flex-wrap gap-3">
        <button type="button" data-notification-center-refresh class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Listeyi yenile</button>
        ${state.showArchived ? '<button type="button" data-notification-center-reset-filter class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Güncel bildirimlere dön</button>' : ''}
      </div>
    `
    : `<div class="space-y-2">${state.notifications.map((item) => renderNotificationItem(state, item)).join('')}</div>`;

  return `
    <div class="space-y-4">
      ${state.error ? renderNotificationError(state.error) : ''}
      ${state.notice ? renderNotificationNotice(state.notice, state.noticeAction) : ''}
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-gray-900">${UI_COPY_TR.notifications.centerTitle}</h1>
          ${badge}
        </div>
        <button type="button" data-notification-center-refresh class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">Listeyi yenile</button>
      </div>
      ${renderToggle(state.showArchived)}
      ${renderBulkActions(state)}
      ${list}
    </div>
  `;
}
