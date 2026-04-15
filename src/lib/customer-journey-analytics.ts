/**
 * Phase 216: Customer Journey Analytics
 * Journey mapping, stage progression, drop-off analysis, journey optimization
 */

import { logger } from './logger';

interface JourneyStage {
  stageId: string;
  name: string;
  order: number;
  avgDurationMs: number;
  completionRate: number;
  dropoffRate: number;
  entryCount: number;
  exitCount: number;
  createdAt: number;
}

interface CustomerJourney {
  journeyId: string;
  customerId: string;
  journeyType: string;
  currentStage: string;
  startedAt: number;
  completedAt?: number;
  stageHistory: Array<{ stage: string; enteredAt: number; exitedAt?: number }>;
  status: 'active' | 'completed' | 'abandoned';
  totalDurationMs: number;
}

interface JourneyDropOff {
  dropOffId: string;
  journeyType: string;
  fromStage: string;
  toStage: string;
  dropOffCount: number;
  dropOffRate: number;
  avgTimeAtStageMs: number;
  topReasons: string[];
  detectedAt: number;
}

interface JourneyOptimizationSuggestion {
  suggestionId: string;
  journeyType: string;
  targetStage: string;
  type: 'reduce_friction' | 'personalize' | 'accelerate' | 'recover';
  description: string;
  expectedImprovementPct: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  createdAt: number;
}

class JourneyStageMapper {
  private stages: Map<string, Map<string, JourneyStage>> = new Map();
  private counter = 0;

  defineStage(journeyType: string, name: string, order: number): JourneyStage {
    const stageId = `stage-${Date.now()}-${++this.counter}`;
    const stage: JourneyStage = {
      stageId, name, order,
      avgDurationMs: 0, completionRate: 0, dropoffRate: 0,
      entryCount: 0, exitCount: 0, createdAt: Date.now()
    };
    const typeMap = this.stages.get(journeyType) || new Map();
    typeMap.set(name, stage);
    this.stages.set(journeyType, typeMap);
    logger.debug('Journey stage defined', { journeyType, name, order });
    return stage;
  }

  recordEntry(journeyType: string, stageName: string): void {
    const stage = this.stages.get(journeyType)?.get(stageName);
    if (stage) stage.entryCount++;
  }

  recordExit(journeyType: string, stageName: string, durationMs: number, completed: boolean): void {
    const stage = this.stages.get(journeyType)?.get(stageName);
    if (!stage) return;
    stage.exitCount++;
    const prev = stage.exitCount - 1;
    stage.avgDurationMs = (stage.avgDurationMs * prev + durationMs) / stage.exitCount;
    stage.completionRate = (stage.completionRate * prev + (completed ? 100 : 0)) / stage.exitCount;
    stage.dropoffRate = 100 - stage.completionRate;
  }

  getStages(journeyType: string): JourneyStage[] {
    return Array.from(this.stages.get(journeyType)?.values() || [])
      .sort((a, b) => a.order - b.order);
  }

  getHighDropoffStages(journeyType: string, threshold = 40): JourneyStage[] {
    return this.getStages(journeyType).filter(s => s.dropoffRate >= threshold);
  }
}

class CustomerJourneyTracker {
  private journeys: Map<string, CustomerJourney> = new Map();
  private counter = 0;

  start(customerId: string, journeyType: string, firstStage: string): CustomerJourney {
    const journeyId = `journey-${Date.now()}-${++this.counter}`;
    const journey: CustomerJourney = {
      journeyId, customerId, journeyType,
      currentStage: firstStage, startedAt: Date.now(),
      stageHistory: [{ stage: firstStage, enteredAt: Date.now() }],
      status: 'active', totalDurationMs: 0
    };
    this.journeys.set(journeyId, journey);
    return journey;
  }

  advance(journeyId: string, nextStage: string): boolean {
    const journey = this.journeys.get(journeyId);
    if (!journey || journey.status !== 'active') return false;
    const last = journey.stageHistory[journey.stageHistory.length - 1];
    if (last) last.exitedAt = Date.now();
    journey.currentStage = nextStage;
    journey.stageHistory.push({ stage: nextStage, enteredAt: Date.now() });
    return true;
  }

  complete(journeyId: string): boolean {
    const journey = this.journeys.get(journeyId);
    if (!journey) return false;
    journey.status = 'completed';
    journey.completedAt = Date.now();
    journey.totalDurationMs = journey.completedAt - journey.startedAt;
    logger.debug('Journey completed', { journeyId, totalDurationMs: journey.totalDurationMs });
    return true;
  }

  abandon(journeyId: string): boolean {
    const journey = this.journeys.get(journeyId);
    if (!journey) return false;
    journey.status = 'abandoned';
    journey.totalDurationMs = Date.now() - journey.startedAt;
    return true;
  }

