/**
 * Tests for Phase 287-292: Alumni, Insurance, M&A, Digital Assets, Franchise, Events & Hospitality
 */

import { describe, it, expect } from 'vitest';

// Phase 287: Alumni Network
import {
  alumniProfileManager, alumniEngagementTracker,
  mentorshipProgramManager, alumniNetworkValueCalculator
} from '../alumni-network-intelligence';

// Phase 288: Insurance & Risk
import {
  insurancePolicyManager, insuranceClaimsManager,
  riskExposureAnalyzer, insuranceProgramAnalyzer
} from '../insurance-risk-intelligence';

// Phase 289: M&A Intelligence
import {
  maDealPipelineManager, dueDiligenceTracker,
  maValuationEngine, integrationMonitor
} from '../mergers-acquisitions-intelligence';

// Phase 290: Digital Asset Management
import {
  digitalAssetManager, assetRightsManager,
  assetUsageAnalyzer, contentPerformanceTracker
} from '../digital-asset-management-intelligence';

// Phase 291: Franchise Intelligence
import {
  franchiseeManager, franchiseePerformanceTracker,
  franchiseComplianceManager, franchiseExpansionPlanner
} from '../franchise-intelligence';

// Phase 292: Corporate Events & Hospitality
import {
  corporateEventManager, hospitalityBudgetManager,
  guestExperienceTracker, hospitalityComplianceTracker
} from '../corporate-events-hospitality-intelligence';

// ─── Phase 287: Alumni Network ────────────────────────────────────────────────

describe('Phase 287: Alumni Network Intelligence', () => {
  it('registers alumni and updates engagement tier', () => {
    const alumni = alumniProfileManager.register('Ayşe Demir', 2018, 'Computer Science', 'Techco', 'Software Engineer', 'Technology');
    expect(alumni.alumniId).toMatch(/^alumni-/);
    expect(alumni.engagementTier).toBe('dormant');

    alumniProfileManager.updateEngagement(alumni.alumniId, 80);
    const updated = alumniProfileManager.getProfile(alumni.alumniId);
    expect(updated?.engagementTier).toBe('champion');
    expect(updated?.engagementScore).toBe(80);
  });

  it('tracks engagement activities and scores', () => {
    const alumni = alumniProfileManager.register('Mehmet Çelik', 2015, 'Business Admin', 'BigCo', 'Manager', 'Finance');
    const activity1 = alumniEngagementTracker.record(alumni.alumniId, 'event_attended');
    const activity2 = alumniEngagementTracker.record(alumni.alumniId, 'donation');
    expect(activity1.valueScore).toBe(10);
    expect(activity2.valueScore).toBe(20);

    const total = alumniEngagementTracker.getTotalEngagementScore(alumni.alumniId);
    expect(total).toBe(30);

    const mostActive = alumniEngagementTracker.getMostActiveAlumni(5);
    expect(mostActive.some(a => a.alumniId === alumni.alumniId)).toBe(true);
  });

  it('manages mentorship program and tracks outcomes', () => {
    const program = mentorshipProgramManager.create('Tech Mentorship 2026', '2026', 30, 45);
    expect(program.programId).toMatch(/^mentor-/);
    expect(program.matchRatePct).toBeCloseTo(66.67, 1);

    mentorshipProgramManager.updateOutcomes(program.programId, 6, 85, 78, 88, 42);
    const active = mentorshipProgramManager.getActivePrograms();
    expect(active.find(p => p.programId === program.programId)).toBeUndefined(); // 85% → completed
  });

  it('calculates alumni network value', () => {
    const value = alumniNetworkValueCalculator.calculate('2026-Q1', 5000, 1200, 500000, 85, 30, 25, 8);
    expect(value.recordId).toMatch(/^alumval-/);
    expect(value.engagementRatePct).toBe(24);
    expect(value.networkValueEstimateUSD).toBe(500000 + 30 * 15000 + 8 * 5000 + 25 * 2000); // 1,040,000
    expect(alumniNetworkValueCalculator.getValueTrend()).toHaveLength(1);
  });
});

// ─── Phase 288: Insurance & Risk ─────────────────────────────────────────────

