import { publishSocialEvent, subscribeSocialEvents } from './event-stream';

export type SocialMessageEventType = 'message' | 'read' | 'typing';

type MessageEvent = {
  eventType: SocialMessageEventType;
  conversationId: string;
  actorUserId: string;
  createdAt: string;
  isTyping?: boolean;
};

export async function publishMessageEvent(event: MessageEvent) {
  const mappedType =
    event.eventType === 'message'
      ? 'message.sent'
      : event.eventType === 'read'
        ? 'message.read'
        : 'message.typing';
  await publishSocialEvent({
    eventType: mappedType,
    actorUserId: event.actorUserId,
    conversationId: event.conversationId,
    createdAt: event.createdAt,
    ...(event.isTyping === undefined ? {} : { metadata: { isTyping: event.isTyping } }),
  });
}

export async function subscribeMessageEvents(listener: (event: MessageEvent) => void) {
  const unsubscribe = await subscribeSocialEvents((event) => {
    const messageType =
      event.eventType === 'message.sent'
        ? 'message'
        : event.eventType === 'message.read'
          ? 'read'
          : event.eventType === 'message.typing'
            ? 'typing'
            : null;
    if (!messageType || !event.conversationId) return;
    listener({
      eventType: messageType,
      conversationId: event.conversationId,
      actorUserId: event.actorUserId,
      createdAt: event.createdAt,
      ...(typeof event.metadata?.isTyping === 'boolean'
        ? { isTyping: Boolean(event.metadata.isTyping) }
        : {}),
    });
  });
  return () => {
    unsubscribe();
  };
}
