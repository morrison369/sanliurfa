/**
 * Advanced Partner & Ecosystem Management (Phase 185-190)
 * Test suite for partner onboarding, API monetization, ecosystem analytics,
 * partner portal, co-selling workflows, and integration marketplace
 */

import { describe, it, expect } from 'vitest';
import {
  partnerApplicationManager, partnerOnboardingOrchestrator,
  partnerComplianceChecker, partnerProfileManager,
  apiProductManager, apiUsageTracker, apiBillingEngine, apiAccessManager,
  ecosystemHealthMonitor, partnerPerformanceTracker,
  ecosystemGrowthAnalyzer, networkEffectCalculator,
  partnerPortalContentManager, partnerSandboxManager,
  partnerSupportTicketManager, partnerCertificationTracker,
  coSellOpportunityManager, coSellDealRegistration,
  partnerCommissionTracker, coSellPipelineAnalyzer,
  integrationCatalogManager, integrationRatingSystem,
  integrationDeploymentManager, integrationHealthMonitor
} from '../index';

// Phase 185: Partner Onboarding
describe('Phase 185: Partner Onboarding', () => {
  it('should submit, review and approve partner applications', () => {
    const app = partnerApplicationManager.submit('Acme Corp', 'contact@acme.com', 'technology', 'https://acme.com', 'EMEA');
    expect(app.status).toBe('pending');

    partnerApplicationManager.review(app.applicationId);
    const approved = partnerApplicationManager.approve(app.applicationId, 'admin@platform.com');
    expect(approved?.status).toBe('approved');
    expect(approved?.reviewedBy).toBe('admin@platform.com');
  });

  it('should orchestrate onboarding steps and track progress', () => {
    const app = partnerApplicationManager.submit('Beta Inc', 'hi@beta.io', 'reseller', 'https://beta.io', 'APAC');
    partnerApplicationManager.approve(app.applicationId, 'admin@platform.com');

    const steps = partnerOnboardingOrchestrator.initiate('partner-beta', 'reseller');
    expect(steps.length).toBeGreaterThan(0);

    const requiredSteps = steps.filter(s => s.required);
    partnerOnboardingOrchestrator.completeStep('partner-beta', requiredSteps[0].stepId);

    const progress = partnerOnboardingOrchestrator.getProgress('partner-beta');
    expect(progress.completed).toBe(1);
    expect(progress.percentage).toBeGreaterThan(0);
  });

  it('should run compliance checks', () => {
    const results = partnerComplianceChecker.runChecks('partner-001', {
      businessId: 'REG-12345', dpaSignedAt: Date.now(),
      securityScore: 85, insuranceValid: true
    });
    expect(results.every(r => r.status === 'passed')).toBe(true);
    expect(partnerComplianceChecker.isCompliant('partner-001')).toBe(true);
  });

  it('should create partner profiles and upgrade tiers', () => {
    const app = partnerApplicationManager.submit('Gamma Ltd', 'ops@gamma.com', 'implementation', 'https://gamma.com', 'NA');
    const profile = partnerProfileManager.create(app);
    expect(profile.tier).toBe('registered');

    partnerProfileManager.addCapability(profile.partnerId, 'cloud-migration');
    const upgraded = partnerProfileManager.upgradeTier(profile.partnerId, 'gold');
    expect(upgraded?.tier).toBe('gold');
    expect(upgraded?.capabilities).toContain('cloud-migration');
  });
});

// Phase 186: API Monetization
describe('Phase 186: API Monetization', () => {
  it('should create API products with tiered pricing', () => {
    const product = apiProductManager.create(
      'Geo API', 'Location intelligence', ['/geocode', '/reverse'],
      'tiered', 0.001,
      [{ callsUpTo: 10000, pricePerCall: 0.0005 }, { callsUpTo: 100000, pricePerCall: 0.0003 }]
    );
    expect(product.status).toBe('active');

    const priceSmall = apiProductManager.calculatePrice(product.productId, 5000);
    const priceLarge = apiProductManager.calculatePrice(product.productId, 50000);
    expect(priceSmall).toBeLessThan(priceLarge);
  });

  it('should track API usage and generate bills', () => {
    const product = apiProductManager.create('Search API', 'Full-text search', ['/search'], 'per_call', 0.002);

    apiUsageTracker.record('partner-001', product.productId, '/search', 45, true);
    apiUsageTracker.record('partner-001', product.productId, '/search', 52, true);

    const usage = apiUsageTracker.getUsage('partner-001', product.productId);
    expect(usage?.callCount).toBe(2);

    const bill = apiBillingEngine.generateBill('partner-001', product.productId, 500, product);
    expect(bill.amount).toBeGreaterThan(0);
    expect(bill.status).toBe('pending');
  });

  it('should manage API access quotas', () => {
    const product = apiProductManager.create('Analytics API', 'Business insights', ['/metrics'], 'freemium', 0.001);

    apiAccessManager.grantAccess('partner-002', product.productId, 1000, 'standard');
    const access = apiAccessManager.checkAccess('partner-002', product.productId);
    expect(access.allowed).toBe(true);
    expect(access.remaining).toBe(1000);

    apiAccessManager.consumeQuota('partner-002', product.productId);
    const afterConsume = apiAccessManager.checkAccess('partner-002', product.productId);
    expect(afterConsume.remaining).toBe(999);
  });

  it('should calculate total revenue', () => {
    const product = apiProductManager.create('Payments API', 'Payment processing', ['/pay'], 'flat', 99);
    const bill = apiBillingEngine.generateBill('partner-003', product.productId, 1, product);
    apiBillingEngine.markPaid(bill.billId);

    const revenue = apiBillingEngine.getTotalRevenue();
    expect(revenue).toBeGreaterThan(0);
  });
});

