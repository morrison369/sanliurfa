/**
 * Unit Tests — AuditLogger (in-memory event log)
 *
 * Pure helper — no DB. Audit events recorded in-memory Array.
 * Tests verify event shape, ID generation, user filtering, immutability.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLogger } from '../audit';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger();
  });

  describe('log() — event creation', () => {
    it('creates event with action + resource', () => {
      const event = logger.log('create', 'place');
      expect(event.action).toBe('create');
      expect(event.resource).toBe('place');
      expect(event.timestamp).toBeInstanceOf(Date);
    });

    it('generates unique cryptographic ID (16 char hex)', () => {
      const event = logger.log('action', 'resource');
      expect(event.id).toMatch(/^[0-9a-f]{16}$/);
    });

    it('includes userId when provided', () => {
      const event = logger.log('login', 'session', 'user-123');
      expect(event.userId).toBe('user-123');
    });

    it('omits userId when not provided', () => {
      const event = logger.log('public-view', 'place');
      expect(event.userId).toBeUndefined();
      expect('userId' in event).toBe(false);
    });

    it('includes metadata when provided', () => {
      const event = logger.log('update', 'user', 'u1', { ip: '1.2.3.4', country: 'TR' });
      expect(event.metadata).toEqual({ ip: '1.2.3.4', country: 'TR' });
    });

    it('omits metadata when not provided', () => {
      const event = logger.log('action', 'resource');
      expect(event.metadata).toBeUndefined();
    });

    it('returns the created event (for chaining)', () => {
      const event = logger.log('action', 'resource', 'u1');
      expect(event).toHaveProperty('id');
      expect(event).toHaveProperty('action', 'action');
    });

    it('generates unique IDs across multiple calls', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        ids.add(logger.log('action', 'resource').id);
      }
      expect(ids.size).toBe(50);
    });

    it('timestamp is current time (within 1s)', () => {
      const before = Date.now();
      const event = logger.log('action', 'resource');
      const after = Date.now();
      expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(event.timestamp.getTime()).toBeLessThanOrEqual(after);
    });
  });

  describe('getEvents() — query/filter', () => {
    it('returns empty array when no events logged', () => {
      expect(logger.getEvents()).toEqual([]);
    });

    it('returns all events when no userId filter', () => {
      logger.log('a1', 'r1', 'u1');
      logger.log('a2', 'r2', 'u2');
      logger.log('a3', 'r3'); // public
      expect(logger.getEvents()).toHaveLength(3);
    });

    it('filters by userId when provided', () => {
      logger.log('a1', 'r1', 'u1');
      logger.log('a2', 'r2', 'u2');
      logger.log('a3', 'r3', 'u1');
      expect(logger.getEvents('u1')).toHaveLength(2);
    });

    it('returns empty for non-existent user', () => {
      logger.log('a1', 'r1', 'u1');
      expect(logger.getEvents('u-non-existent')).toEqual([]);
    });

    it('does not return events without userId when filtering', () => {
      logger.log('public', 'page'); // no userId
      logger.log('private', 'profile', 'u1');
      expect(logger.getEvents('u1')).toHaveLength(1);
    });

    it('preserves event order (insertion order)', () => {
      const e1 = logger.log('first', 'a');
      const e2 = logger.log('second', 'b');
      const e3 = logger.log('third', 'c');
      const events = logger.getEvents();
      expect(events[0].id).toBe(e1.id);
      expect(events[1].id).toBe(e2.id);
      expect(events[2].id).toBe(e3.id);
    });
  });

  describe('isolation — multiple loggers', () => {
    it('separate AuditLogger instances have independent state', () => {
      const a = new AuditLogger();
      const b = new AuditLogger();
      a.log('a-action', 'a-resource');
      expect(a.getEvents()).toHaveLength(1);
      expect(b.getEvents()).toHaveLength(0);
    });
  });

  describe('use case scenarios', () => {
    it('login flow audit trail', () => {
      const userId = 'u-42';
      logger.log('login_attempt', 'auth', userId, { ip: '1.2.3.4' });
      logger.log('login_success', 'session', userId, { sessionId: 'sess-1' });
      const userEvents = logger.getEvents(userId);
      expect(userEvents).toHaveLength(2);
      expect(userEvents[0].action).toBe('login_attempt');
      expect(userEvents[1].action).toBe('login_success');
    });

    it('admin bulk operation audit', () => {
      const adminId = 'admin-1';
      ['p1', 'p2', 'p3'].forEach((placeId) => {
        logger.log('admin_approve', 'place', adminId, { placeId });
      });
      const adminEvents = logger.getEvents(adminId);
      expect(adminEvents).toHaveLength(3);
      expect(adminEvents.every((e) => e.action === 'admin_approve')).toBe(true);
    });
  });
});
