/**
 * Phase 189: Real-Time Compliance Posture API
 */

import { logger } from '../logger';

export interface PostureSnapshot {
  snapshotId: string;
  postureScore: number;
  openIncidents: number;
  overdueExceptions: number;
  timestamp: number;
}

class PostureAggregator {
  build(input: { controlPassRate: number; incidentPenalty: number; exceptionPenalty: number }): PostureSnapshot {
    const postureScore = Math.max(0, Math.round((input.controlPassRate - input.incidentPenalty - input.exceptionPenalty) * 10) / 10);
    return {
      snapshotId: `posture-${Date.now()}`,
      postureScore,
      openIncidents: Math.round(input.incidentPenalty / 5),
      overdueExceptions: Math.round(input.exceptionPenalty / 2),
      timestamp: Date.now()
    };
  }
}

class PostureStreamPublisher {
  publish(snapshot: PostureSnapshot): { event: string; payload: PostureSnapshot } {
    logger.debug('Posture snapshot published', { snapshotId: snapshot.snapshotId, score: snapshot.postureScore });
    return { event: 'compliance.posture.updated', payload: snapshot };
  }
}

class PostureThresholdEvaluator {
  evaluate(score: number): { status: 'green' | 'amber' | 'red'; actionRequired: boolean } {
    if (score >= 85) return { status: 'green', actionRequired: false };
    if (score >= 70) return { status: 'amber', actionRequired: true };
    return { status: 'red', actionRequired: true };
  }
}

class PostureAPISerializer {
  toJson(snapshot: PostureSnapshot): string {
    return JSON.stringify(snapshot);
  }

  toPublicView(snapshot: PostureSnapshot) {
    return {
      score: snapshot.postureScore,
      openIncidents: snapshot.openIncidents,
      overdueExceptions: snapshot.overdueExceptions,
      updatedAt: snapshot.timestamp
    };
  }
}

export const postureAggregator = new PostureAggregator();
export const postureStreamPublisher = new PostureStreamPublisher();
export const postureThresholdEvaluator = new PostureThresholdEvaluator();
export const postureApiSerializer = new PostureAPISerializer();

export type {
  PostureAggregator,
  PostureStreamPublisher,
  PostureThresholdEvaluator,
  PostureAPISerializer
};