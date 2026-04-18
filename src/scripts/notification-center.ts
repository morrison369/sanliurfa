import { setElementClassName, setElementHtml } from '../lib/admin-dom';
import {
  extractNotificationCenterData,
  extractNotificationCenterMessage,
  renderNotificationCenter,
  type NotificationCenterState,
} from '../lib/notification-center';
import { readJsonSafely, retryOnce } from './shared/async-ui';
import { bindAll } from './shared/bind-events';
import { emitNotificationUnreadCount } from './shared/unread-sync';

type NotificationCenterRoot = HTMLElement & { dataset: DOMStringMap };
const NOTIFICATION_CENTER_RETRY_DELAY_MS = 200;
const NOTIFICATION_CENTER_UNDO_MS = 3000;
const pendingArchiveTimers = new WeakMap<NotificationCenterRoot, ReturnType<typeof setTimeout>>();
const pendingArchiveSnapshots = new WeakMap<
  NotificationCenterRoot,
  { notifications: NotificationCenterState['notifications']; unreadCount: number }
>();

function readState(root: NotificationCenterRoot): NotificationCenterState {
  return {
    notifications: readNotifications(root),
    unreadCount: Number(root.dataset.unreadCount || '0'),
    showArchived: root.dataset.showArchived === 'true',
    actionInProgress: root.dataset.actionInProgress || null,
    error: root.dataset.error || null,
    notice: root.dataset.notice || null,
    noticeAction: root.dataset.noticeAction === 'undo-bulk-archive' ? 'undo-bulk-archive' : null,
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

function setNoticeAction(root: NotificationCenterRoot, value: NotificationCenterState['noticeAction']) {
  if (value) {
    root.dataset.noticeAction = value;
  } else {
    delete root.dataset.noticeAction;
  }
}

function readNotifications(root: NotificationCenterRoot) {
  const raw = root.dataset.notificationsJson;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeNotifications(root: NotificationCenterRoot, notifications: NotificationCenterState['notifications']) {
  root.dataset.notificationsJson = JSON.stringify(notifications);
}

function writeUnreadCount(root: NotificationCenterRoot, unreadCount: number) {
  root.dataset.unreadCount = String(unreadCount);
  emitNotificationUnreadCount(unreadCount);
}

function applyOptimisticNotificationAction(
  notifications: NotificationCenterState['notifications'],
  action: 'read' | 'archive',
  notificationId: string,
) {
  return notifications
    .map((item) => {
      if (item.id !== notificationId) return item;

      if (action === 'read') {
        return { ...item, is_read: true };
      }

      return { ...item, is_archived: true };
    })
    .filter((item) => (action === 'archive' ? item.id !== notificationId : true));
}

function applyOptimisticMarkAllAsRead(notifications: NotificationCenterState['notifications']) {
  return notifications.map((item) => ({ ...item, is_read: true }));
}

async function loadNotifications(root: NotificationCenterRoot, attempt = 0) {
  return retryOnce(async () => {
    const response = await fetch(`/api/notifications/center?archived=${root.dataset.showArchived === 'true'}`);
    const payload = await readJsonSafely(response);

    if (!response.ok) {
      throw new Error(extractNotificationCenterMessage(payload, 'Bildirimler alınırken hata oluştu'));
    }

    return extractNotificationCenterData(payload);
  }, NOTIFICATION_CENTER_RETRY_DELAY_MS, attempt);
}

function renderCurrentState(root: NotificationCenterRoot) {
  const loading = root.querySelector<HTMLElement>('[data-notification-center-loading]');
  const content = root.querySelector<HTMLElement>('[data-notification-center-content]');
  if (!loading || !content) return;

  setElementHtml(content, renderNotificationCenter(readState(root)));
  bindActions(root, content);
  setElementClassName(loading, 'hidden');
  setElementClassName(content, '');
}

async function runNotificationAction(root: NotificationCenterRoot, action: 'read' | 'archive', notificationId: string) {
  const previousNotifications = readNotifications(root);
  const previousUnreadCount = Number(root.dataset.unreadCount || '0');
  const nextNotifications = applyOptimisticNotificationAction(previousNotifications, action, notificationId);

  root.dataset.actionInProgress = notificationId;
  setNotice(root, null);
  setNoticeAction(root, null);
  writeNotifications(root, nextNotifications);
  if (action === 'read' && previousNotifications.some((item) => item.id === notificationId && !item.is_read)) {
    writeUnreadCount(root, Math.max(0, previousUnreadCount - 1));
  }
  renderCurrentState(root);

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
    setNoticeAction(root, null);
  } catch (error) {
    writeNotifications(root, previousNotifications);
    writeUnreadCount(root, previousUnreadCount);
    setError(root, error instanceof Error ? error.message : 'İşlem başarısız');
    setNotice(root, null);
    setNoticeAction(root, null);
  } finally {
    delete root.dataset.actionInProgress;
    renderCurrentState(root);
  }
}

async function runMarkAllAsRead(root: NotificationCenterRoot) {
  const previousNotifications = readNotifications(root);
  const previousUnreadCount = Number(root.dataset.unreadCount || '0');
  const nextNotifications = applyOptimisticMarkAllAsRead(previousNotifications);

  root.dataset.actionInProgress = 'bulk:read-all';
  setError(root, null);
  setNotice(root, null);
  setNoticeAction(root, null);
  writeNotifications(root, nextNotifications);
  writeUnreadCount(root, 0);
  renderCurrentState(root);

  try {
    const response = await fetch('/api/notifications/read-all', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(extractNotificationCenterMessage(payload, 'İşlem başarısız'));
    }

    setError(root, null);
    setNotice(root, 'Tüm bildirimler okundu olarak işaretlendi.');
    setNoticeAction(root, null);
  } catch (error) {
    writeNotifications(root, previousNotifications);
    writeUnreadCount(root, previousUnreadCount);
    setError(root, error instanceof Error ? error.message : 'İşlem başarısız');
    setNotice(root, null);
    setNoticeAction(root, null);
  } finally {
    delete root.dataset.actionInProgress;
    renderCurrentState(root);
  }
}

async function commitArchiveVisible(root: NotificationCenterRoot, notificationIds: string[]) {
  try {
    await Promise.all(
      notificationIds.map((notificationId) =>
        fetch('/api/notifications/center', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'archive', notificationId }),
        }).then(async (response) => {
          const payload = await readJsonSafely(response);
          if (!response.ok) {
            throw new Error(extractNotificationCenterMessage(payload, 'İşlem başarısız'));
          }
        }),
      ),
    );

    setError(root, null);
    setNotice(root, 'Görünen bildirimler arşive taşındı.');
    setNoticeAction(root, null);
    pendingArchiveSnapshots.delete(root);
  } catch (error) {
    const snapshot = pendingArchiveSnapshots.get(root);
    if (snapshot) {
      writeNotifications(root, snapshot.notifications);
      writeUnreadCount(root, snapshot.unreadCount);
    }
    setError(root, error instanceof Error ? error.message : 'İşlem başarısız');
    setNotice(root, null);
    setNoticeAction(root, null);
    pendingArchiveSnapshots.delete(root);
  } finally {
    pendingArchiveTimers.delete(root);
    delete root.dataset.actionInProgress;
    renderCurrentState(root);
  }
}

