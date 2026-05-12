/**
 * Unit Tests — data/data-quality.ts singleton class managers
 *
 * - QualityRuleEngine (createRule + addRuleToSet + runQualityChecks: nullness/uniqueness/range)
 * - AnomalyDetector (z-score statistical outlier detection, threshold 3 stdDev)
 * - DataProfiler (profileData field stats: nullCount/uniqueCount/min/max/avg)
 * - QualityScorecardManager (5-metric average overallScore, latest by timestamp)
 */

import { describe, it, expect } from 'vitest';
import {
  qualityRuleEngine,
  anomalyDetector,
  dataProfiler,
  qualityScorecard,
} from '../data/data-quality';

describe('QualityRuleEngine', () => {
  it('createRule — id `rule-` prefix', () => {
    const id = qualityRuleEngine.createRule('Test Rule', 'nullness', { max_null_percent: 5 });
    expect(id).toMatch(/^rule-\d+-\d+$/);
  });

  it('addRuleToSet + runQualityChecks — nullness rule', async () => {
    const RULESET = `rs-null-${Date.now()}`;
    qualityRuleEngine.addRuleToSet(RULESET, {
      id: 'r-1', name: 'No nulls', type: 'nullness',
      enabled: true, field: 'name', parameters: { max_null_percent: 0 },
    } as any);
    const data = [{ name: 'A' }, { name: '' }, { name: 'B' }];
    const results = await qualityRuleEngine.runQualityChecks(data, RULESET);
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(false); // 1 null > 0%
    expect(results[0].recordsAffected).toBe(1);
  });

  it('runQualityChecks — uniqueness rule', async () => {
    const RULESET = `rs-uniq-${Date.now()}`;
    qualityRuleEngine.addRuleToSet(RULESET, {
      id: 'r-2', name: 'Unique', type: 'uniqueness',
      enabled: true, field: 'id', parameters: {},
    } as any);
    const data = [{ id: 1 }, { id: 2 }, { id: 1 }];
    const results = await qualityRuleEngine.runQualityChecks(data, RULESET);
    expect(results[0].passed).toBe(false);
    expect(results[0].recordsAffected).toBe(1); // 1 duplicate
  });

  it('runQualityChecks — range rule', async () => {
    const RULESET = `rs-range-${Date.now()}`;
    qualityRuleEngine.addRuleToSet(RULESET, {
      id: 'r-3', name: 'Age range', type: 'range',
      enabled: true, field: 'age', parameters: { min: 0, max: 120 },
    } as any);
    const data = [{ age: 25 }, { age: 150 }, { age: -5 }];
    const results = await qualityRuleEngine.runQualityChecks(data, RULESET);
    expect(results[0].passed).toBe(false);
    expect(results[0].recordsAffected).toBe(2); // 150 + -5
  });

  it('runQualityChecks — disabled rule skip', async () => {
    const RULESET = `rs-disabled-${Date.now()}`;
    qualityRuleEngine.addRuleToSet(RULESET, {
      id: 'r-4', name: 'X', type: 'nullness',
      enabled: false, field: 'name', parameters: {},
    } as any);
    const results = await qualityRuleEngine.runQualityChecks([{ name: '' }], RULESET);
    expect(results).toHaveLength(0);
  });

  it('runQualityChecks — bilinmeyen ruleSet → boş', async () => {
    expect(await qualityRuleEngine.runQualityChecks([], 'non-existent')).toEqual([]);
  });

  it('getCheckResults — son sonuçlar', async () => {
    const RULESET = `rs-results-${Date.now()}`;
    qualityRuleEngine.addRuleToSet(RULESET, {
      id: 'r-5', name: 'X', type: 'nullness', enabled: true, field: 'x', parameters: {},
    } as any);
    await qualityRuleEngine.runQualityChecks([{ x: 1 }], RULESET);
    expect(qualityRuleEngine.getCheckResults(RULESET).length).toBeGreaterThan(0);
  });

  it('getRule — bilinmeyen → null', () => {
    expect(qualityRuleEngine.getRule('non-existent')).toBeNull();
  });
});

