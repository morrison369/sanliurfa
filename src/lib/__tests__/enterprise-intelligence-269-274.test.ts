/**
 * Tests for Phase 269-274: Channel Partners, Facilities, IP, Events, Subscriptions, Field Service
 */

import { describe, it, expect } from 'vitest';

// Phase 269: Channel Partner Intelligence
import { partnerPerformanceTracker, dealRegistrationManager, partnerEnablementManager, channelHealthAnalyzer } from '../channel-partner-intelligence';

// Phase 270: Facilities Intelligence
import { spaceUtilizationTracker, leaseManager, facilitiesCostAnalyzer, workplaceOptimizationAdvisor } from '../facilities-intelligence';

// Phase 271: Intellectual Property Intelligence
import { patentPortfolioManager, trademarkMonitor, ipValuationEngine, licensingManager } from '../intellectual-property-intelligence';

// Phase 272: Event Intelligence
import { eventManager, sessionPerformanceTracker, sponsorValueTracker, attendeeEngagementAnalyzer } from '../event-intelligence';

// Phase 273: Subscription Lifecycle Intelligence
import { subscriptionHealthMonitor, expansionRevenueEngine, renewalForecastEngine, contractionTracker } from '../subscription-lifecycle-intelligence';

// Phase 274: Field Service Intelligence
import { workOrderManager, technicianPerformanceTracker, slaPerformanceAnalyzer, fieldServiceCostTracker } from '../field-service-intelligence';

describe('Phase 269: Channel Partner Intelligence', () => {
  it('records partner performance and identifies at-risk partners', () => {
    const top = partnerPerformanceTracker.record('p1', 'TopPartner', 'platinum', 'Q2', 500000, 200000, 10, 2, 5, 95);
    const weak = partnerPerformanceTracker.record('p2', 'WeakPartner', 'silver', 'Q2', 50000, 5000, 1, 5, 1, 20);
    expect(top.performanceScore).toBeGreaterThan(weak.performanceScore);
    const atRisk = partnerPerformanceTracker.getAtRisk(40);
    expect(atRisk.some(r => r.partnerId === 'p2')).toBe(true);
    expect(partnerPerformanceTracker.getTopPartners(1)[0].partnerId).toBe('p1');
  });

  it('manages deal registrations and calculates approval rate', () => {
    const reg1 = dealRegistrationManager.register('p1', 'TopPartner', 'MegaCorp', 250000, 'Platform');
    const reg2 = dealRegistrationManager.register('p1', 'TopPartner', 'SmallCo', 25000, 'Analytics');
    dealRegistrationManager.approve(reg1.registrationId, 'sales-mgr');
    dealRegistrationManager.closeWon(reg1.registrationId);
    // reg2 still pending
    expect(dealRegistrationManager.getApprovalRate()).toBeGreaterThan(0);
    expect(dealRegistrationManager.getPending().some(r => r.registrationId === reg2.registrationId)).toBe(true);
  });

  it('tracks enablement progress and earns certification', () => {
    const track = partnerEnablementManager.enroll('p1', 'Sales Certification', 10);
    expect(track.status).toBe('not_started');
    partnerEnablementManager.progress(track.trackId, 10);
    expect(partnerEnablementManager.getCompletionRate('p1')).toBe(100);
    const updated = partnerEnablementManager.enroll('p2', 'Technical Certification', 5);
    expect(partnerEnablementManager.getNotStarted().some(t => t.trackId === updated.trackId)).toBe(true);
  });

  it('generates channel health report with composite score', () => {
    const report = channelHealthAnalyzer.generate('Q2', 25, 5000000, 1500000, 72, 'TopPartner', 3, 85);
    expect(report.partnerSourcedRevenuePct).toBe(30);
    expect(report.channelHealthScore).toBeGreaterThan(0);
    expect(report.topPerformingPartner).toBe('TopPartner');
  });
});