describe('Phase 288: Insurance & Risk Management Intelligence', () => {
  it('adds insurance policy and tracks premiums', () => {
    const policy = insurancePolicyManager.add('POL-2026-001', 'cyber', 'Axa Insurance', 5000000, 50000, 10000, Date.now(), Date.now() + 365 * 86400000, ['data breach', 'ransomware']);
    expect(policy.policyId).toMatch(/^inspol-/);
    expect(policy.annualPremium).toBe(50000);

    const total = insurancePolicyManager.getTotalPremiumSpend();
    expect(total).toBeGreaterThanOrEqual(50000);
  });

  it('files and settles insurance claims', () => {
    const policy = insurancePolicyManager.add('POL-2026-002', 'property', 'Zurich', 10000000, 80000, 25000, Date.now(), Date.now() + 365 * 86400000, ['fire', 'flood']);
    const claim = insuranceClaimsManager.file(policy.policyId, 'fire_damage', Date.now() - 86400000, 150000);
    expect(claim.claimId).toMatch(/^claim-/);
    expect(claim.status).toBe('filed');

    insuranceClaimsManager.settle(claim.claimId, policy.policyId, 125000, 25000);
    expect(insuranceClaimsManager.getTotalPaid()).toBe(125000);
    expect(insuranceClaimsManager.getOpenClaims().length).toBe(0);
  });

  it('assesses risk exposure and identifies critical risks', () => {
    const risk = riskExposureAnalyzer.assess('cyber', 'Ransomware attack on core systems', 4, 5, ['EDR', 'MFA', 'Backups'], ['Incident response plan', 'Cyber insurance'], 80, 2000000);
    expect(risk.recordId).toMatch(/^risk-/);
    expect(risk.riskScore).toBe(20);
    expect(risk.riskLevel).toBe('critical');

    const critical = riskExposureAnalyzer.getCriticalRisks();
    expect(critical.length).toBeGreaterThan(0);
    expect(critical[0].riskScore).toBeGreaterThanOrEqual(12);
  });

  it('analyzes overall insurance program', () => {
    const pol = insurancePolicyManager.add('POL-2026-003', 'liability', 'Allianz', 2000000, 20000, 5000, Date.now(), Date.now() + 365 * 86400000, ['third party']);
    const allPolicies = [pol];
    const allClaims = insuranceClaimsManager.getOpenClaims();
    const report = insuranceProgramAnalyzer.analyze('2026-Q1', allPolicies, allClaims);
    expect(report.reportId).toMatch(/^insrep-/);
    expect(report.totalPolicies).toBe(1);
  });
});

// ─── Phase 289: M&A Intelligence ─────────────────────────────────────────────

describe('Phase 289: M&A Intelligence', () => {
  it('creates deal and advances through stages', () => {
    const deal = maDealPipelineManager.create('TechTarget Inc', 'acquisition', 'SaaS', 20000000, 4000000, 150, 60000000, 'Expand product portfolio', Date.now() + 180 * 86400000);
    expect(deal.dealId).toMatch(/^madeal-/);
    expect(deal.evToEBITDA).toBe(15);
    expect(deal.stage).toBe('screening');

    maDealPipelineManager.advance(deal.dealId, 'due_diligence', 65);
    const updated = maDealPipelineManager.getDeal(deal.dealId);
    expect(updated?.stage).toBe('due_diligence');
    expect(maDealPipelineManager.getPipelineValue()).toBeGreaterThan(0);
  });

  it('tracks due diligence workstreams', () => {
    const deal = maDealPipelineManager.create('DataCo', 'acquisition', 'Analytics', 10000000, 2000000, 80, 30000000, 'Data capabilities', Date.now() + 120 * 86400000);
    const dd = dueDiligenceTracker.initiate(deal.dealId, 'financial', 'Finance Team', 50, Date.now() + 30 * 86400000);
    expect(dd.ddId).toMatch(/^dd-/);

    dueDiligenceTracker.updateProgress(dd.ddId, deal.dealId, 35, 2, false, ['Revenue recognition concerns', 'Working capital adjustment needed']);
    const progress = dueDiligenceTracker.getOverallProgress(deal.dealId);
    expect(progress).toBe(70); // 35/50 × 100
    expect(dueDiligenceTracker.hasDealBreaker(deal.dealId)).toBe(false);
  });

  it('performs deal valuation', () => {
    const deal = maDealPipelineManager.create('CloudCo', 'acquisition', 'Cloud', 30000000, 6000000, 200, 90000000, 'Cloud expansion', Date.now() + 90 * 86400000);
    const val = maValuationEngine.value(deal.dealId, 'dcf', 90000000, 85000000, 30000000, 6000000, 3000000, 40000000, 15000000);
    expect(val.valuationId).toMatch(/^maval-/);
    expect(val.evToEBITDA).toBe(15);
    expect(val.premiumToBVPct).toBeCloseTo(112.5, 1);
  });

  it('monitors post-merger integration', () => {
    const deal = maDealPipelineManager.create('LogiCo', 'acquisition', 'Logistics', 50000000, 8000000, 300, 120000000, 'Supply chain', Date.now() + 60 * 86400000);
    maDealPipelineManager.advance(deal.dealId, 'closed', 100);

    const integration = integrationMonitor.track(deal.dealId, '2026-Q1', 20, 16, 5000000, 3000000, 88, 60, 92, 2000000);
    expect(integration.integrationId).toMatch(/^integ-/);
    expect(integration.synergyRealizationPct).toBe(60);
    expect(integration.overallHealthScore).toBeGreaterThan(0);
  });
});

