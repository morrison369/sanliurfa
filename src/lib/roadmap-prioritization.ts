/**
 * Phase 199: Roadmap Prioritization
 * Feature request management, prioritization scoring, roadmap planning, impact estimation
 */

import { logger } from './logger';

interface FeatureRequest {
  requestId: string;
  title: string;
  description: string;
  requestedBy: string;
  customerSegment: string;
  votes: number;
  revenueImpact: number;
  effortPoints: number;
  strategicAlignment: number; // 0-10
  status: 'submitted' | 'under_review' | 'planned' | 'in_progress' | 'delivered' | 'rejected';
  priorityScore: number;
  submittedAt: number;
  updatedAt: number;
  tags: string[];
}

interface PrioritizationScore {
  requestId: string;
  riceScore: number; // Reach × Impact × Confidence / Effort
  reach: number;
  impact: number;
  confidence: number;
  effort: number;
  strategicBonus: number;
  finalScore: number;
}

interface RoadmapItem {
  itemId: string;
  requestId: string;
  quarter: string;
  teamOwner: string;
  estimatedDeliveryDate: number;
  status: 'backlog' | 'planned' | 'in_progress' | 'shipped';
  dependencies: string[];
  createdAt: number;
}

interface ImpactEstimate {
  estimateId: string;
  requestId: string;
  revenueUplift: number;
  retentionImprovementPct: number;
  acquisitionImprovementPct: number;
  npsImpact: number;
  confidence: 'low' | 'medium' | 'high';
  estimatedAt: number;
}

class FeatureRequestManager {
  private requests: Map<string, FeatureRequest> = new Map();
  private counter = 0;

  submit(title: string, description: string, requestedBy: string, customerSegment: string, revenueImpact: number, effortPoints: number, strategicAlignment: number, tags: string[] = []): FeatureRequest {
    const requestId = `req-${Date.now()}-${++this.counter}`;
    const priorityScore = (revenueImpact / Math.max(1, effortPoints)) * (strategicAlignment / 10);
    const request: FeatureRequest = {
      requestId, title, description, requestedBy, customerSegment,
      votes: 1, revenueImpact, effortPoints,
      strategicAlignment: Math.max(0, Math.min(10, strategicAlignment)),
      status: 'submitted', priorityScore, tags,
      submittedAt: Date.now(), updatedAt: Date.now()
    };
    this.requests.set(requestId, request);
    logger.debug('Feature request submitted', { requestId, title, priorityScore: priorityScore.toFixed(2) });
    return request;
  }

  vote(requestId: string): number {
    const req = this.requests.get(requestId);
    if (req) { req.votes++; req.updatedAt = Date.now(); return req.votes; }
    return 0;
  }

  updateStatus(requestId: string, status: FeatureRequest['status']): boolean {
    const req = this.requests.get(requestId);
    if (req) { req.status = status; req.updatedAt = Date.now(); return true; }
    return false;
  }

  getByStatus(status: FeatureRequest['status']): FeatureRequest[] {
    return Array.from(this.requests.values()).filter(r => r.status === status);
  }

  getTopRequested(limit = 10): FeatureRequest[] {
    return Array.from(this.requests.values())
      .filter(r => r.status !== 'rejected' && r.status !== 'delivered')
      .sort((a, b) => b.votes - a.votes)
      .slice(0, limit);
  }
}

class PrioritizationScorer {
  score(requestId: string, reach: number, impact: number, confidence: number, effort: number, strategicAlignment: number): PrioritizationScore {
    const riceScore = effort > 0 ? (reach * impact * (confidence / 100)) / effort : 0;
    const strategicBonus = strategicAlignment * 10;
    const finalScore = riceScore + strategicBonus;
    return { requestId, riceScore, reach, impact, confidence, effort, strategicBonus, finalScore };
  }

  rankRequests(requests: Array<{ requestId: string; reach: number; impact: number; confidence: number; effort: number; strategicAlignment: number }>): PrioritizationScore[] {
    return requests
      .map(r => this.score(r.requestId, r.reach, r.impact, r.confidence, r.effort, r.strategicAlignment))
      .sort((a, b) => b.finalScore - a.finalScore);
  }

  getQuickWins(scores: PrioritizationScore[], effortThreshold = 3): PrioritizationScore[] {
    return scores.filter(s => s.effort <= effortThreshold && s.impact >= 3).sort((a, b) => b.finalScore - a.finalScore);
  }
}

class RoadmapPlanner {
  private items: Map<string, RoadmapItem> = new Map();
  private counter = 0;

  plan(requestId: string, quarter: string, teamOwner: string, estimatedDeliveryDays: number, dependencies: string[] = []): RoadmapItem {
    const itemId = `roadmap-${Date.now()}-${++this.counter}`;
    const item: RoadmapItem = {
      itemId, requestId, quarter, teamOwner,
      estimatedDeliveryDate: Date.now() + estimatedDeliveryDays * 86400000,
      status: 'planned', dependencies, createdAt: Date.now()
    };
    this.items.set(itemId, item);
    logger.debug('Roadmap item planned', { itemId, requestId, quarter, teamOwner });
    return item;
  }

  advance(itemId: string, status: RoadmapItem['status']): boolean {
    const item = this.items.get(itemId);
    if (item) { item.status = status; return true; }
    return false;
  }

  getQuarterItems(quarter: string): RoadmapItem[] {
    return Array.from(this.items.values()).filter(i => i.quarter === quarter);
  }

  getCapacityByTeam(quarter: string): Record<string, number> {
    const items = this.getQuarterItems(quarter);
    const capacity: Record<string, number> = {};
    for (const item of items) {
      capacity[item.teamOwner] = (capacity[item.teamOwner] || 0) + 1;
    }
    return capacity;
  }

  getBlockedItems(): RoadmapItem[] {
    const allIds = new Set(Array.from(this.items.keys()));
    return Array.from(this.items.values()).filter(item =>
      item.dependencies.some(dep => {
        const depItem = Array.from(this.items.values()).find(i => i.itemId === dep);
        return depItem && depItem.status !== 'shipped';
      })
    );
  }
}

class ImpactEstimator {
  private estimates: Map<string, ImpactEstimate> = new Map();
  private counter = 0;

  estimate(requestId: string, revenueUplift: number, retentionPct: number, acquisitionPct: number, npsImpact: number, confidence: ImpactEstimate['confidence']): ImpactEstimate {
    const estimateId = `impact-${Date.now()}-${++this.counter}`;
    const estimate: ImpactEstimate = {
      estimateId, requestId, revenueUplift,
      retentionImprovementPct: retentionPct,
      acquisitionImprovementPct: acquisitionPct,
      npsImpact, confidence, estimatedAt: Date.now()
    };
    this.estimates.set(requestId, estimate);
    logger.debug('Impact estimated', { estimateId, requestId, revenueUplift, confidence });
    return estimate;
  }

  getTotalEstimatedRevenue(): number {
    return Array.from(this.estimates.values()).reduce((s, e) => s + e.revenueUplift, 0);
  }

  getHighConfidenceEstimates(): ImpactEstimate[] {
    return Array.from(this.estimates.values()).filter(e => e.confidence === 'high');
  }

  getEstimate(requestId: string): ImpactEstimate | undefined {
    return this.estimates.get(requestId);
  }
}

export const featureRequestManager = new FeatureRequestManager();
export const prioritizationScorer = new PrioritizationScorer();
export const roadmapPlanner = new RoadmapPlanner();
export const impactEstimator = new ImpactEstimator();

export { FeatureRequest, PrioritizationScore, RoadmapItem, ImpactEstimate };
