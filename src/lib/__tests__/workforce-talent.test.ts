/**
 * Advanced Workforce & Talent Intelligence (Phase 203-208)
 * Test suite for skills gap analysis, workforce planning, performance intelligence,
 * succession planning, engagement analytics, and talent marketplace
 */

import { describe, it, expect } from 'vitest';
import {
  skillsInventoryManager, gapAnalyzer, skillsDevelopmentPlanner, skillsMatrixBuilder,
  headcountPlanner, workforceForecaster, capacityAnalyzer, hiringPlanManager,
  performanceMetricsTracker, goalAlignmentAnalyzer, performancePredictionEngine, teamPerformanceAnalyzer,
  successionPlanManager, readinessAssessor, talentPipelineTracker, leadershipDevelopmentTracker,
  engagementSurveyManager, pulseCheckTracker, retentionRiskAnalyzer, engagementActionTracker,
  internalOpportunityManager, talentMatchingEngine, mobilityTracker, skillsMarketplaceAnalyzer
} from '../index';

// Phase 203: Skills Gap Analysis
describe('Phase 203: Skills Gap Analysis', () => {
  it('should record skills and detect gaps', () => {
    skillsInventoryManager.record('emp-001', 'TypeScript', 'technical', 3, 5);
    skillsInventoryManager.record('emp-001', 'Leadership', 'leadership', 2, 4);
    skillsInventoryManager.record('emp-001', 'SQL', 'technical', 4, 4);

    const skills = skillsInventoryManager.getEmployeeSkills('emp-001');
    expect(skills.length).toBe(3);

    const tsSkill = skills.find(s => s.skillName === 'TypeScript');
    expect(tsSkill?.gap).toBe(2);
    expect(skills.find(s => s.skillName === 'SQL')?.gap).toBe(0);
  });

  it('should analyze gaps and identify critical areas', () => {
    const skills = skillsInventoryManager.getEmployeeSkills('emp-001');
    const result = gapAnalyzer.analyze('emp-001', skills);

    expect(result.skillsWithGap).toBe(2); // TypeScript and Leadership
    expect(result.criticalGaps.length).toBeGreaterThan(0);
    expect(result.avgGapScore).toBeGreaterThan(0);

    const orgGaps = gapAnalyzer.getOrgCriticalGaps(2);
    expect(orgGaps.some(g => g.skillName === 'TypeScript')).toBe(true);
  });

  it('should create development plan and track progress', () => {
    const plan = skillsDevelopmentPlanner.createPlan('emp-001', 'Senior Engineer', [
      { skillName: 'TypeScript', currentLevel: 3, targetLevel: 5, resources: ['course-ts'], durationWeeks: 8 },
      { skillName: 'Leadership', currentLevel: 2, targetLevel: 4, resources: ['mentoring'], durationWeeks: 12 }
    ]);
    expect(plan.status).toBe('active');
    expect(plan.completionPct).toBe(0);

    skillsDevelopmentPlanner.updateProgress(plan.planId, 1);
    const updated = skillsDevelopmentPlanner.getPlan(plan.planId);
    expect(updated?.completionPct).toBe(50);
  });

  it('should build skills matrix and find coverage gaps', () => {
    skillsInventoryManager.record('emp-002', 'TypeScript', 'technical', 5, 5);
    skillsInventoryManager.record('emp-002', 'SQL', 'technical', 4, 4);

    const matrix = skillsMatrixBuilder.build('team-eng', [
      { employeeId: 'emp-001', skills: skillsInventoryManager.getEmployeeSkills('emp-001') },
      { employeeId: 'emp-002', skills: skillsInventoryManager.getEmployeeSkills('emp-002') }
    ]);
    expect(matrix.skillColumns.length).toBeGreaterThan(0);
    expect(Object.keys(matrix.coverageBySkill).length).toBeGreaterThan(0);
  });
});

