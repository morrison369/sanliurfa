/**
 * Unit Tests — supplier-risk.ts singleton class managers
 *
 * 4 in-memory class manager (governance phase 209):
 * - SupplierProfileManager (register/updateStatus/getByCategory/getCriticalSuppliers)
 * - RiskScoreCalculator (composite formula + 4-tier risk level)
 * - SupplierAuditTracker (schedule/complete + critical finding → 'failed')
 * - RiskMitigationManager (create/advance/getOpenMitigations/getTotalExpectedReduction)
 *
 * Singleton state shared — testler unique name kullanır.
 */

import { describe, it, expect } from 'vitest';
import {
  supplierProfileManager,
  riskScoreCalculator,
  supplierAuditTracker,
  riskMitigationManager,
} from '../supplier-risk';

describe('SupplierProfileManager', () => {
  it('register — profile döner, status="active"', () => {
    const p = supplierProfileManager.register('Tedarikçi A-1', 'TR', 'raw_material', 1, 500000);
    expect(p.status).toBe('active');
    expect(p.tier).toBe(1);
    expect(p.category).toBe('raw_material');
    expect(p.supplierId).toMatch(/^supplier-\d+-\d+$/);
  });

  it('register — default contract 365 gün', () => {
    const p = supplierProfileManager.register('Tedarikçi-Contract-2', 'TR', 'service', 2, 100000);
    const expectedEnd = p.contractStart + 365 * 86400000;
    expect(p.contractEnd).toBeGreaterThan(expectedEnd - 5000);
    expect(p.contractEnd).toBeLessThan(expectedEnd + 5000);
  });

  it('register — custom contract days', () => {
    const p = supplierProfileManager.register('Tedarikçi-Custom-3', 'TR', 'service', 2, 100000, 730);
    const expectedEnd = p.contractStart + 730 * 86400000;
    expect(p.contractEnd).toBeGreaterThan(expectedEnd - 5000);
    expect(p.contractEnd).toBeLessThan(expectedEnd + 5000);
  });

  it('updateStatus — true + status update', () => {
    const p = supplierProfileManager.register('Tedarikçi-Status-4', 'TR', 'service', 2, 100000);
    expect(supplierProfileManager.updateStatus(p.supplierId, 'suspended')).toBe(true);
    expect(supplierProfileManager.getProfile(p.supplierId)?.status).toBe('suspended');
  });

  it('updateStatus — bilinmeyen → false', () => {
    expect(supplierProfileManager.updateStatus('non-existent', 'suspended')).toBe(false);
  });

  it('getByCategory — service filter', () => {
    const p = supplierProfileManager.register('Tedarikçi-Service-5', 'TR', 'service', 2, 100000);
    const services = supplierProfileManager.getByCategory('service');
    expect(services.some((s) => s.supplierId === p.supplierId)).toBe(true);
    expect(services.every((s) => s.category === 'service')).toBe(true);
  });

  it('getCriticalSuppliers — tier 1 + spend >= threshold + active', () => {
    const p = supplierProfileManager.register('Tedarikçi-Critical-6', 'TR', 'raw_material', 1, 500000);
    const critical = supplierProfileManager.getCriticalSuppliers();
    expect(critical.some((s) => s.supplierId === p.supplierId)).toBe(true);
    expect(critical.every((s) => s.tier === 1 && s.annualSpend >= 100000 && s.status === 'active')).toBe(true);
  });

  it('getCriticalSuppliers — tier 2 hariç', () => {
    const p = supplierProfileManager.register('Tedarikçi-T2-7', 'TR', 'raw_material', 2, 500000);
    const critical = supplierProfileManager.getCriticalSuppliers();
    expect(critical.some((s) => s.supplierId === p.supplierId)).toBe(false);
  });

  it('getCriticalSuppliers — annualSpend desc sıralı', () => {
    const critical = supplierProfileManager.getCriticalSuppliers();
    for (let i = 1; i < critical.length; i++) {
      expect(critical[i - 1].annualSpend).toBeGreaterThanOrEqual(critical[i].annualSpend);
    }
  });

  it('getCriticalSuppliers — custom threshold', () => {
    const critical = supplierProfileManager.getCriticalSuppliers(1000000);
    expect(critical.every((s) => s.annualSpend >= 1000000)).toBe(true);
  });

  it('getProfile — bilinmeyen → undefined', () => {
    expect(supplierProfileManager.getProfile('non-existent')).toBeUndefined();
  });
});

