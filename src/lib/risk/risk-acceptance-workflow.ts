/**
 * Phase 170: Risk Acceptance Workflow Engine
 */

import { logger } from '../logger';

export type RiskAcceptanceStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'expired';

export interface RiskAcceptanceRequest {
  requestId: string;
  riskId: string;
  requesterId: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  rationale: string;
  status: RiskAcceptanceStatus;
  approvalChain: string[];
  createdAt: number;
  updatedAt: number;
  validUntil: number;
}

class RiskAcceptanceWorkflow {
  private requests = new Map<string, RiskAcceptanceRequest>();
  private counter = 0;

  createRequest(input: {
    riskId: string;
    requesterId: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    rationale: string;
    approvalChain: string[];
    validHours: number;
  }): RiskAcceptanceRequest {
    const now = Date.now();
    const request: RiskAcceptanceRequest = {
      requestId: `risk-acc-${Date.now()}-${++this.counter}`,
      riskId: input.riskId,
      requesterId: input.requesterId,
      impact: input.impact,
      rationale: input.rationale,
      status: 'draft',
      approvalChain: input.approvalChain,
      createdAt: now,
      updatedAt: now,
      validUntil: now + input.validHours * 60 * 60 * 1000
    };

    this.requests.set(request.requestId, request);
    return request;
  }

  submit(requestId: string): RiskAcceptanceRequest | undefined {
    return this.transition(requestId, 'submitted');
  }

  approve(requestId: string): RiskAcceptanceRequest | undefined {
    return this.transition(requestId, 'approved');
  }

  reject(requestId: string): RiskAcceptanceRequest | undefined {
    return this.transition(requestId, 'rejected');
  }

  get(requestId: string): RiskAcceptanceRequest | undefined {
    return this.requests.get(requestId);
  }

  private transition(requestId: string, status: RiskAcceptanceStatus): RiskAcceptanceRequest | undefined {
    const current = this.requests.get(requestId);
    if (!current) return undefined;
    const next: RiskAcceptanceRequest = { ...current, status, updatedAt: Date.now() };
    this.requests.set(requestId, next);
    logger.debug('Risk request transitioned', { requestId, status });
    return next;
  }
}

class ApprovalChainBuilder {
  build(impact: 'low' | 'medium' | 'high' | 'critical', ownerId: string): string[] {
    if (impact === 'critical') return [ownerId, 'head-of-risk', 'ciso'];
    if (impact === 'high') return [ownerId, 'head-of-risk'];
    if (impact === 'medium') return [ownerId, 'risk-manager'];
    return [ownerId];
  }
}

class RiskDecisionLedger {
  private entries: Array<{
    requestId: string;
    actorId: string;
    decision: 'approve' | 'reject';
    reason: string;
    timestamp: number;
  }> = [];

  append(entry: { requestId: string; actorId: string; decision: 'approve' | 'reject'; reason: string }): void {
    this.entries.push({ ...entry, timestamp: Date.now() });
  }

  listByRequest(requestId: string) {
    return this.entries.filter(e => e.requestId === requestId);
  }
}

class RevalidationScheduler {
  nextReviewAt(validUntil: number, daysBefore = 7): number {
    return validUntil - daysBefore * 24 * 60 * 60 * 1000;
  }

  needsRevalidation(validUntil: number, now = Date.now(), thresholdDays = 7): boolean {
    return validUntil - now <= thresholdDays * 24 * 60 * 60 * 1000;
  }
}

export const riskAcceptanceWorkflow = new RiskAcceptanceWorkflow();
export const approvalChainBuilder = new ApprovalChainBuilder();
export const riskDecisionLedger = new RiskDecisionLedger();
export const revalidationScheduler = new RevalidationScheduler();

export {
  RiskAcceptanceWorkflow,
  ApprovalChainBuilder,
  RiskDecisionLedger,
  RevalidationScheduler
};


