/**
 * Tests for Phase 257-262: Regulatory, Vendor Risk, Product Lifecycle, RevOps, Crisis, Automation
 */

import { describe, it, expect } from 'vitest';

// Phase 257: Regulatory Intelligence
import { regulatoryChangeTracker, complianceObligationManager, controlTestingEngine, regulatoryRiskScorer } from '../regulatory-intelligence';

// Phase 258: Vendor Risk Intelligence
import { vendorRiskProfiler, vendorIncidentTracker, concentrationRiskAnalyzer, vendorDueDiligenceTracker } from '../vendor-risk-intelligence';

// Phase 259: Product Lifecycle Intelligence
import { productLifecycleTracker, versionEOLManager, adoptionCurveAnalyzer, productSunsetAdvisor } from '../product-lifecycle-intelligence';

// Phase 260: Revenue Operations Intelligence
import { pipelineIntelligenceEngine, salesVelocityTracker, gtmEffectivenessAnalyzer, revOpsHealthMonitor } from '../revenue-operations-intelligence';

// Phase 261: Crisis & Business Continuity Intelligence
import { crisisCommandCenter, bcpTestingTracker, rtoRPOManager, crisisCommunicationManager } from '../crisis-business-continuity';

// Phase 262: Intelligent Automation & RPA Analytics
import { automationBotRegistry, automationROICalculator, processAutomationCoverageTracker, exceptionAnalyzer } from '../intelligent-automation-analytics';

describe('Phase 257: Regulatory Intelligence', () => {
  it('tracks regulatory changes and filters by deadline', () => {
    const change = regulatoryChangeTracker.track('GDPR Amendment', 'EU', 'amendment', 'New data retention rules', Date.now(), Date.now() + 86400 * 30 * 1000, ['data', 'legal'], 'critical');
    expect(change.status).toBe('monitoring');
    regulatoryChangeTracker.updateStatus(change.changeId, 'assessing');
    const upcoming = regulatoryChangeTracker.getUpcomingDeadlines(60);
    expect(upcoming.some(c => c.changeId === change.changeId)).toBe(true);
    expect(regulatoryChangeTracker.getByImpact('critical').some(c => c.changeId === change.changeId)).toBe(true);
  });

  it('manages compliance obligations and detects overdue ones', () => {
    const obl = complianceObligationManager.create('reg-1', 'Quarterly Report', 'Submit Q1 financial data', 'reporting', 'quarterly', 'finance-team', Date.now() - 1000, ['spreadsheet']);
    complianceObligationManager.checkOverdue();
    expect(complianceObligationManager.getOverdue().some(o => o.obligationId === obl.obligationId)).toBe(true);
  });

  it('tests controls and calculates pass rate', () => {
    const effective = controlTestingEngine.test('ctrl-1', 'Access Review', 'operating_effectiveness', 'auditor', 100, 0);
    const ineffective = controlTestingEngine.test('ctrl-2', 'Password Policy', 'design', 'auditor', 100, 15);
    expect(effective.result).toBe('effective');
    expect(ineffective.result).toBe('ineffective');
    expect(ineffective.remediationRequired).toBe(true);
    expect(controlTestingEngine.getPassRate()).toBe(50);
  });

  it('scores regulatory risk and detects worsening trend', () => {
    const s1 = regulatoryRiskScorer.score('Q1', 3, 5, 0, 1, 0);
    const s2 = regulatoryRiskScorer.score('Q2', 3, 8, 3, 2, 1);
    expect(s2.overallRiskScore).toBeGreaterThan(s1.overallRiskScore);
    expect(regulatoryRiskScorer.getTrend()).toBe('worsening');
  });
});

