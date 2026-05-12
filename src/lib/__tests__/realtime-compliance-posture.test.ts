/**
 * Unit Tests - realtime/realtime-compliance-posture-api.ts (Phase 189)
 *
 * - PostureAggregator (build snapshot - postureScore Math.max(0, ...) + 0.1 precision)
 * - PostureStreamPublisher (event "compliance.posture.updated" + payload passthrough)
 * - PostureThresholdEvaluator (3-tier: green ≥85 / amber ≥70 / red <70)
 * - PostureAPISerializer (toJson + toPublicView - hide internal fields)
 *
 * Singleton state shared.
 */

import { describe, it, expect } from 'vitest';
import {
  postureAggregator,
  postureStreamPublisher,
  postureThresholdEvaluator,
  postureApiSerializer,
} from '../realtime/realtime-compliance-posture-api';

describe('PostureAggregator', () => {
  it('build - postureScore = controlPassRate - incidentPenalty - exceptionPenalty (0.1 precision)', () => {
    const s = postureAggregator.build({
      controlPassRate: 95,
      incidentPenalty: 5,
      exceptionPenalty: 2,
    });
    expect(s.postureScore).toBe(88); // 95 - 5 - 2 = 88
  });

  it('build - Math.max(0, ...) clamp - negative → 0', () => {
    const s = postureAggregator.build({
      controlPassRate: 10,
      incidentPenalty: 50,
      exceptionPenalty: 30,
    });
    expect(s.postureScore).toBe(0); // Negative clamped
  });

  it('build - openIncidents = round(incidentPenalty / 5)', () => {
    const s = postureAggregator.build({
      controlPassRate: 100,
      incidentPenalty: 25,
      exceptionPenalty: 10,
    });
    expect(s.openIncidents).toBe(5); // 25/5
  });

  it('build - overdueExceptions = round(exceptionPenalty / 2)', () => {
    const s = postureAggregator.build({
      controlPassRate: 100,
      incidentPenalty: 0,
      exceptionPenalty: 8,
    });
    expect(s.overdueExceptions).toBe(4); // 8/2
  });

  it('build - snapshotId prefix "posture-" + timestamp', () => {
    const s = postureAggregator.build({ controlPassRate: 100, incidentPenalty: 0, exceptionPenalty: 0 });
    expect(s.snapshotId.startsWith('posture-')).toBe(true);
    expect(s.timestamp).toBeGreaterThan(0);
  });
});

describe('PostureStreamPublisher', () => {
  it('publish - event "compliance.posture.updated" + payload passthrough', () => {
    const snapshot = postureAggregator.build({ controlPassRate: 90, incidentPenalty: 0, exceptionPenalty: 0 });
    const r = postureStreamPublisher.publish(snapshot);
    expect(r.event).toBe('compliance.posture.updated');
    expect(r.payload).toBe(snapshot);
  });
});

describe('PostureThresholdEvaluator', () => {
  it('evaluate - score ≥85 → green + actionRequired false', () => {
    expect(postureThresholdEvaluator.evaluate(85)).toEqual({ status: 'green', actionRequired: false });
    expect(postureThresholdEvaluator.evaluate(95)).toEqual({ status: 'green', actionRequired: false });
  });

  it('evaluate - 70 ≤ score < 85 → amber + actionRequired true', () => {
    expect(postureThresholdEvaluator.evaluate(70)).toEqual({ status: 'amber', actionRequired: true });
    expect(postureThresholdEvaluator.evaluate(80)).toEqual({ status: 'amber', actionRequired: true });
    expect(postureThresholdEvaluator.evaluate(84.99)).toEqual({ status: 'amber', actionRequired: true });
  });

  it('evaluate - score < 70 → red + actionRequired true', () => {
    expect(postureThresholdEvaluator.evaluate(69)).toEqual({ status: 'red', actionRequired: true });
    expect(postureThresholdEvaluator.evaluate(0)).toEqual({ status: 'red', actionRequired: true });
  });
});

describe('PostureAPISerializer', () => {
  it('toJson - JSON.stringify snapshot', () => {
    const snapshot = postureAggregator.build({ controlPassRate: 90, incidentPenalty: 0, exceptionPenalty: 0 });
    const json = postureApiSerializer.toJson(snapshot);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('toPublicView - score + openIncidents + overdueExceptions + updatedAt (no snapshotId)', () => {
    const snapshot = postureAggregator.build({ controlPassRate: 90, incidentPenalty: 5, exceptionPenalty: 4 });
    const view = postureApiSerializer.toPublicView(snapshot);
    expect(view).toHaveProperty('score');
    expect(view).toHaveProperty('openIncidents');
    expect(view).toHaveProperty('overdueExceptions');
    expect(view).toHaveProperty('updatedAt');
    expect((view as any).snapshotId).toBeUndefined(); // internal field hidden
  });
});