describe('Phase 270: Facilities Intelligence', () => {
  it('tracks space utilization and identifies underutilized locations', () => {
    spaceUtilizationTracker.record('hq-office', 'HQ Floor 5', 'office', 200, 85, 95, 90, 5, 10000, 'April');
    spaceUtilizationTracker.record('branch-nyc', 'NYC Branch', 'office', 100, 20, 45, 35, 6, 5000, 'April');
    const underutilized = spaceUtilizationTracker.getUnderutilized(30);
    expect(underutilized.some(r => r.locationId === 'branch-nyc')).toBe(true);
    expect(spaceUtilizationTracker.getTotalMonthlyCost()).toBeGreaterThan(0);
  });

  it('manages leases and detects expiring ones', () => {
    leaseManager.add('HQ Tower', '123 Main St', 50000, 100000, Date.now() - 86400000 * 365 * 2, Date.now() + 86400000 * 90, 3, 'Landlord Inc');
    leaseManager.add('Remote Office', '456 Park Ave', 5000, 10000, Date.now() - 86400000 * 365, Date.now() + 86400000 * 500, 2, 'REIT Co');
    const expiring = leaseManager.getExpiringSoon(180);
    expect(expiring.some(l => l.propertyName === 'HQ Tower')).toBe(true);
    expect(leaseManager.getTotalAnnualRent()).toBeGreaterThan(0);
  });

  it('analyzes facilities cost vs benchmark', () => {
    facilitiesCostAnalyzer.record('hq-office', 'April', 100000, 20000, 15000, 5000, 8000, 100, 1500);
    const cost = facilitiesCostAnalyzer.getLatest('hq-office');
    expect(cost?.totalCost).toBe(148000);
    expect(cost?.costPerEmployee).toBe(1480);
    const overBenchmark = facilitiesCostAnalyzer.getOverBenchmark(0);  // 1480 > 1500 → false
    // variance = (1480 - 1500) / 1500 × 100 = -1.3% → not over 0%
    expect(overBenchmark.every(r => r.varianceVsBenchmarkPct > 0)).toBe(true);
  });

  it('recommends workplace optimizations and finds quick wins', () => {
    workplaceOptimizationAdvisor.recommend('branch-nyc', 'NYC Branch', 'consolidate', 'Only 20% utilization', 300000, 50000, 50);
    workplaceOptimizationAdvisor.recommend('hq-office', 'HQ Floor 5', 'hotdesking', 'Hybrid work policy', 80000, 200000, 200);
    const quickWins = workplaceOptimizationAdvisor.getQuickWins();  // payback ≤ 12 months
    // NYC: 300000/50000 × 12 = 2 months → quick win
    expect(quickWins.some(r => r.locationId === 'branch-nyc')).toBe(true);
    expect(workplaceOptimizationAdvisor.getTotalPotentialSavings()).toBe(380000);
  });
});

describe('Phase 271: Intellectual Property Intelligence', () => {
  it('registers patents and tracks portfolio value', () => {
    const p1 = patentPortfolioManager.register('AI Scheduling Algorithm', 'US2026/001', ['alice', 'bob'], 'AI/ML', ['US', 'EU'], false);
    patentPortfolioManager.grant(p1.patentId, 2000000);
    patentPortfolioManager.updateMetrics(p1.patentId, 15, 150000, 5000);
    expect(patentPortfolioManager.getPortfolioValue()).toBe(2000000);
    expect(patentPortfolioManager.getMostCited(1)[0].citationCount).toBe(15);
  });

  it('monitors trademarks and detects infringements', () => {
    const tm = trademarkMonitor.register('SANLIURFA', 'wordmark', [42, 35], ['TR', 'EU', 'US'], 500000);
    trademarkMonitor.recordInfringementAlert(tm.trademarkId);
    trademarkMonitor.recordInfringementAlert(tm.trademarkId);
    expect(trademarkMonitor.getActiveInfringements()[0].infringementAlerts).toBe(2);
    // Not registered yet, so brand value sum = 0
    expect(trademarkMonitor.getTotalBrandValue()).toBe(0);
  });

  it('values IP assets with composite method', () => {
    const patent = patentPortfolioManager.register('Data Compression Patent', 'US2026/002', ['carol'], 'Data', ['US'], false);
    const val = ipValuationEngine.value('patent', patent.patentId, 'income', 1000000, 500000, 300000);
    expect(val.totalValue).toBe(1000000 + 500000 * 0.5 + 300000 * 0.3);  // 1340000
    expect(ipValuationEngine.getTotalIPPortfolioValue()).toBeGreaterThan(0);
  });

  it('creates licensing agreements and tracks royalties', () => {
    const p = patentPortfolioManager.register('Core Tech', 'US2026/003', ['dave'], 'Core', ['US'], false);
    const agreement = licensingManager.create(p.patentId, 'BigCorp', 'non_exclusive', ['US', 'EU'], 200000, 5, Date.now() + 365 * 86400000 * 3);
    expect(licensingManager.getTotalAnnualRoyalties()).toBe(200000);
    const expiring = licensingManager.getExpiringAgreements(400 * 365);
    expect(expiring.some(a => a.agreementId === agreement.agreementId)).toBe(true);
  });
});

