/**
 * Tests for Phase 251-256: Enterprise Intelligence (EX, ESG, Digital Transformation, CDP, Ecosystem, ONA)
 */

import { describe, it, expect } from 'vitest';

// Phase 251: Employee Experience Intelligence
import { exScoreCalculator, pulseSurveyAnalyzer, wellbeingMonitor, engagementDriverAnalyzer } from '../employee-experience-intelligence';

// Phase 252: Sustainability & ESG Intelligence
import { carbonEmissionTracker, esgScorer, sustainabilityTargetManager, esgComplianceTracker } from '../sustainability-esg-intelligence';

// Phase 253: Digital Transformation Intelligence
import { transformationInitiativeTracker, digitizationMaturityAssessor, adoptionVelocityTracker, transformationROICalculator } from '../digital-transformation-intelligence';

// Phase 254: Customer Data Platform Intelligence
import { unifiedProfileManager, identityResolutionEngine, segmentManager, dataActivationManager } from '../customer-data-platform';

// Phase 255: Ecosystem Health Intelligence
import { partnerHealthMonitor, marketplaceVitalityAnalyzer, apiConsumerHealthTracker, ecosystemGrowthReporter } from '../ecosystem-health-intelligence';

// Phase 256: Organizational Network Analytics
import { collaborationNetworkMapper, employeeNetworkProfiler, siloDetector, knowledgeFlowAnalyzer } from '../organizational-network-analytics';

describe('Phase 251: Employee Experience Intelligence', () => {
  it('calculates EX score with weighted composite and detects at-risk employees', () => {
    const good = exScoreCalculator.calculate('emp-1', 'engineering', 'Q2-2026', 80, 85, 78, 90, 82);
    const poor = exScoreCalculator.calculate('emp-2', 'sales', 'Q2-2026', 30, 25, 40, 50, 35);
    expect(good.overallEXScore).toBeGreaterThan(poor.overallEXScore);
    const atRisk = exScoreCalculator.getAtRisk(50);
    expect(atRisk.some(s => s.employeeId === 'emp-2')).toBe(true);
  });

  it('calculates eNPS from pulse survey responses', () => {
    pulseSurveyAnalyzer.submit('survey-1', 'emp-a', 'eng', { q1: 9 }, 10);  // promoter
    pulseSurveyAnalyzer.submit('survey-1', 'emp-b', 'eng', { q1: 5 }, 4);   // detractor
    pulseSurveyAnalyzer.submit('survey-1', 'emp-c', 'eng', { q1: 8 }, 8);   // passive
    const nps = pulseSurveyAnalyzer.getSurveyNPS('survey-1');
    // 1 promoter (10), 1 detractor (4), 1 passive (8) → (1-1)/3 × 100 = 0
    expect(nps).toBeCloseTo(0, 0);
    expect(pulseSurveyAnalyzer.getResponseRate('survey-1', 10)).toBe(30);
  });

  it('detects burnout risk based on stress and overtime', () => {
    const risky = wellbeingMonitor.record('emp-burnout', 'Q2', 9, 25, 30, 5);
    expect(risky.burnoutRisk).toBe('critical');
    const safe = wellbeingMonitor.record('emp-healthy', 'Q2', 3, 2, 85, 1);
    expect(safe.burnoutRisk).toBe('low');
    const highRisk = wellbeingMonitor.getHighBurnoutRisk();
    expect(highRisk.some(i => i.employeeId === 'emp-burnout')).toBe(true);
  });

  it('prioritizes engagement drivers by gap and impact', () => {
    engagementDriverAnalyzer.upsert('Career Growth', 'growth', 0.9, 40, 75);  // large gap + high impact
    engagementDriverAnalyzer.upsert('Office Snacks', 'culture', 0.1, 72, 75);  // small gap + low impact
    const top = engagementDriverAnalyzer.getTopPriority(2);
    expect(top[0].name).toBe('Career Growth');
  });
});

