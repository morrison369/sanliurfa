/**
 * Unit Tests — ai/ai-ops.ts singleton class managers (Phase 40)
 *
 * - ModelRegistry (register/promote/retire/getChampion/listVersions — model lifecycle)
 * - ModelMonitor (recordPrediction + getMetrics + detectDrift threshold 0.15 + 100 prediction min)
 * - ExperimentRunner (createExperiment + assignModel hash-based + recordOutcome + getResults)
 *
 * Singleton state shared — testler unique modelId/expName kullanır.
 */

import { describe, it, expect } from 'vitest';
import { modelRegistry, modelMonitor, experimentRunner } from '../ai/ai-ops';

describe('ModelRegistry', () => {
  it('register — model ekler, status="candidate"', () => {
    modelRegistry.register({
      id: 'mr-model-1',
      name: 'Test Model',
      version: '1.0.0',
      metrics: { accuracy: 0.95 },
    });
    const versions = modelRegistry.listVersions('mr-model-1');
    expect(versions).toHaveLength(1);
    expect(versions[0].status).toBe('candidate');
  });

  it('register — multiple version aynı model', () => {
    modelRegistry.register({ id: 'mr-multi', name: 'M', version: '1.0', metrics: {} });
    modelRegistry.register({ id: 'mr-multi', name: 'M', version: '1.1', metrics: {} });
    expect(modelRegistry.listVersions('mr-multi')).toHaveLength(2);
  });

  it('promote — version status="champion", önceki champion "retired"', () => {
    modelRegistry.register({ id: 'mr-promote', name: 'P', version: '1.0', metrics: {} });
    modelRegistry.register({ id: 'mr-promote', name: 'P', version: '1.1', metrics: {} });
    modelRegistry.promote('mr-promote', '1.0');
    const ch1 = modelRegistry.getChampion('mr-promote');
    expect(ch1?.version).toBe('1.0');
    // Yeni promote — eski champion retired'a düşer
    modelRegistry.promote('mr-promote', '1.1');
    const ch2 = modelRegistry.getChampion('mr-promote');
    expect(ch2?.version).toBe('1.1');
    const versions = modelRegistry.listVersions('mr-promote');
    const v10 = versions.find((v) => v.version === '1.0');
    expect(v10?.status).toBe('retired');
  });

  it('promote — bilinmeyen modelId → no-op', () => {
    expect(() => modelRegistry.promote('non-existent', '1.0')).not.toThrow();
  });

  it('retire — tüm version retired', () => {
    modelRegistry.register({ id: 'mr-retire', name: 'R', version: '1.0', metrics: {} });
    modelRegistry.register({ id: 'mr-retire', name: 'R', version: '2.0', metrics: {} });
    modelRegistry.retire('mr-retire');
    for (const v of modelRegistry.listVersions('mr-retire')) {
      expect(v.status).toBe('retired');
    }
  });

  it('getChampion — bilinmeyen → null', () => {
    expect(modelRegistry.getChampion('non-existent')).toBeNull();
  });

  it('getChampion — champion yok (sadece candidate) → null', () => {
    modelRegistry.register({ id: 'mr-nochamp', name: 'N', version: '1.0', metrics: {} });
    expect(modelRegistry.getChampion('mr-nochamp')).toBeNull();
  });

  it('listVersions — bilinmeyen → boş array', () => {
    expect(modelRegistry.listVersions('non-existent')).toEqual([]);
  });
});

describe('ModelMonitor', () => {
  it('recordPrediction + getMetrics — avgLatency + avgConfidence + count', () => {
    const MID = `mm-${Date.now()}-1`;
    modelMonitor.recordPrediction({
      modelId: MID, input: {}, output: {}, confidence: 0.9, latency: 100, timestamp: Date.now(),
    });
    modelMonitor.recordPrediction({
      modelId: MID, input: {}, output: {}, confidence: 0.8, latency: 200, timestamp: Date.now(),
    });
    const m = modelMonitor.getMetrics(MID);
    expect(m.predictionCount).toBe(2);
    expect(m.avgLatency).toBe(150); // (100+200)/2
    expect(m.avgConfidence).toBeCloseTo(0.85, 2);
  });

  it('getMetrics — bilinmeyen modelId → 0/0/0', () => {
    const m = modelMonitor.getMetrics('non-existent-mm');
    expect(m).toEqual({ avgLatency: 0, avgConfidence: 0, predictionCount: 0 });
  });

  it('detectDrift — < 100 prediction → driftDetected=false', () => {
    const MID = `mm-drift-min-${Date.now()}`;
    for (let i = 0; i < 50; i++) {
      modelMonitor.recordPrediction({
        modelId: MID, input: {}, output: {}, confidence: 0.5, latency: 100, timestamp: Date.now(),
      });
    }
    const drift = modelMonitor.detectDrift(MID);
    expect(drift.driftDetected).toBe(false);
    expect(drift.magnitude).toBe(0);
    expect(drift.affectedFeatures).toEqual([]);
  });

  it('detectDrift — düşük confidence (drift > 0.15) → driftDetected=true', () => {
    const MID = `mm-drift-yes-${Date.now()}`;
    for (let i = 0; i < 100; i++) {
      modelMonitor.recordPrediction({
        modelId: MID, input: {}, output: {}, confidence: 0.4, latency: 100, timestamp: Date.now(),
      });
    }
    const drift = modelMonitor.detectDrift(MID);
    // recent avg = 0.4, historical baseline = 0.8, |0.4 - 0.8| = 0.4 > 0.15 → drift
    expect(drift.driftDetected).toBe(true);
    expect(drift.magnitude).toBeGreaterThan(0.15);
    expect(drift.affectedFeatures).toContain('input_distribution');
  });

  it('detectDrift — confidence baseline\'a yakın (drift < 0.15) → false', () => {
    const MID = `mm-drift-no-${Date.now()}`;
    for (let i = 0; i < 100; i++) {
      modelMonitor.recordPrediction({
        modelId: MID, input: {}, output: {}, confidence: 0.78, latency: 100, timestamp: Date.now(),
      });
    }
    const drift = modelMonitor.detectDrift(MID);
    // recent 0.78 vs baseline 0.8 → drift 0.02 < 0.15 → no drift
    expect(drift.driftDetected).toBe(false);
  });

  it('getUnderperformingModels — placeholder döner boş array', () => {
    expect(modelMonitor.getUnderperformingModels()).toEqual([]);
  });
});

