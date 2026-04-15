/**
 * Tests for Phase 305-310: Contract Lifecycle, Customer Loyalty, Product Catalog,
 * Service Desk, Service Knowledge, Corporate Strategy
 */

import { describe, it, expect } from 'vitest';

// Phase 305: Contract Lifecycle Intelligence
import {
  contractManager, contractObligationTracker,
  contractRenewalManager, contractPerformanceAnalyzer
} from '../contract-lifecycle-intelligence';

// Phase 306: Customer Loyalty Intelligence
import {
  loyaltyMemberManager, loyaltyTransactionEngine,
  loyaltyProgramMetricsCalculator, churnPreventionEngine
} from '../customer-loyalty-intelligence';

// Phase 307: Product Catalog Intelligence
import {
  productCatalogManager, pricingOptimizer,
  catalogHealthAnalyzer, productAffinityAnalyzer
} from '../product-catalog-intelligence';

// Phase 308: Service Desk Intelligence
import {
  ticketManager, agentPerformanceAnalyzer,
  serviceDeskMetricsEngine, knowledgeBaseAnalyzer
} from '../service-desk-intelligence';

// Phase 309: Service Knowledge Intelligence
import {
  kbArticleManager, searchGapAnalyzer,
  kbGapAnalyzer, kbContributionTracker
} from '../service-knowledge-intelligence';

// Phase 310: Corporate Strategy Intelligence
import {
  strategicGoalManager, okrTracker,
  strategicInitiativeManager, strategicRiskRegister
} from '../corporate-strategy-intelligence';

// ─── Phase 305: Contract Lifecycle ───────────────────────────────────────────

describe('Phase 305: Contract Lifecycle Intelligence', () => {
  it('creates contract and detects expiring status', () => {
    const active = contractManager.create('Cloud SLA 2025', 'vendor', 'CloudCo', 'IT', 'Legal Dept', Date.now() - 86400000 * 300, Date.now() + 86400000 * 25, 120000, true, 30, ['Maintain 99.9% uptime', 'Quarterly reporting'], 'medium');
    expect(active.contractId).toMatch(/^con-/);
    expect(active.status).toBe('expiring');   // ≤30 days to expiry

    const expiring = contractManager.getExpiringContracts(30);
    expect(expiring.some(c => c.contractId === active.contractId)).toBe(true);
    expect(contractManager.getTotalActiveValue()).toBeGreaterThan(0);
  });

  it('tracks obligations and calculates penalty exposure', () => {
    const c = contractManager.create('License Agreement', 'vendor', 'SoftVendor', 'Legal', 'Legal Dept', Date.now() - 86400000 * 10, Date.now() + 86400000 * 180, 50000, false, 60, ['Monthly reporting'], 'low');
    const oblig = contractObligationTracker.add(c.contractId, 'Submit Q1 compliance report', 'reporting', Date.now() - 86400000, 'us', 5000);
    expect(oblig.obligationId).toMatch(/^oblig-/);
    expect(oblig.status).toBe('overdue');

    expect(contractObligationTracker.getTotalPenaltyExposure()).toBeGreaterThan(0);
  });

  it('evaluates contract renewal and recommends action', () => {
    const renewal = contractRenewalManager.evaluate('con-001', 'Vendor SLA', 'CloudCo', Date.now() + 86400000 * 60, 30, 100000, 85, 120000);
    expect(renewal.renewalId).toMatch(/^renewal-/);
    expect(renewal.recommendedAction).toBe('renew');   // score ≥ 80

    const low = contractRenewalManager.evaluate('con-002', 'Legacy Support', 'OldCo', Date.now() + 86400000 * 25, 30, 20000, 30, 30000);
    expect(low.recommendedAction).toBe('terminate');  // score < 40

    const terminations = contractRenewalManager.getRecommendedTerminations();
    expect(terminations.length).toBeGreaterThan(0);
  });

  it('analyzes contract performance score', () => {
    const perf = contractPerformanceAnalyzer.analyze('con-001', '2026-Q1', 95, 88, 1, 0, 2000);
    expect(perf.recordId).toMatch(/^contperf-/);
    expect(perf.overallPerformanceScore).toBeGreaterThan(70);
    expect(perf.trend).toBe('stable'); // first record, no prior
  });
});

// ─── Phase 306: Customer Loyalty Intelligence ─────────────────────────────────

