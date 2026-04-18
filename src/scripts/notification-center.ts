import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractNotificationCenterData,
  extractNotificationCenterMessage,
  renderNotificationCenter,
  type NotificationCenterState,
} from '../lib/notification-center';

type NotificationCenterRoot = HTMLElement & { dataset: DOMStringMap };

function readState(root: NotificationCenterRoot): NotificationCenterState {
  return {
    notifications: [],
    unreadCount: Number(root.dataset.unreadCount || '0'),
    showArchived: root.dataset.showArchived === 'true',
    actionInProgress: root.dataset.actionInProgress || null,
    error: root.dataset.error || null,
    notice: root.dataset.notice || null,
  };
}

function setError(root: NotificationCenterRoot, message: string | null) {
  if (message) {
    root.dataset.error = message;
  } else {
    delete root.dataset.error;
  }
}

function setNotice(root: NotificationCenterRoot, message: string | null) {
  if (message) {
    root.dataset.notice = message;
  } else {
    delete root.dataset.notice;
  }
}

async function loadNotifications(root: NotificationCenterRoot) {
  const response = await fetch(`/api/notifications/center?archived=${root.dataset.showArchived === 'true'}`);
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(extractNotificationCenterMessage(payload, 'Bildirimler alınırken hata oluştu'));
  }

  return extractNotificationCenterData(payload);
}

async function runNotificationAction(root: NotificationCenterRoot, action: 'read' | 'archive', notificationId: string) {
  root.dataset.actionInProgress = notificationId;
  setNotice(root, null);
  await renderNotificationCenterRoot(root);

  try {
    const response = await fetch('/api/notifications/center', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, notificationId }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(extractNotificationCenterMessage(payload, 'İşlem başarısız'));
    }

    setError(root, null);
    setNotice(
      root,
      action === 'read' ? 'Bildirim okundu olarak işaretlendi.' : 'Bildirim listeden kaldırıldı.',
    );
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'İşlem başarısız');
    setNotice(root, null);
  } finally {
    delete root.dataset.actionInProgress;
    await renderNotificationCenterRoot(root);
  }
}

function bindActions(root: NotificationCenterRoot, content: HTMLElement) {
  content.querySelectorAll<HTMLElement>('[data-notifications-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.notificationsFilter === 'archived';
      if ((root.dataset.showArchived === 'true') === mode) return;
      root.dataset.showArchived = String(mode);
      setNotice(root, null);
      void renderNotificationCenterRoot(root);
    });
  });

  content.querySelectorAll<HTMLElement>('[data-notification-center-refresh]').forEach((button) => {
    button.addEventListener('click', () => {
      setError(root, null);
      setNotice(root, null);
      void renderNotificationCenterRoot(root);
    });
  });

  content.querySelectorAll<HTMLElement>('[data-notification-center-reset-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      root.dataset.showArchived = 'false';
      setError(root, null);
      setNotice(root, null);
      void renderNotificationCenterRoot(root);
    });
  });

  content.querySelectorAll<HTMLElement>('[data-notification-action]').forEach((button) => {
    button.addEventListener('click', () => {
      const token = button.dataset.notificationAction;
      if (!token || root.dataset.actionInProgress) return;
      const [action, notificationId] = token.split(':');
      if ((action !== 'read' && action !== 'archive') || !notificationId) return;
      void runNotificationAction(root, action, notificationId);
    });
  });
}

async function renderNotificationCenterRoot(root: NotificationCenterRoot) {
  const loading = root.querySelector<HTMLElement>('[data-notification-center-loading]');
  const content = root.querySelector<HTMLElement>('[data-notification-center-content]');
  if (!loading || !content) return;

  try {
    const { notifications, unreadCount } = await loadNotifications(root);
    root.dataset.unreadCount = String(unreadCount);
    const state = readState(root);
    state.notifications = notifications;
    state.unreadCount = unreadCount;
    setElementHtml(content, renderNotificationCenter(state));
    bindActions(root, content);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Bildirimler alınırken hata oluştu');
    const state = readState(root);
    state.notifications = [];
    setElementHtml(content, renderNotificationCenter(state));
  } finally {
    setElementClassName(loading, 'hidden');
    setElementClassName(content, '');
  }
}

export function initNotificationCenter() {
  const roots = Array.from(document.querySelectorAll<NotificationCenterRoot>('[data-notification-center]'));

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;
    root.dataset.initialized = 'true';
    root.dataset.showArchived = 'false';
    setNotice(root, null);
    void renderNotificationCenterRoot(root);
  }
}
