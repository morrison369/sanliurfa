/**
 * Audit Module
 * Stub for audit logging
 */

import { randomBytes } from 'node:crypto';

export interface AuditEvent {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export class AuditLogger {
  private events: AuditEvent[] = [];

  log(action: string, resource: string, userId?: string, metadata?: Record<string, unknown>): AuditEvent {
    const event: AuditEvent = {
      id: randomBytes(8).toString('hex'),
      action,
      resource,
      timestamp: new Date(),
      ...(userId ? { userId } : {}),
      ...(metadata ? { metadata } : {}),
    };
    this.events.push(event);
    return event;
  }

  getEvents(userId?: string): AuditEvent[] {
    if (userId) {
      return this.events.filter(e => e.userId === userId);
    }
    return this.events;
  }
}

export const auditLogger = new AuditLogger();
export default auditLogger;
