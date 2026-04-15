/**
 * Phase 324: Customer Journey Intelligence
 * Touchpoint mapping, path analysis, friction detection, journey optimization
 */

import { logger } from './logger';

interface TouchpointRecord {
  touchpointId: string;
  customerId: string;
  sessionId: string;
  channel: string;
  touchpointType: 'awareness' | 'consideration' | 'intent' | 'purchase' | 'retention' | 'advocacy';
  action: string;                   // e.g. 'page_view', 'form_submit', 'chat_start'
  page?: string;
  durationSeconds: number;
  isConverted: boolean;
  sentiment: 'positive' | 'neutral' | 'negative';
  deviceType: 'desktop' | 'mobile' | 'tablet';
  timestamp: number;
}

interface JourneyPathRecord {
  pathId: string;
  customerId: string;
  journeyStarted: number;
  journeyCompleted?: number;
  daysToConvert?: number;
  isConverted: boolean;
  touchpointCount: number;
  channelSequence: string[];
  uniqueChannels: number;
  conversionValue?: number;
  frictionPoints: string[];
  dropOffStage?: string;
  pathPattern: string;              // e.g. 'organic→email→direct'
  createdAt: number;
}

interface FrictionPointRecord {
  frictionId: string;
  stage: string;
  frictionType: 'high_drop_off' | 'long_dwell_time' | 'repeated_visits' | 'rage_clicks' | 'error_encounter' | 'form_abandonment';
  affectedPage?: string;
  affectedChannel?: string;
  dropOffRatePct: number;
  avgDwellSeconds: number;
  occurrenceCount: number;
  estimatedRevenueLossUSD: number;
  priorityScore: number;
  recommendedFix: string;
  detectedAt: number;
}

interface JourneyOptimizationRecord {
  optimizationId: string;
  targetSegment: string;
  currentConversionRatePct: number;
  projectedConversionRatePct: number;
  conversionLiftPct: number;
  recommendations: { action: string; stage: string; expectedImpact: string; effort: 'low' | 'medium' | 'high' }[];
  estimatedRevenueImpactUSD: number;
  topFrictionPoints: string[];
  bestPerformingPaths: string[];
  generatedAt: number;
}

class JourneyTracker {
  private touchpoints: TouchpointRecord[] = [];
  private journeys: Map<string, JourneyPathRecord> = new Map();
  private tpCounter = 0;
  private jpCounter = 0;

  recordTouchpoint(customerId: string, sessionId: string, channel: string, type: TouchpointRecord['touchpointType'], action: string, durationSec: number, device: TouchpointRecord['deviceType'], sentiment: TouchpointRecord['sentiment'] = 'neutral', page?: string, isConverted = false): TouchpointRecord {
    const touchpointId = `tp-${Date.now()}-${++this.tpCounter}`;
    const record: TouchpointRecord = {
      touchpointId, customerId, sessionId, channel, touchpointType: type,
      action, page, durationSeconds: durationSec, isConverted, sentiment, deviceType: device, timestamp: Date.now()
    };
    this.touchpoints.push(record);

    // Update journey
    const journey = this.journeys.get(customerId);
    if (journey) {
      journey.touchpointCount++;
      if (!journey.channelSequence.includes(channel)) journey.uniqueChannels++;
      journey.channelSequence.push(channel);
      journey.pathPattern = journey.channelSequence.join('→');
      if (isConverted) { journey.isConverted = true; journey.journeyCompleted = Date.now(); journey.daysToConvert = Math.round((Date.now() - journey.journeyStarted) / 86400000 * 10) / 10; }
    } else {
      const pathId = `journey-${Date.now()}-${++this.jpCounter}`;
      this.journeys.set(customerId, {
        pathId, customerId, journeyStarted: Date.now(), isConverted,
        touchpointCount: 1, channelSequence: [channel], uniqueChannels: 1,
        frictionPoints: [], pathPattern: channel, createdAt: Date.now()
      });
    }
    return record;
  }

  getCustomerJourney(customerId: string): JourneyPathRecord | undefined {
    return this.journeys.get(customerId);
  }

  getCustomerTouchpoints(customerId: string): TouchpointRecord[] {
    return this.touchpoints.filter(t => t.customerId === customerId).sort((a, b) => a.timestamp - b.timestamp);
  }

  getConversionRate(): number {
    const total = this.journeys.size;
    const converted = Array.from(this.journeys.values()).filter(j => j.isConverted).length;
    return total > 0 ? Math.round((converted / total) * 100 * 10) / 10 : 0;
  }

  getAverageTouchpointsToConvert(): number {
    const converted = Array.from(this.journeys.values()).filter(j => j.isConverted);
    return converted.length > 0 ? Math.round(converted.reduce((s, j) => s + j.touchpointCount, 0) / converted.length * 10) / 10 : 0;
  }

  getAllJourneys(): JourneyPathRecord[] {
    return Array.from(this.journeys.values());
  }
}

class FrictionDetector {
  private frictions: FrictionPointRecord[] = [];
  private counter = 0;

