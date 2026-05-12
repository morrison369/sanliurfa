/**
 * Unit Tests - social/event-stream.ts SocialEventType union + SocialEvent type
 *
 * - SocialEventType union: 8 event ('message.sent' / 'message.read' / 'message.typing' /
 *   'follow.created' / 'follow.removed' / 'swipe.left' / 'swipe.right' / 'swipe.match')
 * - SocialEvent struct shape (eventType, actorUserId, optional fields)
 *
 * NOT: publishSocialEvent / subscribeSocialEvents Redis pub/sub bağımlı, kapsam dışı.
 * Bu test sadece type contract + module export shape lock'lar.
 */

import { describe, it, expect } from 'vitest';
import type { SocialEventType, SocialEvent } from '../social/event-stream';

describe('SocialEventType union', () => {
  it('8 expected event types', () => {
    // Compile-time type check via runtime sample assignment
    const all: SocialEventType[] = [
      'message.sent',
      'message.read',
      'message.typing',
      'follow.created',
      'follow.removed',
      'swipe.left',
      'swipe.right',
      'swipe.match',
    ];
    expect(all).toHaveLength(8);
  });

  it('message.* event types', () => {
    const msgEvents: SocialEventType[] = ['message.sent', 'message.read', 'message.typing'];
    expect(msgEvents.every((e) => e.startsWith('message.'))).toBe(true);
  });

  it('follow.* event types', () => {
    const followEvents: SocialEventType[] = ['follow.created', 'follow.removed'];
    expect(followEvents.every((e) => e.startsWith('follow.'))).toBe(true);
  });

  it('swipe.* event types', () => {
    const swipeEvents: SocialEventType[] = ['swipe.left', 'swipe.right', 'swipe.match'];
    expect(swipeEvents.every((e) => e.startsWith('swipe.'))).toBe(true);
  });
});

describe('SocialEvent struct shape', () => {
  it('minimal event - eventType + actorUserId + createdAt', () => {
    const event: SocialEvent = {
      eventType: 'message.sent',
      actorUserId: 'u-1',
      createdAt: new Date().toISOString(),
    };
    expect(event.eventType).toBe('message.sent');
    expect(event.actorUserId).toBe('u-1');
  });

  it('optional fields - targetUserId / conversationId / tenantId / metadata', () => {
    const event: SocialEvent = {
      eventType: 'follow.created',
      actorUserId: 'u-actor',
      targetUserId: 'u-target',
      conversationId: 'c-1',
      tenantId: 't-1',
      createdAt: new Date().toISOString(),
      metadata: { ip: '1.2.3.4', source: 'web' },
    };
    expect(event.targetUserId).toBe('u-target');
    expect(event.metadata?.ip).toBe('1.2.3.4');
  });

  it('module exports - publishSocialEvent / subscribeSocialEvents', async () => {
    const mod = await import('../social/event-stream');
    expect(typeof mod.publishSocialEvent).toBe('function');
    expect(typeof mod.subscribeSocialEvents).toBe('function');
  });
});
