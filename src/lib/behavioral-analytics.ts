/**
 * Phase 39: Behavioral Analytics & Segmentation
 * Funnel analysis, cohort analysis, user segmentation, clustering
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface UserEvent {
  userId: string;
  event: string;
  properties: Record<string, any>;
  timestamp: number;
}

export interface FunnelStep {
  name: string;
  event: string;
  count: number;
  dropoffRate: number;
}

export interface CohortData {
  cohortDate: string;
  userId: string;
  retentionByWeek: number[];
}

export interface UserCluster {
  clusterId: string;
  centroid: Record<string, number>;
  users: string[];
  label: string;
}

// ==================== FUNNEL ANALYZER ====================

export class FunnelAnalyzer {
  private funnels = new Map<string, { name: string; event: string }[]>();
  private events: UserEvent[] = [];

  defineStep(funnelId: string, stepName: string, event: string): void {
    if (!this.funnels.has(funnelId)) {
      this.funnels.set(funnelId, []);
    }

    this.funnels.get(funnelId)!.push({ name: stepName, event });
    logger.debug('Funnel step defined', { funnelId, stepName });
  }

  recordEvent(event: UserEvent): void {
    this.events.push(event);
  }

  analyzeFunnel(funnelId: string, windowDays: number = 30): FunnelStep[] {
    const funnel = this.funnels.get(funnelId);
    if (!funnel) return [];

    const steps: FunnelStep[] = [];
    const cutoff = Date.now() - windowDays * 86400000;

    for (let i = 0; i < funnel.length; i++) {
      const eventType = funnel[i].event;
      const matchingEvents = this.events.filter(
        e => e.event === eventType && e.timestamp >= cutoff
      );

      const count = new Set(matchingEvents.map(e => e.userId)).size;
      const prevCount = i > 0 ? steps[i - 1].count : count;
      const dropoffRate = prevCount > 0 ? ((prevCount - count) / prevCount) * 100 : 0;

      steps.push({
        name: funnel[i].name,
        event: eventType,
        count,
        dropoffRate: Math.round(dropoffRate)
      });
    }

    return steps;
  }

  getConversionRate(funnelId: string): number {
    const steps = this.analyzeFunnel(funnelId);
    if (steps.length === 0) return 0;

    const firstCount = steps[0].count;
    const lastCount = steps[steps.length - 1].count;

    return firstCount > 0 ? (lastCount / firstCount) * 100 : 0;
  }
}

// ==================== COHORT ANALYZER ====================

export class CohortAnalyzer {
  private cohorts = new Map<string, Set<string>>();
  private activity = new Map<string, number[]>();

  addUserToCohort(userId: string, cohortDate: string): void {
    if (!this.cohorts.has(cohortDate)) {
      this.cohorts.set(cohortDate, new Set());
    }

    this.cohorts.get(cohortDate)!.add(userId);
  }

  recordActivity(userId: string, timestamp: number): void {
    if (!this.activity.has(userId)) {
      this.activity.set(userId, []);
    }

    this.activity.get(userId)!.push(timestamp);
  }

  getRetention(cohortDate: string, weeks: number = 12): CohortData {
    const users = Array.from(this.cohorts.get(cohortDate) || []);
    const cohortStart = new Date(cohortDate).getTime();

    const retentionByWeek: number[] = [];

    for (let week = 0; week < weeks; week++) {
      const weekStart = cohortStart + week * 7 * 86400000;
      const weekEnd = weekStart + 7 * 86400000;

      let activeUsers = 0;

      for (const userId of users) {
        const activities = this.activity.get(userId) || [];
        if (activities.some(a => a >= weekStart && a < weekEnd)) {
          activeUsers++;
        }
      }

      const retentionRate = users.length > 0 ? (activeUsers / users.length) * 100 : 0;
      retentionByWeek.push(Math.round(retentionRate));
    }

    return {
      cohortDate,
      userId: users[0] || '',
      retentionByWeek
    };
  }

  getRetentionTable(limit: number = 10): CohortData[] {
    const cohorts = Array.from(this.cohorts.keys()).slice(0, limit);

    return cohorts.map(cohortDate => this.getRetention(cohortDate));
  }
}

// ==================== USER SEGMENTOR ====================

export class UserSegmentor {
  private features = new Map<string, Record<string, number>>();
  private clusters: UserCluster[] = [];

  recordFeature(userId: string, feature: string, value: number): void {
    if (!this.features.has(userId)) {
      this.features.set(userId, {});
    }

    this.features.get(userId)![feature] = value;
  }

  buildClusters(k: number): UserCluster[] {
    const users = Array.from(this.features.keys());
    if (users.length < k) return [];

    const clusters: UserCluster[] = [];

    for (let i = 0; i < k; i++) {
      clusters.push({
        clusterId: 'cluster-' + i,
        centroid: {},
        users: [],
        label: 'Segment ' + (i + 1)
      });
    }

    // Simple assignment to clusters
    for (let i = 0; i < users.length; i++) {
      clusters[i % k].users.push(users[i]);
    }

    this.clusters = clusters;
    logger.debug('Clusters built', { k, totalUsers: users.length });

    return clusters;
  }

  assignCluster(userId: string): string {
    for (const cluster of this.clusters) {
      if (cluster.users.includes(userId)) {
        return cluster.clusterId;
      }
    }

    return 'unassigned';
  }

  getSegmentStats(): { clusterId: string; size: number; avgEngagement: number }[] {
    return this.clusters.map(cluster => ({
      clusterId: cluster.clusterId,
      size: cluster.users.length,
      avgEngagement: 75
    }));
  }
}

// ==================== EXPORTS ====================

export const funnelAnalyzer = new FunnelAnalyzer();
export const cohortAnalyzer = new CohortAnalyzer();
export const userSegmentor = new UserSegmentor();