describe('Phase 306: Customer Loyalty Intelligence', () => {
  it('enrolls member and upgrades tier via spend', () => {
    const member = loyaltyMemberManager.enroll('cust-001', 'Acme Corp', 'enterprise');
    expect(member.memberId).toMatch(/^loy-/);
    expect(member.currentTier).toBe('bronze');

    loyaltyMemberManager.updateActivity(member.memberId, 50000, 25000, 5000, 82);
    const updated = loyaltyMemberManager.getMember(member.memberId);
    expect(updated?.currentTier).toBe('gold');   // lifetime spend 25k ≥ 20k
    expect(updated?.churnRiskScore).toBe(18);    // 100 - 82
  });

  it('records transactions and calculates redemption rate', () => {
    const m = loyaltyMemberManager.enroll('cust-002', 'BetaCorp', 'mid_market');
    loyaltyMemberManager.updateActivity(m.memberId, 10000, 5000, 2000, 70);

    loyaltyTransactionEngine.record(m.memberId, 'earn', 10000, 10000, 'online', 5000, 2.0);
    loyaltyTransactionEngine.record(m.memberId, 'redeem', 2000, 8000, 'portal', undefined, undefined, 'Free Month');

    expect(loyaltyTransactionEngine.getTotalPointsIssued()).toBeGreaterThan(0);
    expect(loyaltyTransactionEngine.getTotalPointsRedeemed()).toBe(2000);
  });

  it('calculates program metrics and ROI', () => {
    const tierDist = { bronze: 800, silver: 150, gold: 40, platinum: 8, diamond: 2 };
    const metrics = loyaltyProgramMetricsCalculator.calculate('2026-Q1', 1000, 80, 25, 500000, 150000, 30000, 45000, 2000000, 75000, tierDist);
    expect(metrics.recordId).toMatch(/^loyprog-/);
    expect(metrics.redemptionRatePct).toBe(30);   // 150k/500k × 100
    expect(metrics.programROIPct).toBeGreaterThan(0);
  });

  it('identifies high-value at-risk members for intervention', () => {
    const risk = churnPreventionEngine.identify('loy-001', 'cust-003', 85, ['No login 60 days', 'Points expiring'], 60, 5000, 80000);
    expect(risk.recordId).toMatch(/^churnprev-/);
    expect(risk.recommendedIntervention).toBe('reactivation_campaign');  // risk ≥ 75

    const highValue = churnPreventionEngine.getHighValueAtRisk(50000);
    expect(highValue.length).toBeGreaterThan(0);
    expect(churnPreventionEngine.getTotalValueAtRisk()).toBeGreaterThan(0);
  });
});

// ─── Phase 307: Product Catalog Intelligence ─────────────────────────────────

describe('Phase 307: Product Catalog Intelligence', () => {
  it('adds product and records sales to classify tier', () => {
    const prod = productCatalogManager.add('Enterprise Suite', 'Software', 'ERP', 'Acme', 5000, 500, 200);
    expect(prod.productId).toMatch(/^prod-/);
    expect(prod.sku).toMatch(/^SKU-/);
    expect(prod.grossMarginPct).toBe(90);

    productCatalogManager.recordSales(prod.productId, 100, 500000, 2.5);
    const updated = productCatalogManager.getProduct(prod.productId);
    expect(updated?.performanceTier).toBe('hero');   // revenue ≥ 100k && velocity high
  });

  it('optimizes pricing with competitive strategy', () => {
    const opt = pricingOptimizer.optimize('prod-001', 'Widget Pro', 100, 40, 95, -1.2, 'competitive');
    expect(opt.recordId).toMatch(/^price-/);
    expect(opt.recommendedPriceUSD).toBeCloseTo(93.1, 0);   // 95 × 0.98
    expect(opt.pricePositioning).toBe('parity');
  });

  it('analyzes catalog health from active products', () => {
    const p1 = productCatalogManager.add('Hero Product', 'Electronics', 'Devices', 'TechBrand', 1000, 200, 500);
    productCatalogManager.recordSales(p1.productId, 500, 500000, 1);
    const p2 = productCatalogManager.add('Dead Item', 'Electronics', 'Accessories', 'OldBrand', 10, 8, 5);

    const allProds = productCatalogManager.getAll();
    const health = catalogHealthAnalyzer.analyze('2026-Q1', allProds);
    expect(health.recordId).toMatch(/^cathlth-/);
    expect(health.totalSKUs).toBeGreaterThan(0);
    expect(health.catalogHealthScore).toBeGreaterThanOrEqual(0);
  });

  it('analyzes product affinity and recommends bundles', () => {
    const affinity = productAffinityAnalyzer.analyze('prod-001', 'Widget Pro', 'prod-002', 'Widget Case', 120, 1000, 300);
    expect(affinity.recordId).toMatch(/^affinity-/);
    expect(affinity.confidencePct).toBe(40);   // 120/300 × 100
    expect(affinity.bundleRecommended).toBe(true);   // conf ≥ 20

    const bundles = productAffinityAnalyzer.getBundleOpportunities();
    expect(bundles.length).toBeGreaterThan(0);
  });
});

