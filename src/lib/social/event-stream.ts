import { EventEmitter } from 'node:events';
import { createClient } from 'redis';
import { prefixKey } from '../cache/cache';
import { appendSocialEvent } from './event-store';

export type SocialEventType =
  | 'message.sent'
  | 'message.read'
  | 'message.typing'
  | 'follow.created'
  | 'follow.removed'
  | 'swipe.left'
  | 'swipe.right'
  | 'swipe.match';

export type SocialEvent = {
  eventType: SocialEventType;
  actorUserId: string;
  targetUserId?: string;
  conversationId?: string;
  tenantId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

// Pub/sub channel — namespace prefix ile izole edilir (shared Redis instance).
const CHANNEL = prefixKey('social:events:v1');
const emitter = new EventEmitter();
let redisPub: ReturnType<typeof createClient> | null = null;
let redisSub: ReturnType<typeof createClient> | null = null;
let subReady = false;

async function getRedisPub() {
  if (redisPub && redisPub.isOpen) return redisPub;
  redisPub = createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6381' });
  await redisPub.connect();
  return redisPub;
}

async function ensureRedisSub() {
  if (subReady) return;
  try {
    redisSub = createClient({ url: process.env.REDIS_URL || 'redis://127.0.0.1:6381' });
    await redisSub.connect();
    await redisSub.subscribe(CHANNEL, (message) => {
      try {
        const parsed = JSON.parse(message) as SocialEvent;
        emitter.emit('social-event', parsed);
      } catch {
        // noop
      }
    });
    subReady = true;
  } catch {
    subReady = false;
  }
}

export async function publishSocialEvent(event: SocialEvent) {
  await appendSocialEvent(event).catch(() => null);
  emitter.emit('social-event', event);
  try {
    const pub = await getRedisPub();
    await pub.publish(CHANNEL, JSON.stringify(event));
  } catch {
    // fail-open; local emitter already delivered
  }
}

export async function subscribeSocialEvents(listener: (event: SocialEvent) => void) {
  emitter.on('social-event', listener);
  await ensureRedisSub();
  return () => {
    emitter.off('social-event', listener);
  };
}