// Phase 187: Ecosystem Analytics
describe('Phase 187: Ecosystem Analytics', () => {
  it('should capture ecosystem health and compute trends', () => {
    const snap1 = ecosystemHealthMonitor.capture(100, 5, 2, 500, 50000, 30);
    const snap2 = ecosystemHealthMonitor.capture(108, 10, 2, 600, 65000, 38);

    expect(snap1.healthScore).toBeGreaterThan(0);
    expect(snap2.activePartners).toBeGreaterThan(snap1.activePartners);

    const trend = ecosystemHealthMonitor.getTrend();
    expect(trend).toMatch(/improving|declining|stable/);
  });

  it('should track partner KPIs and rank top performers', () => {
    partnerPerformanceTracker.record('p-alpha', '2026-04', {
      revenueGenerated: 15000, apiCalls: 8000,
      dealsRegistered: 5, customersReferred: 12, certificationCount: 3
    });
    partnerPerformanceTracker.record('p-beta', '2026-04', {
      revenueGenerated: 5000, apiCalls: 2000,
      dealsRegistered: 1, customersReferred: 3, certificationCount: 1
    });

    const top = partnerPerformanceTracker.getTopPartners('2026-04', 2);
    expect(top[0].partnerId).toBe('p-alpha');
    expect(top[0].performanceScore).toBeGreaterThan(top[1].performanceScore);
  });

  it('should record growth metrics and forecast', () => {
    ecosystemGrowthAnalyzer.record('2026-01', 80, 40000, 200000);
    ecosystemGrowthAnalyzer.record('2026-02', 90, 48000, 240000);
    ecosystemGrowthAnalyzer.record('2026-03', 100, 55000, 280000);

    const forecast = ecosystemGrowthAnalyzer.forecastNextPeriod();
    expect(forecast.partnerCount).toBeGreaterThan(100);
  });

  it('should calculate network effects', () => {
    const val100 = networkEffectCalculator.calculateNetworkValue(100);
    const val200 = networkEffectCalculator.calculateNetworkValue(200);
    expect(val200).toBeGreaterThan(val100 * 3); // Metcalfe's law: quadratic growth

    const multiplier = networkEffectCalculator.calculateGrowthMultiplier(100, 10);
    expect(multiplier).toBeGreaterThan(1);
  });
});

// Phase 188: Partner Portal
describe('Phase 188: Partner Portal', () => {
  it('should publish and search portal content', () => {
    partnerPortalContentManager.publish('Getting Started Guide', 'tutorial', 'Follow these steps...', ['onboarding', 'api']);
    partnerPortalContentManager.publish('API Changelog v2.0', 'changelog', 'New endpoints added...', ['api', 'v2']);

    const results = partnerPortalContentManager.search('api');
    expect(results.length).toBeGreaterThan(0);

    const tutorials = partnerPortalContentManager.getByType('tutorial');
    expect(tutorials.length).toBeGreaterThan(0);
  });

  it('should provision and manage sandbox environments', () => {
    const sandbox = partnerSandboxManager.provision('partner-001', 'Dev Sandbox', 500, 30);
    expect(sandbox.status).toBe('active');
    expect(sandbox.quotaPerDay).toBe(500);

    const consumed = partnerSandboxManager.consumeQuota(sandbox.sandboxId);
    expect(consumed).toBe(true);

    const updated = partnerSandboxManager.getSandbox(sandbox.sandboxId);
    expect(updated?.usedToday).toBe(1);
  });

  it('should manage support tickets through lifecycle', () => {
    const ticket = partnerSupportTicketManager.create(
      'partner-002', 'OAuth2 token refresh fails', 'Getting 401 after token expiry...', 'high', 'technical'
    );
    expect(ticket.status).toBe('open');

    partnerSupportTicketManager.assign(ticket.ticketId, 'support-engineer@platform.com');
    const resolved = partnerSupportTicketManager.resolve(ticket.ticketId);
    expect(resolved?.status).toBe('resolved');
    expect(resolved?.resolvedAt).toBeDefined();
  });

  it('should issue and track partner certifications', () => {
    const cert = partnerCertificationTracker.issue('partner-003', 'Platform Integration Expert', 'professional', 365);
    expect(cert.status).toBe('active');
    expect(cert.level).toBe('professional');

    const certs = partnerCertificationTracker.getPartnerCertifications('partner-003');
    expect(certs.length).toBe(1);
  });
});