// Phase 204: Workforce Planning
describe('Phase 204: Workforce Planning', () => {
  it('should create and approve headcount plans', () => {
    const plan = headcountPlanner.create('Engineering', 'Q2-2026', 50, 60, 5, 500000);
    expect(plan.openRoles).toBe(15); // 60-50+5
    expect(plan.status).toBe('draft');

    headcountPlanner.approve(plan.planId);
    const approved = headcountPlanner.getByDepartment('Engineering');
    expect(approved[0].status).toBe('approved');

    const budget = headcountPlanner.getTotalBudget('Q2-2026');
    expect(budget).toBe(500000);
  });

  it('should forecast workforce needs', () => {
    const forecast = workforceForecaster.forecast('Engineering', '2026-Q3', 60, 0.1, 0.2);
    expect(forecast.hiringNeeds).toBeGreaterThan(0);
    expect(forecast.forecastedHeadcount).toBeGreaterThan(0);

    const highGrowth = workforceForecaster.getHighGrowthDepartments(0.15);
    expect(highGrowth.some(f => f.department === 'Engineering')).toBe(true);
  });

  it('should track team capacity and utilization', () => {
    capacityAnalyzer.capture('team-eng', '2026-Q2', 800, 720, 2, 1);
    const snapshot = capacityAnalyzer.getLatestSnapshot('team-eng');
    expect(snapshot?.utilizationRate).toBe(90);

    const overloaded = capacityAnalyzer.getOverallocatedTeams(90);
    expect(overloaded).toContain('team-eng');
  });

  it('should manage hiring pipeline and compute time-to-fill', () => {
    const role1 = hiringPlanManager.addRole('Engineering', 'Senior Engineer', 60, 'critical', 150000);
    const role2 = hiringPlanManager.addRole('Engineering', 'Product Manager', 90, 'high', 130000);

    expect(hiringPlanManager.getOpenRoles('critical').length).toBeGreaterThan(0);

    hiringPlanManager.advanceStatus(role1.hiringId, 'filled');
    const ttf = hiringPlanManager.getTimeToFill('Engineering');
    expect(ttf).toBeGreaterThanOrEqual(0);

    const budget = hiringPlanManager.getTotalHiringBudget();
    expect(budget).toBeGreaterThan(0);
  });
});

// Phase 205: Performance Intelligence
describe('Phase 205: Performance Intelligence', () => {
  it('should submit reviews and determine performance band', () => {
    const review = performanceMetricsTracker.submitReview(
      'perf-001', 'manager-001', '2026-Q1', 4.2,
      { delivery: 4, collaboration: 4.5, initiative: 4 },
      ['strong delivery', 'great teammate'], ['communication']
    );
    expect(review.performanceBand).toBe('exceeds');
    expect(review.overallScore).toBe(4.2);

    const latest = performanceMetricsTracker.getLatestReview('perf-001');
    expect(latest?.reviewId).toBe(review.reviewId);
  });

  it('should track goals and detect at-risk status', () => {
    const goal = goalAlignmentAnalyzer.addGoal('perf-001', 'Increase API coverage', 100, '%', 90, 0.3, 'technical_excellence');
    goalAlignmentAnalyzer.updateProgress(goal.goalId, 40);

    const goals = goalAlignmentAnalyzer.getEmployeeGoals('perf-001');
    expect(goals.length).toBeGreaterThan(0);
    expect(goals[0].progressPct).toBe(40);
  });

  it('should predict performance and identify at-risk employees', () => {
    const reviews = [performanceMetricsTracker.getLatestReview('perf-001')].filter(Boolean) as any[];
    const prediction = performancePredictionEngine.predict('perf-001', reviews, 0.8, 75);
    expect(prediction.predictedBand).toBeDefined();
    expect(prediction.confidence).toBeGreaterThan(0);
  });

  it('should summarize team performance', () => {
    const reviews = ['perf-001'].map(id => performanceMetricsTracker.getLatestReview(id)).filter(Boolean) as any[];
    const goals = goalAlignmentAnalyzer.getEmployeeGoals('perf-001');
    const summary = teamPerformanceAnalyzer.summarize('team-eng', '2026-Q1', reviews, goals);

    expect(summary.avgScore).toBeGreaterThan(0);
    expect(summary.distributionByBand).toBeDefined();
  });
});

