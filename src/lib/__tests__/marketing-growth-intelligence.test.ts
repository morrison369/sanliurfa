/**
 * Tests: Phase 239-244 — Advanced Marketing Intelligence & Growth Analytics
 */

import { describe, it, expect } from 'vitest';
import {
  touchpointEventCollector, attributionModelEngine, channelContributionTracker, campaignROICalculator,
  targetAccountManager, engagementSignalTracker, abmCampaignManager, accountIntelligenceEngine,
  contentAssetManager, contentEngagementTracker, contentROIAnalyzer, seoPerformanceTracker,
  growthLoopManager, acquisitionFunnelAnalyzer, retentionCohortAnalyzer, growthExperimentEngine,
  cacTracker, acquisitionChannelScorer, leadQualityScorer, conversionOptimizationAdvisor,
  brandHealthTracker, shareOfVoiceTracker, brandSentimentMonitor, brandEquityMeasurer
} from '../index';

// Phase 239: Marketing Attribution
describe('Phase 239 — Marketing Attribution', () => {
  it('collects touchpoints and attributes with linear model', () => {
    touchpointEventCollector.record('cust-100', 'paid_search', 'q1-campaign', false);
    touchpointEventCollector.record('cust-100', 'email', 'nurture', false);
    touchpointEventCollector.record('cust-100', 'direct', 'none', true, 1500);
    const journey = touchpointEventCollector.getCustomerJourney('cust-100');
    const result = attributionModelEngine.attribute('cust-100', journey, 'linear');
    expect(result.conversionValue).toBe(1500);
    expect(result.touchpointCount).toBe(2);
    expect(result.channelCredits['paid_search']).toBeCloseTo(750, 0);
  });

  it('attributes with last_touch model giving full credit', () => {
    const journey = touchpointEventCollector.getCustomerJourney('cust-100');
    const result = attributionModelEngine.attribute('cust-100', journey, 'last_touch');
    expect(result.channelCredits['email']).toBe(1500);
  });

  it('records channel contribution and calculates ROAS', () => {
    const contrib = channelContributionTracker.record('paid_search', '2026-Q1', 150, 500000, 350000, 50000);
    expect(contrib.roas).toBe(7);
    expect(contrib.contributionPct).toBe(70);
    const topRoas = channelContributionTracker.getTopROASChannels();
    expect(topRoas[0].roas).toBeGreaterThanOrEqual(7);
  });

  it('calculates campaign ROI and identifies negative ROI', () => {
    campaignROICalculator.calculate('camp-1', 'Spring Launch', 100000, 350000, 150, '2026-Q1');
    campaignROICalculator.calculate('camp-2', 'Summer Test', 80000, 60000, 30, '2026-Q1');
    const top = campaignROICalculator.getTopROI(1);
    expect(top[0].roi).toBeCloseTo(250, 0);
    const negative = campaignROICalculator.getNegativeROI();
    expect(negative.length).toBeGreaterThan(0);
  });
});

// Phase 240: Account-Based Marketing
describe('Phase 240 — Account-Based Marketing Intelligence', () => {
  it('adds target account with correct tier and ICP score', () => {
    const acc = targetAccountManager.add('MegaCorp', 'fintech', 500000000, 5000, 88, 'rep@co.com');
    expect(acc.tier).toBe('tier1');
    expect(acc.icp_score).toBe(88);
    const tier1 = targetAccountManager.getByTier('tier1');
    expect(tier1.some(a => a.accountId === acc.accountId)).toBe(true);
  });

  it('records engagement signals and calculates score', () => {
    const acc = targetAccountManager.getByTier('tier1')[0];
    engagementSignalTracker.record(acc.accountId, 'demo_request', 'website');  // weight 20
    engagementSignalTracker.record(acc.accountId, 'pricing_view', 'website');  // weight 15
    const score = engagementSignalTracker.getEngagementScore(acc.accountId);
    expect(score).toBe(35);
    const hot = engagementSignalTracker.getHotAccounts(30);
    expect(hot).toContain(acc.accountId);
  });

  it('creates ABM campaign and updates metrics', () => {
    const campaign = abmCampaignManager.create('Fintech Q1', 'tier1', ['fintech'], 50);
    abmCampaignManager.updateMetrics(campaign.campaignId, 35, 2000000, 500000);
    const updated = abmCampaignManager.getCampaign(campaign.campaignId)!;
    expect(updated.engagementRate).toBe(70);
    expect(updated.revenueInfluenced).toBe(500000);
  });

  it('generates account intelligence with propensity score', () => {
    const acc = targetAccountManager.getByTier('tier1')[0];
    const report = accountIntelligenceEngine.generate(acc.accountId, ['budget_approved', 'vendor_review'], ['CompetitorA'], ['Salesforce', 'SAP', 'Oracle', 'Workday'], ['Series C raised'], 5, 'Q2');
    expect(report.propensityScore).toBeGreaterThan(0);
    const highPropensity = accountIntelligenceEngine.getHighPropensity(30);
    expect(highPropensity.length).toBeGreaterThan(0);
  });
});