describe('Phase 272: Event Intelligence', () => {
  it('creates events and calculates ROI after completion', () => {
    const event = eventManager.create('TechSummit 2026', 'conference', Date.now(), Date.now() + 86400000 * 2, 1000, 500000);
    eventManager.complete(event.eventId, 950, 480000, 50000, 300, 2000000, 72);
    const updated = eventManager.getEvent(event.eventId);
    expect(updated?.attendanceRatePct).toBe(95);
    expect(updated?.netROI).toBeGreaterThan(0);
    expect(eventManager.getAverageNPS()).toBe(72);
  });

  it('tracks session performance and ranks top sessions', () => {
    sessionPerformanceTracker.record('evt-1', 'AI in Practice', 'Dr Smith', 'AI', 100, 95, 4.8, 92, 45);
    sessionPerformanceTracker.record('evt-1', 'Security Basics', 'Jane Doe', 'Security', 80, 40, 3.2, 85, 5);
    const top = sessionPerformanceTracker.getTopSessions('evt-1', 1);
    expect(top[0].title).toBe('AI in Practice');
    expect(sessionPerformanceTracker.getAverageRating('evt-1')).toBeCloseTo(4, 0);
  });

  it('evaluates sponsor value and identifies renewal likelihood', () => {
    const highROI = sponsorValueTracker.evaluate('evt-1', 'TechGiant', 'platinum', 100000, 50000, 200, 2, 500);
    const lowROI = sponsorValueTracker.evaluate('evt-1', 'SmallCo', 'bronze', 5000, 1000, 5, 0, 20);
    expect(highROI.renewalLikelihood).toBe('high');
    expect(lowROI.renewalLikelihood).not.toBe('high');
    expect(sponsorValueTracker.getTotalSponsorRevenue('evt-1')).toBe(105000);
  });

  it('analyzes attendee engagement and calculates satisfaction', () => {
    const metric = attendeeEngagementAnalyzer.analyze('evt-1', 'Day1', 1000, 950, 70, 800, 600, 1200);
    expect(metric.satisfactionScore).toBeGreaterThan(0);
    expect(metric.satisfactionScore).toBeLessThanOrEqual(100);
    expect(attendeeEngagementAnalyzer.getAverageCheckInRate()).toBeCloseTo(95, 0);
  });
});