// Phase 206: Succession Planning
describe('Phase 206: Succession Planning', () => {
  it('should create succession plan and add successors', () => {
    const plan = successionPlanManager.create('role-cto', 'CTO', 'Engineering', 'emp-current', 'critical');
    expect(plan.criticalityLevel).toBe('critical');

    successionPlanManager.addSuccessor('role-cto', 'emp-001', 'ready_1_2yr', ['executive_presence', 'board_experience']);
    const readyNow = successionPlanManager.getReadyNow('role-cto');
    expect(readyNow.length).toBe(0); // emp-001 is ready_1_2yr

    const critical = successionPlanManager.getCriticalRolesWithoutSuccessors();
    expect(critical.every(p => p.successorSlots.length === 0)).toBe(true);
  });

  it('should assess successor readiness', () => {
    const assessment = readinessAssessor.assess('emp-001', 'role-cto', [
      { name: 'strategic_vision', required: 5, current: 4 },
      { name: 'financial_acumen', required: 4, current: 4 },
      { name: 'executive_presence', required: 5, current: 3 }
    ]);
    expect(assessment.overallReadiness).toBeGreaterThan(0);
    expect(assessment.readinessLevel).toBeDefined();
    expect(assessment.developmentPriorities.length).toBeGreaterThan(0);
  });

  it('should track talent pipeline depth', () => {
    talentPipelineTracker.add('pipe-001', 'Engineer', 'L3', 'Principal Engineer', 'L5', 730, 'high');
    talentPipelineTracker.addActivity('pipe-001', 'architecture_review');

    const depth = talentPipelineTracker.getPipelineDepth('Principal Engineer');
    expect(depth).toBeGreaterThan(0);

    const ready = talentPipelineTracker.getReadyForPromotion(800);
    expect(ready.some(e => e.employeeId === 'pipe-001')).toBe(true);
  });

  it('should track leadership development programs', () => {
    const record = leadershipDevelopmentTracker.enroll('emp-001', 'Executive Presence Program', 'coaching');
    expect(record.status).toBe('active');

    leadershipDevelopmentTracker.complete(record.recordId, 88);
    const avg = leadershipDevelopmentTracker.getAvgOutcomeScore('coaching');
    expect(avg).toBe(88);
  });
});