// ─── Phase 308: Service Desk Intelligence ─────────────────────────────────────

describe('Phase 308: Service Desk Intelligence', () => {
  it('creates ticket and resolves within SLA', () => {
    const ticket = ticketManager.create('Login not working', 'Cannot access portal', 'usr-001', 'Alice', 'incident', 'p2_high', 'agent-001', 'IT Support', 'portal', ['auth', 'login']);
    expect(ticket.ticketId).toMatch(/^tkt-/);
    expect(ticket.slaTargetHours).toBe(8);

    ticketManager.firstResponse(ticket.ticketId);
    ticketManager.resolve(ticket.ticketId, 5);
    const resolved = ticketManager.getTicket(ticket.ticketId);
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.slaBreached).toBe(false);
    expect(resolved?.satisfactionScore).toBe(5);
  });

  it('analyzes agent performance and identifies top performers', () => {
    const perf = agentPerformanceAnalyzer.analyze('agent-001', 'Bob Smith', 'IT Support', '2026-Q1', 200, 185, 8, 4.2, 94, 4.5, 72, 3, 5);
    expect(perf.recordId).toMatch(/^agentperf-/);
    expect(perf.productivityScore).toBeGreaterThan(0);

    const top = agentPerformanceAnalyzer.getTopAgents('2026-Q1', 1);
    expect(top[0].agentId).toBe('agent-001');
  });

  it('calculates service desk metrics from tickets', () => {
    const allTickets = ticketManager.getAll();
    const metrics = serviceDeskMetricsEngine.calculate('2026-Q1', allTickets);
    expect(metrics.recordId).toMatch(/^sdmetrics-/);
    expect(metrics.totalTickets).toBeGreaterThan(0);
    expect(metrics.slaCompliancePct).toBeGreaterThanOrEqual(0);
  });

  it('analyzes knowledge base utilization and deflection', () => {
    const kb = knowledgeBaseAnalyzer.analyze('2026-Q1', 50000, 120, 800, 3000, 4.2, 15,
      [{ title: 'How to reset password', views: 12000 }, { title: 'VPN setup', views: 8000 }]);
    expect(kb.recordId).toMatch(/^kb-/);
    expect(kb.deflectionRatePct).toBeCloseTo(26.67, 0);
    expect(kb.topViewedArticles[0].title).toBe('How to reset password');
  });
});

// ─── Phase 309: Service Knowledge Intelligence ───────────────────────────────

describe('Phase 309: Service Knowledge Intelligence', () => {
  it('publishes KB article and records engagement metrics', () => {
    const article = kbArticleManager.publish('How to Configure SSO', 'Authentication', 'SSO', 'author-001', 'Jane Doe', 850, ['sso', 'saml', 'auth']);
    expect(article.articleId).toMatch(/^kba-/);
    expect(article.status).toBe('published');

    kbArticleManager.recordEngagement(article.articleId, 1200, 900, 180, 850, 120, 45, 3000, 35);
    const updated = kbArticleManager.getArticle(article.articleId);
    expect(updated?.helpfulnessPct).toBeCloseTo(87.6, 0);  // 850/970 × 100
    expect(updated?.effectivenessScore).toBeGreaterThan(0);
  });

  it('analyzes search gaps and zero-result rate', () => {
    const gap = searchGapAnalyzer.analyze('2026-Q1', 10000, 8500,
      [{ term: 'password reset', count: 1200, hasResult: true }, { term: 'sso setup', count: 800, hasResult: false }, { term: 'api docs', count: 600, hasResult: false }]);
    expect(gap.recordId).toMatch(/^srchgap-/);
    expect(gap.zeroResultRatePct).toBe(15);   // 1500/10000 × 100
    expect(gap.gapSearchTerms.some(t => t.term === 'sso setup')).toBe(true);
  });

  it('identifies KB content gaps with ROI estimate', () => {
    const g = kbGapAnalyzer.identify('SAML Configuration', 800, 200, 150, 8);
    expect(g.gapId).toMatch(/^kbgap-/);
    expect(g.estimatedDeflectionPotential).toBe(60);  // min(200, 800×0.3)
    expect(g.estimatedROI).toBe(9000);                // 60 × 150
    expect(g.priority).toBe('medium');

    const critical = kbGapAnalyzer.identify('Enterprise API Setup', 2000, 500, 300, 16);
    expect(critical.priority).toBe('critical');        // ROI = 60k ≥ 50k
    expect(kbGapAnalyzer.getTotalROIPotential()).toBeGreaterThan(0);
  });

  it('tracks contributor performance and ranks top authors', () => {
    kbContributionTracker.track('2026-Q1', 'author-001', 'Jane Doe', 'CS', 5, 12, 25000, 120, 82);
    kbContributionTracker.track('2026-Q1', 'author-002', 'Tom Smith', 'Eng', 2, 3, 8000, 30, 75);

    const top = kbContributionTracker.getTopContributors('2026-Q1', 1);
    expect(top[0].authorId).toBe('author-001');   // 5×30+12×10+60 = 330 vs 2×30+3×10+15 = 105
    expect(kbContributionTracker.getTotalDeflectionsByPeriod('2026-Q1')).toBe(150);
  });
});

