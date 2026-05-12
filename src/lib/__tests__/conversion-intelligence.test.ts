/**
 * Unit Tests — conversion-intelligence.ts singleton class managers
 *
 * - ConversionPredictor (weighted score → probability + categorize hot/warm/cold)
 * - ConversionOptimizer (probability + cartValue → action type discount/social-proof/urgency/personalize)
 * - AbandonmentDetector (detect + recovery + metrics)
 * - RevenueAttributionTracker (touchpoint + first-touch/last-touch/linear attribution model)
 */

import { describe, it, expect } from 'vitest';
import {
  conversionPredictor,
  conversionOptimizer,
  abandonmentDetector,
  revenueAttributionTracker,
} from '../conversion-intelligence';

describe('ConversionPredictor', () => {
  it('predict — weighted average probability', () => {
    const p = conversionPredictor.predict('user-1', [
      { name: 'time_on_site', value: 0.8, weight: 0.3 },
      { name: 'pages_viewed', value: 0.6, weight: 0.5 },
      { name: 'cart_added', value: 1.0, weight: 0.2 },
    ]);
    // (0.8*0.3 + 0.6*0.5 + 1.0*0.2) / (0.3+0.5+0.2) = 0.74 / 1.0 = 0.74
    expect(p.probability).toBeCloseTo(0.74, 2);
  });

  it('predict — totalWeight=0 → probability 0', () => {
    const p = conversionPredictor.predict('user-2', []);
    expect(p.probability).toBe(0);
  });

  it('predict — clamp 0-1', () => {
    const p = conversionPredictor.predict('user-3', [{ name: 'x', value: 5, weight: 1 }]);
    expect(p.probability).toBe(1);

    const p2 = conversionPredictor.predict('user-4', [{ name: 'x', value: -5, weight: 1 }]);
    expect(p2.probability).toBe(0);
  });

  it('categorizeLead — >= 0.7 hot', () => {
    expect(conversionPredictor.categorizeLead(0.7)).toBe('hot');
    expect(conversionPredictor.categorizeLead(0.95)).toBe('hot');
  });

  it('categorizeLead — >= 0.3 < 0.7 warm', () => {
    expect(conversionPredictor.categorizeLead(0.3)).toBe('warm');
    expect(conversionPredictor.categorizeLead(0.5)).toBe('warm');
    expect(conversionPredictor.categorizeLead(0.69)).toBe('warm');
  });

  it('categorizeLead — < 0.3 cold', () => {
    expect(conversionPredictor.categorizeLead(0.0)).toBe('cold');
    expect(conversionPredictor.categorizeLead(0.29)).toBe('cold');
  });

  it('predictBatch — multiple user prediction', () => {
    const result = conversionPredictor.predictBatch({
      'u-batch-1': [{ name: 'x', value: 0.5, weight: 1 }],
      'u-batch-2': [{ name: 'x', value: 0.8, weight: 1 }],
    });
    expect(result).toHaveLength(2);
    expect(result[0].userId).toBe('u-batch-1');
    expect(result[1].probability).toBe(0.8);
  });
});

describe('ConversionOptimizer', () => {
  it('selectAction — probability < 0.3 + cartValue > 50 → "discount"', () => {
    const action = conversionOptimizer.selectAction('u-disc', 0.2, 100);
    expect(action.type).toBe('discount');
    expect(action.content.discountPct).toBe(10);
  });

  it('selectAction — probability < 0.3 + cartValue <= 50 → "social-proof"', () => {
    // < 0.3 ama cartValue küçük → social-proof branch
    const action = conversionOptimizer.selectAction('u-sp-low', 0.2, 30);
    expect(action.type).toBe('social-proof');
  });

  it('selectAction — probability < 0.5 → "social-proof"', () => {
    const action = conversionOptimizer.selectAction('u-sp', 0.4, 100);
    expect(action.type).toBe('social-proof');
  });

  it('selectAction — probability < 0.7 → "urgency"', () => {
    const action = conversionOptimizer.selectAction('u-urg', 0.6, 100);
    expect(action.type).toBe('urgency');
    expect(action.content.message).toContain('3 left');
  });

  it('selectAction — probability >= 0.7 → "personalize"', () => {
    const action = conversionOptimizer.selectAction('u-pers', 0.8, 100);
    expect(action.type).toBe('personalize');
  });

  it('selectAction — converted=false default', () => {
    const action = conversionOptimizer.selectAction('u-default', 0.5, 100);
    expect(action.converted).toBe(false);
    expect(action.actionId).toMatch(/^action-\d+-\d+$/);
  });

  it('recordConversion — true + converted=true', () => {
    const action = conversionOptimizer.selectAction('u-conv', 0.5, 100);
    expect(conversionOptimizer.recordConversion(action.actionId)).toBe(true);
  });

  it('recordConversion — bilinmeyen → false', () => {
    expect(conversionOptimizer.recordConversion('non-existent')).toBe(false);
  });

  it('getActionEffectiveness — type bazlı triggered/converted/rate', () => {
    const stats = conversionOptimizer.getActionEffectiveness();
    expect(typeof stats).toBe('object');
    for (const stat of Object.values(stats)) {
      expect(stat.rate).toBeGreaterThanOrEqual(0);
      expect(stat.rate).toBeLessThanOrEqual(100);
    }
  });
});