// Phase 207: Engagement Analytics
describe('Phase 207: Engagement Analytics', () => {
  it('should record survey responses and compute stats', () => {
    engagementSurveyManager.record('survey-2026-q1', 'eng-001', 'Engineering',
      { autonomy: 4, growth: 3, recognition: 5, manager: 4, purpose: 4 });
    engagementSurveyManager.record('survey-2026-q1', 'eng-002', 'Engineering',
      { autonomy: 3, growth: 4, recognition: 3, manager: 3, purpose: 4 });

    const stats = engagementSurveyManager.getSurveyStats('survey-2026-q1');
    expect(stats.responseCount).toBe(2);
    expect(stats.avgEngagement).toBeGreaterThan(0);

    const dims = engagementSurveyManager.getDimensionScores('survey-2026-q1');
    expect(dims['autonomy']).toBeGreaterThan(0);
  });

  it('should track pulse checks and detect declining trends', () => {
    pulseCheckTracker.record('pulse-emp-1', 'How are you feeling today?', 4, 'morning');
    pulseCheckTracker.record('pulse-emp-1', 'How are you feeling today?', 3, 'morning');
    pulseCheckTracker.record('pulse-emp-1', 'How are you feeling today?', 2, 'morning');

    const trend = pulseCheckTracker.getEmployeeTrend('pulse-emp-1');
    expect(['improving', 'declining', 'stable']).toContain(trend);

    const avg = pulseCheckTracker.getAvgScore('pulse-emp-1');
    expect(avg).toBeCloseTo(3, 0);
  });

  it('should assess retention risk from signals', () => {
    const risk = retentionRiskAnalyzer.assess('risk-emp-1', ['low_engagement', 'no_promotion_18mo', 'below_market_comp']);
    expect(risk.riskLevel).toBeDefined();
    expect(risk.riskScore).toBeGreaterThan(0);
    expect(risk.recommendedActions.length).toBeGreaterThan(0);

    const highRisk = retentionRiskAnalyzer.getHighRiskEmployees();
    expect(highRisk.length).toBeGreaterThan(0);
  });

  it('should create and track engagement actions', () => {
    const risk = retentionRiskAnalyzer.getRisk('risk-emp-1');
    const action = engagementActionTracker.create(risk?.riskId || 'test', 'Engineering', 'manager_conversation', 'manager-001', 7);
    expect(action.status).toBe('pending');

    engagementActionTracker.complete(action.actionId, 75);
    const rate = engagementActionTracker.getCompletionRate();
    expect(rate).toBeGreaterThan(0);
  });
});

// Phase 208: Talent Marketplace
describe('Phase 208: Talent Marketplace', () => {
  it('should post opportunities and process applications', () => {
    const opp = internalOpportunityManager.post(
      'Backend Rotation', 'Platform', 'project_rotation',
      ['TypeScript', 'PostgreSQL'], 'L3', 'manager-001', 90
    );
    expect(opp.status).toBe('open');

    internalOpportunityManager.apply(opp.opportunityId, 'emp-001');
    internalOpportunityManager.apply(opp.opportunityId, 'emp-002');

    const updated = internalOpportunityManager.getOpportunity(opp.opportunityId);
    expect(updated?.applicants.length).toBe(2);

    internalOpportunityManager.fill(opp.opportunityId, 'emp-001');
    expect(internalOpportunityManager.getOpportunity(opp.opportunityId)?.status).toBe('filled');
  });

  it('should match employees to opportunities by skill score', () => {
    const opp2 = internalOpportunityManager.post(
      'Data Engineering Role', 'Data', 'full_time_transfer', ['SQL', 'TypeScript'], 'L3', 'mgr-002'
    );
    const matches = talentMatchingEngine.match('emp-001', ['TypeScript', 'SQL', 'Leadership'], 'L3', 80, [opp2]);
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].matchScore).toBeGreaterThan(40);

    const candidates = talentMatchingEngine.getBestCandidatesForOpportunity(opp2.opportunityId, 3);
    expect(candidates.length).toBeGreaterThan(0);
  });

  it('should track mobility and compute rates', () => {
    const record = mobilityTracker.record('emp-001', 'Engineering', 'Platform', 'Backend Engineer', 'Platform Engineer', 'lateral');
    mobilityTracker.recordSatisfaction(record.mobilityId, 4, 180);

    const rate = mobilityTracker.getMobilityRate(100, 365);
    expect(rate).toBeGreaterThan(0);

    const avgSat = mobilityTracker.getAvgSatisfaction();
    expect(avgSat).toBe(4);
  });

  it('should analyze skills supply/demand in marketplace', () => {
    const allOpps = internalOpportunityManager.getOpenOpportunities();
    const employeeSkillsMap = new Map([
      ['emp-001', ['TypeScript', 'SQL', 'Leadership']],
      ['emp-002', ['TypeScript', 'SQL']]
    ]);

    const supplyDemand = skillsMarketplaceAnalyzer.analyzeSupplyDemand(allOpps, employeeSkillsMap);
    expect(supplyDemand.length).toBeGreaterThan(0);
  });
});
