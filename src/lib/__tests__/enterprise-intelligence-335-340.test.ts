/**
 * Tests for Phase 335-340: Market Intelligence, Customer Advocacy,
 * Regulatory Change, Sales Forecasting, Vendor Collaboration, Employee Experience
 */

import { describe, it, expect } from 'vitest';
import {
  marketSizeAnalyzer, competitorTracker, trendMonitor, marketShareTracker
} from '../market-intelligence';
import {
  advocateManager, referralManager, caseStudyManager, advocacyProgramAnalyzer
} from '../customer-advocacy-intelligence';
import {
  regulatoryChangeMonitor, impactAssessor, complianceGapManager, changeReadinessAssessor
} from '../regulatory-change-intelligence';
import {
  dealManager, forecastEngine, pipelineHealthAnalyzer, forecastAccuracyTracker
} from '../sales-forecasting-intelligence';
import {
  vendorCollaborationManager, jointPlanManager, sharedKpiTracker, collaborationHealthMonitor
} from '../vendor-collaboration-intelligence';
import {
  engagementTracker, retentionRiskDetector, experienceJourneyManager, pulseCheckEngine
} from '../employee-experience-intelligence';

// ─── Phase 335: Market Intelligence ───────────────────────────────────────────

describe('Phase 335: Market Intelligence', () => {
  it('defines market and calculates market share and projected TAM', () => {
    const market = marketSizeAnalyzer.define('SaaS Analytics', 'Enterprise', 'global', 5000000000, 500000000, 50000000, 25000000, 18, 'growing', ['AI adoption', 'Cloud migration'], ['Economic headwinds'], 'Gartner 2025', 'high');
    expect(market.marketId).toMatch(/^mkt-/);
    expect(market.ourMarketSharePct).toBe(5);  // 25M / 500M
    expect(market.projectedTamUSD).toBeGreaterThan(market.tamUSD);
    expect(market.maturity).toBe('growing');
  });

  it('tracks competitor with threat level and win rate', () => {
    const market = marketSizeAnalyzer.getAll()[0];
    const comp = competitorTracker.track('DataRival Inc', market.marketId, ['DataDash', 'Analytics Pro'], ['Strong brand', 'Enterprise sales'], ['High price', 'Legacy UI'], ['Raised $150M Series C'], 'high', 'premium', ['enterprise', 'mid_market'], 8, 400000000);
    expect(comp.competitorId).toMatch(/^comp-/);
    expect(comp.threatLevel).toBe('high');
    competitorTracker.updateWinRate(comp.competitorId, 45);
    expect(competitorTracker.getCriticalThreats().length).toBeGreaterThan(0);
  });

  it('detects market trend and classifies impact', () => {
    const trend = trendMonitor.detect('AI-native analytics disruption', 'technology', 'negative', 'fast', 'short_term', 'threat', 'high', 'New AI-native tools commoditizing traditional analytics', ['TechCrunch', 'Gartner'], ['Accelerate AI product roadmap', 'Partner with AI providers'], 85);
    expect(trend.trendId).toMatch(/^trend-/);
    expect(trend.impactSeverity).toBe('high');
    expect(trendMonitor.getThreats().length).toBeGreaterThan(0);
    expect(trendMonitor.getOpportunities()).toBeDefined();
  });

  it('records market share and tracks changes period-over-period', () => {
    const market = marketSizeAnalyzer.getAll()[0];
    const share = marketShareTracker.record(market.marketId, '2025-Q1', 25000000, 500000000, [{ competitorName: 'DataRival', sharePct: 8, change: 0.5 }], ['Won 3 enterprise deals'], [], ['Product-led growth', 'Mid-market expansion']);
    expect(share.shareId).toMatch(/^mktshare-/);
    expect(share.ourSharePct).toBe(5);
    const trend = marketShareTracker.getShareTrend(market.marketId);
    expect(trend.length).toBeGreaterThan(0);
  });
});

// ─── Phase 336: Customer Advocacy ─────────────────────────────────────────────