describe('AbandonmentDetector', () => {
  it('detectAbandonment — event döner, recoveryAttempted=false', () => {
    const e = abandonmentDetector.detectAbandonment('u-ab-1', 'sess-1', '/cart', 150);
    expect(e.recoveryAttempted).toBe(false);
    expect(e.cartValue).toBe(150);
    expect(e.eventId).toMatch(/^abandon-\d+-\d+$/);
    expect(e.abandonedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it('detectAbandonment — cartValue undefined optional', () => {
    const e = abandonmentDetector.detectAbandonment('u-ab-2', 'sess-2', '/checkout');
    expect(e.cartValue).toBeUndefined();
  });

  it('triggerRecovery — true ilk denemede', () => {
    const e = abandonmentDetector.detectAbandonment('u-tr', 'sess-tr', '/cart', 100);
    expect(abandonmentDetector.triggerRecovery(e.eventId)).toBe(true);
  });

  it('triggerRecovery — ikinci defa false (zaten attempted)', () => {
    const e = abandonmentDetector.detectAbandonment('u-tr2', 'sess', '/x', 50);
    abandonmentDetector.triggerRecovery(e.eventId);
    expect(abandonmentDetector.triggerRecovery(e.eventId)).toBe(false);
  });

  it('triggerRecovery — bilinmeyen → false', () => {
    expect(abandonmentDetector.triggerRecovery('non-existent')).toBe(false);
  });

  it('recordRecovery — recoveredAt set + true', () => {
    const e = abandonmentDetector.detectAbandonment('u-rec', 'sess-rec', '/x', 50);
    expect(abandonmentDetector.recordRecovery(e.eventId)).toBe(true);
  });

  it('recordRecovery — bilinmeyen → false', () => {
    expect(abandonmentDetector.recordRecovery('non-existent')).toBe(false);
  });

  it('getAbandonmentMetrics — total/recovered/recoveryRate/avgCartValue', () => {
    const metrics = abandonmentDetector.getAbandonmentMetrics();
    expect(metrics.total).toBeGreaterThanOrEqual(0);
    expect(metrics.recovered).toBeGreaterThanOrEqual(0);
    expect(metrics.recoveryRate).toBeGreaterThanOrEqual(0);
    expect(metrics.recoveryRate).toBeLessThanOrEqual(100);
    expect(metrics.avgCartValue).toBeGreaterThanOrEqual(0);
  });
});

describe('RevenueAttributionTracker', () => {
  it('recordTouchpoint — tp döner, attributionWeight=0 default', () => {
    const tp = revenueAttributionTracker.recordTouchpoint('u-tp-1', 'organic', 'spring-sale');
    expect(tp.attributed).toBe(false);
    expect(tp.attributionWeight).toBe(0);
    expect((tp as any).campaign).toBe('spring-sale');
  });

  it('recordTouchpoint — campaign optional', () => {
    const tp = revenueAttributionTracker.recordTouchpoint('u-tp-2', 'paid');
    expect((tp as any).campaign).toBeUndefined();
  });

  it('attributeConversion — first-touch model', () => {
    const U = `u-first-${Date.now()}`;
    revenueAttributionTracker.recordTouchpoint(U, 'organic');
    revenueAttributionTracker.recordTouchpoint(U, 'paid');
    revenueAttributionTracker.recordTouchpoint(U, 'social');
    const tps = revenueAttributionTracker.attributeConversion(U, 'first-touch');
    expect(tps[0].attributed).toBe(true);
    expect(tps[0].attributionWeight).toBe(1.0);
    expect(tps[1].attributed).toBe(false); // değişmedi
  });

  it('attributeConversion — last-touch model', () => {
    const U = `u-last-${Date.now()}`;
    revenueAttributionTracker.recordTouchpoint(U, 'organic');
    revenueAttributionTracker.recordTouchpoint(U, 'paid');
    const tps = revenueAttributionTracker.attributeConversion(U, 'last-touch');
    expect(tps[tps.length - 1].attributed).toBe(true);
    expect(tps[tps.length - 1].attributionWeight).toBe(1.0);
    expect(tps[0].attributed).toBe(false);
  });

  it('attributeConversion — linear model (eşit ağırlık)', () => {
    const U = `u-lin-${Date.now()}`;
    revenueAttributionTracker.recordTouchpoint(U, 'organic');
    revenueAttributionTracker.recordTouchpoint(U, 'paid');
    revenueAttributionTracker.recordTouchpoint(U, 'social');
    revenueAttributionTracker.recordTouchpoint(U, 'email');
    const tps = revenueAttributionTracker.attributeConversion(U, 'linear');
    expect(tps).toHaveLength(4);
    // 4 touchpoint → her biri 0.25
    for (const tp of tps) {
      expect(tp.attributed).toBe(true);
      expect(tp.attributionWeight).toBe(0.25);
    }
  });

  it('attributeConversion — touchpoint yok → boş array', () => {
    expect(revenueAttributionTracker.attributeConversion('non-existent', 'linear')).toEqual([]);
  });

  it('getChannelAttribution — channel bazlı toplam', () => {
    const attribution = revenueAttributionTracker.getChannelAttribution();
    expect(typeof attribution).toBe('object');
    for (const stat of Object.values(attribution)) {
      expect(stat.touchpoints).toBeGreaterThan(0);
      expect(stat.totalWeight).toBeGreaterThan(0);
    }
  });

  it('getUserTouchpoints — user filter', () => {
    const U = `u-utp-${Date.now()}`;
    revenueAttributionTracker.recordTouchpoint(U, 'organic');
    revenueAttributionTracker.recordTouchpoint(U, 'paid');
    expect(revenueAttributionTracker.getUserTouchpoints(U)).toHaveLength(2);
  });

  it('getUserTouchpoints — bilinmeyen → boş array', () => {
    expect(revenueAttributionTracker.getUserTouchpoints('non-existent')).toEqual([]);
  });
});