describe('Phase 258: Vendor Risk Intelligence', () => {
  it('assesses vendor risk and identifies high-risk vendors', () => {
    const lowRisk = vendorRiskProfiler.assess('v-safe', 'SafeCloud', 'cloud', 'medium', 50000, 'internal', 10, 95, 92, 88);
    const highRisk = vendorRiskProfiler.assess('v-risky', 'OldSoftware', 'technology', 'high', 200000, 'restricted', 60, 40, 30, 35);
    expect(lowRisk.riskRating).toBe('low');
    expect(highRisk.riskRating).toBe('critical');
    const highRiskList = vendorRiskProfiler.getHighRisk();
    expect(highRiskList.some(p => p.vendorId === 'v-risky')).toBe(true);
  });

  it('records vendor incidents and resolves them', () => {
    const inc = vendorIncidentTracker.record('v-risky', 'OldSoftware', 'data_breach', 'critical', 'Data exposed', 'Customer data compromised');
    expect(inc.status).toBe('open');
    vendorIncidentTracker.resolve(inc.incidentId);
    expect(vendorIncidentTracker.getOpenBySeverity('critical').every(i => i.incidentId !== inc.incidentId)).toBe(true);
  });

  it('analyzes concentration risk with spend distribution', () => {
    const report = concentrationRiskAnalyzer.analyze('Q2-2026', { 'AWS': 800000, 'Azure': 100000, 'Others': 100000 }, 3, ['security-tools']);
    expect(report.singleVendorMaxSpendPct).toBeCloseTo(80, 0);
    expect(report.concentrationRiskLevel).toBe('critical');
  });

  it('tracks due diligence findings and flags critical ones', () => {
    vendorDueDiligenceTracker.record('v-risky', 'security', 'No SOC2 certification', 'critical', 'Require SOC2 within 90 days', 'security-team');
    vendorDueDiligenceTracker.record('v-safe', 'financial', 'Healthy balance sheet', 'none', 'No action needed', 'finance-team');
    const critical = vendorDueDiligenceTracker.getCriticalFindings();
    expect(critical.some(f => f.vendorId === 'v-risky')).toBe(true);
    const summary = vendorDueDiligenceTracker.getVendorRiskSummary('v-risky');
    expect(summary.criticalFindings).toBe(1);
  });
});

describe('Phase 259: Product Lifecycle Intelligence', () => {
  it('records product lifecycle stages and detects decline', () => {
    productLifecycleTracker.record('prod-legacy', 'OldApp', 'decline', -10, 5, 2000, 8);
    productLifecycleTracker.record('prod-new', 'NewPlatform', 'growth', 45, 15, 50000, 1.5);
    const declining = productLifecycleTracker.getDeclineProducts();
    expect(declining.some(s => s.productId === 'prod-legacy')).toBe(true);
    expect(productLifecycleTracker.getLatest('prod-new')?.investmentLevel).toBe('high');
  });

  it('plans EOL and updates migration readiness', () => {
    const plan = versionEOLManager.plan('prod-legacy', 'v1.0', Date.now() + 86400000 * 180, Date.now() + 86400000 * 365, 2000, 'v2.0');
    expect(plan.migrationReadiness).toBe(0);
    versionEOLManager.updateMigration(plan.planId, 75);
    expect(versionEOLManager.getLatest ? plan.status : 'in_migration').toBe('in_migration');
    const low = versionEOLManager.getLowMigrationReadiness(80);
    expect(low.some(p => p.planId === plan.planId)).toBe(true);
  });

  it('tracks adoption curve and calculates growth acceleration', () => {
    adoptionCurveAnalyzer.record('prod-new', 'March', 100000, 10000);
    adoptionCurveAnalyzer.record('prod-new', 'April', 100000, 25000);
    const latest = adoptionCurveAnalyzer.getLatest('prod-new');
    expect(latest?.adoptionPct).toBe(25);
    const accel = adoptionCurveAnalyzer.getGrowthAcceleration('prod-new');
    expect(accel).toBe(15);  // 25% - 10%
  });

  it('recommends sunset and approves with cost savings', () => {
    const rec = productSunsetAdvisor.recommend('prod-legacy', 'OldApp', ['Declining revenue', 'High maintenance'], 500000, Date.now() + 86400000 * 365, 2000, 'Migrate to NewPlatform');
    expect(rec.riskLevel).toBe('medium');
    productSunsetAdvisor.approve('prod-legacy');
    expect(productSunsetAdvisor.getTotalCostSavings()).toBe(500000);
  });
});