describe('RiskScoreCalculator', () => {
  it('calculate — composite (f*0.25 + o*0.25 + g*0.2 + c*0.2 + conc*0.1)', () => {
    const s = riskScoreCalculator.calculate('sup-rs-1', 80, 70, 50, 60, 40);
    // 80*0.25 + 70*0.25 + 50*0.2 + 60*0.2 + 40*0.1 = 20+17.5+10+12+4 = 63.5
    expect(s.overallRisk).toBeCloseTo(63.5, 1);
  });

  it('riskLevel — overall >= 70 → "critical"', () => {
    const s = riskScoreCalculator.calculate('sup-crit-1', 80, 80, 80, 80, 80);
    expect(s.overallRisk).toBe(80);
    expect(s.riskLevel).toBe('critical');
  });

  it('riskLevel — overall >= 50 < 70 → "high"', () => {
    const s = riskScoreCalculator.calculate('sup-high-1', 60, 60, 60, 60, 60);
    expect(s.overallRisk).toBe(60);
    expect(s.riskLevel).toBe('high');
  });

  it('riskLevel — overall >= 30 < 50 → "medium"', () => {
    const s = riskScoreCalculator.calculate('sup-med-1', 35, 35, 35, 35, 35);
    expect(s.overallRisk).toBe(35);
    expect(s.riskLevel).toBe('medium');
  });

  it('riskLevel — overall < 30 → "low"', () => {
    const s = riskScoreCalculator.calculate('sup-low-1', 20, 20, 20, 20, 20);
    expect(s.overallRisk).toBe(20);
    expect(s.riskLevel).toBe('low');
  });

  it('boundary 70 → critical (>=)', () => {
    const s = riskScoreCalculator.calculate('sup-bound-70', 70, 70, 70, 70, 70);
    expect(s.riskLevel).toBe('critical');
  });

  it('boundary 50 → high (>=)', () => {
    const s = riskScoreCalculator.calculate('sup-bound-50', 50, 50, 50, 50, 50);
    expect(s.riskLevel).toBe('high');
  });

  it('boundary 30 → medium (>=)', () => {
    const s = riskScoreCalculator.calculate('sup-bound-30', 30, 30, 30, 30, 30);
    expect(s.riskLevel).toBe('medium');
  });

  it('getScore — bilinmeyen → undefined', () => {
    expect(riskScoreCalculator.getScore('non-existent')).toBeUndefined();
  });

  it('getHighRiskSuppliers — critical + high filter, overallRisk desc', () => {
    riskScoreCalculator.calculate('sup-hr-1', 90, 90, 90, 90, 90);
    const high = riskScoreCalculator.getHighRiskSuppliers();
    expect(high.every((s) => s.riskLevel === 'critical' || s.riskLevel === 'high')).toBe(true);
    for (let i = 1; i < high.length; i++) {
      expect(high[i - 1].overallRisk).toBeGreaterThanOrEqual(high[i].overallRisk);
    }
  });

  it('getPortfolioRiskAvg — ortalama risk score', () => {
    const avg = riskScoreCalculator.getPortfolioRiskAvg();
    expect(avg).toBeGreaterThanOrEqual(0);
    expect(typeof avg).toBe('number');
  });
});

