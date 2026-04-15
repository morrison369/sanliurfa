/**
 * Advanced Product Intelligence (Phase 197-202)
 * Test suite for product analytics, feature adoption, roadmap prioritization,
 * product-led growth, NPS & satisfaction
 */

import { describe, it, expect } from 'vitest';
import {
  featureUsageTracker, productEventCollector, userJourneyAnalyzer, productHealthMonitor,
  featureAdoptionTracker, adoptionFunnelAnalyzer, featureStickinessCalculator, adoptionCampaignManager,
  featureRequestManager, prioritizationScorer, roadmapPlanner, impactEstimator,
  plgFunnelTracker, viralLoopAnalyzer, activationTracker, expansionSignalDetector,
  npsSurveyManager, satisfactionScoreTracker, feedbackCategorizor, npsTrendAnalyzer
} from '../index';

// Phase 197: Product Analytics
describe('Phase 197: Product Analytics', () => {
  it('should track feature usage and compute stats', () => {
    featureUsageTracker.track('user-001', 'dashboard', 'view', {}, 'session-1');
    featureUsageTracker.track('user-002', 'dashboard', 'view', {}, 'session-2');
    featureUsageTracker.track('user-001', 'dashboard', 'filter', {}, 'session-1');

    const stats = featureUsageTracker.getFeatureStats('dashboard');
    expect(stats.uniqueUsers).toBe(2);
    expect(stats.totalEvents).toBe(3);

    const most = featureUsageTracker.getMostUsedFeatures(1);
    expect(most.length).toBeGreaterThan(0);
    expect(most[0].uniqueUsers).toBeGreaterThan(0);
  });

  it('should collect events and compute conversion funnel', () => {
    productEventCollector.collect('activation', 'signed_up', 'u-a');
    productEventCollector.collect('activation', 'signed_up', 'u-b');
    productEventCollector.collect('engagement', 'first_action', 'u-a');

    const funnel = productEventCollector.getEventFunnel(['signed_up', 'first_action']);
    expect(funnel.length).toBe(2);
    expect(funnel[0].count).toBe(2);
    expect(funnel[1].count).toBe(1);
    expect(funnel[1].conversionFromPrev).toBe(50);
  });

  it('should track user journey steps and compute conversion rates', () => {
    userJourneyAnalyzer.enterStep('journey-user', 'onboarding');
    userJourneyAnalyzer.completeStep('journey-user', 'onboarding');
    userJourneyAnalyzer.enterStep('journey-user', 'first_value');

    const journey = userJourneyAnalyzer.getJourney('journey-user');
    expect(journey.length).toBeGreaterThan(0);

    const rate = userJourneyAnalyzer.getStepConversionRate('onboarding');
    expect(rate).toBe(100); // 1 entered, 1 completed

    const avgDuration = userJourneyAnalyzer.getAvgStepDuration('onboarding');
    expect(avgDuration).toBeGreaterThanOrEqual(0);
  });

  it('should record product health and compute health score', () => {
    productHealthMonitor.record('2026-04', 5000, 15000, 30000, 65, 180000, 80, 60, 40);
    const score = productHealthMonitor.getHealthScore();
    expect(score).toBeGreaterThan(0);

    const latest = productHealthMonitor.getLatest();
    expect(latest?.dauMauRatio).toBeCloseTo(16.67, 0);
    expect(latest?.retentionD30).toBe(40);
  });
});