// Phase 241: Content Performance Analytics
describe('Phase 241 — Content Performance Analytics', () => {
  it('creates content asset and retrieves by type', () => {
    const asset = contentAssetManager.create('10 Tips for Enterprise Security', 'blog', 'security', 'CISO', 'awareness', 'author@co.com', ['security', 'enterprise']);
    expect(asset.buyerStage).toBe('awareness');
    const blogs = contentAssetManager.getByType('blog');
    expect(blogs.length).toBeGreaterThan(0);
  });

  it('tracks content engagement and calculates composite score', () => {
    const asset = contentAssetManager.getAllAssets()[0];
    const metric = contentEngagementTracker.record(asset.assetId, '2026-Q1', 5000, 3200, 180, 65, 45, 120, 30);
    expect(metric.engagementScore).toBeGreaterThan(0);
    const top = contentEngagementTracker.getTopEngaged(3);
    expect(top.length).toBeGreaterThan(0);
  });

  it('calculates content ROI and pipeline influenced', () => {
    const asset = contentAssetManager.getAllAssets()[0];
    const roi = contentROIAnalyzer.analyze(asset.assetId, '2026-Q1', 2000, 3000, 30, 150000, 45000);
    expect(roi.roi).toBeCloseTo(800, 0);  // (45000-5000)/5000*100
    expect(contentROIAnalyzer.getTotalPipelineInfluenced()).toBeGreaterThan(0);
  });

  it('records SEO performance and calculates CTR', () => {
    const asset = contentAssetManager.getAllAssets()[0];
    const seo = seoPerformanceTracker.record(asset.assetId, '2026-Q1', 800, 20000, 3.5, ['enterprise security', 'ciso guide'], 12);
    expect(seo.ctr).toBe(4);
    expect(seoPerformanceTracker.getAvgCTR()).toBeGreaterThan(0);
  });
});

// Phase 242: Growth Analytics
describe('Phase 242 — Growth Analytics', () => {
  it('defines growth loop and projects compound growth', () => {
    const loop = growthLoopManager.define('Referral Loop', 'viral', 'signups', 'referred_signups', 1.3, 14);
    const projection = growthLoopManager.projectGrowth(loop.loopId, 100, 3);
    expect(projection[0]).toBe(100);
    expect(projection[1]).toBeCloseTo(130, 0);
    expect(projection[3]).toBeCloseTo(219.7, 0);
  });

  it('analyzes acquisition funnel and finds bottleneck', () => {
    acquisitionFunnelAnalyzer.record('Visitor', 1, 10000, 2000, 0.5, '2026-Q1');
    acquisitionFunnelAnalyzer.record('Trial', 2, 2000, 800, 2, '2026-Q1');
    acquisitionFunnelAnalyzer.record('Paid', 3, 800, 300, 5, '2026-Q1');
    const overall = acquisitionFunnelAnalyzer.getOverallConversion('2026-Q1');
    expect(overall).toBe(3);
    const bottleneck = acquisitionFunnelAnalyzer.getBottleneck('2026-Q1');
    expect(bottleneck!.conversionRate).toBeLessThanOrEqual(20);
  });

  it('analyzes retention cohort with 30/90 day rates', () => {
    const cohort = retentionCohortAnalyzer.analyze('2026-01', 500, { M1: 75, M2: 65, M3: 60 }, 2400);
    expect(cohort.avgRetention30).toBe(75);
    expect(cohort.avgRetention90).toBeCloseTo(66.7, 0);
    expect(cohort.churnRate).toBe(25);
  });

  it('runs growth experiment and detects significant win', () => {
    const exp = growthExperimentEngine.create('Onboarding Checklist', 'Checklist improves activation by 20%', 'activation_rate');
    growthExperimentEngine.conclude(exp.experimentId, 30, 38, 0.02, 1000);
    const concluded = growthExperimentEngine.getExperiment(exp.experimentId)!;
    expect(concluded.isSignificant).toBe(true);
    expect(concluded.uplift).toBeCloseTo(26.7, 0);
    expect(growthExperimentEngine.getSignificantWins().length).toBeGreaterThan(0);
  });
});

