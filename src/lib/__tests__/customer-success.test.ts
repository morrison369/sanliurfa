import { describe, it, expect } from 'vitest';
import {
  customerHealthManager,
  metricsTracker,
  churnPredictor,
  successPlanManager,
  milestoneManager,
  goalManager,
  issueManager,
  escalationManager,
  slaManager,
  onboardingManager,
  trainingManager,
  adoptionTracker,
  feedbackManager,
  npsManager,
  satisfactionManager,
  successMetricsManager,
  retentionAnalyzer,
  expansionAnalyzer,
  customerHealthDashboard
} from '../index';

describe('Phase 83: Customer Health & Metrics', () => {
  it('should create and track customer health', () => {
    const health = customerHealthManager.createHealthRecord({
      customerId: 'customer-123',
      accountId: 'account-456',
      healthScore: 85,
      status: 'healthy',
      riskFactors: [],
      lastUpdated: Date.now()
    });

    expect(health.id).toBeDefined();
    expect(health.healthScore).toBe(85);
    expect(health.status).toBe('healthy');

    const retrieved = customerHealthManager.getCustomerHealth('customer-123');
    expect(retrieved?.healthScore).toBe(85);
  });

  it('should track health metrics by category', () => {
    const metric = metricsTracker.recordMetric({
      customerId: 'customer-123',
      category: 'engagement',
      metricName: 'login_frequency',
      value: 15,
      trend: 'improving',
      lastUpdated: Date.now()
    });

    expect(metric.id).toBeDefined();
    expect(metric.category).toBe('engagement');

    const customerMetrics = metricsTracker.getCustomerMetrics('customer-123');
    expect(customerMetrics.length).toBeGreaterThan(0);
  });

  it('should predict churn and identify high-risk customers', () => {
    const prediction = churnPredictor.predictChurn('customer-456');
    expect(prediction.id).toBeDefined();
    expect(prediction.churnProbability).toBeGreaterThanOrEqual(0);
    expect(prediction.churnProbability).toBeLessThanOrEqual(100);

    const highRisk = churnPredictor.identifyHighRiskCustomers();
    expect(Array.isArray(highRisk)).toBe(true);

    const riskScore = churnPredictor.getChurnRiskScore('customer-456');
    expect(riskScore).toBeGreaterThanOrEqual(0);
  });
});

describe('Phase 84: Success Planning & Execution', () => {
  it('should create and manage success plans', () => {
    const plan = successPlanManager.createPlan({
      customerId: 'customer-789',
      accountId: 'account-789',
      title: 'Q1 Success Plan',
      description: 'Goals for Q1',
      status: 'active',
      startDate: Date.now(),
      endDate: Date.now() + 90 * 86400000
    });

    expect(plan.id).toBeDefined();
    expect(plan.status).toBe('active');

    const retrieved = successPlanManager.getPlan(plan.id);
    expect(retrieved?.title).toBe('Q1 Success Plan');

    successPlanManager.completePlan(plan.id);
    const completed = successPlanManager.getPlan(plan.id);
    expect(completed?.status).toBe('completed');
  });

  it('should track milestones', () => {
    const plan = successPlanManager.createPlan({
      customerId: 'customer-789',
      accountId: 'account-789',
      title: 'Test Plan',
      description: 'Test',
      status: 'active',
      startDate: Date.now(),
      endDate: Date.now() + 90 * 86400000
    });

    const milestone = milestoneManager.addMilestone({
      planId: plan.id,
      title: 'Complete setup',
      description: 'Full system setup',
      targetDate: Date.now() + 30 * 86400000,
      status: 'in_progress'
    });

    expect(milestone.id).toBeDefined();

    milestoneManager.completeMilestone(milestone.id);
    const completed = milestoneManager.getMilestone(milestone.id);
    expect(completed?.status).toBe('completed');
  });

  it('should manage goals and track progress', () => {
    const plan = successPlanManager.createPlan({
      customerId: 'customer-789',
      accountId: 'account-789',
      title: 'Goals Plan',
      description: 'Goals',
      status: 'active',
      startDate: Date.now(),
      endDate: Date.now() + 90 * 86400000
    });

    const goal = goalManager.createGoal({
      planId: plan.id,
      title: 'Increase adoption',
      description: 'Increase feature adoption',
      targetValue: 100,
      currentValue: 0,
      dueDate: Date.now() + 60 * 86400000,
      status: 'not_started'
    });

    expect(goal.id).toBeDefined();

    goalManager.updateProgress(goal.id, 75);
    const progress = goalManager.trackGoalProgress(goal.id);
    expect(progress.progress).toBe(75);
    expect(progress.onTrack).toBeDefined();
  });
});