// ─── Phase 290: Digital Asset Management ─────────────────────────────────────

describe('Phase 290: Digital Asset Management Intelligence', () => {
  it('registers asset and tracks usage', () => {
    const asset = digitalAssetManager.register('Brand Logo 2026', 'brand_element', 'SVG', 50000, 'designer-1', 'Marketing', ['logo', 'brand'], 'owned');
    expect(asset.assetId).toMatch(/^asset-/);
    expect(asset.performanceScore).toBe(0);

    digitalAssetManager.recordUsage(asset.assetId, 'campaign');
    digitalAssetManager.recordUsage(asset.assetId, 'view');
    const updated = digitalAssetManager.getAsset(asset.assetId);
    expect(updated?.usedInCampaignCount).toBe(1);
    expect(updated?.viewCount).toBe(1);
    expect(updated?.performanceScore).toBeGreaterThan(0);
  });

  it('manages asset rights and detects expiring licenses', () => {
    const asset = digitalAssetManager.register('Stock Photo Pack', 'image', 'JPG', 5000000, 'stock-team', 'Content', ['photography'], 'licensed', Date.now() + 20 * 86400000);
    const rights = assetRightsManager.register(asset.assetId, 'Getty Images', 'royalty_free', ['web', 'print'], ['TR'], Date.now() - 86400000, Date.now() + 20 * 86400000, 2000, 2500, []);
    expect(rights.rightsId).toMatch(/^rights-/);

    const expiring = assetRightsManager.getExpiringRights(30);
    expect(expiring.length).toBeGreaterThan(0);
  });

  it('analyzes asset usage patterns', () => {
    const assets = [
      digitalAssetManager.register('Video Ad Q1', 'video', 'MP4', 100000000, 'vid-team', 'Marketing', ['video', 'ad'], 'owned'),
      digitalAssetManager.register('Whitepaper 2026', 'document', 'PDF', 2000000, 'content-1', 'Product', ['document'], 'owned')
    ];
    assets.forEach(a => { digitalAssetManager.recordUsage(a.assetId, 'download'); digitalAssetManager.recordUsage(a.assetId, 'view'); });

    const allAssets = assets.map(a => digitalAssetManager.getAsset(a.assetId)!);
    const analysis = assetUsageAnalyzer.analyze('2026-Q1', allAssets);
    expect(analysis.recordId).toMatch(/^assetusage-/);
    expect(analysis.totalDownloads).toBe(2);
  });

  it('tracks content performance and revenue attribution', () => {
    const asset = digitalAssetManager.register('Campaign Banner', 'image', 'PNG', 200000, 'design-1', 'Marketing', ['banner'], 'owned');
    const perf = contentPerformanceTracker.record(asset.assetId, 'camp-001', 'social_media', 100000, 3500, 280, 56000, 10000);
    expect(perf.recordId).toMatch(/^contentperf-/);
    expect(perf.ctr).toBe(3.5);
    expect(perf.conversionRate).toBe(8);
    expect(contentPerformanceTracker.getTotalRevenueAttributed()).toBeGreaterThan(0);
  });
});

// ─── Phase 291: Franchise Intelligence ───────────────────────────────────────