// Phase 243: Customer Acquisition Optimization
describe('Phase 243 — Customer Acquisition Optimization', () => {
  it('records CAC and calculates LTV:CAC ratio', () => {
    const metric = cacTracker.record('paid_search', '2026-Q1', 50000, 30000, 80, 500, 6000);
    expect(metric.cac).toBe(1000);
    expect(metric.ltvCacRatio).toBe(6);
    const unhealthy = cacTracker.getUnhealthyChannels(3);
    expect(unhealthy.every(m => m.ltvCacRatio < 3)).toBe(true);
  });

  it('scores acquisition channel and ranks by efficiency', () => {
    acquisitionChannelScorer.score('Organic Search', 'organic', 300, 80, 12, 800, 5000);
    acquisitionChannelScorer.score('Cold Outbound', 'outbound', 50, 60, 5, 1500, 8000);
    const top = acquisitionChannelScorer.getTopChannels(2);
    expect(top.length).toBeGreaterThanOrEqual(1);
  });

  it('scores lead quality with composite grade', () => {
    const score = leadQualityScorer.score('lead-1', 'organic', 85, 70, 80, 75);
    expect(score.compositeScore).toBeCloseTo(77.25, 1);
    expect(score.grade).toBe('A');
    const dist = leadQualityScorer.getGradeDistribution();
    expect(dist['A']).toBeGreaterThan(0);
  });

  it('generates conversion optimization quick wins', () => {
    conversionOptimizationAdvisor.generate('trial_to_paid', 'pricing_page', 8, 15, 'Add social proof', 25, 'low');
    conversionOptimizationAdvisor.generate('signup_flow', 'form', 20, 30, 'Reduce form fields', 15, 'low');
    const quickWins = conversionOptimizationAdvisor.getQuickWins('low', 10);
    expect(quickWins.length).toBeGreaterThanOrEqual(2);
    expect(quickWins[0].estimatedUpliftPct).toBeGreaterThanOrEqual(15);
  });
});

// Phase 244: Brand Intelligence
describe('Phase 244 — Brand Intelligence', () => {
  it('records brand health and calculates strength index', () => {
    const metric = brandHealthTracker.record('2026-Q1', 72, 55, 48, 42);
    expect(metric.brandStrengthIndex).toBeGreaterThan(0);
    expect(metric.brandStrengthIndex).toBeLessThanOrEqual(100);
    expect(brandHealthTracker.getLatest()!.period).toBe('2026-Q1');
  });

  it('tracks share of voice and calculates overall SOV', () => {
    shareOfVoiceTracker.record('2026-Q1', 'social', 10000, 2500, { 'CompetitorA': 3000, 'CompetitorB': 2000 });
    shareOfVoiceTracker.record('2026-Q1', 'search', 5000, 1500, { 'CompetitorA': 1500 });
    const overallSOV = shareOfVoiceTracker.getOverallSOV('2026-Q1');
    expect(overallSOV).toBeCloseTo(26.7, 0);
  });

  it('monitors brand sentiment and detects negative channels', () => {
    brandSentimentMonitor.record('2026-Q1', 'twitter', 60, 25, 15, 5000, ['great_product'], ['slow_support']);
    brandSentimentMonitor.record('2026-Q1', 'review_sites', 30, 20, 50, 2000, ['easy_setup'], ['pricing', 'bugs']);
    const negative = brandSentimentMonitor.getNegativeChannels(-0.1);
    expect(negative.some(r => r.channel === 'review_sites')).toBe(true);
  });

  it('measures brand equity and compares vs competitor', () => {
    const equity = brandEquityMeasurer.measure('2026-Q1', 72, 65, 80, 70, 60, 68);
    expect(equity.overallEquity).toBeGreaterThan(0);
    expect(equity.vsCompetitor).toBeGreaterThan(0);
    expect(brandEquityMeasurer.getLatest()!.period).toBe('2026-Q1');
  });
});
