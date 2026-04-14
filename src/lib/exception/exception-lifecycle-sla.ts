/**
 * Phase 169: Exception Lifecycle & SLA Management
 */

import { logger } from '../logger';

export type ExceptionStatus = 'requested' | 'approved' | 'rejected' | 'expired' | 'closed';

export interface GovernanceException {
  exceptionId: string;
  controlId: string;
  requestedBy: string;
  justification: string;
  status: ExceptionStatus;
  slaDueAt: number;
  expiresAt: number;
  createdAt: number;
  updatedAt: number;
}

class ExceptionLifecycleManager {
  private exceptions = new Map<string, GovernanceException>();
  private counter = 0;

  request(input: {
    controlId: string;
    requestedBy: string;
    justification: string;
    slaHours: number;
    validHours: number;
  }): GovernanceException {
    const now = Date.now();
    const exception: GovernanceException = {
      exceptionId: `ex-${Date.now()}-${++this.counter}`,
      controlId: input.controlId,
      requestedBy: input.requestedBy,
      justification: input.justification,
      status: 'requested',
      slaDueAt: now + input.slaHours * 60 * 60 * 1000,
      expiresAt: now + input.validHours * 60 * 60 * 1000,
      createdAt: now,
      updatedAt: now
    };
    this.exceptions.set(exception.exceptionId, exception);
    return exception;
  }

  approve(exceptionId: string): GovernanceException | undefined {
    return this.transition(exceptionId, 'approved');
  }

  reject(exceptionId: string): GovernanceException | undefined {
    return this.transition(exceptionId, 'rejected');
  }

  close(exceptionId: string): GovernanceException | undefined {
    return this.transition(exceptionId, 'closed');
  }

  get(exceptionId: string): GovernanceException | undefined {
    return this.exceptions.get(exceptionId);
  }

  list(): GovernanceException[] {
    return Array.from(this.exceptions.values());
  }

  private transition(exceptionId: string, status: ExceptionStatus): GovernanceException | undefined {
    const current = this.exceptions.get(exceptionId);
    if (!current) return undefined;
    const next = { ...current, status, updatedAt: Date.now() };
    this.exceptions.set(exceptionId, next);
    logger.debug('Exception transitioned', { exceptionId, status });
    return next;
  }
}

class ExceptionSLATracker {
  isSLABreached(exception: GovernanceException, now = Date.now()): boolean {
    return exception.status === 'requested' && now > exception.slaDueAt;
  }

  timeToSlaMs(exception: GovernanceException, now = Date.now()): number {
    return Math.max(0, exception.slaDueAt - now);
  }

  listBreaches(exceptions: GovernanceException[], now = Date.now()): GovernanceException[] {
    return exceptions.filter(ex => this.isSLABreached(ex, now));
  }
}

class ExceptionRenewalEngine {
  renew(exception: GovernanceException, extendHours: number): GovernanceException {
    return {
      ...exception,
      expiresAt: exception.expiresAt + extendHours * 60 * 60 * 1000,
      updatedAt: Date.now()
    };
  }

  isExpired(exception: GovernanceException, now = Date.now()): boolean {
    return now > exception.expiresAt;
  }
}

class ExceptionNotificationHub {
  buildNotification(exception: GovernanceException, type: 'sla-warning' | 'sla-breach' | 'expiry-warning'): {
    channel: 'email' | 'slack';
    message: string;
  } {
    const message = `${type} for ${exception.exceptionId} on control ${exception.controlId}`;
    const channel: 'email' | 'slack' = type === 'sla-breach' ? 'slack' : 'email';
    return { channel, message };
  }
}

export const exceptionLifecycleManager = new ExceptionLifecycleManager();
export const exceptionSlaTracker = new ExceptionSLATracker();
export const exceptionRenewalEngine = new ExceptionRenewalEngine();
export const exceptionNotificationHub = new ExceptionNotificationHub();

export {
  ExceptionLifecycleManager,
  ExceptionSLATracker,
  ExceptionRenewalEngine,
  ExceptionNotificationHub
};