  detect(stage: string, type: FrictionPointRecord['frictionType'], dropOffRatePct: number, avgDwellSec: number, occurrences: number, revenueLoss: number, fix: string, page?: string, channel?: string): FrictionPointRecord {
    const frictionId = `friction-${Date.now()}-${++this.counter}`;
    // Priority: weighted by drop-off rate and revenue loss
    const priorityScore = Math.min(100, Math.round(dropOffRatePct * 0.5 + Math.log10(Math.max(1, revenueLoss)) * 10));
    const record: FrictionPointRecord = {
      frictionId, stage, frictionType: type, affectedPage: page, affectedChannel: channel,
      dropOffRatePct, avgDwellSeconds: avgDwellSec, occurrenceCount: occurrences,
      estimatedRevenueLossUSD: revenueLoss, priorityScore, recommendedFix: fix, detectedAt: Date.now()
    };
    this.frictions.push(record);
    logger.debug('Friction point detected', { frictionId, stage, type, dropOffRatePct });
    return record;
  }

  getTopFrictions(limit = 5): FrictionPointRecord[] {
    return [...this.frictions].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, limit);
  }

  getTotalRevenueLoss(): number {
    return this.frictions.reduce((s, f) => s + f.estimatedRevenueLossUSD, 0);
  }

  getByStage(stage: string): FrictionPointRecord[] {
    return this.frictions.filter(f => f.stage === stage);
  }
}

class PathAnalyzer {
  analyze(journeys: JourneyPathRecord[]): { pattern: string; count: number; conversionRate: number; avgTouchpoints: number }[] {
    const patternMap = new Map<string, { total: number; converted: number; touchpoints: number }>();
    journeys.forEach(j => {
      const pattern = j.pathPattern || 'direct';
      const existing = patternMap.get(pattern) || { total: 0, converted: 0, touchpoints: 0 };
      existing.total++;
      if (j.isConverted) existing.converted++;
      existing.touchpoints += j.touchpointCount;
      patternMap.set(pattern, existing);
    });

    return Array.from(patternMap.entries())
      .map(([pattern, data]) => ({
        pattern,
        count: data.total,
        conversionRate: data.total > 0 ? Math.round((data.converted / data.total) * 100 * 10) / 10 : 0,
        avgTouchpoints: data.total > 0 ? Math.round((data.touchpoints / data.total) * 10) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  getBestConvertingPaths(journeys: JourneyPathRecord[], minCount = 2): string[] {
    return this.analyze(journeys)
      .filter(p => p.count >= minCount)
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .slice(0, 3)
      .map(p => p.pattern);
  }
}

class JourneyOptimizer {
  private optimizations: JourneyOptimizationRecord[] = [];
  private counter = 0;

  optimize(segment: string, journeys: JourneyPathRecord[], frictions: FrictionPointRecord[], avgOrderValue: number): JourneyOptimizationRecord {
    const optimizationId = `jopt-${Date.now()}-${++this.counter}`;
    const total = journeys.length;
    const converted = journeys.filter(j => j.isConverted).length;
    const currentRate = total > 0 ? Math.round((converted / total) * 100 * 10) / 10 : 0;

    const topFrictions = [...frictions].sort((a, b) => b.priorityScore - a.priorityScore).slice(0, 3);
    const recs: JourneyOptimizationRecord['recommendations'] = topFrictions.map(f => ({
      action: f.recommendedFix, stage: f.stage,
      expectedImpact: `Reduce ${f.stage} drop-off by ~${Math.round(f.dropOffRatePct * 0.3)}%`,
      effort: f.dropOffRatePct > 40 ? 'high' : f.dropOffRatePct > 20 ? 'medium' : 'low'
    }));

    const projectedLift = Math.min(30, topFrictions.reduce((s, f) => s + f.dropOffRatePct * 0.1, 0));
    const projectedRate = Math.min(100, Math.round((currentRate * (1 + projectedLift / 100)) * 10) / 10);
    const revenueImpact = Math.round((projectedRate - currentRate) / 100 * total * avgOrderValue);

    const pathAnalyzer = new PathAnalyzer();
    const bestPaths = pathAnalyzer.getBestConvertingPaths(journeys);

    const record: JourneyOptimizationRecord = {
      optimizationId, targetSegment: segment, currentConversionRatePct: currentRate,
      projectedConversionRatePct: projectedRate, conversionLiftPct: Math.round(projectedLift * 10) / 10,
      recommendations: recs, estimatedRevenueImpactUSD: revenueImpact,
      topFrictionPoints: topFrictions.map(f => f.frictionType),
      bestPerformingPaths: bestPaths, generatedAt: Date.now()
    };
    this.optimizations.push(record);
    return record;
  }

  getLatest(): JourneyOptimizationRecord | undefined {
    return this.optimizations[this.optimizations.length - 1];
  }
}

export const journeyTracker = new JourneyTracker();
export const frictionDetector = new FrictionDetector();
export const pathAnalyzer = new PathAnalyzer();
export const journeyOptimizer = new JourneyOptimizer();

export { TouchpointRecord, JourneyPathRecord, FrictionPointRecord, JourneyOptimizationRecord };