// Phase 189: Co-selling Workflows
describe('Phase 189: Co-selling Workflows', () => {
  it('should manage co-sell opportunity pipeline', () => {
    const opp = coSellOpportunityManager.create('partner-001', 'Globex Corp', 50000, ['product-crm'], 90);
    expect(opp.stage).toBe('identified');

    coSellOpportunityManager.advance(opp.opportunityId, 'qualified');
    coSellOpportunityManager.advance(opp.opportunityId, 'closed_won', 'Customer signed contract');

    const won = coSellOpportunityManager.getWonDeals('partner-001');
    expect(won.length).toBeGreaterThan(0);
  });

  it('should register deals and check partner protection', () => {
    const opp = coSellOpportunityManager.create('partner-002', 'Initech', 30000, ['product-erp'], 60);
    const reg = coSellDealRegistration.register(opp.opportunityId, 'partner-002', 90);
    expect(reg.status).toBe('pending');

    coSellDealRegistration.approve(reg.registrationId);
    const protected_ = coSellDealRegistration.isProtected(opp.opportunityId, 'partner-002');
    expect(protected_).toBe(true);
  });

  it('should track and pay partner commissions', () => {
    partnerCommissionTracker.setCommissionRate('partner-001', 0.15);
    const opp = coSellOpportunityManager.create('partner-001', 'Umbrella Co', 20000, ['product-analytics'], 45);
    coSellOpportunityManager.advance(opp.opportunityId, 'closed_won');

    const commission = partnerCommissionTracker.record('partner-001', opp.opportunityId, 20000);
    expect(commission.commissionAmount).toBe(3000);

    partnerCommissionTracker.approve(commission.commissionId);
    partnerCommissionTracker.markPaid(commission.commissionId);

    const earnings = partnerCommissionTracker.getPartnerEarnings('partner-001');
    expect(earnings).toBe(3000);
  });

  it('should analyze pipeline health and forecast revenue', () => {
    const opps = [
      coSellOpportunityManager.create('p1', 'Acme', 10000, [], 30),
      coSellOpportunityManager.create('p1', 'Beta', 25000, [], 60),
      coSellOpportunityManager.create('p1', 'Gamma', 15000, [], 90)
    ];
    opps[0] && coSellOpportunityManager.advance(opps[0].opportunityId, 'negotiation');

    const analysis = coSellPipelineAnalyzer.analyze(opps);
    expect(analysis.totalPipelineValue).toBe(50000);
    expect(analysis.weightedPipelineValue).toBeGreaterThan(0);
    expect(analysis.stageDistribution).toBeDefined();
  });
});

// Phase 190: Integration Marketplace
describe('Phase 190: Integration Marketplace', () => {
  it('should submit, approve, and discover integrations', () => {
    const integration = integrationCatalogManager.submit(
      'Stripe Payments', 'Accept payments via Stripe', 'partner-001',
      'payments', { endpoint: 'https://api.stripe.com', authType: 'apikey' },
      ['payments', 'stripe', 'checkout']
    );
    expect(integration.status).toBe('pending_review');

    integrationCatalogManager.approve(integration.integrationId);
    integrationCatalogManager.recordDownload(integration.integrationId);

    const results = integrationCatalogManager.search('stripe');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].downloadCount).toBe(1);
  });

  it('should rate integrations and calculate averages', () => {
    const all = integrationCatalogManager.getPopular(10);
    if (!all.length) return;

    const id = all[0].integrationId;
    integrationRatingSystem.rate(id, 'user-001', 5, 'Works great!');
    integrationRatingSystem.rate(id, 'user-002', 4, 'Solid integration');
    integrationRatingSystem.rate(id, 'user-001', 3, 'Updated review'); // upsert

    const stats = integrationRatingSystem.getStats(id);
    expect(stats.count).toBe(2);
    expect(stats.avgScore).toBe(3.5); // user-001 updated to 3, user-002 = 4
  });

  it('should deploy integrations and manage lifecycle', () => {
    const published = integrationCatalogManager.search('');
    if (!published.length) return;

    const deployment = integrationDeploymentManager.deploy(
      published[0].integrationId, 'customer-001', 'sandbox', { apiKey: 'test-key' }
    );
    expect(deployment.status).toBe('active');
    expect(deployment.environment).toBe('sandbox');

    const deactivated = integrationDeploymentManager.deactivate(deployment.deploymentId);
    expect(deactivated).toBe(true);
  });

  it('should monitor integration health and detect failures', () => {
    integrationHealthMonitor.recordCheck('int-001', 'deploy-001', 45, true);
    integrationHealthMonitor.recordCheck('int-001', 'deploy-001', 52, true);
    integrationHealthMonitor.recordCheck('int-001', 'deploy-001', 0, false, 'Connection timeout');

    const uptime = integrationHealthMonitor.getUptime('deploy-001');
    expect(uptime).toBeCloseTo(66.7, 0);

    const last = integrationHealthMonitor.getLastCheck('deploy-001');
    expect(last?.success).toBe(false);
    expect(last?.errorMessage).toBe('Connection timeout');
  });
});
