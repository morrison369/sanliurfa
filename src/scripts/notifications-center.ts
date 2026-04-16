import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractNotificationsCenterData,
  extractNotificationsCenterMessage,
  renderNotificationsCenter,
  type NotificationsCenterState,
} from '../lib/notifications-center';

type NotificationsCenterRoot = HTMLElement & { dataset: DOMStringMap };

function readState(root: NotificationsCenterRoot): NotificationsCenterState {
  return {
    notifications: [],
    filter: root.dataset.filter === 'unread' ? 'unread' : 'all',
    actionInProgress: root.dataset.actionInProgress || null,
    bulkActionInProgress: root.dataset.bulkActionInProgress === 'true',
    error: root.dataset.error || null,
  };
}

function setError(root: NotificationsCenterRoot, message: string | null) {
  if (message) {
    root.dataset.error = message;
  } else {
    delete root.dataset.error;
  }
}

async function loadNotifications(root: NotificationsCenterRoot) {
  const filter = root.dataset.filter === 'unread' ? 'unread' : 'all';
  const response = await fetch(`/api/notifications?filter=${filter}&limit=50`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(extractNotificationsCenterMessage(payload, 'Bildirimler alınırken hata oluştu'));
  }

  return extractNotificationsCenterData(payload);
}

async function reloadNotifications(root: NotificationsCenterRoot) {
  const loading = root.querySelector<HTMLElement>('[data-notifications-center-loading]');
  const content = root.querySelector<HTMLElement>('[data-notifications-center-content]');
  if (!loading || !content) return;

  try {
    const { notifications, filter } = await loadNotifications(root);
    root.dataset.filter = filter;
    const state = readState(root);
    state.notifications = notifications;
    setElementHtml(content, renderNotificationsCenter(state));
    bindActions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Bildirimler alınırken hata oluştu');
    const state = readState(root);
    setElementHtml(content, renderNotificationsCenter(state));
    bindActions(root, content);
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

async function runItemAction(root: NotificationsCenterRoot, action: 'read' | 'delete', notificationId: string) {
  root.dataset.actionInProgress = notificationId;
  await reloadNotifications(root);

  try {
    const response = await fetch(`/api/notifications/${notificationId}`, {
      method: action === 'read' ? 'PUT' : 'DELETE',
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(extractNotificationsCenterMessage(payload, 'Bildirim işlemi başarısız'));
    }
    setError(root, null);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Bildirim işlemi başarısız');
  } finally {
    delete root.dataset.actionInProgress;
    await reloadNotifications(root);
  }
}

async function markAllAsRead(root: NotificationsCenterRoot) {
  root.dataset.bulkActionInProgress = 'true';
  await reloadNotifications(root);

  try {
    const response = await fetch('/api/notifications/read-all', { method: 'PUT' });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(extractNotificationsCenterMessage(payload, 'Tüm bildirimler işaretlenemedi'));
    }
    setError(root, null);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Tüm bildirimler işaretlenemedi');
  } finally {
    delete root.dataset.bulkActionInProgress;
    await reloadNotifications(root);
  }
}

function bindActions(root: NotificationsCenterRoot, content: HTMLElement) {
  content.querySelectorAll<HTMLElement>('[data-notifications-center-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextFilter = button.dataset.notificationsCenterFilter === 'unread' ? 'unread' : 'all';
      if ((root.dataset.filter || 'all') === nextFilter) return;
      root.dataset.filter = nextFilter;
      void reloadNotifications(root);
    });
  });

  content.querySelectorAll<HTMLElement>('[data-notifications-center-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const token = button.dataset.notificationsCenterAction;
      if (!token || root.dataset.actionInProgress) return;
      const [action, notificationId] = token.split(':');
      if ((action !== 'read' && action !== 'delete') || !notificationId) return;
      void runItemAction(root, action, notificationId);
    });
  });

  const markAllButton = content.querySelector<HTMLElement>('[data-notifications-center-mark-all]');
  markAllButton?.addEventListener('click', () => {
    if (root.dataset.bulkActionInProgress === 'true') return;
    void markAllAsRead(root);
  });
}

export function initNotificationsCenter() {
  const roots = Array.from(document.querySelectorAll<NotificationsCenterRoot>('[data-notifications-center]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.filter = 'all';
    void reloadNotifications(root);
  }
}