describe('Phase 291: Franchise Intelligence', () => {
  it('onboards franchisee and updates performance tier', () => {
    const franchisee = franchiseeManager.onboard('Istanbul Café Franchise', 'Ahmet Kaya', 'Istanbul', Date.now() + 1095 * 86400000, 8, 2);
    expect(franchisee.franchiseeId).toMatch(/^franch-/);
    expect(franchisee.performanceTier).toBe('silver');

    franchiseeManager.updateTier(franchisee.franchiseeId, 92);
    const updated = franchiseeManager.getFranchisee(franchisee.franchiseeId);
    expect(updated?.performanceTier).toBe('platinum');
  });

  it('records franchisee performance and royalties', () => {
    const franchisee = franchiseeManager.onboard('Ankara Café Franchise', 'Fatma Yıldız', 'Ankara', Date.now() + 730 * 86400000, 8, 2);
    const perf = franchiseePerformanceTracker.record(franchisee.franchiseeId, '2026-Q1', 500000, 8, 2, 85, 90, 88, 95);
    expect(perf.recordId).toMatch(/^franchperf-/);
    expect(perf.royaltiesPaid).toBe(40000);
    expect(perf.marketingFundPaid).toBe(10000);
    expect(perf.performanceScore).toBeCloseTo(88.25, 1);

    const totalRoyalties = franchiseePerformanceTracker.getTotalRoyalties('2026-Q1');
    expect(totalRoyalties).toBe(40000);
  });

  it('conducts compliance audit and identifies failures', () => {
    const franchisee = franchiseeManager.onboard('Izmir Franchise', 'Can Özer', 'Izmir', Date.now() + 548 * 86400000, 8, 2);
    const audit = franchiseComplianceManager.audit(franchisee.franchiseeId, 'scheduled', 50, 45, 1, 2, 3, ['Fix food safety labeling', 'Update POS system'], 'Auditor Smith');
    expect(audit.recordId).toMatch(/^francomp-/);
    expect(audit.complianceScore).toBe(90);
    expect(audit.status).toBe('fail'); // critical violation present

    const failed = franchiseComplianceManager.getFailedAudits();
    expect(failed.length).toBeGreaterThan(0);
  });

  it('plans franchise expansion by market attractiveness', () => {
    const plan1 = franchiseExpansionPlanner.plan('Marmara', 20, 15, 12, 4, 150000, 18, 35, '2026-Q1');
    const plan2 = franchiseExpansionPlanner.plan('Aegean', 15, 10, 8, 3, 120000, 15, 25, '2026-Q1');
    expect(plan1.recordId).toMatch(/^franexp-/);

    const topMarkets = franchiseExpansionPlanner.getTopExpansionMarkets(5);
    expect(topMarkets.length).toBe(2);
    expect(topMarkets[0].expansionScore).toBeGreaterThanOrEqual(topMarkets[1].expansionScore);
  });
});

// ─── Phase 292: Corporate Events & Hospitality ───────────────────────────────

describe('Phase 292: Corporate Events & Hospitality Intelligence', () => {
  it('creates event and records completion data', () => {
    const event = corporateEventManager.create('Annual Client Gala', 'gala', 'Sales', 150, 20, 'Grand Hotel', Date.now() + 30 * 86400000, 100000);
    expect(event.eventId).toMatch(/^corpevt-/);
    expect(event.externalAttendees).toBe(130);

    corporateEventManager.complete(event.eventId, 95000, 500000, 85, 92, true);
    const updated = corporateEventManager.getEvent(event.eventId);
    expect(updated?.budgetVariancePct).toBe(-5);
    expect(updated?.complianceStatus).toBe('compliant');
    expect(updated?.status).toBe('completed');
  });

  it('manages hospitality budget and detects overruns', () => {
    const budget = hospitalityBudgetManager.allocate('2026-Q1', 'Sales', 200000);
    expect(budget.budgetId).toMatch(/^hospbud-/);
    expect(budget.remainingBudget).toBe(200000);

    hospitalityBudgetManager.updateSpend('Sales', '2026-Q1', 180000, 5, 200, 900000);
    const latest = hospitalityBudgetManager.getLatest('Sales');
    expect(latest?.utilizationRatePct).toBe(90);
    expect(latest?.costPerGuest).toBe(900);
    expect(latest?.roiEstimatePct).toBe(400); // (900k-180k)/180k × 100
  });

  it('tracks guest experience and deal conversion', () => {
    const event = corporateEventManager.create('Product Launch Dinner', 'product_launch', 'Marketing', 50, 10, 'Restaurant', Date.now() + 14 * 86400000, 30000);
    guestExperienceTracker.record(event.eventId, 'guest-1', 'Ahmet Yıldız', 'Prospect Corp', 'prospect', 3, 4.5, 60, true, true);
    guestExperienceTracker.record(event.eventId, 'guest-2', 'Zeynep Kara', 'Client Ltd', 'key_client', 4, 5, 80, true, false);

    const avgNPS = guestExperienceTracker.getAvgNPS(event.eventId);
    expect(avgNPS).toBe(70);
    const convRate = guestExperienceTracker.getDealConversionRate(event.eventId);
    expect(convRate).toBe(50); // 1/2 external guests progressed deal
  });

  it('assesses hospitality compliance and regulatory risk', () => {
    const record = hospitalityComplianceTracker.assess('2026-Q1', 30, 28, 1, 150, 200, 25, 25);
    expect(record.recordId).toMatch(/^hospcomp-/);
    expect(record.complianceRatePct).toBeCloseTo(93.33, 1);
    expect(record.regulatoryRisk).toBe('medium'); // 1 violation → riskScore=1 → medium

    const latest = hospitalityComplianceTracker.getLatest();
    expect(latest?.complianceRatePct).toBeGreaterThan(90);
  });
});
