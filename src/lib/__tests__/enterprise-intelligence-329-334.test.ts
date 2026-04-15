/**
 * Tests for Phase 329-334: Price Optimization, Customer Feedback, Knowledge Worker,
 * Supply Disruption, Revenue Leakage, Corporate Learning Intelligence
 */

import { describe, it, expect } from 'vitest';
import {
  priceOptimizer, elasticityAnalyzer, markdownManager, priceTestManager
} from '../price-optimization-intelligence';
import {
  feedbackCollector, surveyAnalyzer, feedbackThemeEngine, voiceOfCustomerEngine
} from '../customer-feedback-intelligence';
import {
  workerProductivityTracker, collaborationAnalyzer, expertiseMapper, teamFlowAnalyzer
} from '../knowledge-worker-intelligence';
import {
  disruptionDetector, alternateSourceManager, disruptionImpactCalculator, recoveryPlanManager
} from '../supply-disruption-intelligence';
import {
  leakageDetector, billingAuditor, contractComplianceChecker, recoveryTracker
} from '../revenue-leakage-intelligence';
import {
  trainingProgramManager, learningOutcomeTracker, ldRoiCalculator, skillDevelopmentManager
} from '../corporate-learning-intelligence';

// ─── Phase 329: Price Optimization ────────────────────────────────────────────

describe('Phase 329: Price Optimization Intelligence', () => {
  it('analyzes price point and recommends action based on elasticity', () => {
    const price = priceOptimizer.analyze('SKU-P01', 'Premium Widget', 'electronics', 99, 45, 149, -0.5, 95);
    expect(price.pricePointId).toMatch(/^pp-/);
    expect(price.marginPct).toBeGreaterThan(0);
    expect(price.pricePositioning).toBe('parity');  // 99 vs 95 competitor
    expect(['increase', 'decrease', 'hold', 'test']).toContain(price.recommendedAction);
  });

  it('measures price elasticity and classifies as elastic or inelastic', () => {
    // Elastic: 10% price increase → 15% quantity decrease
    const elast = elasticityAnalyzer.measure('SKU-E01', 'Elastic Good', 100, 1000, 110, 850);
    expect(elast.elasticityId).toMatch(/^elast-/);
    expect(elast.elasticity).toBeLessThan(-1);
    expect(elast.elasticityType).toBe('elastic');
    expect(elast.optimalPriceDirection).toBe('decrease');
  });

  it('plans markdown with net benefit calculation', () => {
    const md = markdownManager.plan('SKU-M01', 'Seasonal Coat', 500, 2, 80, 25, 0.05, 'season_end');
    expect(md.markdownId).toMatch(/^md-/);
    expect(md.markdownPriceUSD).toBe(60);
    expect(md.daysOfSupply).toBe(250);
    expect(md.urgency).toBe('immediate'); // 250 days > 120
  });

  it('starts price test and concludes with winner determination', () => {
    const test = priceTestManager.start('SKU-T01', 'Test Product', 'a_b', 49.99, 54.99);
    expect(test.testId).toMatch(/^ptest-/);
    priceTestManager.conclude(test.testId, 49900, 52450, 1000, 955, 2000, 14);
    const tests = priceTestManager['tests'];
    const completed = tests.find(t => t.testId === test.testId)!;
    expect(completed.completedAt).toBeDefined();
    expect(['control', 'test', 'inconclusive']).toContain(completed.winner);
  });
});

// ─── Phase 330: Customer Feedback ─────────────────────────────────────────────