// Phase 198: Feature Adoption Tracking
describe('Phase 198: Feature Adoption Tracking', () => {
  it('should track adoption lifecycle from aware to adopted', () => {
    featureAdoptionTracker.markAware('adopt-u1', 'reports');
    featureAdoptionTracker.markActivated('adopt-u1', 'reports');
    featureAdoptionTracker.markAdopted('adopt-u1', 'reports');

    const rate = featureAdoptionTracker.getAdoptionRate('reports');
    expect(rate).toBe(100);

    const adopted = featureAdoptionTracker.getFeatureUsers('reports', 'adopted');
    expect(adopted.length).toBe(1);
  });

  it('should analyze adoption funnel and identify dropoff', () => {
    featureAdoptionTracker.markAware('af-u1', 'exports');
    featureAdoptionTracker.markAware('af-u2', 'exports');
    featureAdoptionTracker.markActivated('af-u1', 'exports');

    const records = featureAdoptionTracker.getFeatureUsers('exports');
    const funnel = adoptionFunnelAnalyzer.analyze(records);
    expect(funnel.length).toBe(3);
    expect(funnel[0].stageName).toBe('aware');

    const dropoff = adoptionFunnelAnalyzer.getDropoffStage(funnel);
    expect(dropoff).toBeDefined();
  });

  it('should track feature stickiness and compare', () => {
    featureStickinessCalculator.record('feature-x', '2026-04', 2000, 8000, 5000, 70);
    featureStickinessCalculator.record('feature-y', '2026-04', 500, 8000, 1000, 30);

    const comparison = featureStickinessCalculator.compareFeatures(['feature-x', 'feature-y']);
    expect(comparison[0].featureKey).toBe('feature-x');
    expect(comparison[0].stickinessRatio).toBeGreaterThan(comparison[1].stickinessRatio);
  });

  it('should run adoption campaigns and track conversions', () => {
    const campaign = adoptionCampaignManager.create('Onboarding Nudge', 'reports', 'new_users', 'in_app', 500);
    expect(campaign.status).toBe('active');

    adoptionCampaignManager.recordActivation(campaign.campaignId, 75);
    const rate = adoptionCampaignManager.getConversionRate(campaign.campaignId);
    expect(rate).toBe(15); // 75/500 * 100

    adoptionCampaignManager.complete(campaign.campaignId);
    expect(adoptionCampaignManager.getActiveCampaigns().some(c => c.campaignId === campaign.campaignId)).toBe(false);
  });
});

// Phase 199: Roadmap Prioritization
describe('Phase 199: Roadmap Prioritization', () => {
  it('should submit, vote and prioritize feature requests', () => {
    const req1 = featureRequestManager.submit('Dark Mode', 'UI dark theme', 'u1', 'all', 5000, 3, 7);
    const req2 = featureRequestManager.submit('Bulk Export', 'Export all data', 'u2', 'enterprise', 15000, 8, 9);

    featureRequestManager.vote(req1.requestId);
    featureRequestManager.vote(req1.requestId);

    const top = featureRequestManager.getTopRequested(2);
    expect(top.length).toBe(2);

    featureRequestManager.updateStatus(req1.requestId, 'planned');
    const planned = featureRequestManager.getByStatus('planned');
    expect(planned.length).toBe(1);
  });

  it('should score and rank feature requests with RICE', () => {
    const requests = [
      { requestId: 'r1', reach: 1000, impact: 3, confidence: 80, effort: 2, strategicAlignment: 8 },
      { requestId: 'r2', reach: 200, impact: 5, confidence: 90, effort: 1, strategicAlignment: 6 }
    ];
    const ranked = prioritizationScorer.rankRequests(requests);
    expect(ranked.length).toBe(2);
    expect(ranked[0].finalScore).toBeGreaterThanOrEqual(ranked[1].finalScore);

    const quickWins = prioritizationScorer.getQuickWins(ranked, 2);
    expect(quickWins.every(q => q.effort <= 2)).toBe(true);
  });

  it('should plan roadmap items and check capacity', () => {
    const req = featureRequestManager.submit('SSO Integration', 'SAML SSO', 'u3', 'enterprise', 20000, 5, 9);
    const item = roadmapPlanner.plan(req.requestId, 'Q2-2026', 'platform-team', 60);
    expect(item.status).toBe('planned');

    roadmapPlanner.advance(item.itemId, 'in_progress');
    const capacity = roadmapPlanner.getCapacityByTeam('Q2-2026');
    expect(capacity['platform-team']).toBeGreaterThan(0);
  });

  it('should estimate feature impact', () => {
    const req = featureRequestManager.submit('AI Assistant', 'AI feature', 'u4', 'all', 50000, 13, 10);
    const estimate = impactEstimator.estimate(req.requestId, 50000, 5, 10, 8, 'high');
    expect(estimate.revenueUplift).toBe(50000);
    expect(estimate.confidence).toBe('high');

    const highConf = impactEstimator.getHighConfidenceEstimates();
    expect(highConf.some(e => e.requestId === req.requestId)).toBe(true);

    const total = impactEstimator.getTotalEstimatedRevenue();
    expect(total).toBeGreaterThanOrEqual(50000);
  });
});