describe('Phase 336: Customer Advocacy Intelligence', () => {
  it('enrolls advocate and assigns correct tier based on NPS', () => {
    const adv = advocateManager.enroll('cust-adv-01', 'TechCorp Inc', 'Sarah Johnson', 'VP Engineering', 9, ['case_study', 'referral', 'speaking'], 'quarterly');
    expect(adv.advocateId).toMatch(/^adv-/);
    expect(adv.tier).toBe('champion');  // NPS 9
    expect(adv.advocacyScore).toBeGreaterThan(0);
  });

  it('tracks referral through pipeline to won', () => {
    const adv = advocateManager.getAll()[0];
    const referral = referralManager.submit(adv.advocateId, adv.customerName, 'ProspectCo', 'Mike Brown', 'mike@prospect.com', 75000, 'direct_ask');
    expect(referral.referralId).toMatch(/^ref-/);
    referralManager.advance(referral.referralId, 'qualified');
    referralManager.advance(referral.referralId, 'won', 70000);
    const updated = referralManager.getAll().find(r => r.referralId === referral.referralId)!;
    expect(updated.actualValueUSD).toBe(70000);
    expect(updated.incentiveEarnedUSD).toBe(3500);  // 5% of 70k
  });

  it('creates and publishes case study with performance tracking', () => {
    const cs = caseStudyManager.create('cust-adv-01', 'TechCorp Inc', 'How TechCorp Reduced Data Costs by 40%', 'Technology', 'Cost Optimization', 'Rising analytics costs', 'Implemented DataSuite', [{ metric: 'Monthly cost', before: '$50K', after: '$30K', improvement: '-40%' }]);
    expect(cs.caseStudyId).toMatch(/^cs-/);
    caseStudyManager.publish(cs.caseStudyId, 'https://example.com/case-studies/techcorp');
    caseStudyManager.trackPerformance(cs.caseStudyId, 1500, 250, 30, 180000);
    expect(cs.status).toBe('published');
    expect(cs.revenueInfluencedUSD).toBe(180000);
  });

  it('analyzes advocacy program ROI', () => {
    const advocates = advocateManager.getAll();
    const referrals = referralManager.getAll();
    const caseStudies = caseStudyManager.getPublished();
    const program = advocacyProgramAnalyzer.analyze('2025-Q1', advocates, referrals, caseStudies, 25000);
    expect(program.programId).toMatch(/^advprog-/);
    expect(program.revenueFromReferralsUSD).toBeGreaterThan(0);
    expect(program.roiPct).toBeGreaterThan(0);
  });
});

// ─── Phase 337: Regulatory Change ─────────────────────────────────────────────

describe('Phase 337: Regulatory Change Intelligence', () => {
  it('tracks regulatory change and retrieves upcoming deadlines', () => {
    const change = regulatoryChangeMonitor.track('EU AI Act', 'European Commission', 'EU', 'new_regulation', 'security', 'effective', Date.now() + 180 * 86400000, Date.now() + 365 * 86400000, 'Up to €30M or 6% of global revenue', ['AI systems', 'Product development', 'Data governance'], 'Comprehensive AI regulation requiring transparency and risk assessments', 30000000);
    expect(change.changeId).toMatch(/^regchg-/);
    expect(change.category).toBe('security');
    expect(regulatoryChangeMonitor.getUpcoming(400).length).toBeGreaterThan(0);
  });

  it('assesses impact and calculates compliance cost', () => {
    const changes = regulatoryChangeMonitor.getAll();
    const assessment = impactAssessor.assess(changes[0].changeId, 'EU AI Act', 70, 60, 80, 50, 250000, 5000000, 12, 8, ['Update model documentation', 'Implement audit trails', 'Risk classification'], 65, 'compliance-team');
    expect(assessment.assessmentId).toMatch(/^impact-/);
    expect(assessment.overallImpact).toBe('high');  // avg (70+60+80+50)/4 = 65
    expect(assessment.readinessGapPct).toBe(65);
  });

  it('logs compliance gap and tracks remediation', () => {
    const changes = regulatoryChangeMonitor.getAll();
    const gap = complianceGapManager.log(changes[0].changeId, 'EU AI Act', 'AI system risk classification', 'No formal risk assessment process', 'Documented risk assessment for all AI systems', 'critical', 'Implement AI risk assessment framework', 'CTO', 45, 75000, Date.now() + 180 * 86400000, ['Risk assessment documentation', 'Board approval']);
    expect(gap.gapId).toMatch(/^compgap-/);
    expect(gap.gapSeverity).toBe('critical');
    complianceGapManager.updateStatus(gap.gapId, 'in_progress');
    expect(complianceGapManager.getCriticalOpen().length).toBe(0);  // now in_progress, not open
  });

  it('assesses change readiness and determines risk level', () => {
    const changes = regulatoryChangeMonitor.getAll();
    const gaps = complianceGapManager['gaps'];
    const readiness = changeReadinessAssessor.assess(changes[0].changeId, 'EU AI Act', Date.now() + 365 * 86400000, 50, 40, 30, 20, 45, gaps);
    expect(readiness.readinessId).toMatch(/^chgready-/);
    expect(readiness.overallReadinessPct).toBe(37);  // (50+40+30+20+45)/5
    expect(readiness.riskLevel).toBe('critical');
  });
});