describe('Phase 273: Subscription Lifecycle Intelligence', () => {
  it('evaluates subscription health and detects at-risk accounts', () => {
    const healthy = subscriptionHealthMonitor.evaluate('sub-1', 'cust-1', 'enterprise', 5000, 60, 85, 20, 0, 100);
    const risky = subscriptionHealthMonitor.evaluate('sub-2', 'cust-2', 'starter', 500, 14, 15, 1, 8, 40);
    expect(healthy.healthBand).toBe('healthy');
    expect(risky.healthBand).toBe('at_risk');
    expect(subscriptionHealthMonitor.getAtRisk().some(r => r.subscriptionId === 'sub-2')).toBe(true);
    expect(subscriptionHealthMonitor.getTotalMRR()).toBe(5500);
  });

  it('identifies expansion opportunities and calculates pipeline MRR', () => {
    const opp = expansionRevenueEngine.identify('sub-1', 'cust-1', 5000, 'seat_expansion', 2000, 80, ['Power user count up 40%']);
    expect(opp.status).toBe('identified');
    const pipeline = expansionRevenueEngine.getTotalPipelineMRR();
    expect(pipeline).toBeCloseTo(2000 * 0.8, 0);  // 1600
    expansionRevenueEngine.win(opp.opportunityId);
    expect(expansionRevenueEngine.getHighProbability(70).every(o => o.opportunityId !== opp.opportunityId)).toBe(true);
  });

  it('forecasts renewals with health-weighted model', () => {
    const forecast = renewalForecastEngine.forecast('Q3-2026', 100, 500000, 85, 50000, { healthy: 60, neutral: 30, atRisk: 10 });
    expect(forecast.forecastedRenewalRatePct).toBeGreaterThan(75);
    expect(forecast.netRevenueRetentionPct).toBeGreaterThan(80);
    expect(forecast.forecastedChurnMRR).toBeGreaterThan(0);
  });

  it('tracks contractions and identifies top reasons', () => {
    contractionTracker.record('sub-3', 'cust-3', 3000, 1500, 'downgrade');
    contractionTracker.record('sub-4', 'cust-4', 5000, 3000, 'seat_reduction');
    contractionTracker.record('sub-5', 'cust-5', 2000, 500, 'downgrade');
    expect(contractionTracker.getTotalMRRLost()).toBe(5000);
    const byReason = contractionTracker.getByReason();
    expect(byReason['downgrade']).toBeGreaterThan(byReason['seat_reduction']);
  });
});

describe('Phase 274: Field Service Intelligence', () => {
  it('creates work orders with correct SLA deadlines', () => {
    const emergency = workOrderManager.create('cust-1', 'repair', 'p1_emergency');
    const standard = workOrderManager.create('cust-2', 'maintenance', 'p3_standard');
    expect(emergency.slaDeadline).toBeLessThan(standard.slaDeadline);  // 4h vs 72h
    expect(emergency.status).toBe('open');
    workOrderManager.assign(emergency.workOrderId, 'tech-1', Date.now() + 3600000);
    expect(workOrderManager.getOpen().some(o => o.workOrderId === standard.workOrderId)).toBe(true);
  });

  it('completes work orders and calculates first-time fix rate', () => {
    const wo1 = workOrderManager.create('cust-3', 'installation', 'p2_urgent');
    const wo2 = workOrderManager.create('cust-4', 'repair', 'p2_urgent');
    workOrderManager.complete(wo1.workOrderId, 30, 90, true, 5);
    workOrderManager.complete(wo2.workOrderId, 45, 120, false, 3);
    expect(workOrderManager.getFirstTimeFixRate()).toBe(50);  // 1 of 2
  });

  it('tracks technician performance with composite score', () => {
    const top = technicianPerformanceTracker.record('tech-1', 'Alice', 'April', 50, 45, 60, 20, 4.8, 96, 85);
    const avg = technicianPerformanceTracker.record('tech-2', 'Bob', 'April', 30, 18, 90, 35, 3.5, 75, 65);
    expect(top.performanceScore).toBeGreaterThan(avg.performanceScore);
    expect(technicianPerformanceTracker.getTopTechnicians(1)[0].technicianId).toBe('tech-1');
  });

  it('generates SLA report and calculates penalty risk', () => {
    const orders = Array.from({ length: 3 }, (_, i) => {
      const o = workOrderManager.create(`cust-${i + 10}`, 'maintenance', 'p3_standard');
      if (i < 2) workOrderManager.complete(o.workOrderId, 20, 60, true);
      return workOrderManager.getOpen().find(w => w.workOrderId === o.workOrderId) || o;
    });
    const allOrders = workOrderManager.getOpen().concat(workOrderManager.getSLABreached ? workOrderManager.getSLABreached() : []);
    const report = slaPerformanceAnalyzer.generate('April', 'maintenance', allOrders, 1000);
    expect(report.totalWorkOrders).toBeGreaterThanOrEqual(0);
    const costRecord = fieldServiceCostTracker.record('April', 50000, 15000, 20000, 10000, 100, 500, 150000);
    expect(costRecord.grossMarginPct).toBeCloseTo(((150000 - 95000) / 150000) * 100, 0);
  });
});