describe('Phase 85: Escalation & Issue Management', () => {
  it('should report and track issues', () => {
    const issue = issueManager.reportIssue({
      customerId: 'customer-101',
      reportedBy: 'user-456',
      title: 'API timeout issue',
      description: 'API calls timing out',
      severity: 'high',
      status: 'new',
      createdDate: Date.now()
    });

    expect(issue.id).toBeDefined();
    expect(issue.severity).toBe('high');

    const retrieved = issueManager.getIssue(issue.id);
    expect(retrieved?.status).toBe('new');

    issueManager.resolveIssue(issue.id);
    const resolved = issueManager.getIssue(issue.id);
    expect(resolved?.status).toBe('resolved');
  });

  it('should escalate issues through support tiers', () => {
    const issue = issueManager.reportIssue({
      customerId: 'customer-101',
      reportedBy: 'user-456',
      title: 'Critical problem',
      description: 'Critical',
      severity: 'critical',
      status: 'new',
      createdDate: Date.now()
    });

    const escalation = escalationManager.escalateIssue({
      issueId: issue.id,
      fromLevel: 'tier1',
      toLevel: 'tier2',
      reason: 'Complex technical issue',
      assignedTo: 'senior-engineer'
    });

    expect(escalation.id).toBeDefined();
    expect(escalation.toLevel).toBe('tier2');

    const highPriority = escalationManager.getHighPriorityEscalations();
    expect(Array.isArray(highPriority)).toBe(true);
  });

  it('should manage SLAs', () => {
    const sla = slaManager.getSLABySeverity('critical');
    expect(sla).toBeDefined();
    expect(sla?.responseTimeMinutes).toBe(15);

    const metrics = slaManager.getSLAMetrics();
    expect(metrics.overall_compliance).toBeGreaterThan(0);
  });
});

describe('Phase 86: Customer Onboarding', () => {
  it('should create and manage onboarding programs', () => {
    const program = onboardingManager.createProgram({
      customerId: 'customer-202',
      accountId: 'account-202',
      stage: 'signup',
      startDate: Date.now(),
      targetGoLiveDate: Date.now() + 60 * 86400000,
      status: 'in_progress'
    });

    expect(program.id).toBeDefined();
    expect(program.stage).toBe('signup');

    onboardingManager.updateStage(program.id, 'training');
    const updated = onboardingManager.getProgram(program.id);
    expect(updated?.stage).toBe('training');
  });

  it('should schedule and track training sessions', () => {
    const program = onboardingManager.createProgram({
      customerId: 'customer-202',
      accountId: 'account-202',
      stage: 'training',
      startDate: Date.now(),
      targetGoLiveDate: Date.now() + 60 * 86400000,
      status: 'in_progress'
    });

    const session = trainingManager.scheduleSession({
      customerId: 'customer-202',
      programId: program.id,
      title: 'Platform basics',
      scheduledDate: Date.now() + 7 * 86400000,
      attendees: ['user-1', 'user-2'],
      resourcesProvided: ['guide-pdf', 'video-link']
    });

    expect(session.id).toBeDefined();

    trainingManager.completeSession(session.id);
    const completed = trainingManager.getSession(session.id);
    expect(completed?.completedDate).toBeDefined();
  });

  it('should track adoption metrics', () => {
    const adoption = adoptionTracker.recordAdoption({
      customerId: 'customer-202',
      measuredDate: Date.now(),
      adoptionLevel: 'high',
      featureUsage: { dashboard: 45, reports: 28, api: 12 },
      userEngagement: 85,
      trainingCompletion: 100
    });

    expect(adoption.id).toBeDefined();
    expect(adoption.adoptionLevel).toBe('high');

    const retrieved = adoptionTracker.getAdoption('customer-202');
    expect(retrieved?.userEngagement).toBe(85);
  });
});

