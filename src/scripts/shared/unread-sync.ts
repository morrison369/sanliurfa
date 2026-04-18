const NOTIFICATION_UNREAD_EVENT = 'sanliurfa:notifications-unread-change';
const MESSAGE_UNREAD_EVENT = 'sanliurfa:messages-unread-change';

export function emitNotificationUnreadCount(count: number) {
  try {
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_UNREAD_EVENT, {
        detail: { count: Math.max(0, count) },
      }),
    );
  } catch {
    // no-op
  }
}

export function emitMessageUnreadCount(count: number) {
  try {
    window.dispatchEvent(
      new CustomEvent(MESSAGE_UNREAD_EVENT, {
        detail: { count: Math.max(0, count) },
      }),
    );
  } catch {
    // no-op
  }
}

export function getConversationUnreadCount(
  conversations: Array<{ unreadCount?: number }>,
): number {
  return conversations.reduce((sum, conversation) => sum + Math.max(0, conversation.unreadCount ?? 0), 0);
}

export function subscribeToNotificationUnread(
  handler: (count: number) => void,
): () => void {
  const listener = (event: Event) => {
    const nextCount =
      event instanceof CustomEvent && typeof event.detail?.count === 'number'
        ? event.detail.count
        : 0;
    handler(nextCount);
  };

  window.addEventListener(NOTIFICATION_UNREAD_EVENT, listener);
  return () => {
    window.removeEventListener(NOTIFICATION_UNREAD_EVENT, listener);
  };
}

export function subscribeToMessageUnread(
  handler: (count: number) => void,
): () => void {
  const listener = (event: Event) => {
    const nextCount =
      event instanceof CustomEvent && typeof event.detail?.count === 'number'
        ? event.detail.count
        : 0;
    handler(nextCount);
  };

  window.addEventListener(MESSAGE_UNREAD_EVENT, listener);
  return () => {
    window.removeEventListener(MESSAGE_UNREAD_EVENT, listener);
  };
}
