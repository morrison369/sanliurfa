/**
 * Unit Tests — audit-intelligence.ts singleton class managers
 *
 * 4 in-memory class manager (governance phase):
 * - AuditEngagementPlanner (plan/updateStatus/getActive/getByRiskRating)
 * - AuditFindingManager (record/updateStatus/getOverdue/getCriticalOpen)
 * - ControlTestingEngine (test with exception rate threshold/getIneffective/getOverallEffectivenessRate)
 * - AuditAnalyticsEngine (generate insight/getRequiringFollowUp/getByEngagement/getTotalAnomalies)
 *
 * Singleton state shared — testler unique ID/title kullanır.
 */

import { describe, it, expect } from 'vitest';
import {
  auditEngagementPlanner,
  auditFindingManager,
  controlTestingEngine,
  auditAnalyticsEngine,
} from '../audit-intelligence';

const NOW = Date.now();
const DAY = 86400 * 1000;

describe('AuditEngagementPlanner', () => {
  it('plan — engagement döner, status="planned"', () => {
    const eng = auditEngagementPlanner.plan(
      'Q4 Internal Audit Unique-1',
      'internal',
      'Finance & Accounting',
      'high',
      NOW,
      NOW + 30 * DAY,
      'Auditor A',
    );
    expect(eng.status).toBe('planned');
    expect(eng.name).toBe('Q4 Internal Audit Unique-1');
    expect(eng.type).toBe('internal');
    expect(eng.engagementId).toMatch(/^audit-\d+-\d+$/);
  });

  it('updateStatus — status değiştirir + true', () => {
    const eng = auditEngagementPlanner.plan('Status Update-2', 'internal', 'X', 'medium', NOW, NOW + DAY, 'A');
    expect(auditEngagementPlanner.updateStatus(eng.engagementId, 'fieldwork')).toBe(true);
    expect(auditEngagementPlanner.getEngagement(eng.engagementId)?.status).toBe('fieldwork');
  });

  it('updateStatus — fieldwork → actualStartDate set', () => {
    const eng = auditEngagementPlanner.plan('Fieldwork Date-3', 'internal', 'X', 'low', NOW, NOW + DAY, 'A');
    auditEngagementPlanner.updateStatus(eng.engagementId, 'fieldwork');
    expect(auditEngagementPlanner.getEngagement(eng.engagementId)?.actualStartDate).toBeDefined();
  });

  it('updateStatus — completed → actualEndDate set', () => {
    const eng = auditEngagementPlanner.plan('Complete Date-4', 'internal', 'X', 'low', NOW, NOW + DAY, 'A');
    auditEngagementPlanner.updateStatus(eng.engagementId, 'fieldwork');
    auditEngagementPlanner.updateStatus(eng.engagementId, 'completed');
    expect(auditEngagementPlanner.getEngagement(eng.engagementId)?.actualEndDate).toBeDefined();
  });

  it('updateStatus — bilinmeyen → false', () => {
    expect(auditEngagementPlanner.updateStatus('non-existent', 'fieldwork')).toBe(false);
  });

  it('getActive — fieldwork + reporting filter', () => {
    const eng = auditEngagementPlanner.plan('Active-5', 'internal', 'X', 'medium', NOW, NOW + DAY, 'A');
    auditEngagementPlanner.updateStatus(eng.engagementId, 'fieldwork');
    const active = auditEngagementPlanner.getActive();
    expect(active.some((e) => e.engagementId === eng.engagementId)).toBe(true);
  });

  it('getActive — planned/completed/cancelled hariç', () => {
    const eng = auditEngagementPlanner.plan('Not Active-6', 'internal', 'X', 'medium', NOW, NOW + DAY, 'A');
    // status: 'planned'
    const active = auditEngagementPlanner.getActive();
    expect(active.some((e) => e.engagementId === eng.engagementId)).toBe(false);
  });

  it('getByRiskRating — high filter', () => {
    const eng = auditEngagementPlanner.plan('High Risk-7', 'internal', 'X', 'high', NOW, NOW + DAY, 'A');
    const high = auditEngagementPlanner.getByRiskRating('high');
    expect(high.some((e) => e.engagementId === eng.engagementId)).toBe(true);
    expect(high.every((e) => e.riskRating === 'high')).toBe(true);
  });

  it('getEngagement — bilinmeyen → undefined', () => {
    expect(auditEngagementPlanner.getEngagement('non-existent')).toBeUndefined();
  });
});