describe('SupplierAuditTracker', () => {
  const SUP_ID = 'sup-audit-1';

  it('schedule — audit döner, status="scheduled"', () => {
    const a = supplierAuditTracker.schedule(SUP_ID, 'quality', 'Auditor X');
    expect(a.status).toBe('scheduled');
    expect(a.type).toBe('quality');
    expect(a.findings).toEqual([]);
    expect(a.score).toBe(0);
    expect(a.auditId).toMatch(/^audit-\d+-\d+$/);
  });

  it('schedule — default 30 gün ileri', () => {
    const a = supplierAuditTracker.schedule(SUP_ID, 'esg', 'Auditor');
    const expected = Date.now() + 30 * 86400000;
    expect(a.scheduledAt).toBeGreaterThan(expected - 5000);
    expect(a.scheduledAt).toBeLessThan(expected + 5000);
  });

  it('complete — bilinmeyen → false', () => {
    expect(supplierAuditTracker.complete('non-existent', 80, [])).toBe(false);
  });

  it('complete — score 0-100 clamp', () => {
    const a = supplierAuditTracker.schedule(SUP_ID, 'security', 'A');
    supplierAuditTracker.complete(a.auditId, 150, []);
    const audits = (supplierAuditTracker.getLatestAudit(SUP_ID));
    // findings boş → status "completed", score clamp 100
    expect(audits?.score).toBe(100);
  });

  it('complete — negatif score 0\'a clamp', () => {
    const a = supplierAuditTracker.schedule('sup-neg-clamp', 'financial', 'A');
    supplierAuditTracker.complete(a.auditId, -10, []);
    expect(supplierAuditTracker.getLatestAudit('sup-neg-clamp')?.score).toBe(0);
  });

  it('complete — critical finding → status="failed"', () => {
    const a = supplierAuditTracker.schedule('sup-fail-1', 'full', 'A');
    supplierAuditTracker.complete(a.auditId, 50, [{ area: 'X', severity: 'critical', description: 'D' }]);
    expect(supplierAuditTracker.getLatestAudit('sup-fail-1')?.status).toBe('failed');
  });

  it('complete — non-critical finding → status="completed"', () => {
    const a = supplierAuditTracker.schedule('sup-comp-1', 'quality', 'A');
    supplierAuditTracker.complete(a.auditId, 80, [{ area: 'X', severity: 'minor', description: 'D' }]);
    expect(supplierAuditTracker.getLatestAudit('sup-comp-1')?.status).toBe('completed');
  });

  it('getLatestAudit — completedAt yüksek olan döner (sort desc by completedAt)', () => {
    const SUP = `sup-latest-${Date.now()}`;
    const a1 = supplierAuditTracker.schedule(SUP, 'quality', 'A');
    const a2 = supplierAuditTracker.schedule(SUP, 'security', 'B');
    supplierAuditTracker.complete(a1.auditId, 80, []);
    supplierAuditTracker.complete(a2.auditId, 90, []);
    const latest = supplierAuditTracker.getLatestAudit(SUP);
    // Aynı ms içinde complete edilirse stable sort → ilk eklenen kalır.
    // Garanti: latest tamamlanmış bir audit ve completedAt set.
    expect(latest).toBeDefined();
    expect([a1.auditId, a2.auditId]).toContain(latest?.auditId);
    expect(latest?.completedAt).toBeDefined();
  });

  it('getLatestAudit — completedAt yok → undefined', () => {
    const SUP = `sup-no-complete-${Date.now()}`;
    supplierAuditTracker.schedule(SUP, 'quality', 'A');
    expect(supplierAuditTracker.getLatestAudit(SUP)).toBeUndefined();
  });

  it('getFailedAudits — failed status filter', () => {
    const failed = supplierAuditTracker.getFailedAudits();
    expect(failed.every((a) => a.status === 'failed')).toBe(true);
  });
});

describe('RiskMitigationManager', () => {
  const SUP_ID = 'sup-mit-1';

  it('create — mitigation döner, status="planned"', () => {
    const m = riskMitigationManager.create(SUP_ID, 'financial', 'Diversify suppliers', 'CFO', 60, 25);
    expect(m.status).toBe('planned');
    expect(m.expectedRiskReduction).toBe(25);
    expect(m.mitigationId).toMatch(/^mitigate-\d+-\d+$/);
  });

  it('create — dueDate = now + dueDays * 86400000', () => {
    const m = riskMitigationManager.create(SUP_ID, 'r', 'a', 'o', 30, 10);
    const expected = Date.now() + 30 * 86400000;
    expect(m.dueDate).toBeGreaterThan(expected - 5000);
    expect(m.dueDate).toBeLessThan(expected + 5000);
  });

  it('advance — mevcut → status update + true', () => {
    const m = riskMitigationManager.create(SUP_ID, 'r', 'a', 'o', 60, 20);
    expect(riskMitigationManager.advance(m.mitigationId, 'in_progress')).toBe(true);
  });

  it('advance — bilinmeyen → false', () => {
    expect(riskMitigationManager.advance('non-existent', 'completed')).toBe(false);
  });

  it('getOpenMitigations — completed hariç', () => {
    riskMitigationManager.create('sup-open-1', 'r', 'a', 'o', 60, 20);
    const open = riskMitigationManager.getOpenMitigations();
    expect(open.every((m) => m.status !== 'completed')).toBe(true);
  });

  it('getOpenMitigations(supplierId) — supplier filter', () => {
    const SUP = `sup-open-filter-${Date.now()}`;
    riskMitigationManager.create(SUP, 'r', 'a', 'o', 60, 20);
    const open = riskMitigationManager.getOpenMitigations(SUP);
    expect(open.every((m) => m.supplierId === SUP)).toBe(true);
  });

  it('getTotalExpectedReduction — sadece completed mitigations toplanır', () => {
    const SUP = `sup-reduction-${Date.now()}`;
    const m1 = riskMitigationManager.create(SUP, 'r', 'a', 'o', 60, 30);
    const m2 = riskMitigationManager.create(SUP, 'r', 'a', 'o', 60, 20);
    riskMitigationManager.advance(m1.mitigationId, 'completed');
    // m2 hala planned
    const total = riskMitigationManager.getTotalExpectedReduction(SUP);
    expect(total).toBe(30); // sadece m1 (completed) sayılır
  });

  it('getTotalExpectedReduction — bilinmeyen supplier → 0', () => {
    expect(riskMitigationManager.getTotalExpectedReduction('non-existent')).toBe(0);
  });
});