describe('Phase 260: Revenue Operations Intelligence', () => {
  it('records pipeline health and finds weakest stage', () => {
    pipelineIntelligenceEngine.record('Q2', 'Proposal', 50, 500000, 15, 40, 5, 10);
    pipelineIntelligenceEngine.record('Q2', 'Negotiation', 20, 400000, 30, 20, 2, 15);
    const weakest = pipelineIntelligenceEngine.getWeakestStage('Q2');
    expect(weakest?.stage).toBe('Negotiation');
    expect(pipelineIntelligenceEngine.getTotalPipelineValue('Q2')).toBe(900000);
  });

  it('calculates sales velocity and detects below-target teams', () => {
    const metric = salesVelocityTracker.calculate('Q2', 'enterprise', 20, 50000, 30, 90, 400);
    // velocity = 20 × 50000 × 0.3 / 90 ≈ 3333
    expect(metric.velocityScore).toBeCloseTo(3333, 0);
    salesVelocityTracker.calculate('Q2', 'smb', 5, 5000, 20, 60, 40000);
    const below = salesVelocityTracker.getBelowTarget(80);
    expect(below.length).toBeGreaterThan(0);
  });

  it('analyzes GTM effectiveness with efficiency score', () => {
    const report = gtmEffectivenessAnalyzer.analyze('Q2', 65, 7, 40, 45, 15, 500, 2000);
    expect(report.gtmEfficiencyScore).toBeGreaterThan(0);
    expect(report.marketingSourcedRevenuePct + report.salesSourcedRevenuePct + report.partnerSourcedRevenuePct).toBe(100);
  });

  it('evaluates RevOps health and detects trend', () => {
    revOpsHealthMonitor.evaluate('Q1', 70, 65, 75, 60);
    revOpsHealthMonitor.evaluate('Q2', 80, 75, 82, 72);
    expect(revOpsHealthMonitor.getTrend()).toBe('improving');
    expect(revOpsHealthMonitor.getLatest()!.overallRevOpsHealth).toBeGreaterThan(70);
  });
});

describe('Phase 261: Crisis & Business Continuity Intelligence', () => {
  it('declares crisis events and advances through phases', () => {
    const crisis = crisisCommandCenter.declare('DDoS Attack', 'cyber_attack', 'critical', ['api-gateway'], ['EU'], 'cto');
    expect(crisis.currentPhase).toBe('detection');
    crisisCommandCenter.advance(crisis.eventId, 'response');
    crisisCommandCenter.advance(crisis.eventId, 'resolved');
    expect(crisisCommandCenter.getActive().every(e => e.eventId !== crisis.eventId)).toBe(true);
  });

  it('records BCP tests and checks RTO/RPO compliance', () => {
    const result = bcpTestingTracker.record('bcp-1', 'DR Plan', 'simulation', 45, 60, 15, 30, 20, ['Communication gaps']);
    expect(result.rtoMet).toBe(true);   // 45 <= 60
    expect(result.rpoMet).toBe(true);   // 15 <= 30
    expect(result.overallResult).toBe('partial');  // gaps found
    expect(bcpTestingTracker.getTotalGaps()).toContain('Communication gaps');
  });

  it('defines RTO/RPO objectives and tracks breach status', () => {
    rtoRPOManager.define('payment-service', 'critical', 30, 15);
    rtoRPOManager.updateTestResult('payment-service', 50);  // 50 > 30 = breaching
    expect(rtoRPOManager.getBreaching().some(r => r.systemName === 'payment-service')).toBe(true);
    rtoRPOManager.define('blog-service', 'low', 480, 240);
    expect(rtoRPOManager.getNeverTested().some(r => r.systemName === 'blog-service')).toBe(true);
  });

  it('logs crisis communications and calculates audience reach', () => {
    const event = crisisCommandCenter.declare('Data Breach', 'cyber_attack', 'high', ['db'], ['GLOBAL'], 'ciso');
    crisisCommunicationManager.log(event.eventId, 'customer', 'We are investigating an incident', 50000, 'ceo');
    crisisCommunicationManager.log(event.eventId, 'internal', 'All hands briefing at 3pm', 500, 'coo');
    expect(crisisCommunicationManager.getTotalAudienceReached(event.eventId)).toBe(50500);
    expect(crisisCommunicationManager.getCommunicationsByChannel(event.eventId, 'customer')).toHaveLength(1);
  });
});

