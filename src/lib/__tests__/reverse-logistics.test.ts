/**
 * Unit Tests — vendor/reverse-logistics.ts singleton class managers (Phase 56)
 *
 * - ReverseLogistics (createReturn + updateReturnStatus completedAt + listReturns + generateReturnLabel)
 * - ReturnAnalytics (recordReturnItem + getReturnRate/Reasons stochastic + analyzeQuality + predictReturns)
 * - RefurbRecovery (planRecovery condition switch + recordRefurb + trackRefurbInventory + getRecoveryValue)
 *
 * Singleton state shared.
 */

import { describe, it, expect } from 'vitest';
import {
  reverseLogistics,
  returnAnalytics,
  refurbRecovery,
} from '../vendor/reverse-logistics';

describe('ReverseLogistics', () => {
  it('createReturn — createdAt eklenir + initial status', () => {
    const r = reverseLogistics.createReturn({
      id: `ret-${Date.now()}-1`,
      orderId: 'o-1',
      reason: 'defective',
      status: 'requested',
    });
    expect(r.createdAt).toBeGreaterThan(0);
    expect(r.status).toBe('requested');
  });

  it('updateReturnStatus — refunded → completedAt set', () => {
    const RID = `ret-${Date.now()}-2`;
    reverseLogistics.createReturn({ id: RID, orderId: 'o-2', reason: 'damaged', status: 'requested' });
    reverseLogistics.updateReturnStatus(RID, 'refunded');
    const r = reverseLogistics.getReturn(RID);
    expect(r?.status).toBe('refunded');
    expect(r?.completedAt).toBeGreaterThan(0);
  });

  it('updateReturnStatus — rejected → completedAt set', () => {
    const RID = `ret-${Date.now()}-3`;
    reverseLogistics.createReturn({ id: RID, orderId: 'o-3', reason: 'other', status: 'requested' });
    reverseLogistics.updateReturnStatus(RID, 'rejected');
    expect(reverseLogistics.getReturn(RID)?.completedAt).toBeGreaterThan(0);
  });

  it('updateReturnStatus — intermediate (in_transit) → completedAt undefined', () => {
    const RID = `ret-${Date.now()}-4`;
    reverseLogistics.createReturn({ id: RID, orderId: 'o-4', reason: 'wrong_item', status: 'requested' });
    reverseLogistics.updateReturnStatus(RID, 'in_transit');
    expect(reverseLogistics.getReturn(RID)?.completedAt).toBeUndefined();
  });

  it('getReturn — bilinmeyen id → null', () => {
    expect(reverseLogistics.getReturn('non-existent')).toBeNull();
  });

  it('listReturns — orderId filter', () => {
    const OID = `order-${Date.now()}`;
    reverseLogistics.createReturn({ id: `r-a-${Date.now()}`, orderId: OID, reason: 'defective', status: 'requested' });
    reverseLogistics.createReturn({ id: `r-b-${Date.now()}`, orderId: OID, reason: 'damaged', status: 'requested' });
    const list = reverseLogistics.listReturns(OID);
    expect(list).toHaveLength(2);
  });

  it('listReturns — orderId yok → tüm returnlar', () => {
    const all = reverseLogistics.listReturns();
    expect(Array.isArray(all)).toBe(true);
  });

  it('generateReturnLabel — URL prefix /return-labels/', () => {
    const RID = `ret-label-${Date.now()}`;
    const url = reverseLogistics.generateReturnLabel(RID);
    expect(url).toBe(`/return-labels/${RID}.pdf`);
  });
});

describe('ReturnAnalytics', () => {
  it('recordReturnItem — items array içine ekler (smoke)', () => {
    returnAnalytics.recordReturnItem({
      returnId: 'r-1',
      sku: 'sku-1',
      quantity: 1,
      condition: 'used',
    });
    expect(true).toBe(true); // no throw
  });

  it('getReturnRate — 2-12% range invariant', () => {
    for (let i = 0; i < 5; i++) {
      const rate = returnAnalytics.getReturnRate('2026-05');
      expect(rate).toBeGreaterThanOrEqual(2);
      expect(rate).toBeLessThanOrEqual(12);
    }
  });

  it('getReturnReasons — 6 ReturnReason key + her biri >= 0', () => {
    const r = returnAnalytics.getReturnReasons();
    expect(Object.keys(r).sort()).toEqual(
      ['customer_request', 'damaged', 'defective', 'not_as_described', 'other', 'wrong_item']
    );
    for (const v of Object.values(r)) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('analyzeQuality — defectRate 0-10 + commonIssues array', () => {
    const q = returnAnalytics.analyzeQuality('sku-x');
    expect(q.defectRate).toBeGreaterThanOrEqual(0);
    expect(q.defectRate).toBeLessThanOrEqual(10);
    expect(Array.isArray(q.commonIssues)).toBe(true);
  });

  it('predictReturns — expectedRate 0-15 + confidence 0.7-0.9', () => {
    const p = returnAnalytics.predictReturns('sku-y');
    expect(p.expectedRate).toBeGreaterThanOrEqual(0);
    expect(p.expectedRate).toBeLessThanOrEqual(15);
    expect(p.confidence).toBeGreaterThanOrEqual(0.7);
    expect(p.confidence).toBeLessThanOrEqual(0.9);
  });
});

describe('RefurbRecovery', () => {
  it('planRecovery — new condition → restock', () => {
    const action = refurbRecovery.planRecovery({
      returnId: 'r1',
      sku: 'sku-1',
      quantity: 1,
      condition: 'new',
    });
    expect(action).toBe('restock');
  });

  it('planRecovery — used condition → refurbish veya resale', () => {
    const action = refurbRecovery.planRecovery({
      returnId: 'r2',
      sku: 'sku-2',
      quantity: 1,
      condition: 'used',
    });
    expect(['refurbish', 'resale']).toContain(action);
  });

  it('planRecovery — damaged condition → donation veya disposal', () => {
    const action = refurbRecovery.planRecovery({
      returnId: 'r3',
      sku: 'sku-3',
      quantity: 1,
      condition: 'damaged',
    });
    expect(['donation', 'disposal']).toContain(action);
  });

  it('recordRefurb + listRefurbItems — append', () => {
    const before = refurbRecovery.listRefurbItems().length;
    refurbRecovery.recordRefurb({
      itemId: `item-${Date.now()}`,
      originalSku: 'sku-x',
      refurbDate: Date.now(),
      cost: 25,
      newCondition: 'refurbished',
    });
    const after = refurbRecovery.listRefurbItems().length;
    expect(after).toBe(before + 1);
  });

  it('getRecoveryValue — 10-110 range', () => {
    const v = refurbRecovery.getRecoveryValue('sku-x');
    expect(v).toBeGreaterThanOrEqual(10);
    expect(v).toBeLessThanOrEqual(110);
  });

  it('trackRefurbInventory — total/available/inProgress invariants', () => {
    const inv = refurbRecovery.trackRefurbInventory();
    expect(inv.total).toBeGreaterThanOrEqual(0);
    expect(inv.available + inv.inProgress).toBe(inv.total);
    expect(inv.inProgress).toBe(Math.floor(inv.total * 0.3));
  });
});