describe('Phase 252: Sustainability & ESG Intelligence', () => {
  it('tracks carbon emissions by scope and returns totals', () => {
    carbonEmissionTracker.record('scope1', 'Company Fleet', 'transport', 50, '2026-04', 'logistics');
    carbonEmissionTracker.record('scope2', 'Data Center', 'energy', 200, '2026-04', 'it');
    carbonEmissionTracker.record('scope3', 'Supply Chain', 'supply_chain', 500, '2026-04', 'procurement');
    const byScope = carbonEmissionTracker.getTotalByScope('2026-04');
    expect(byScope.scope1).toBe(50);
    expect(byScope.scope2).toBe(200);
    expect(byScope.scope3).toBe(500);
    expect(carbonEmissionTracker.getTotalEmissions('2026-04')).toBe(750);
  });

  it('calculates ESG score and assigns correct rating', () => {
    const score = esgScorer.calculate('2026-Q1', 85, 78, 82, ['Renewable energy target exceeded']);
    const expected = 85 * 0.4 + 78 * 0.35 + 82 * 0.25;
    expect(score.overallESGScore).toBeCloseTo(expected, 1);
    expect(score.rating).toBe('AA');
  });

  it('tracks sustainability targets and detects off-track ones', () => {
    const target = sustainabilityTargetManager.set('Net Zero 2030', 'carbon', 2030, 1000, 0);
    sustainabilityTargetManager.updateProgress(target.targetId, 900);  // only 10% of 1000 reduction
    const offTrack = sustainabilityTargetManager.getOffTrack();
    expect(offTrack.some(t => t.targetId === target.targetId)).toBe(true);
  });

  it('tracks ESG compliance and calculates compliance rate', () => {
    const item1 = esgComplianceTracker.register('CSRD', 'EU', 'Annual ESG report', Date.now() + 86400000 * 365);
    const item2 = esgComplianceTracker.register('TCFD', 'Global', 'Climate risk disclosure', Date.now() + 86400000 * 180);
    esgComplianceTracker.updateStatus(item1.itemId, 'compliant');
    const rate = esgComplianceTracker.getComplianceRate();
    expect(rate).toBe(50);
    expect(esgComplianceTracker.getNonCompliant().some(i => i.itemId === item2.itemId)).toBe(true);
  });
});

describe('Phase 253: Digital Transformation Intelligence', () => {
  it('creates transformation initiatives and tracks status', () => {
    const init = transformationInitiativeTracker.create('AI Ops Modernization', 'operations', 'CTO', 500000, Date.now() + 86400000 * 365, 150);
    expect(init.phase).toBe('discovery');
    transformationInitiativeTracker.updateProgress(init.initiativeId, 'pilot', 45, 100000, 20);
    expect(transformationInitiativeTracker.getInitiative(init.initiativeId)?.phase).toBe('pilot');
  });

  it('assesses digitization maturity levels correctly', () => {
    const advanced = digitizationMaturityAssessor.assess('CustomerOps', 85, 90, 80, 75, 88);
    const basic = digitizationMaturityAssessor.assess('BackOffice', 25, 30, 20, 35, 28);
    expect(advanced.maturityLevel).toBeGreaterThanOrEqual(4);
    expect(basic.maturityLevel).toBeLessThanOrEqual(2);
    expect(digitizationMaturityAssessor.getLowMaturityDomains(2).some(s => s.domain === 'BackOffice')).toBe(true);
  });

  it('tracks adoption velocity and detects trend', () => {
    const m1 = adoptionVelocityTracker.record('init-1', 'Week-1', 50, 50, 5, 80, 10);
    const m2 = adoptionVelocityTracker.record('init-1', 'Week-2', 80, 125, 3, 85, 5);
    expect(m1.netAdoptionVelocity).toBe(45);
    expect(m2.netAdoptionVelocity).toBe(77);
    const trend = adoptionVelocityTracker.getVelocityTrend('init-1');
    expect(trend).toBe('accelerating');
  });

  it('calculates transformation ROI with payback period', () => {
    const report = transformationROICalculator.calculate('2026-H1', 1200000, 400000, 600000, 200000);
    expect(report.totalBenefits).toBe(1200000);
    expect(report.roi).toBeCloseTo(0, 0);  // (1200000 - 1200000) / 1200000 × 100 = 0
    expect(report.paybackMonths).toBe(12);
  });
});

describe('Phase 254: Customer Data Platform Intelligence', () => {
  it('resolves identities and merges profiles', () => {
    const p1 = unifiedProfileManager.upsert(['user@example.com', 'cookie-abc'], { name: 'Alice' }, 'organic');
    const p2 = unifiedProfileManager.upsert(['cookie-abc', 'device-xyz'], { city: 'Istanbul' }, 'paid');
    // Same cookie → same profile
    expect(p1.profileId).toBe(p2.profileId);
    expect(p1.resolvedIdentities).toContain('device-xyz');
    const found = unifiedProfileManager.findByIdentity('device-xyz');
    expect(found?.profileId).toBe(p1.profileId);
  });

  it('creates identity resolution rules sorted by priority', () => {
    const r1 = identityResolutionEngine.addRule('Email Match', 'deterministic', 'email', 99, 10);
    const r2 = identityResolutionEngine.addRule('IP Match', 'probabilistic', 'ip_address', 40, 1);
    const active = identityResolutionEngine.getActiveRules();
    expect(active[0].priority).toBeGreaterThan(active[1].priority);
    expect(r1.confidence).toBeGreaterThan(r2.confidence);
  });

  it('creates segments and finds largest ones', () => {
    const s1 = segmentManager.create('High Value', 'LTV > 1000', 'value_based', [{ field: 'ltv', operator: '>', value: 1000 }], ['email']);
    const s2 = segmentManager.create('New Users', 'Signed up last 7 days', 'lifecycle', [], ['push_notification']);
    segmentManager.updateMemberCount(s1.segmentId, 5000);
    segmentManager.updateMemberCount(s2.segmentId, 200);
    const largest = segmentManager.getLargestSegments(1);
    expect(largest[0].segmentId).toBe(s1.segmentId);
  });

  it('runs data activation jobs and tracks success rate', () => {
    const job1 = dataActivationManager.createJob('seg-1', 'Mailchimp', 'email_platform');
    const job2 = dataActivationManager.createJob('seg-2', 'Google Ads', 'ad_network');
    dataActivationManager.complete(job1.jobId, 5000);
    dataActivationManager.fail(job2.jobId, 'API quota exceeded');
    expect(dataActivationManager.getSuccessRate()).toBe(50);
  });
});