describe('ExperimentRunner', () => {
  it('createExperiment — id `exp-` prefix + crypto random suffix', () => {
    const exp = experimentRunner.createExperiment({
      name: 'Test Exp 1',
      championModelId: 'champ-1',
      challengerModelId: 'chall-1',
      trafficSplit: 0.5,
      startDate: Date.now(),
    });
    expect(exp.id).toMatch(/^exp-\d+-[0-9a-f]+$/);
    expect(exp.name).toBe('Test Exp 1');
  });

  it('assignModel — bilinmeyen experimentId → boş string', () => {
    expect(experimentRunner.assignModel('non-existent', 'user-1')).toBe('');
  });

  it('assignModel — sticky (aynı user → aynı atama)', () => {
    const exp = experimentRunner.createExperiment({
      name: 'Sticky', championModelId: 'C', challengerModelId: 'X',
      trafficSplit: 0.5, startDate: Date.now(),
    });
    const a1 = experimentRunner.assignModel(exp.id, 'user-sticky');
    const a2 = experimentRunner.assignModel(exp.id, 'user-sticky');
    expect(a1).toBe(a2);
  });

  it('assignModel — atama champion veya challenger\'dan biri', () => {
    const exp = experimentRunner.createExperiment({
      name: 'Assign', championModelId: 'CHAMP', challengerModelId: 'CHALL',
      trafficSplit: 0.5, startDate: Date.now(),
    });
    const assigned = experimentRunner.assignModel(exp.id, 'user-x');
    expect(['CHAMP', 'CHALL']).toContain(assigned);
  });

  it('assignModel — trafficSplit=0 → her zaman champion', () => {
    const exp = experimentRunner.createExperiment({
      name: 'Zero', championModelId: 'C0', challengerModelId: 'X0',
      trafficSplit: 0, startDate: Date.now(),
    });
    const assigned = experimentRunner.assignModel(exp.id, 'user-zero');
    expect(assigned).toBe('C0');
  });

  it('assignModel — trafficSplit=1 → her zaman challenger', () => {
    const exp = experimentRunner.createExperiment({
      name: 'Full', championModelId: 'C1', challengerModelId: 'X1',
      trafficSplit: 1, startDate: Date.now(),
    });
    const assigned = experimentRunner.assignModel(exp.id, 'user-full');
    expect(assigned).toBe('X1');
  });

  it('recordOutcome + getResults — winRate calculation', () => {
    const exp = experimentRunner.createExperiment({
      name: 'Outcome', championModelId: 'OC', challengerModelId: 'OX',
      trafficSplit: 0.5, startDate: Date.now(),
    });
    experimentRunner.recordOutcome(exp.id, 'u1', true);
    experimentRunner.recordOutcome(exp.id, 'u2', true);
    experimentRunner.recordOutcome(exp.id, 'u3', false);
    const result = experimentRunner.getResults(exp.id);
    expect(result.champion.winRate).toBe(67); // 2/3 ≈ 0.667
    expect(result.challenger.winRate).toBe(33);
  });

  it('getResults — > %50 success → winner=champion', () => {
    const exp = experimentRunner.createExperiment({
      name: 'WinChamp', championModelId: 'WC-CHAMP', challengerModelId: 'WC-CHALL',
      trafficSplit: 0.5, startDate: Date.now(),
    });
    experimentRunner.recordOutcome(exp.id, 'u1', true);
    experimentRunner.recordOutcome(exp.id, 'u2', true);
    experimentRunner.recordOutcome(exp.id, 'u3', true);
    experimentRunner.recordOutcome(exp.id, 'u4', false);
    expect(experimentRunner.getResults(exp.id).winner).toBe('WC-CHAMP');
  });

  it('getResults — bilinmeyen → 0 winRate + null winner', () => {
    const result = experimentRunner.getResults('non-existent-exp');
    expect(result.champion.winRate).toBe(0);
    expect(result.challenger.winRate).toBe(0);
    expect(result.winner).toBeNull();
  });

  it('getResults — outcome yok → 0 success rate', () => {
    const exp = experimentRunner.createExperiment({
      name: 'NoOutcome', championModelId: 'NC', challengerModelId: 'NX',
      trafficSplit: 0.5, startDate: Date.now(),
    });
    expect(experimentRunner.getResults(exp.id).champion.winRate).toBe(0);
  });
});