describe('Phase 330: Customer Feedback Intelligence', () => {
  it('collects feedback and classifies sentiment and urgency', () => {
    const fb = feedbackCollector.submit('review', 'app_store', 'The pricing is too high for small businesses', -0.6, ['pricing', 'value'], 'high', 'cust-f01');
    expect(fb.feedbackId).toMatch(/^fb-/);
    expect(fb.sentiment).toBe('negative');
    expect(fb.isActionable).toBe(true);
    expect(fb.primaryCategory).toBe('pricing');
  });

  it('analyzes NPS survey and calculates promoter/detractor percentages', () => {
    const responses = [
      { nps: 9, text: 'Love the product', sentiment: 0.8 },
      { nps: 10, text: 'Outstanding experience', sentiment: 0.9 },
      { nps: 6, text: 'Average, needs improvement', sentiment: -0.1 },
      { nps: 8, text: 'Good but pricey', sentiment: 0.3 }
    ];
    const survey = surveyAnalyzer.analyze('Q1 NPS Survey', 'nps', 'enterprise', responses, 72);
    expect(survey.surveyId).toMatch(/^survey-/);
    expect(survey.promotersPct).toBe(50);
    expect(survey.detractorsPct).toBe(25);
    expect(['excellent', 'good', 'needs_improvement', 'poor']).toContain(survey.npsCategory);
  });

  it('identifies feedback themes and tracks worsening trends', () => {
    feedbackCollector.submit('support_ticket', 'email', 'Onboarding is confusing', -0.7, ['onboarding'], 'high');
    feedbackCollector.submit('survey', 'web', 'Hard to get started', -0.5, ['onboarding'], 'normal');
    const allFeedbacks = feedbackCollector.getAll();
    const theme = feedbackThemeEngine.upsert('Onboarding Issues', 'onboarding', allFeedbacks);
    expect(theme.themeId).toMatch(/^theme-/);
    expect(theme.mentionCount).toBeGreaterThan(0);
    expect(theme.sentimentAvg).toBeLessThan(0);
  });

  it('generates Voice of Customer report with sentiment trend', () => {
    const feedbacks = feedbackCollector.getAll();
    const surveys = surveyAnalyzer.getAll();
    const themes = feedbackThemeEngine.getTopThemes(5);
    const voc = voiceOfCustomerEngine.generate('2025-Q1', feedbacks, surveys, themes);
    expect(voc.vocId).toMatch(/^voc-/);
    expect(voc.totalFeedbackCount).toBeGreaterThan(0);
    expect(['improving', 'stable', 'declining']).toContain(voc.sentimentTrend);
  });
});

// ─── Phase 331: Knowledge Worker ──────────────────────────────────────────────

describe('Phase 331: Knowledge Worker Intelligence', () => {
  it('tracks worker productivity and calculates composite score', () => {
    const prod = workerProductivityTracker.track('w-001', 'Alice Dev', 'Engineering', '2025-Q1', 5, 2, 1, 1.5, 85, 88, 3, 105, 4);
    expect(prod.productivityId).toMatch(/^wprod-/);
    expect(prod.deepWorkRatioPct).toBeGreaterThan(0);
    expect(prod.compositeProductivityScore).toBeGreaterThan(0);
    expect(prod.focusScore).toBe(Math.max(0, 100 - 4 * 5));
  });

  it('analyzes collaboration and detects silo risks', () => {
    const collab = collaborationAnalyzer.analyze('w-002', 'Bob PM', '2025-Q1', 50, 120, 5, 20, 15, 30, 2, 45, 3);
    expect(collab.collabId).toMatch(/^collab-/);
    expect(collab.siloRisk).toBe(true);  // networkStrength = 3 < 5
    expect(collaborationAnalyzer.getSiloRisks().length).toBeGreaterThan(0);
  });

  it('maps expertise and identifies key person risks', () => {
    const domains = [
      { domain: 'Distributed Systems', level: 'thought_leader' as const, evidenceCount: 15, lastDemonstrated: Date.now() },
      { domain: 'Go', level: 'expert' as const, evidenceCount: 8, lastDemonstrated: Date.now() }
    ];
    const expertise = expertiseMapper.map('w-003', 'Carol Arch', 'Engineering', domains, 75, 0);
    expect(expertise.expertiseId).toMatch(/^exp-/);
    expect(expertise.isKeyPerson).toBe(true);   // unique expertise areas + successorCount < 2
    expect(expertise.uniqueExpertiseAreas).toContain('Distributed Systems');
  });

  it('analyzes team flow and identifies blockers', () => {
    const prod1 = workerProductivityTracker.track('w-010', 'Dev1', 'Eng', '2025-Q2', 2, 5, 1, 1.5, 70, 72, 1, 60, 9);
    const prod2 = workerProductivityTracker.track('w-011', 'Dev2', 'Eng', '2025-Q2', 1.5, 4.5, 1.5, 2, 65, 68, 1, 55, 10);
    const flow = teamFlowAnalyzer.analyze('team-eng', 'Engineering', '2025-Q2', [prod1, prod2], 0.5);
    expect(flow.flowId).toMatch(/^teamflow-/);
    expect(flow.flowBlockers.length).toBeGreaterThan(0);
    expect(flow.teamFlowScore).toBeGreaterThanOrEqual(0);
  });
});