// ─── Phase 338: Sales Forecasting ─────────────────────────────────────────────

describe('Phase 338: Sales Forecasting Intelligence', () => {
  it('creates deal with automatic scoring and risk flag detection', () => {
    const deal = dealManager.create('Acme Enterprise Deal', 'acc-001', 'Acme Corp', 'rep-001', 'Alice Sales', 'proposal', 120000, 65, Date.now() + 30 * 86400000, 'best_case', 'Send proposal and schedule demo', ['Competitor X']);
    expect(deal.dealId).toMatch(/^deal-/);
    expect(deal.dealScore).toBeGreaterThan(0);
    expect(deal.weightedValueUSD).toBe(78000);  // 120k * 65%
  });

  it('generates forecast with coverage ratio', () => {
    dealManager.create('Beta Corp Renewal', 'acc-002', 'Beta Corp', 'rep-001', 'Alice Sales', 'negotiation', 85000, 90, Date.now() + 14 * 86400000, 'commit', 'Finalize contract terms');
    const deals = dealManager.getAll();
    const forecast = forecastEngine.generate('2025-Q2', deals, 500000, 'individual', 'rep-001');
    expect(forecast.forecastId).toMatch(/^forecast-/);
    expect(forecast.coverageRatio).toBeGreaterThan(0);
    expect(forecast.pipelineUSD).toBeGreaterThan(0);
  });

  it('analyzes pipeline health with stale deal detection', () => {
    const deals = dealManager.getAll();
    const health = pipelineHealthAnalyzer.analyze('2025-Q2', deals, 45);
    expect(health.healthId).toMatch(/^pihealth-/);
    expect(health.dealCount).toBeGreaterThan(0);
    expect(health.healthScore).toBeGreaterThanOrEqual(0);
  });

  it('tracks forecast accuracy and detects bias', () => {
    const accuracy = forecastAccuracyTracker.track('2025-Q1', 450000, 420000);
    expect(accuracy.accuracyId).toMatch(/^forecastacc-/);
    expect(accuracy.variancePct).toBeCloseTo(-6.7, 0);
    expect(accuracy.biasDirection).toBe('optimistic');  // actual < forecast by > 5%
    expect(accuracy.isWithin10Pct).toBe(true);
  });
});

// ─── Phase 339: Vendor Collaboration ──────────────────────────────────────────

describe('Phase 339: Vendor Collaboration Intelligence', () => {
  it('establishes vendor collaboration with initial scoring', () => {
    const col = vendorCollaborationManager.establish('vendor-001', 'CloudParter Inc', 'strategic_partnership', 2000000, 5000000, 'monthly', ['Joint product integration', 'Co-marketing campaign'], ['Joint revenue', 'Customer satisfaction', 'Integration uptime'], 'CTO', 'VP Partnerships');
    expect(col.collaborationId).toMatch(/^vcol-/);
    expect(col.collaborationScore).toBeGreaterThanOrEqual(80);  // strategic + exec sponsor
    expect(col.status).toBe('active');
  });

  it('creates joint plan and tracks revenue attainment', () => {
    const col = vendorCollaborationManager.getAll()[0];
    const objectives = [
      { objective: 'Launch joint integration', owner: 'joint' as const, targetDate: Date.now() + 60 * 86400000, status: 'in_progress' as const },
      { objective: 'Co-marketing campaign', owner: 'us' as const, targetDate: Date.now() + 90 * 86400000, status: 'pending' as const }
    ];
    const plan = jointPlanManager.create(col.collaborationId, 'CloudParter Inc', '2025-H1', objectives, 100000, 60000, 40000, 1000000);
    expect(plan.planId).toMatch(/^jplan-/);
    jointPlanManager.updateRevenue(plan.planId, 750000);
    expect(plan.revenueAttainmentPct).toBe(75);
  });

  it('tracks shared KPIs with RAG status', () => {
    const col = vendorCollaborationManager.getAll()[0];
    const kpi = sharedKpiTracker.track(col.collaborationId, 'CloudParter Inc', 'Joint Revenue', 'revenue', '2025-Q2', 500000, 500000, 1000000, 480000, 450000, 930000);
    expect(kpi.kpiId).toMatch(/^sharedkpi-/);
    expect(kpi.ourAttainmentPct).toBe(96);
    expect(kpi.ragStatus).toBe('green');  // min attainment: 93% >= 90
  });

  it('evaluates collaboration health across portfolio', () => {
    const cols = vendorCollaborationManager.getAll();
    const plans = jointPlanManager['plans'];
    const health = collaborationHealthMonitor.evaluate('2025-Q2', cols, plans);
    expect(health.healthId).toMatch(/^colhealth-/);
    expect(health.totalCollaborations).toBeGreaterThan(0);
    expect(health.avgCollaborationScore).toBeGreaterThan(0);
  });
});