describe('AnomalyDetector', () => {
  it('detectAnomalies — z-score > 3 outlier detect', () => {
    // 99 normal + 1 çok büyük outlier (population stdDev küçük → z-score büyük)
    const data = [
      ...Array.from({ length: 99 }, () => ({ val: 10 })),
      { val: 100000 }, // çok büyük outlier
    ];
    const anomalies = anomalyDetector.detectAnomalies(data, 'val', 'z-score');
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].anomalyType).toBe('statistical');
  });

  it('detectAnomalies — uniform values → outlier yok', () => {
    const data = Array.from({ length: 10 }, () => ({ val: 100 }));
    const anomalies = anomalyDetector.detectAnomalies(data, 'val');
    // Tüm değer aynı, stdDev=0 → zScore NaN → outlier yok
    expect(anomalies.length).toBe(0);
  });

  it('detectAnomalies — boş data → boş array', () => {
    expect(anomalyDetector.detectAnomalies([], 'x')).toEqual([]);
  });

  it('detectAnomalies — null/undefined value skip', () => {
    const data = [{ x: null }, { x: undefined }, { x: 5 }, { x: 10 }];
    const anomalies = anomalyDetector.detectAnomalies(data, 'x');
    expect(Array.isArray(anomalies)).toBe(true);
  });

  it('detectAnomalies — z-score default method', () => {
    // method param vermeden default z-score kullanılır
    const anomalies = anomalyDetector.detectAnomalies([{ x: 1 }, { x: 2 }, { x: 1000 }], 'x');
    expect(Array.isArray(anomalies)).toBe(true);
  });

  it('getAnomalies — bilinmeyen detectionId → boş', () => {
    expect(anomalyDetector.getAnomalies('non-existent')).toEqual([]);
  });
});

describe('DataProfiler', () => {
  it('profileData — boş → boş array', () => {
    expect(dataProfiler.profileData([])).toEqual([]);
  });

  it('profileData — field metadata (nullCount/uniqueCount)', () => {
    const data = [{ x: 1 }, { x: 2 }, { x: null }, { x: 1 }];
    const profiles = dataProfiler.profileData(data);
    const xProfile = profiles.find((p) => p.fieldName === 'x');
    expect(xProfile?.nullCount).toBe(1);
    expect(xProfile?.uniqueCount).toBe(2); // 1, 2 unique
  });

  it('profileData — min/max/avg', () => {
    const data = [{ x: 10 }, { x: 20 }, { x: 30 }];
    const profile = dataProfiler.profileData(data).find((p) => p.fieldName === 'x');
    expect(profile?.minValue).toBe(10);
    expect(profile?.maxValue).toBe(30);
    expect(profile?.avgValue).toBe(20);
  });

  it('profileData — multiple field', () => {
    const data = [{ a: 1, b: 'x' }, { a: 2, b: 'y' }];
    const profiles = dataProfiler.profileData(data);
    expect(profiles).toHaveLength(2);
  });

  it('compareProfiles — değişiklik delta', () => {
    const p1 = { fieldName: 'x', dataType: 'number', nullCount: 5, uniqueCount: 100, minValue: 0, maxValue: 100, avgValue: 50 };
    const p2 = { fieldName: 'x', dataType: 'number', nullCount: 10, uniqueCount: 95, minValue: 0, maxValue: 100, avgValue: 50 };
    const diff = dataProfiler.compareProfiles(p1, p2);
    expect(diff.nullCountChange).toBe(5);
    expect(diff.uniqueCountChange).toBe(-5);
  });
});

describe('QualityScorecardManager', () => {
  it('createScorecard — overallScore = average 5 metric', () => {
    const card = qualityScorecard.createScorecard('ds-1', {
      completeness: 90, consistency: 85, timeliness: 95, validity: 80, accuracy: 100,
    });
    expect(card.overallScore).toBe(90); // (90+85+95+80+100)/5
    expect(card.id).toMatch(/^scorecard-\d+-\d+$/);
  });

  it('createScorecard — datasetId set', () => {
    const card = qualityScorecard.createScorecard('ds-2', {
      completeness: 100, consistency: 100, timeliness: 100, validity: 100, accuracy: 100,
    });
    expect(card.datasetId).toBe('ds-2');
    expect(card.overallScore).toBe(100);
  });

  it('getScorecard — bilinmeyen → null', () => {
    expect(qualityScorecard.getScorecard('non-existent')).toBeNull();
  });

  it('getScorecard — kayıtlı', () => {
    const card = qualityScorecard.createScorecard('ds-3', {
      completeness: 50, consistency: 50, timeliness: 50, validity: 50, accuracy: 50,
    });
    expect(qualityScorecard.getScorecard(card.id)?.id).toBe(card.id);
  });

  it('getLatestScorecard — datasetId için en yeni timestamp', async () => {
    const DSID = `ds-latest-${Date.now()}`;
    qualityScorecard.createScorecard(DSID, {
      completeness: 50, consistency: 50, timeliness: 50, validity: 50, accuracy: 50,
    });
    await new Promise((r) => setTimeout(r, 5));
    const newer = qualityScorecard.createScorecard(DSID, {
      completeness: 100, consistency: 100, timeliness: 100, validity: 100, accuracy: 100,
    });
    expect((qualityScorecard as any).getLatestScorecard(DSID)?.id).toBe(newer.id);
  });
});