// ─── Phase 332: Supply Disruption ─────────────────────────────────────────────

describe('Phase 332: Supply Disruption Intelligence', () => {
  it('detects disruption and calculates resilience score', () => {
    const disruption = disruptionDetector.detect('supplier_failure', 'sup-001', 'Global Parts Co', ['SKU-A', 'SKU-B', 'SKU-C'], 'critical', 500000, 10000, 2, 'Asia Pacific', 'Factory fire');
    expect(disruption.disruptionId).toMatch(/^disrupt-/);
    expect(disruption.resilienceScore).toBe(40);  // 2 alts × 20 = 40
    expect(disruption.status).toBe('detected');
    expect(disruptionDetector.getCritical().length).toBeGreaterThan(0);
  });

  it('identifies alternate sources with feasibility scoring', () => {
    const disruption = disruptionDetector.detect('logistics_delay', 'sup-002', 'Fast Ship Inc', ['SKU-D'], 'major', 200000, 5000, 3, 'Europe', 'Port strike');
    const alt = alternateSourceManager.identify(disruption.disruptionId, 'SKU-D', 'Widget D', 'sup-002', 'sup-alt-001', 'Backup Supplier', 8000, 14, 12.5, 10, 88, 7);
    expect(alt.sourceId).toMatch(/^altsrc-/);
    expect(alt.costPremiumPct).toBe(25);  // (12.5-10)/10 * 100
    expect(alt.feasibilityScore).toBeGreaterThan(0);
  });

  it('calculates disruption impact with stockout probability', () => {
    const disruptions = disruptionDetector.getAll();
    const impact = disruptionImpactCalculator.calculate(disruptions[0].disruptionId, '2025-Q2', 500000, 5000, 150, 5, 25000, 10000, 50000);
    expect(impact.impactId).toMatch(/^disimpact-/);
    expect(impact.stockoutProbabilityPct).toBe(90);  // daysUntilStockout <= 7
    expect(impact.netImpactUSD).toBeGreaterThan(0);
  });

  it('creates recovery plan and tracks approval', () => {
    const disruptions = disruptionDetector.getAll();
    const actions = [
      { action: 'Qualify alternate supplier', owner: 'procurement@co.com', deadline: Date.now() + 3 * 86400000, status: 'in_progress' as const },
      { action: 'Draw down safety stock', owner: 'ops@co.com', deadline: Date.now() + 86400000, status: 'pending' as const }
    ];
    const plan = recoveryPlanManager.create(disruptions[0].disruptionId, 'Alternate Supplier Recovery', 'alternate_supplier', actions, 21, 75000, 70, 500000);
    expect(plan.planId).toMatch(/^recplan-/);
    expect(plan.residualImpactUSD).toBe(150000);  // 500k * (1 - 0.7)
    recoveryPlanManager.approve(plan.planId, 'supply-chain-director');
    const approved = recoveryPlanManager.getActivePlans();
    expect(approved.find(p => p.planId === plan.planId)).toBeTruthy();
  });
});

// ─── Phase 333: Revenue Leakage ───────────────────────────────────────────────

