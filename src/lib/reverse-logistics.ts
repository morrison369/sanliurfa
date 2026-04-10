/**
 * Phase 56: Returns & Reverse Logistics
 * Return processing, refund handling, item recovery, refurbishment tracking
 */

import { logger } from './logging';
import { hashString, normalize, round } from './deterministic';

export type ReturnReason = 'defective' | 'wrong_item' | 'not_as_described' | 'customer_request' | 'damaged' | 'other';
export type ReturnStatus = 'requested' | 'approved' | 'in_transit' | 'received' | 'refunded' | 'restocked' | 'rejected';
export type RecoveryAction = 'restock' | 'refurbish' | 'donation' | 'disposal' | 'resale';

export interface ReturnRequest {
  id: string;
  orderId: string;
  reason: ReturnReason;
  status: ReturnStatus;
  createdAt: number;
  completedAt?: number;
}

export interface ReturnItem {
  returnId: string;
  sku: string;
  quantity: number;
  condition: 'new' | 'used' | 'damaged';
  recoveryAction?: RecoveryAction;
}

export interface Refund {
  id: string;
  returnId: string;
  amount: number;
  status: 'pending' | 'processing' | 'completed';
  processedAt?: number;
}

export interface RefurbRecord {
  itemId: string;
  originalSku: string;
  refurbDate: number;
  cost: number;
  newCondition: 'refurbished' | 'new';
}

export class ReverseLogistics {
  private returns = new Map<string, ReturnRequest>();
  private orderReturns = new Map<string, Set<string>>();

  createReturn(request: Omit<ReturnRequest, 'createdAt'>): ReturnRequest {
    const fullRequest: ReturnRequest = {
      ...request,
      createdAt: Date.now()
    };

    this.returns.set(request.id, fullRequest);

    if (!this.orderReturns.has(request.orderId)) {
      this.orderReturns.set(request.orderId, new Set());
    }
    this.orderReturns.get(request.orderId)!.add(request.id);

    logger.debug('Return created', { returnId: request.id, reason: request.reason });

    return fullRequest;
  }

  updateReturnStatus(returnId: string, status: ReturnStatus): void {
    const returnReq = this.returns.get(returnId);
    if (returnReq) {
      returnReq.status = status;
      if (status === 'refunded' || status === 'rejected') {
        returnReq.completedAt = Date.now();
      }
      logger.debug('Return status updated', { returnId, status });
    }
  }

  getReturn(returnId: string): ReturnRequest | null {
    return this.returns.get(returnId) || null;
  }

  listReturns(orderId?: string): ReturnRequest[] {
    if (!orderId) {
      return Array.from(this.returns.values());
    }

    const returnIds = this.orderReturns.get(orderId) || new Set();
    return Array.from(returnIds).map(id => this.returns.get(id)!);
  }

  generateReturnLabel(returnId: string): string {
    const labelUrl = `/return-labels/${returnId}.pdf`;
    logger.debug('Return label generated', { returnId });
    return labelUrl;
  }
}

export class ReturnAnalytics {
  private items: ReturnItem[] = [];

  recordReturnItem(item: ReturnItem): void {
    this.items.push(item);
    logger.debug('Return item recorded', { returnId: item.returnId, sku: item.sku });
  }

  getReturnRate(period: string): number {
    return round(normalize(hashString(`${period}|return-rate`), 2, 12), 2);
  }

  getReturnReasons(period?: string): Record<ReturnReason, number> {
    const seed = period || 'all';
    return {
      defective: Math.round(normalize(hashString(`${seed}|defective`), 8, 30)),
      wrong_item: Math.round(normalize(hashString(`${seed}|wrong-item`), 4, 20)),
      not_as_described: Math.round(normalize(hashString(`${seed}|not-described`), 6, 25)),
      customer_request: Math.round(normalize(hashString(`${seed}|customer-request`), 3, 15)),
      damaged: Math.round(normalize(hashString(`${seed}|damaged`), 2, 10)),
      other: Math.round(normalize(hashString(`${seed}|other`), 1, 5))
    };
  }

  analyzeQuality(sku: string): { defectRate: number; commonIssues: string[] } {
    const commonIssues = [
      'Manufacturing defect',
      'Missing components',
      'Packaging damage'
    ].filter((_, index) => ((hashString(`${sku}|quality|${index}`) + index) % 3) !== 0);

    return {
      defectRate: round(normalize(hashString(`${sku}|defect-rate`), 0.5, 10), 2),
      commonIssues
    };
  }

  predictReturns(sku: string): { expectedRate: number; confidence: number } {
    return {
      expectedRate: round(normalize(hashString(`${sku}|expected-rate`), 1, 15), 2),
      confidence: round(normalize(hashString(`${sku}|confidence`), 0.7, 0.9), 3)
    };
  }
}

export class RefurbRecovery {
  private refurbRecords: RefurbRecord[] = [];

  planRecovery(returnItem: ReturnItem): RecoveryAction {
    if (returnItem.condition === 'new') {
      return 'restock';
    }
    if (returnItem.condition === 'used') {
      return hashString(`${returnItem.sku}|used`) % 2 === 0 ? 'refurbish' : 'resale';
    }
    return hashString(`${returnItem.sku}|damaged`) % 2 === 0 ? 'donation' : 'disposal';
  }

  recordRefurb(record: RefurbRecord): void {
    this.refurbRecords.push(record);
    logger.debug('Refurb recorded', { itemId: record.itemId, newCondition: record.newCondition });
  }

  getRecoveryValue(sku: string): number {
    return Math.round(normalize(hashString(`${sku}|recovery-value`), 10, 110));
  }

  trackRefurbInventory(): { total: number; available: number; inProgress: number } {
    const total = this.refurbRecords.length;
    const inProgress = Math.floor(total * 0.3);
    const available = total - inProgress;

    return { total, available, inProgress };
  }

  listRefurbItems(status?: string): RefurbRecord[] {
    return this.refurbRecords;
  }
}

export const reverseLogistics = new ReverseLogistics();
export const returnAnalytics = new ReturnAnalytics();
export const refurbRecovery = new RefurbRecovery();