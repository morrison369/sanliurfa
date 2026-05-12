/**
 * Unit Tests — vendor/payout-engine.ts singleton class managers (Phase 48)
 *
 * - CommissionManager (setCommission + calculateCommission percentage/fixed/tiered + applyTiers)
 * - EarningsTracker (recordEarning + getEarnings range filter + getSummary + getTaxReport)
 * - PayoutProcessor (createPayout + getPayout + updateStatus + listPayouts + payoutSchedule CRUD)
 *
 * Singleton state shared — testler unique vendorId kullanır.
 */

import { describe, it, expect } from 'vitest';
import {
  commissionManager,
  earningsTracker,
  payoutProcessor,
} from '../vendor/payout-engine';

describe('CommissionManager', () => {
  it('calculateCommission — vendor not found → 0 commission, full net', () => {
    const VID = `non-existent-${Date.now()}`;
    expect(commissionManager.calculateCommission(VID, 1000)).toEqual({ commission: 0, net: 1000 });
  });

  it('calculateCommission — percentage type → amount * rate / 100', () => {
    const VID = `v-pct-${Date.now()}`;
    commissionManager.setCommission(VID, { vendorId: VID, rate: 10, type: 'percentage' });
    const r = commissionManager.calculateCommission(VID, 1000);
    expect(r.commission).toBe(100);
    expect(r.net).toBe(900);
  });

  it('calculateCommission — fixed type → rate doğrudan komisyon', () => {
    const VID = `v-fix-${Date.now()}`;
    commissionManager.setCommission(VID, { vendorId: VID, rate: 50, type: 'fixed' });
    const r = commissionManager.calculateCommission(VID, 1000);
    expect(r.commission).toBe(50);
    expect(r.net).toBe(950);
  });

  it('calculateCommission — tiered → en yüksek minAmount eşiğinde rate uygulanır', () => {
    const VID = `v-tier-${Date.now()}`;
    commissionManager.setCommission(VID, { vendorId: VID, rate: 5, type: 'tiered' });
    commissionManager.applyTiers(VID, [
      { minAmount: 100, rate: 5 },
      { minAmount: 500, rate: 10 },
      { minAmount: 1000, rate: 15 },
    ]);
    const r = commissionManager.calculateCommission(VID, 1500);
    expect(r.commission).toBe(225); // 1500 * 15 / 100
  });

  it('calculateCommission — round 2 decimal', () => {
    const VID = `v-round-${Date.now()}`;
    commissionManager.setCommission(VID, { vendorId: VID, rate: 3.333, type: 'percentage' });
    const r = commissionManager.calculateCommission(VID, 100);
    expect(r.commission).toBe(3.33);
  });

  it('getCommission — bilinmeyen vendor → null', () => {
    expect(commissionManager.getCommission(`non-existent-${Date.now()}`)).toBeNull();
  });

  it('getCommission — kayıtlı vendor → config döner', () => {
    const VID = `v-get-${Date.now()}`;
    commissionManager.setCommission(VID, { vendorId: VID, rate: 8, type: 'percentage' });
    const c = commissionManager.getCommission(VID);
    expect(c?.rate).toBe(8);
  });
});