  getJourney(journeyId: string): CustomerJourney | undefined {
    return this.journeys.get(journeyId);
  }

  getActiveJourneys(journeyType?: string): CustomerJourney[] {
    return Array.from(this.journeys.values())
      .filter(j => j.status === 'active' && (!journeyType || j.journeyType === journeyType));
  }

  getCompletionRate(journeyType: string): number {
    const all = Array.from(this.journeys.values()).filter(j => j.journeyType === journeyType);
    if (!all.length) return 0;
    return (all.filter(j => j.status === 'completed').length / all.length) * 100;
  }
}

class JourneyDropOffAnalyzer {
  private dropOffs: Map<string, JourneyDropOff> = new Map();
  private counter = 0;

  record(journeyType: string, fromStage: string, toStage: string, timeAtStageMs: number, reason?: string): JourneyDropOff {
    const key = `${journeyType}:${fromStage}`;
    const existing = this.dropOffs.get(key);
    if (existing) {
      const prev = existing.dropOffCount;
      existing.dropOffCount++;
      existing.avgTimeAtStageMs = (existing.avgTimeAtStageMs * prev + timeAtStageMs) / existing.dropOffCount;
      if (reason && !existing.topReasons.includes(reason)) existing.topReasons.push(reason);
      return existing;
    }
    const dropOffId = `dropoff-${Date.now()}-${++this.counter}`;
    const dropOff: JourneyDropOff = {
      dropOffId, journeyType, fromStage, toStage,
      dropOffCount: 1, dropOffRate: 0, avgTimeAtStageMs: timeAtStageMs,
      topReasons: reason ? [reason] : [], detectedAt: Date.now()
    };
    this.dropOffs.set(key, dropOff);
    return dropOff;
  }

  updateDropOffRates(journeyType: string, totalEntries: number): void {
    for (const dropOff of this.dropOffs.values()) {
      if (dropOff.journeyType === journeyType && totalEntries > 0) {
        dropOff.dropOffRate = (dropOff.dropOffCount / totalEntries) * 100;
      }
    }
  }

  getTopDropOffs(journeyType: string, limit = 5): JourneyDropOff[] {
    return Array.from(this.dropOffs.values())
      .filter(d => d.journeyType === journeyType)
      .sort((a, b) => b.dropOffCount - a.dropOffCount)
      .slice(0, limit);
  }

  getCriticalDropOffs(threshold = 30): JourneyDropOff[] {
    return Array.from(this.dropOffs.values())
      .filter(d => d.dropOffRate >= threshold)
      .sort((a, b) => b.dropOffRate - a.dropOffRate);
  }
}

class JourneyOptimizationEngine {
  private suggestions: Map<string, JourneyOptimizationSuggestion> = new Map();
  private counter = 0;

  suggest(journeyType: string, targetStage: string, type: JourneyOptimizationSuggestion['type'], description: string, expectedImprovementPct: number): JourneyOptimizationSuggestion {
    const suggestionId = `jopt-${Date.now()}-${++this.counter}`;
    const priority: JourneyOptimizationSuggestion['priority'] =
      expectedImprovementPct >= 30 ? 'critical' :
      expectedImprovementPct >= 20 ? 'high' :
      expectedImprovementPct >= 10 ? 'medium' : 'low';

    const suggestion: JourneyOptimizationSuggestion = {
      suggestionId, journeyType, targetStage, type, description,
      expectedImprovementPct, priority, createdAt: Date.now()
    };
    this.suggestions.set(suggestionId, suggestion);
    logger.debug('Journey optimization suggested', { journeyType, targetStage, type, priority });
    return suggestion;
  }

  getTopSuggestions(journeyType: string, limit = 5): JourneyOptimizationSuggestion[] {
    return Array.from(this.suggestions.values())
      .filter(s => s.journeyType === journeyType)
      .sort((a, b) => b.expectedImprovementPct - a.expectedImprovementPct)
      .slice(0, limit);
  }

  getByType(type: JourneyOptimizationSuggestion['type']): JourneyOptimizationSuggestion[] {
    return Array.from(this.suggestions.values()).filter(s => s.type === type);
  }

  getSuggestion(suggestionId: string): JourneyOptimizationSuggestion | undefined {
    return this.suggestions.get(suggestionId);
  }
}

export const journeyStageMapper = new JourneyStageMapper();
export const customerJourneyTracker = new CustomerJourneyTracker();
export const journeyDropOffAnalyzer = new JourneyDropOffAnalyzer();
export const journeyOptimizationEngine = new JourneyOptimizationEngine();

export { JourneyStage, CustomerJourney, JourneyDropOff, JourneyOptimizationSuggestion };