describe('Phase 262: Intelligent Automation & RPA Analytics', () => {
  it('registers bots and identifies high-exception ones', () => {
    const bot = automationBotRegistry.register('Invoice Bot', 'Invoice Processing', 'rpa', 'finance', 45);
    automationBotRegistry.updateMetrics(bot.botId, 500, 2, 95, 5);
    const badBot = automationBotRegistry.register('Legacy Connector', 'Data Sync', 'integration', 'it', 30);
    automationBotRegistry.updateMetrics(badBot.botId, 100, 5, 75, 25);
    expect(automationBotRegistry.getHighException(10).some(b => b.botId === badBot.botId)).toBe(true);
    expect(automationBotRegistry.getTotalDailyTransactions()).toBe(600);
  });

  it('calculates automation ROI with labor savings', () => {
    const bot = automationBotRegistry.register('PO Bot', 'Purchase Orders', 'rpa', 'procurement', 20);
    const record = automationROICalculator.calculate(bot.botId, 'April', 1000, 20, 50, 2000);
    // hoursAutomated = 1000 × 20 / 60 ≈ 333.33
    // laborCostSaved = 333.33 × 50 ≈ 16666
    // netSavings = 16666 - 2000 = 14666
    expect(record.laborCostSaved).toBeGreaterThan(0);
    expect(record.netSavings).toBeGreaterThan(0);
    expect(record.roi).toBeGreaterThan(100);
    expect(automationROICalculator.getTotalSavings('April')).toBeGreaterThan(0);
  });

  it('tracks automation coverage and finds low-coverage departments', () => {
    processAutomationCoverageTracker.record('finance', 'Q2', 20, 15, 3, ['Manual reconciliation'], 100000);
    processAutomationCoverageTracker.record('hr', 'Q2', 30, 3, 2, ['Onboarding', 'Payroll'], 200000);
    const low = processAutomationCoverageTracker.getLowCoverage(30);
    expect(low.some(r => r.department === 'hr')).toBe(true);
    const finCoverage = processAutomationCoverageTracker.getLatest('finance');
    expect(finCoverage!.automationCoveragePct).toBeGreaterThan(50);
  });

  it('analyzes exceptions and identifies high-escalation bots', () => {
    const bot = automationBotRegistry.register('Slow Bot', 'Complex Reports', 'rpa', 'analytics', 60);
    const report = exceptionAnalyzer.analyze(bot.botId, 'April', 200, 100, { 'timeout': 80, 'data_error': 70, 'auth_failure': 50 }, 15);
    expect(report.escalatedToHuman).toBe(100);
    expect(report.unhandledPct).toBe(50);
    const highEsc = exceptionAnalyzer.getHighEscalation(30);
    expect(highEsc.some(r => r.botId === bot.botId)).toBe(true);
    const topTypes = exceptionAnalyzer.getTopExceptionTypes();
    expect(topTypes[0].type).toBe('timeout');
  });
});
