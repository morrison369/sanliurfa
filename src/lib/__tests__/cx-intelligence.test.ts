/**
 * Tests: Phase 215-220 — Advanced Customer Experience Intelligence
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  feedbackCollector, vocAnalyzer, customerInsightManager, vocDashboardAggregator,
  journeyStageMapper, customerJourneyTracker, journeyDropOffAnalyzer, journeyOptimizationEngine,
  cxScoreCalculator, experienceIndexManager, momentOfTruthTracker, experienceBenchmarker,
  touchpointMapper, channelPerformanceTracker, journeyOrchestrationAnalyzer, touchpointInfluenceCalculator,
  feedbackTopicExtractor, issueClusteringEngine, feedbackPriorityRanker, closedLoopTracker,
  cxMetricForecaster, churnRiskPredictor, customerValueForecaster, experienceImpactModeler
} from '../index';

// Phase 215: Voice of Customer
describe('Phase 215 — Voice of Customer', () => {
  it('collects feedback and infers sentiment from score', () => {
    const fb = feedbackCollector.collect('cust-1', 'survey', 'Great product, very easy to use', 'platform', 9);
    expect(fb.feedbackId).toMatch(/^voc-/);
    expect(fb.sentiment).toBe('positive');
    expect(fb.customerId).toBe('cust-1');
  });

  it('infers negative sentiment from keywords when no score given', () => {
    const fb = feedbackCollector.collect('cust-2', 'chat', 'This is terrible and broken', 'support');
    expect(fb.sentiment).toBe('negative');
    expect(fb.topics).toContain('reliability');
  });

  it('analyzes feedback themes and returns VoC insights', () => {
    const f1 = feedbackCollector.collect('c1', 'email', 'It is slow and has latency issues', 'api');
    const f2 = feedbackCollector.collect('c2', 'chat', 'Performance is slow needs speed improvement', 'api');
    const insights = vocAnalyzer.analyze([f1, f2]);
    expect(insights.length).toBeGreaterThan(0);
    const perf = insights.find(i => i.theme === 'performance');
    expect(perf).toBeDefined();
    expect(perf!.frequency).toBe(2);
  });

  it('aggregates VoC dashboard snapshot with response rate', () => {
    const feedbacks = [
      feedbackCollector.collect('c1', 'survey', 'great easy service', 'ux', 8),
      feedbackCollector.collect('c2', 'survey', 'broken and terrible experience', 'support', 2)
    ];
    const snapshot = vocDashboardAggregator.aggregate('2026-Q1', feedbacks, 100);
    expect(snapshot.totalFeedback).toBe(2);
    expect(snapshot.responseRate).toBe(2);
    expect(snapshot.sentimentBreakdown.positive).toBe(1);
    expect(snapshot.sentimentBreakdown.negative).toBe(1);
  });
});

// Phase 216: Customer Journey Analytics
describe('Phase 216 — Customer Journey Analytics', () => {
  it('defines journey stage and records entry/exit', () => {
    const stage = journeyStageMapper.defineStage('onboarding', 'email_verification', 1);
    expect(stage.stageId).toMatch(/^stage-/);
    journeyStageMapper.recordEntry('onboarding', 'email_verification');
    journeyStageMapper.recordExit('onboarding', 'email_verification', 5000, true);
    const stages = journeyStageMapper.getStages('onboarding');
    expect(stages.length).toBeGreaterThan(0);
  });

  it('tracks customer journey through stages', () => {
    const journey = customerJourneyTracker.start('cust-10', 'purchase', 'browsing');
    expect(journey.status).toBe('active');
    customerJourneyTracker.advance(journey.journeyId, 'cart');
    customerJourneyTracker.advance(journey.journeyId, 'checkout');
    customerJourneyTracker.complete(journey.journeyId);
    const completed = customerJourneyTracker.getJourney(journey.journeyId);
    expect(completed!.status).toBe('completed');
    expect(completed!.stageHistory.length).toBe(3);
  });

  it('records drop-offs and finds top drop-off stages', () => {
    journeyDropOffAnalyzer.record('purchase', 'cart', 'checkout', 60000, 'price_shock');
    journeyDropOffAnalyzer.record('purchase', 'cart', 'checkout', 45000, 'complicated_form');
    const topDropOffs = journeyDropOffAnalyzer.getTopDropOffs('purchase');
    expect(topDropOffs.length).toBeGreaterThan(0);
    expect(topDropOffs[0].fromStage).toBe('cart');
    expect(topDropOffs[0].dropOffCount).toBe(2);
  });

  it('suggests journey optimizations with priority', () => {
    const s = journeyOptimizationEngine.suggest('purchase', 'checkout', 'reduce_friction', 'Simplify checkout form', 35);
    expect(s.priority).toBe('critical');
    const suggestions = journeyOptimizationEngine.getTopSuggestions('purchase');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].expectedImprovementPct).toBeGreaterThanOrEqual(35);
  });
});

// Phase 217: Experience Scoring
describe('Phase 217 — Experience Scoring', () => {
  it('records CX scores and calculates weighted composite', () => {
    cxScoreCalculator.record('cust-20', 'ease', 85, 0.3, 'registration');
    cxScoreCalculator.record('cust-20', 'emotion', 70, 0.2, 'registration');
    const composite = cxScoreCalculator.calculateComposite('cust-20');
    expect(composite).toBeGreaterThan(0);
    expect(composite).toBeLessThanOrEqual(100);
  });

  it('calculates experience index with tier and trend', () => {
    const idx = experienceIndexManager.calculate('cust-21', '2026-Q1', { ease: 85, emotion: 80, effectiveness: 90 });
    expect(idx.tier).toBe('excellent');
    expect(idx.compositeScore).toBeCloseTo(85, 0);
  });

  it('records moment of truth with correct impact score', () => {
    const moment = momentOfTruthTracker.record('cust-22', 'payment_page', 'make_or_break', 'failed', 'frustrated');
    expect(moment.impactScore).toBe(-15);  // 10 * -1.5
    const failed = momentOfTruthTracker.getFailedMoments('make_or_break');
    expect(failed.length).toBeGreaterThan(0);
  });

  it('sets benchmarks and performs gap analysis', () => {
    experienceBenchmarker.setBenchmark('saas', 'NPS', 40, 60, 55);
    const gaps = experienceBenchmarker.getGapAnalysis('saas');
    expect(gaps.length).toBeGreaterThan(0);
    const npsGap = gaps.find(g => g.metric === 'NPS');
    expect(npsGap!.status).toBe('on_par');
    expect(npsGap!.gap).toBe(15);
  });
});

// Phase 218: Touchpoint Analytics
describe('Phase 218 — Touchpoint Analytics', () => {
  it('defines touchpoint and records interactions', () => {
    const tp = touchpointMapper.define('Support Chat', 'chat', 'support');
    touchpointMapper.recordInteraction(tp.touchpointId, 4.5, 300, true, false);
    touchpointMapper.recordInteraction(tp.touchpointId, 3.0, 600, false, true);
    const updated = touchpointMapper.getTouchpoint(tp.touchpointId);
    expect(updated!.interactionCount).toBe(2);
    expect(updated!.avgSatisfactionScore).toBeCloseTo(3.75, 1);
  });

  it('records channel performance and finds best channel', () => {
    channelPerformanceTracker.record('chat', '2026-Q1', 500, 4.2, 0.85, 180, 2.5);
    channelPerformanceTracker.record('email', '2026-Q1', 300, 3.8, 0.70, 240, 1.5);
    const best = channelPerformanceTracker.getBestChannel('satisfactionAvg');
    expect(best).toBe('chat');
  });

  it('adds orchestration rules and evaluates triggers', () => {
    journeyOrchestrationAnalyzer.addRule('Post-Purchase Follow-up', 'purchase_complete', 'order_value > 100', 'send_thank_you', 'feedback_survey', 5);
    const matched = journeyOrchestrationAnalyzer.evaluate('purchase_complete', { order_value: 150 });
    expect(matched.length).toBeGreaterThan(0);
    expect(matched[0].triggeredCount).toBe(1);
  });

  it('calculates touchpoint influence scores', () => {
    const infl = touchpointInfluenceCalculator.calculate('tp-001', 0.8, 0.6, 0.7, 'last_touch');
    expect(infl.conversionInfluence).toBe(0.8);
    const top = touchpointInfluenceCalculator.getTopInfluencers('conversionInfluence');
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].conversionInfluence).toBeGreaterThanOrEqual(0.8);
  });
});

// Phase 219: Feedback Intelligence
describe('Phase 219 — Feedback Intelligence', () => {
  it('defines topics and extracts from feedback text', () => {
    feedbackTopicExtractor.defineTopic('pricing', ['expensive', 'cost', 'price', 'cheap']);
    const matched = feedbackTopicExtractor.extract('This is too expensive for what it offers', 3);
    expect(matched).toContain('pricing');
  });

  it('creates issue cluster and resolves it', () => {
    const cluster = issueClusteringEngine.createCluster('Login Failures', 'Auth token expiry bug', ['fb-1', 'fb-2'], 45, 'critical');
    expect(cluster.severity).toBe('critical');
    expect(cluster.status).toBe('open');
    issueClusteringEngine.resolve(cluster.clusterId);
    const updated = issueClusteringEngine.getCluster(cluster.clusterId);
    expect(updated!.status).toBe('resolved');
  });

  it('ranks feedback priority with composite score', () => {
    const item = feedbackPriorityRanker.rank('fb-100', 'cust-50', 90, 80, 'billing');
    expect(item.priorityScore).toBeCloseTo(84, 0);  // 90*0.4 + 80*0.6
    const top = feedbackPriorityRanker.getTopPriority(5);
    expect(top.length).toBeGreaterThan(0);
  });

  it('initiates closed-loop and tracks resolution', () => {
    const loop = closedLoopTracker.initiate('fb-200', 'cust-60', 'email');
    closedLoopTracker.contact(loop.loopId);
    closedLoopTracker.resolve(loop.loopId, 'Issue resolved via refund', true);
    expect(closedLoopTracker.getClosureRate()).toBeGreaterThan(0);
    expect(closedLoopTracker.getSatisfactionRate()).toBeGreaterThan(0);
  });
});

// Phase 220: CX Forecasting
describe('Phase 220 — CX Forecasting', () => {
  it('forecasts CX metric with trend detection', () => {
    cxMetricForecaster.recordDataPoint('NPS', 30);
    cxMetricForecaster.recordDataPoint('NPS', 33);
    cxMetricForecaster.recordDataPoint('NPS', 36);
    cxMetricForecaster.recordDataPoint('NPS', 38);
    const forecast = cxMetricForecaster.forecast('NPS', 90);
    expect(forecast.currentValue).toBe(38);
    expect(forecast.forecastHorizonDays).toBe(90);
    expect(forecast.confidence).toBeGreaterThan(0.5);
  });

  it('predicts churn risk with weighted signals', () => {
    const profile = churnRiskPredictor.predict('cust-70', [
      { factor: 'low_engagement', score: 80, weight: 0.4 },
      { factor: 'support_tickets', score: 70, weight: 0.3 },
      { factor: 'missed_renewal', score: 90, weight: 0.3 }
    ]);
    expect(profile.churnProbability).toBeGreaterThan(0.7);
    expect(profile.riskLevel).toMatch(/critical|high/);
    expect(profile.retentionActions.length).toBeGreaterThan(0);
  });

  it('forecasts customer value across scenarios', () => {
    const forecasts = customerValueForecaster.forecast('cust-80', 50000, [10, 15, 12], 12);
    expect(forecasts.length).toBe(3);
    const base = forecasts.find(f => f.scenario === 'base');
    const optimistic = forecasts.find(f => f.scenario === 'optimistic');
    expect(optimistic!.forecastedAnnualValue).toBeGreaterThan(base!.forecastedAnnualValue);
  });

  it('models experience impact with confidence intervals', () => {
    const model = experienceImpactModeler.model('faster_onboarding', 'retention_rate', [8, 12, 10, 9, 11]);
    expect(model.estimatedImpactPct).toBeCloseTo(10, 0);
    expect(model.confidenceInterval.high).toBeGreaterThan(model.confidenceInterval.low);
    expect(model.sampleSize).toBe(5);
  });
});
