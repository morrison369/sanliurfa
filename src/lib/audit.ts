/**
 * Audit Module
 * Stub for audit logging
 */

export interface AuditEvent {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  private events: AuditEvent[] = [];

  log(action: string, resource: string, userId?: string, metadata?: Record<string, any>): AuditEvent {
    const event: AuditEvent = {
      id: Math.random().toString(36).substring(7),
      userId,
      action,
      resource,
      timestamp: new Date(),
      metadata
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