describe('AuditFindingManager', () => {
  const ENG_ID = 'audit-finding-eng-1';

  it('record — finding döner, status="open"', () => {
    const f = auditFindingManager.record(
      ENG_ID,
      'Missing audit trail',
      'No audit trail for sensitive operations',
      'high',
      'control_deficiency',
      'Process gap',
      'Implement logging',
    );
    expect(f.status).toBe('open');
    expect(f.severity).toBe('high');
    expect(f.findingId).toMatch(/^finding-\d+-\d+$/);
  });

  it('record — default daysToRemediate=90', () => {
    const f = auditFindingManager.record(ENG_ID, 't', 'd', 'low', 'observation', 'r', 'rec');
    const expectedDue = Date.now() + 90 * DAY;
    expect(f.dueDate).toBeGreaterThan(expectedDue - 5000);
    expect(f.dueDate).toBeLessThan(expectedDue + 5000);
  });

  it('record — custom daysToRemediate', () => {
    const f = auditFindingManager.record(ENG_ID, 't', 'd', 'low', 'observation', 'r', 'rec', 30);
    const expectedDue = Date.now() + 30 * DAY;
    expect(f.dueDate).toBeGreaterThan(expectedDue - 5000);
    expect(f.dueDate).toBeLessThan(expectedDue + 5000);
  });

  it('updateStatus — true + status update', () => {
    const f = auditFindingManager.record(ENG_ID, 'update-status', 'd', 'low', 'observation', 'r', 'rec');
    expect(auditFindingManager.updateStatus(f.findingId, 'remediated', 'Fixed')).toBe(true);
  });

  it('updateStatus — bilinmeyen → false', () => {
    expect(auditFindingManager.updateStatus('non-existent-finding', 'remediated')).toBe(false);
  });

  it('getCriticalOpen — critical/high + open filter', () => {
    auditFindingManager.record(ENG_ID, 'crit-open', 'd', 'critical', 'material_weakness', 'r', 'rec');
    const crit = auditFindingManager.getCriticalOpen();
    expect(crit.length).toBeGreaterThan(0);
    expect(crit.every((f) => (f.severity === 'critical' || f.severity === 'high') && f.status === 'open')).toBe(true);
  });

  it('getOverdue — dueDate geçmiş + open', () => {
    // negatif daysToRemediate ile dueDate geçmişe yerleştir
    const f = auditFindingManager.record(ENG_ID, 'overdue-test', 'd', 'medium', 'observation', 'r', 'rec', -10);
    const overdue = auditFindingManager.getOverdue();
    expect(overdue.some((o) => o.findingId === f.findingId)).toBe(true);
  });
});

describe('ControlTestingEngine', () => {
  it('test — 0 exception → "effective"', () => {
    const r = controlTestingEngine.test('CTRL-EFF-1', 'eng-1', 'Sample procedure', 50, 0);
    expect(r.result).toBe('effective');
    expect(r.exceptionRate).toBe(0);
  });

  it('test — <= 5% exception → "effective_with_exceptions"', () => {
    const r = controlTestingEngine.test('CTRL-EWE-1', 'eng-1', 'p', 100, 4); // 4%
    expect(r.result).toBe('effective_with_exceptions');
    expect(r.exceptionRate).toBe(4);
  });

  it('test — 5% boundary inclusive → "effective_with_exceptions"', () => {
    const r = controlTestingEngine.test('CTRL-5pct-1', 'eng-1', 'p', 100, 5); // tam 5%
    expect(r.result).toBe('effective_with_exceptions');
  });

  it('test — > 5% exception → "ineffective"', () => {
    const r = controlTestingEngine.test('CTRL-INE-1', 'eng-1', 'p', 100, 10); // 10%
    expect(r.result).toBe('ineffective');
  });

  it('test — sampleSize=0 → exceptionRate 0', () => {
    const r = controlTestingEngine.test('CTRL-ZERO-1', 'eng-1', 'p', 0, 0);
    expect(r.exceptionRate).toBe(0);
    expect(r.result).toBe('effective');
  });

  it('getIneffectiveControls — sadece ineffective döner', () => {
    controlTestingEngine.test('CTRL-INE-LIST-1', 'eng-1', 'p', 100, 20);
    const ineffective = controlTestingEngine.getIneffectiveControls();
    expect(ineffective.every((r) => r.result === 'ineffective')).toBe(true);
  });

  it('getControlTestHistory — controlId filter', () => {
    const ID = `CTRL-HIST-${Date.now()}`;
    controlTestingEngine.test(ID, 'eng-1', 'p1', 50, 0);
    controlTestingEngine.test(ID, 'eng-1', 'p2', 100, 5);
    const history = controlTestingEngine.getControlTestHistory(ID);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.every((r) => r.controlId === ID)).toBe(true);
  });

  it('getOverallEffectivenessRate — % döner [0-100]', () => {
    const rate = controlTestingEngine.getOverallEffectivenessRate();
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });
});

describe('AuditAnalyticsEngine', () => {
  it('generate — insight döner, anomaliesDetected=0 → followUpRequired=false', () => {
    const i = auditAnalyticsEngine.generate('eng-an-1', 'TX log', 0, 'No anomaly', 'Low risk');
    expect(i.followUpRequired).toBe(false);
    expect(i.anomaliesDetected).toBe(0);
    expect(i.insightId).toMatch(/^auditinsight-\d+-\d+$/);
  });

  it('generate — anomalies > 0 → followUpRequired=true', () => {
    const i = auditAnalyticsEngine.generate('eng-an-2', 'TX log', 5, 'Spikes', 'Investigate');
    expect(i.followUpRequired).toBe(true);
  });

  it('getRequiringFollowUp — followUpRequired filter', () => {
    auditAnalyticsEngine.generate('eng-an-followup-1', 'd', 3, 'p', 'r');
    const flagged = auditAnalyticsEngine.getRequiringFollowUp();
    expect(flagged.every((i) => i.followUpRequired === true)).toBe(true);
  });

  it('getByEngagement — engagementId filter', () => {
    const ENG = `eng-an-by-${Date.now()}`;
    auditAnalyticsEngine.generate(ENG, 'd1', 1, 'p', 'r');
    auditAnalyticsEngine.generate(ENG, 'd2', 2, 'p', 'r');
    const byEng = auditAnalyticsEngine.getByEngagement(ENG);
    expect(byEng).toHaveLength(2);
    expect(byEng.every((i) => i.engagementId === ENG)).toBe(true);
  });

  it('getTotalAnomalies — sum of anomaliesDetected', () => {
    const total = auditAnalyticsEngine.getTotalAnomalies();
    expect(total).toBeGreaterThanOrEqual(0);
    expect(typeof total).toBe('number');
  });
});