describe('Phase 255: Ecosystem Health Intelligence', () => {
  it('evaluates partner health and identifies churn risk', () => {
    const healthy = partnerHealthMonitor.evaluate('p1', 'TechCo', 'technology', 85, 90, 100000, 15);
    const risky = partnerHealthMonitor.evaluate('p2', 'OldPartner', 'channel', 10, 20, 5000, -5);
    expect(healthy.churnRisk).toBe('low');
    expect(risky.churnRisk).toBe('high');
    const atRisk = partnerHealthMonitor.getAtRisk();
    expect(atRisk.some(r => r.partnerId === 'p2')).toBe(true);
  });

  it('records marketplace vitality and detects growth trend', () => {
    marketplaceVitalityAnalyzer.record('March', 1000, 800, 50, 200000, 500, 70, 65);
    marketplaceVitalityAnalyzer.record('April', 1100, 900, 100, 230000, 520, 72, 68);
    const trend = marketplaceVitalityAnalyzer.getGrowthTrend();
    expect(trend).toBe('growing');
    expect(marketplaceVitalityAnalyzer.getLatest()?.liquidityScore).toBeGreaterThan(0);
  });

  it('tracks API consumer health and identifies high churn risk', () => {
    apiConsumerHealthTracker.upsert('ActiveDev', 'key-1', 5000, 0.5, 80, 15, 'professional');
    apiConsumerHealthTracker.upsert('InactiveDev', 'key-2', 3, 2, 200, 1, 'free');
    const highRisk = apiConsumerHealthTracker.getChurnRisk('high');
    expect(highRisk.some(c => c.consumerName === 'InactiveDev')).toBe(true);
  });

  it('generates ecosystem growth report with net partner growth', () => {
    const report = ecosystemGrowthReporter.generate('Q2-2026', 100, 15, 5, 2000000, 1800000, [80, 85, 40, 90, 70]);
    expect(report.netPartnerGrowth).toBe(10);
    expect(report.revenueGrowthPct).toBeCloseTo(((2000000 - 1800000) / 1800000) * 100, 1);
    expect(report.healthyPartnerPct).toBe(80);  // 4 of 5 > 70
  });
});

describe('Phase 256: Organizational Network Analytics', () => {
  it('maps collaboration and identifies most connected employees', () => {
    collaborationNetworkMapper.record('alice', 'bob', 'meeting', 25, 'April');
    collaborationNetworkMapper.record('alice', 'carol', 'email', 30, 'April');
    collaborationNetworkMapper.record('alice', 'dave', 'chat', 15, 'April');
    const mostConnected = collaborationNetworkMapper.getMostConnected(1);
    expect(mostConnected[0].employeeId).toBe('alice');
    expect(mostConnected[0].connectionCount).toBe(3);
    const strong = collaborationNetworkMapper.getStrongConnections('alice');
    expect(strong.every(e => e.strength === 'strong')).toBe(true);
  });

  it('profiles employee network and detects isolated employees', () => {
    employeeNetworkProfiler.profile('alice', 'engineering', 'lead', 50, 60, 85, 70);
    employeeNetworkProfiler.profile('isolated-emp', 'finance', 'analyst', 1, 5, 10, 5);
    const isolated = employeeNetworkProfiler.getIsolated();
    expect(isolated.some(p => p.employeeId === 'isolated-emp')).toBe(true);
    const influencers = employeeNetworkProfiler.getTopInfluencers(1);
    expect(influencers[0].employeeId).toBe('alice');
  });

  it('detects silos with high isolation scores', () => {
    const silo = siloDetector.detect(['finance', 'legal'], 90, []);  // 90% intra-group
    expect(silo.isolationScore).toBeGreaterThan(50);
    const critical = siloDetector.getCriticalSilos(60);
    expect(critical.some(s => s.siloId === silo.siloId)).toBe(true);
    expect(siloDetector.getSilosWithNoBridge().some(s => s.siloId === silo.siloId)).toBe(true);
  });

  it('analyzes knowledge flow and calculates concentration risk', () => {
    knowledgeFlowAnalyzer.analyze('Q2-2026', ['alice', 'bob'], ['team-c', 'team-d'], 2.5, 30, 45);
    const risk = knowledgeFlowAnalyzer.getKnowledgeConcentrationRisk();
    expect(risk).toBeGreaterThanOrEqual(0);
    expect(risk).toBeLessThanOrEqual(100);
    expect(knowledgeFlowAnalyzer.getLatest()?.knowledgeSources).toHaveLength(2);
  });
});