describe('EarningsTracker', () => {
  it('recordEarning + getEarnings — vendor isolation', () => {
    const VID = `e-vendor-${Date.now()}-A`;
    earningsTracker.recordEarning({
      id: 'er-1',
      vendorId: VID,
      orderId: 'o-1',
      amount: 100,
      commission: 10,
      net: 90,
      timestamp: Date.now(),
    });
    const list = earningsTracker.getEarnings(VID);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('er-1');
  });

  it('getEarnings — startDate/endDate range filter', () => {
    const VID = `e-range-${Date.now()}`;
    const NOW = Date.now();
    earningsTracker.recordEarning({ id: 'r1', vendorId: VID, orderId: 'o', amount: 50, commission: 5, net: 45, timestamp: NOW - 86400000 });
    earningsTracker.recordEarning({ id: 'r2', vendorId: VID, orderId: 'o', amount: 50, commission: 5, net: 45, timestamp: NOW });
    const list = earningsTracker.getEarnings(VID, NOW - 1000, NOW + 1000);
    expect(list.some((e) => e.id === 'r2')).toBe(true);
  });

  it('getSummary — total/commission/net aggregate', () => {
    const VID = `e-sum-${Date.now()}`;
    earningsTracker.recordEarning({ id: 'a', vendorId: VID, orderId: 'o', amount: 100, commission: 10, net: 90, timestamp: Date.now() });
    earningsTracker.recordEarning({ id: 'b', vendorId: VID, orderId: 'o', amount: 200, commission: 20, net: 180, timestamp: Date.now() });
    const s = earningsTracker.getSummary(VID, '2026-05');
    expect(s.totalEarnings).toBe(300);
    expect(s.totalCommission).toBe(30);
    expect(s.netEarnings).toBe(270);
  });

  it('getSummary — vendor olmayan → all 0', () => {
    const s = earningsTracker.getSummary(`non-existent-${Date.now()}`, '2026-05');
    expect(s.totalEarnings).toBe(0);
    expect(s.netEarnings).toBe(0);
  });

  it('getTaxReport — yıl filter + earnings/deductions/taxable', () => {
    const VID = `e-tax-${Date.now()}`;
    const yearStart = new Date(2026, 0, 15).getTime();
    earningsTracker.recordEarning({ id: 't1', vendorId: VID, orderId: 'o', amount: 1000, commission: 100, net: 900, timestamp: yearStart });
    const r = earningsTracker.getTaxReport(VID, 2026);
    expect(r.earnings).toBe(1000);
    expect(r.deductions).toBe(100);
    expect(r.taxable).toBe(900);
  });

  it('getTaxReport — bilinmeyen vendor → all 0', () => {
    const r = earningsTracker.getTaxReport(`non-existent-${Date.now()}`, 2026);
    expect(r.earnings).toBe(0);
  });
});

describe('PayoutProcessor', () => {
  it('createPayout — id prefix + status pending', () => {
    const VID = `p-vendor-${Date.now()}-1`;
    const p = payoutProcessor.createPayout(VID, 500, Date.now() + 86400000);
    expect(p.id.startsWith('payout-')).toBe(true);
    expect(p.status).toBe('pending');
    expect(p.amount).toBe(500);
  });

  it('getPayout — kayıtlı id → payout döner', () => {
    const VID = `p-get-${Date.now()}`;
    const p = payoutProcessor.createPayout(VID, 100, Date.now());
    expect(payoutProcessor.getPayout(p.id)?.id).toBe(p.id);
  });

  it('getPayout — bilinmeyen id → null', () => {
    expect(payoutProcessor.getPayout('non-existent')).toBeNull();
  });

  it('updateStatus — pending → completed', () => {
    const VID = `p-status-${Date.now()}`;
    const p = payoutProcessor.createPayout(VID, 100, Date.now());
    payoutProcessor.updateStatus(p.id, 'completed');
    expect(payoutProcessor.getPayout(p.id)?.status).toBe('completed');
  });

  it('listPayouts — vendor isolation + reverse order (newest first)', () => {
    const VID = `p-list-${Date.now()}`;
    const p1 = payoutProcessor.createPayout(VID, 100, Date.now());
    const p2 = payoutProcessor.createPayout(VID, 200, Date.now());
    const list = payoutProcessor.listPayouts(VID);
    expect(list[0].id).toBe(p2.id); // newest first
    expect(list[1].id).toBe(p1.id);
  });

  it('listPayouts — limit parameter', () => {
    const VID = `p-limit-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      payoutProcessor.createPayout(VID, 10, Date.now());
    }
    expect(payoutProcessor.listPayouts(VID, 2)).toHaveLength(2);
  });

  it('getPayoutSchedule — default monthly', () => {
    const VID = `p-sched-${Date.now()}`;
    const sched = payoutProcessor.getPayoutSchedule(VID);
    expect(sched.frequency).toBe('monthly');
    expect(sched.amount).toBe(0);
  });

  it('setPayoutSchedule + getPayoutSchedule — config persistence', () => {
    const VID = `p-set-${Date.now()}`;
    const next = Date.now() + 86400000;
    payoutProcessor.setPayoutSchedule(VID, { frequency: 'weekly', nextDate: next, amount: 250 });
    const sched = payoutProcessor.getPayoutSchedule(VID);
    expect(sched.frequency).toBe('weekly');
    expect(sched.nextDate).toBe(next);
    expect(sched.amount).toBe(250);
  });
});