// ─── Phase 340: Employee Experience ───────────────────────────────────────────

describe('Phase 340: Employee Experience Intelligence', () => {
  it('surveys employee engagement and calculates composite score', () => {
    const eng = engagementTracker.survey('emp-e01', 'Alice Dev', 'Engineering', 'mgr-001', 24, 80, 75, 70, 85, 80, 90, 75, 40);
    expect(eng.engagementId).toMatch(/^eng-/);
    expect(eng.engagementScore).toBeGreaterThan(0);
    expect(eng.category).toBe('highly_engaged');  // score ~79 → highly_engaged ≥ 80? close
    expect(eng.eNpsScore).toBe(40);
  });

  it('assesses retention risk with flight risk calculation', () => {
    const eng = engagementTracker.survey('emp-e02', 'Bob Low', 'Sales', 'mgr-002', 24, 30, 35, 25, 30, 40, 35, 30, -40);
    const risk = retentionRiskDetector.assess('emp-e02', 'Bob Low', 'Sales', 'Account Executive', eng, 90000, false, 1.2);
    expect(risk.riskId).toMatch(/^retrisk-/);
    expect(risk.flightRiskPct).toBeGreaterThan(50);
    expect(risk.riskFactors.length).toBeGreaterThan(0);
    expect(risk.retentionActions.length).toBeGreaterThan(0);
  });

  it('sets employee experience journey stage with milestones', () => {
    const milestones = [
      { milestone: '30-day check-in', targetDate: Date.now() + 30 * 86400000, status: 'pending' as const },
      { milestone: '90-day review', targetDate: Date.now() + 90 * 86400000, status: 'pending' as const }
    ];
    const journey = experienceJourneyManager.setStage('emp-e03', 'Carol New', 'onboarding', 72, milestones, ['Unclear process documentation'], ['Welcoming team'], 'Complete onboarding checklist', 'hr-partner-01');
    expect(journey.journeyId).toMatch(/^expjrn-/);
    expect(journey.currentStage).toBe('onboarding');
    expect(journey.stageHealthScore).toBe(72);
  });

  it('runs team pulse check and tracks engagement distribution', () => {
    const responses = [
      engagementTracker.survey('emp-p01', 'P1', 'Product', 'mgr-003', 12, 85, 80, 75, 88, 82, 90, 80, 50),
      engagementTracker.survey('emp-p02', 'P2', 'Product', 'mgr-003', 6, 40, 45, 35, 38, 50, 40, 42, -10)
    ];
    const pulse = pulseCheckEngine.run('2025-Q2', 'team-product', 'Product Team', responses, 88, ['Process clarity', 'Career growth'], ['Team culture'], ['Improve onboarding docs', 'Schedule career conversations']);
    expect(pulse.pulseId).toMatch(/^pulse-/);
    expect(pulse.avgEngagementScore).toBeGreaterThan(0);
    expect(pulse.engagementDistribution.highly_engaged + pulse.engagementDistribution.engaged + pulse.engagementDistribution.neutral + pulse.engagementDistribution.disengaged + pulse.engagementDistribution.actively_disengaged).toBe(2);
  });
});