function runArchiveVisible(root: NotificationCenterRoot) {
  const previousNotifications = readNotifications(root);
  if (previousNotifications.length === 0) return;
  const previousUnreadCount = Number(root.dataset.unreadCount || '0');
  const archivedIds = previousNotifications.map((item) => item.id);
  const unreadVisibleCount = previousNotifications.filter((item) => !item.is_read).length;

  pendingArchiveSnapshots.set(root, {
    notifications: previousNotifications,
    unreadCount: previousUnreadCount,
  });

  root.dataset.actionInProgress = 'bulk:archive-visible';
  setError(root, null);
  setNotice(root, 'Görünen bildirimler arşive taşınmak üzere.');
  setNoticeAction(root, 'undo-bulk-archive');
  writeNotifications(root, []);
  writeUnreadCount(root, Math.max(0, previousUnreadCount - unreadVisibleCount));
  renderCurrentState(root);

  const timer = setTimeout(() => {
    void commitArchiveVisible(root, archivedIds);
  }, NOTIFICATION_CENTER_UNDO_MS);

  pendingArchiveTimers.set(root, timer);
}

function undoArchiveVisible(root: NotificationCenterRoot) {
  const timer = pendingArchiveTimers.get(root);
  if (timer) {
    clearTimeout(timer);
    pendingArchiveTimers.delete(root);
  }

  const snapshot = pendingArchiveSnapshots.get(root);
  if (!snapshot) return;

  writeNotifications(root, snapshot.notifications);
  writeUnreadCount(root, snapshot.unreadCount);
  pendingArchiveSnapshots.delete(root);
  delete root.dataset.actionInProgress;
  setError(root, null);
  setNotice(root, 'Arşivleme işlemi geri alındı.');
  setNoticeAction(root, null);
  renderCurrentState(root);
}

function bindActions(root: NotificationCenterRoot, content: HTMLElement) {
  bindAll<HTMLElement>(content, '[data-notifications-filter]', (button) => {
    button.addEventListener('click', () => {
      const mode = button.dataset.notificationsFilter === 'archived';
      if ((root.dataset.showArchived === 'true') === mode) return;
      root.dataset.showArchived = String(mode);
      setNotice(root, null);
      void renderNotificationCenterRoot(root);
    });
  });

  bindAll<HTMLElement>(content, '[data-notification-center-refresh]', (button) => {
    button.addEventListener('click', () => {
      setError(root, null);
      setNotice(root, null);
      void renderNotificationCenterRoot(root);
    });
  });

  bindAll<HTMLElement>(content, '[data-notification-center-reset-filter]', (button) => {
    button.addEventListener('click', () => {
      root.dataset.showArchived = 'false';
      setError(root, null);
      setNotice(root, null);
      void renderNotificationCenterRoot(root);
    });
  });

  bindAll<HTMLElement>(content, '[data-notification-center-retry]', (button) => {
    button.addEventListener('click', () => {
      setError(root, null);
      setNotice(root, null);
      void renderNotificationCenterRoot(root);
    });
  });

  bindAll<HTMLElement>(content, '[data-notification-center-mark-all]', (button) => {
    button.addEventListener('click', () => {
      if (root.dataset.actionInProgress) return;
      void runMarkAllAsRead(root);
    });
  });

  bindAll<HTMLElement>(content, '[data-notification-center-archive-visible]', (button) => {
    button.addEventListener('click', () => {
      if (root.dataset.actionInProgress) return;
      runArchiveVisible(root);
    });
  });

  bindAll<HTMLElement>(content, '[data-notification-center-undo]', (button) => {
    button.addEventListener('click', () => {
      undoArchiveVisible(root);
    });
  });

  bindAll<HTMLElement>(content, '[data-notification-action]', (button) => {
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
    writeNotifications(root, notifications);
    writeUnreadCount(root, unreadCount);
    renderCurrentState(root);
  } catch (error) {
    setError(root, error instanceof Error ? error.message : 'Bildirimler alınırken hata oluştu');
    renderCurrentState(root);
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