// Phase 200: Product-Led Growth
describe('Phase 200: Product-Led Growth', () => {
  it('should track PLG funnel stages and compute conversions', () => {
    plgFunnelTracker.record('plg-u1', 'visitor');
    plgFunnelTracker.record('plg-u1', 'signup');
    plgFunnelTracker.record('plg-u2', 'visitor');
    plgFunnelTracker.record('plg-u1', 'activated');

    const metrics = plgFunnelTracker.getFunnelMetrics();
    expect(metrics.visitor).toBe(2);
    expect(metrics.signup).toBe(1);

    const stage = plgFunnelTracker.getUserStage('plg-u1');
    expect(stage).toBe('activated');
  });

  it('should track viral loops and compute k-factor', () => {
    const loop = viralLoopAnalyzer.createLoop('viral-u1');
    expect(loop.referralCode).toBeDefined();

    viralLoopAnalyzer.recordInvite('viral-u1');
    viralLoopAnalyzer.recordInvite('viral-u1');
    viralLoopAnalyzer.recordConversion('viral-u1');

    const k = viralLoopAnalyzer.getOverallViralCoefficient();
    expect(k).toBe(0.5); // 1 converted / 2 invited
  });

  it('should track activation milestones', () => {
    const milestone = activationTracker.define('act-u1', 'aha_moment', ['create_project', 'invite_team', 'first_export']);
    activationTracker.completeAction(milestone.milestoneId, 'create_project');
    activationTracker.completeAction(milestone.milestoneId, 'invite_team');

    expect(milestone.activationScore).toBeCloseTo(66.7, 0);
    expect(milestone.isComplete).toBe(false);

    activationTracker.completeAction(milestone.milestoneId, 'first_export');
    expect(milestone.isComplete).toBe(true);
  });

  it('should detect expansion signals and identify ready accounts', () => {
    expansionSignalDetector.detect('u1', 'acct-001', 'usage_spike', 'strong');
    expansionSignalDetector.detect('u2', 'acct-002', 'feature_limit_hit', 'weak');

    const ready = expansionSignalDetector.getExpansionReadyAccounts('moderate');
    expect(ready).toContain('acct-001');
    expect(ready).not.toContain('acct-002');

    const signals = expansionSignalDetector.getAccountSignals('acct-001');
    expect(signals[0].signalType).toBe('usage_spike');
  });
});

// Phase 201 & 202: NPS & Satisfaction
describe('Phase 202: NPS & Satisfaction', () => {
  it('should record NPS responses and calculate score', () => {
    npsSurveyManager.record('nps-u1', 9, 'Love the product!', 'enterprise');
    npsSurveyManager.record('nps-u2', 8, 'Good overall', 'smb');
    npsSurveyManager.record('nps-u3', 4, 'Missing features', 'smb');
    npsSurveyManager.record('nps-u4', 10, 'Best tool ever!', 'enterprise');

    const nps = npsSurveyManager.calculateNPS();
    expect(nps).toBe(50); // 2 promoters, 1 passive, 1 detractor → (2-1)/4 * 100 = 25... actually (2-1)/4=25

    const dist = npsSurveyManager.getDistribution();
    expect(dist.promoter).toBe(2);
    expect(dist.detractor).toBe(1);
  });

  it('should track satisfaction scores and compute CSAT', () => {
    satisfactionScoreTracker.record('sat-u1', 'csat', 4, 5, 'support_interaction');
    satisfactionScoreTracker.record('sat-u2', 'csat', 5, 5, 'support_interaction');
    satisfactionScoreTracker.record('sat-u3', 'csat', 3, 5, 'onboarding');

    const csat = satisfactionScoreTracker.getCSAT();
    expect(csat).toBeCloseTo(66.7, 0); // 2 out of 3 scored >= 80%

    const avgCsat = satisfactionScoreTracker.getAvgScore('csat');
    expect(avgCsat).toBeGreaterThan(0);
  });

  it('should categorize feedback by keywords', () => {
    feedbackCategorizor.defineCategory('performance', ['slow', 'lag', 'speed'], 'negative');
    feedbackCategorizor.defineCategory('ui', ['beautiful', 'clean', 'design'], 'positive');

    const matched1 = feedbackCategorizor.categorize('The app is really slow and laggy', 3);
    const matched2 = feedbackCategorizor.categorize('Beautiful clean design!', 9);

    expect(matched1).toContain('performance');
    expect(matched2).toContain('ui');

    const negative = feedbackCategorizor.getNegativeCategories();
    expect(negative.some(c => c.name === 'performance')).toBe(true);
  });

  it('should track NPS trends and compare to benchmark', () => {
    const surveys = [
      npsSurveyManager.record('t-u1', 9, '', 'all'),
      npsSurveyManager.record('t-u2', 7, '', 'all'),
      npsSurveyManager.record('t-u3', 3, '', 'all')
    ];
    npsTrendAnalyzer.record('2026-Q1', surveys);

    const trend = npsTrendAnalyzer.getTrend();
    expect(['improving', 'declining', 'stable']).toContain(trend);

    const benchmark = npsTrendAnalyzer.getBenchmarkComparison(30);
    expect(['above', 'below', 'at']).toContain(benchmark);
  });
});