// ─── Phase 310: Corporate Strategy Intelligence ───────────────────────────────

describe('Phase 310: Corporate Strategy Intelligence', () => {
  it('defines strategic goal and tracks progress', () => {
    const goal = strategicGoalManager.define('Double ARR', 'Revenue Growth', '3_year', 'CEO', 'Executive', 'ARR USD', 10000000, 20000000, 40, ['init-001', 'init-002']);
    expect(goal.goalId).toMatch(/^goal-/);
    expect(goal.progressPct).toBe(0);

    strategicGoalManager.updateProgress(goal.goalId, 14000000);
    const updated = strategicGoalManager.getGoal(goal.goalId);
    expect(updated?.progressPct).toBe(40);   // (14M-10M)/(20M-10M) × 100
    expect(updated?.status).toBe('at_risk');  // 40 ≤ 40 < 70
  });

  it('creates OKR with key results and tracks confidence', () => {
    const okr = okrTracker.create('2026-Q1', 'company', 'Achieve market leadership in EMEA');
    const krId = okrTracker.addKeyResult(okr.okrId, 'Increase EMEA ARR to $5M', 3000000, 5000000);
    expect(okr.okrId).toMatch(/^okr-/);
    expect(krId).toMatch(/^kr-/);

    okrTracker.updateKeyResult(okr.okrId, krId, 3800000, 'yellow');
    const updated = okrTracker.getOKR(okr.okrId);
    expect(updated?.overallConfidence).toBe('yellow');
    expect(updated?.avgProgressPct).toBe(40);  // (3.8M-3M)/(5M-3M) × 100

    const atRisk = okrTracker.getAtRiskOKRs();
    expect(atRisk.some(o => o.okrId === okr.okrId)).toBe(true);
  });

  it('registers initiative and updates RAG status', () => {
    const init = strategicInitiativeManager.register('EMEA Expansion', 'goal-001', 'CRO', 'VP Sales', 'Expand to 5 new EMEA markets', 3000000, 800000, Date.now() - 86400000 * 90, Date.now() + 86400000 * 270, 12);
    expect(init.initiativeId).toMatch(/^init-/);
    expect(init.expectedROIPct).toBeCloseTo(275, 0);  // (3M-800k)/800k × 100

    strategicInitiativeManager.updateProgress(init.initiativeId, 5, 1000000);
    const updated = strategicInitiativeManager.getInitiative(init.initiativeId);
    expect(updated?.completionPct).toBeCloseTo(41.67, 0);
    expect(updated?.ragStatus).toBe('amber');  // budgetVariance > 10%

    const portfolio = strategicInitiativeManager.getPortfolioSummary();
    expect(portfolio.total).toBeGreaterThan(0);
  });

  it('registers strategic risks and produces heatmap', () => {
    strategicRiskRegister.register('competitive', 'New entrant with AI-native product', ['goal-001'], 4, 5, 'accelerating', 'Accelerate AI roadmap', 'CEO');
    strategicRiskRegister.register('regulatory', 'New data sovereignty rules in EMEA', ['goal-001'], 3, 4, 'stable', 'Legal review and compliance plan', 'CLO');

    const critical = strategicRiskRegister.getCriticalRisks(12);
    expect(critical.length).toBeGreaterThan(0);
    expect(critical[0].riskScore).toBeGreaterThanOrEqual(12);

    const accelerating = strategicRiskRegister.getAcceleratingRisks();
    expect(accelerating.some(r => r.riskCategory === 'competitive')).toBe(true);

    const heatmap = strategicRiskRegister.getRiskHeatmap();
    expect(heatmap.length).toBeGreaterThan(0);
  });
});
