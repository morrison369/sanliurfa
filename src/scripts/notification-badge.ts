import { setElementClassName, setTextContent } from '../lib/admin-dom';
import {
  formatNotificationBadgeCount,
  shouldShowNotificationBadge,
} from '../lib/notification-badge';
import { realtimeManager } from '../lib/realtime-sse';
import { emitNotificationUnreadCount, subscribeToNotificationUnread } from './shared/unread-sync';

type NotificationBadgeRoot = HTMLElement & {
  dataset: DOMStringMap;
};

function updateNotificationBadge(root: NotificationBadgeRoot, count: number) {
  const badge = root.querySelector<HTMLElement>('[data-notification-badge-count]');
  if (!badge) return;

  const visible = shouldShowNotificationBadge(count);
  setTextContent(badge, formatNotificationBadgeCount(count));
  setElementClassName(
    badge,
    visible
      ? 'absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white'
      : 'absolute right-1 top-1 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white',
  );
}

async function loadUnreadCount(root: NotificationBadgeRoot) {
  try {
    const response = await fetch('/api/notifications?filter=unread&limit=1');
    if (!response.ok) return;

    const data = (await response.json()) as { count?: number };
    const count = data.count ?? 0;
    updateNotificationBadge(root, count);
    emitNotificationUnreadCount(count);
  } catch (error) {
    console.error('Okunmamış bildirim sayısı alınamadı:', error);
  }
}

export function initNotificationBadges() {
  const roots = Array.from(
    document.querySelectorAll<NotificationBadgeRoot>('[data-notification-badge]'),
  );

  if (roots.length > 0) {
    realtimeManager.connectToNotifications();
    realtimeManager.subscribeToNotifications(({ count }) => {
      emitNotificationUnreadCount(count);
    });
  }

  for (const root of roots) {
    if (root.dataset.initialized === 'true') continue;

    root.dataset.initialized = 'true';
    updateNotificationBadge(root, 0);
    subscribeToNotificationUnread((count) => {
      updateNotificationBadge(root, count);
    });
    void loadUnreadCount(root);
    window.setInterval(() => {
      void loadUnreadCount(root);
    }, 30000);
  }
}