describe('Phase 87: Customer Sentiment & Feedback', () => {
  it('should collect feedback and analyze sentiment', () => {
    const feedback = feedbackManager.collectFeedback({
      customerId: 'customer-303',
      accountId: 'account-303',
      type: 'review',
      score: 4,
      comment: 'Great product',
      collectedDate: Date.now()
    });

    expect(feedback.id).toBeDefined();
    expect(feedback.sentiment).toBeDefined();

    const retrieved = feedbackManager.getFeedback(feedback.id);
    expect(retrieved?.score).toBe(4);
  });

  it('should track NPS and identify promoters/detractors', () => {
    const response = npsManager.recordNPSResponse({
      customerId: 'customer-303',
      score: 9,
      promoterReason: 'Excellent support',
      respondedDate: Date.now()
    });

    expect(response.id).toBeDefined();
    expect(response.score).toBe(9);

    const promoters = npsManager.identifyPromotors();
    expect(Array.isArray(promoters)).toBe(true);

    const npsScore = npsManager.calculateNPS('account-303', '2026-Q1');
    expect(npsScore).toBeGreaterThanOrEqual(-100);
    expect(npsScore).toBeLessThanOrEqual(100);
  });

  it('should track satisfaction scores and predict churn', () => {
    const score = satisfactionManager.updateScore('customer-303', {
      customerId: 'customer-303',
      overallScore: 82,
      categories: { product: 85, support: 80, pricing: 75 },
      trend: 'improving',
      lastUpdated: Date.now()
    });

    expect(score.id).toBeDefined();
    expect(score.overallScore).toBe(82);

    const churnRisk = satisfactionManager.predictChurnRisk('customer-303');
    expect(churnRisk).toBeGreaterThanOrEqual(0);
    expect(churnRisk).toBeLessThanOrEqual(100);
  });
});

describe('Phase 88: Customer Success Analytics', () => {
  it('should record and retrieve success metrics', () => {
    const metrics = {
      period: '2026-Q1',
      totalCustomers: 250,
      healthyCustomers: 180,
      atRiskCustomers: 50,
      churnedCustomers: 20,
      netRetentionRate: 110
    };

    successMetricsManager.recordMetrics(metrics);
    const retrieved = successMetricsManager.getMetrics('2026-Q1');
    expect(retrieved?.totalCustomers).toBe(250);
    expect(retrieved?.netRetentionRate).toBe(110);
  });

  it('should analyze retention and predict churn', () => {
    const retention = retentionAnalyzer.analyzeRetention('2026-Q1');
    expect(retention.retentionRate).toBeGreaterThan(0);
    expect(retention.churnRate).toBeGreaterThan(0);

    const prediction = retentionAnalyzer.predictRetention('customer-401');
    expect(prediction).toBeGreaterThan(0);
    expect(prediction).toBeLessThanOrEqual(100);

    const ltv = retentionAnalyzer.calculateLifetimeValue('customer-401');
    expect(ltv).toBeGreaterThan(0);
  });

  it('should identify expansion opportunities and segment customers', () => {
    const expansion = expansionAnalyzer.analyzeExpansionPotential('customer-401');
    expect(expansion.expansionScore).toBeGreaterThan(0);
    expect(expansion.upsellOpportunities.length).toBeGreaterThan(0);
    expect(expansion.estimatedExpansionRevenue).toBeGreaterThan(0);

    const upsells = expansionAnalyzer.identifyUpsellOpportunities('customer-401');
    expect(Array.isArray(upsells)).toBe(true);

    const highValue = expansionAnalyzer.identifyHighValueExpansionCustomers();
    expect(Array.isArray(highValue)).toBe(true);
  });

  it('should provide customer success dashboard insights', () => {
    const overview = customerHealthDashboard.getPortfolioOverview('2026-Q1');
    expect(overview.totalARR).toBeGreaterThan(0);
    expect(overview.activeCustomers).toBeGreaterThan(0);

    const segmentation = customerHealthDashboard.getCustomerSegmentation();
    expect(Object.keys(segmentation).length).toBeGreaterThan(0);

    const scorecard = customerHealthDashboard.getSuccessMetricsScorecard();
    expect(Object.keys(scorecard).length).toBeGreaterThan(0);

    const insights = customerHealthDashboard.getActionableInsights();
    expect(insights.length).toBeGreaterThan(0);
  });
});