describe('Phase 333: Revenue Leakage Intelligence', () => {
  it('detects billing error and calculates leakage amount', () => {
    const leakage = leakageDetector.detect('billing_error', 'cust-L01', 'BigCorp Inc', 8500, 10000, '2025-Q1', 'Incorrect tier pricing applied', 'billing_system', 'contract-001');
    expect(leakage.leakageId).toMatch(/^leak-/);
    expect(leakage.leakageAmountUSD).toBe(1500);
    expect(leakage.leakagePct).toBe(15);
    expect(leakage.recoveryProbabilityPct).toBe(85);
  });

  it('audits billing period and identifies top leakage customers', () => {
    leakageDetector.detect('unbilled_usage', 'cust-L02', 'MedCorp', 0, 5000, '2025-Q1', 'Usage tracking gap', 'ERP');
    const allLeakages = leakageDetector.getAll();
    const audit = billingAuditor.audit('2025-Q1', 50, allLeakages, 1000000);
    expect(audit.auditId).toMatch(/^bilaudit-/);
    expect(audit.totalLeakageUSD).toBeGreaterThan(0);
    expect(audit.topLeakageCustomers.length).toBeGreaterThan(0);
  });

  it('checks contract compliance and detects underbilling', () => {
    const compliance = contractComplianceChecker.check('contract-001', 'cust-L01', 'BigCorp Inc', 120000, 85000, 100000, 2, false, true);
    expect(compliance.complianceId).toMatch(/^contcomp-/);
    expect(compliance.underBilledUSD).toBe(15000);
    expect(compliance.compliancePct).toBe(85);
    expect(compliance.complianceStatus).toBe('major_variance');
  });

  it('initiates recovery and tracks progress', () => {
    const allLeakages = leakageDetector.getAll();
    const recovery = recoveryTracker.initiate(allLeakages[0].leakageId, 'billing_error', 'cust-L01', 'BigCorp Inc', 1500, 'invoice_correction', 'ar-team');
    expect(recovery.recoveryId).toMatch(/^recovery-/);
    recoveryTracker.update(recovery.recoveryId, 1500, 'completed');
    expect(recoveryTracker.getTotalRecovered()).toBe(1500);
  });
});

// ─── Phase 334: Corporate Learning ────────────────────────────────────────────

describe('Phase 334: Corporate Learning Intelligence', () => {
  it('creates training program and tracks enrollment and completion', () => {
    const program = trainingProgramManager.create('Advanced TypeScript', 'technical', 'e_learning', 'engineers', 8, 150, false, 'high');
    trainingProgramManager.enroll(program.programId, 40);
    trainingProgramManager.updateMetrics(program.programId, 34, 82, 4.2);
    const updated = trainingProgramManager.getProgram(program.programId)!;
    expect(updated.enrollments).toBe(40);
    expect(updated.completionRatePct).toBe(85);
    expect(updated.totalCostUSD).toBe(6000);
  });

  it('records learning outcomes and measures knowledge gain', () => {
    const program = trainingProgramManager.create('Leadership Essentials', 'leadership', 'blended', 'managers', 16, 500, false, 'high');
    const outcome = learningOutcomeTracker.record(program.programId, 'Leadership Essentials', 'emp-001', 'Jane Manager', 'Product', 55, 82, ['Delegation', 'Feedback'], true, 15, 5, 78);
    expect(outcome.outcomeId).toMatch(/^outcome-/);
    expect(outcome.knowledgeGain).toBe(27);
    expect(outcome.behaviorChangeObserved).toBe(true);
  });

  it('calculates L&D ROI using Phillips methodology', () => {
    const program = trainingProgramManager.getAll()[0];
    const roi = ldRoiCalculator.calculate(program.programId, 'Advanced TypeScript', '2025', 6000, 18000, 3000, ['Improved developer satisfaction', 'Faster onboarding'], 'phillips_roi', 'medium');
    expect(roi.roiId).toMatch(/^ldroi-/);
    expect(roi.roiPct).toBeCloseTo(250, 0);   // (21000-6000)/6000 * 100 = 250%
    expect(roi.benefitsCostRatio).toBe(3.5);
    expect(ldRoiCalculator.getHighROIPrograms(100).length).toBeGreaterThan(0);
  });

  it('tracks skill development and identifies gaps', () => {
    const dev = skillDevelopmentManager.track('emp-001', 'Jane Manager', 'Product', 'Strategic Planning', 2, 3, 5, ['Leadership Essentials']);
    expect(dev.devId).toMatch(/^skilldev-/);
    expect(dev.progressPct).toBeCloseTo(33.3, 0);  // (3-2)/(5-2) * 100 ≈ 33.3
    expect(dev.estimatedTimeToTargetDays).toBe(180);
  });
});
