/**
 * Tests: Phase 221-226 — Advanced Strategic Intelligence & Innovation
 */

import { describe, it, expect } from 'vitest';
import {
  knowledgeEntityManager, relationshipMapper, knowledgeQueryEngine, graphAnalyticsEngine,
  learningPathManager, learnerProgressTracker, trainingEffectivenessAnalyzer, ldAnalyticsAggregator,
  ideaPipelineManager, innovationScorer, experimentTracker, innovationPortfolioManager,
  changeInitiativeTracker, adoptionMonitor, resistanceAnalyzer, changeImpactAssessor,
  strategicObjectiveManager, okrTracker, scenarioPlanningEngine, strategyExecutionAnalyzer,
  competitorProfileManager, marketPositionAnalyzer, winLossAnalyzer, competitiveAlertManager
} from '../index';

// Phase 221: Knowledge Graph Management
describe('Phase 221 — Knowledge Graph Management', () => {
  it('adds entities and retrieves by type', () => {
    const e1 = knowledgeEntityManager.add('product', 'Core Platform', { version: '2.0' }, ['saas', 'b2b']);
    const e2 = knowledgeEntityManager.add('product', 'Mobile App', { platform: 'ios' }, ['mobile']);
    expect(e1.entityId).toMatch(/^ent-/);
    const products = knowledgeEntityManager.getByType('product');
    expect(products.length).toBeGreaterThanOrEqual(2);
  });

  it('links entities and retrieves relationships', () => {
    const e1 = knowledgeEntityManager.add('team', 'Engineering', {});
    const e2 = knowledgeEntityManager.add('team', 'Product', {});
    const rel = relationshipMapper.link(e1.entityId, e2.entityId, 'collaborates_with', 0.9, true);
    expect(rel.strength).toBe(0.9);
    const connected = relationshipMapper.getConnectedEntities(e1.entityId);
    expect(connected).toContain(e2.entityId);
  });

  it('executes knowledge queries and returns results', () => {
    const query = knowledgeQueryEngine.execute('type:product', ['product'], ['uses'], 2, ['ent-1', 'ent-2']);
    expect(query.queryId).toMatch(/^kgq-/);
    expect(query.results.length).toBe(2);
  });

  it('computes graph analytics with entity/relationship counts', () => {
    const entities = knowledgeEntityManager.getAllEntities();
    const relationships = relationshipMapper.getAllRelationships();
    const analytics = graphAnalyticsEngine.compute(entities, relationships);
    expect(analytics.totalEntities).toBeGreaterThan(0);
    expect(analytics.totalRelationships).toBeGreaterThanOrEqual(0);
    expect(analytics.avgConnectionsPerEntity).toBeGreaterThanOrEqual(0);
  });
});

// Phase 222: Learning & Development Intelligence
describe('Phase 222 — Learning & Development Intelligence', () => {
  it('creates learning path and retrieves by role', () => {
    const modules = [
      { moduleId: 'm1', name: 'Intro', durationHours: 2, required: true },
      { moduleId: 'm2', name: 'Advanced', durationHours: 4, required: true }
    ];
    const path = learningPathManager.create('Frontend Mastery', 'frontend_dev', modules, ['React', 'TypeScript'], 'intermediate');
    expect(path.totalHours).toBe(6);
    const byRole = learningPathManager.getByRole('frontend_dev');
    expect(byRole.length).toBeGreaterThan(0);
  });

  it('tracks learner module completion and calculates percentage', () => {
    const path = learningPathManager.getAllPaths()[0];
    learnerProgressTracker.enroll('learner-1', path.pathId);
    learnerProgressTracker.completeModule('learner-1', path.pathId, path.modules[0].moduleId, 2, path.modules.length);
    const progress = learnerProgressTracker.getProgress('learner-1', path.pathId);
    expect(progress!.completionPct).toBeGreaterThan(0);
    expect(progress!.status).toBe('in_progress');
  });

  it('measures training effectiveness with skill improvement', () => {
    const eff = trainingEffectivenessAnalyzer.measure('path-001', 50, 80, 60, 78, 72);
    expect(eff.skillImprovementPct).toBeCloseTo(30, 0);
    expect(eff.businessImpactScore).toBeGreaterThan(0);
  });

  it('aggregates L&D analytics and detects trend', () => {
    const progress = learnerProgressTracker.getLearnerPaths('learner-1');
    const summary = ldAnalyticsAggregator.aggregate('2026-Q1', progress, ['path-001'], 3);
    expect(summary.totalHoursConsumed).toBeGreaterThanOrEqual(0);
    expect(summary.skillGapsClosed).toBe(3);
  });
});

// Phase 223: Innovation Management
describe('Phase 223 — Innovation Management', () => {
  it('submits idea and advances through pipeline stages', () => {
    const idea = ideaPipelineManager.submit('AI-Powered Recommendations', 'Use ML for personalization', 'eng-1', 'technology', ['ai', 'ml']);
    expect(idea.stage).toBe('submitted');
    ideaPipelineManager.vote(idea.ideaId);
    ideaPipelineManager.advance(idea.ideaId, 'prototyping');
    const updated = ideaPipelineManager.getIdea(idea.ideaId);
    expect(updated!.stage).toBe('prototyping');
    expect(updated!.votes).toBe(1);
  });

  it('scores innovation idea with composite recommendation', () => {
    const idea = ideaPipelineManager.getTopVoted(1)[0];
    const score = innovationScorer.score(idea.ideaId, 80, 70, 85, 75);
    expect(score.compositeScore).toBeCloseTo(78, 0);  // 80*.25+70*.25+85*.3+75*.2
    expect(score.recommendation).toBe('pursue');
  });

  it('tracks experiment from creation to completion', () => {
    const idea = ideaPipelineManager.getTopVoted(1)[0];
    const exp = experimentTracker.create(idea.ideaId, 'Users will engage 20% more', ['engagement_rate'], { engagement_rate: 20 });
    experimentTracker.start(exp.experimentId);
    experimentTracker.complete(exp.experimentId, { engagement_rate: 25 });
    const completed = experimentTracker.getExperiment(exp.experimentId);
    expect(completed!.successCriteriaMet).toBe(true);
    expect(experimentTracker.getSuccessRate()).toBeGreaterThan(0);
  });

  it('manages innovation portfolio with ROI tracking', () => {
    const idea = ideaPipelineManager.getTopVoted(1)[0];
    const item = innovationPortfolioManager.add(idea.ideaId, 100000, 150, 'medium', 'medium_term');
    expect(item.expectedROI).toBe(150);
    innovationPortfolioManager.recordActualROI(idea.ideaId, 180);
    expect(innovationPortfolioManager.getTotalInvestment()).toBeGreaterThan(0);
  });
});

// Phase 224: Change Management Analytics
describe('Phase 224 — Change Management Analytics', () => {
  it('creates change initiative and tracks status', () => {
    const future = Date.now() + 90 * 86400 * 1000;
    const init = changeInitiativeTracker.create('ERP Migration', 'Move to new ERP system', 'technology', 'enterprise', 500, 'cto@company.com', future);
    expect(init.status).toBe('planning');
    changeInitiativeTracker.updateStatus(init.initiativeId, 'active');
    expect(changeInitiativeTracker.getActive().some(i => i.initiativeId === init.initiativeId)).toBe(true);
  });

  it('monitors adoption and detects trend', () => {
    const init = changeInitiativeTracker.getActive()[0];
    adoptionMonitor.record(init.initiativeId, '2026-Q1', 500, 400, 300, 200, 100);
    adoptionMonitor.record(init.initiativeId, '2026-Q2', 500, 450, 380, 320, 200);
    const latest = adoptionMonitor.getLatest(init.initiativeId);
    expect(latest!.adoptionRate).toBeCloseTo(64, 0);
    expect(adoptionMonitor.getAdoptionTrend(init.initiativeId)).toBe('accelerating');
  });

  it('records resistance with mitigation actions', () => {
    const init = changeInitiativeTracker.getActive()[0];
    const rec = resistanceAnalyzer.record(init.initiativeId, 'middle_management', 'high', ['fear_of_job_loss', 'skill_gaps'], 45);
    expect(rec.mitigationActions).toContain('champion_program');
    expect(rec.mitigationActions.length).toBeGreaterThan(0);
  });

  it('assesses change impact and calculates readiness', () => {
    const init = changeInitiativeTracker.getActive()[0];
    const assessment = changeImpactAssessor.assess(init.initiativeId, -10, -20, 40, 30);
    expect(assessment.overallChangeReadiness).toBeGreaterThanOrEqual(0);
    expect(assessment.overallChangeReadiness).toBeLessThanOrEqual(100);
  });
});

// Phase 225: Strategic Planning Intelligence
describe('Phase 225 — Strategic Planning Intelligence', () => {
  it('creates strategic objective and updates progress', () => {
    const obj = strategicObjectiveManager.create('Double ARR', 'Achieve 2x annual recurring revenue', 'growth', 'annual', 'cro@company.com');
    strategicObjectiveManager.updateProgress(obj.objectiveId, 75);
    const updated = obj;
    expect(updated.progressPct).toBe(75);
    expect(updated.status).toBe('active');
  });

  it('tracks OKR with key result updates', () => {
    const obj = strategicObjectiveManager.getByPillar('growth')[0];
    const okr = okrTracker.create(obj.objectiveId, '2026-Q1', 'Grow enterprise segment', [
      { krId: 'kr1', description: 'New enterprise logos', target: 20, current: 0, unit: 'count' },
      { krId: 'kr2', description: 'Enterprise ARR ($M)', target: 5, current: 0, unit: 'million' }
    ]);
    okrTracker.updateKeyResult(okr.okrId, 'kr1', 15);
    okrTracker.updateKeyResult(okr.okrId, 'kr2', 3.5);
    const updated = okrTracker.getOKR(okr.okrId);
    expect(updated!.overallProgress).toBeCloseTo(72.5, 0);
  });

  it('creates scenarios and calculates weighted projections', () => {
    scenarioPlanningEngine.create('Base Case', 'base', ['market_stable'], 10000000, 7000000, 0.6, ['competition'], ['upsell']);
    scenarioPlanningEngine.create('Optimistic', 'optimistic', ['market_grows'], 15000000, 8000000, 0.3, [], ['expansion']);
    const projection = scenarioPlanningEngine.getWeightedProjection();
    expect(projection.revenue).toBeGreaterThan(0);
    expect(projection.costs).toBeGreaterThan(0);
  });

  it('records strategy execution metrics and assesses health', () => {
    strategyExecutionAnalyzer.record('2026-Q1', 20, 14, 4, 2, 78, 5);
    const health = strategyExecutionAnalyzer.getExecutionHealth();
    expect(['healthy', 'warning', 'critical']).toContain(health);
    expect(strategyExecutionAnalyzer.getLatest()!.initiativesTotal).toBe(20);
  });
});

// Phase 226: Competitive Intelligence
describe('Phase 226 — Competitive Intelligence', () => {
  it('upserts competitor profile and assigns threat level', () => {
    const comp = competitorProfileManager.upsert('AcmeCorp', 'primary', 25, ['ai_features', 'pricing'], ['support', 'integrations'], 'mid_market');
    expect(comp.threatLevel).toBe('critical');
    competitorProfileManager.addRecentMove(comp.competitorId, 'Launched AI assistant feature');
    const updated = competitorProfileManager.getProfile(comp.competitorId);
    expect(updated!.recentMoves.length).toBeGreaterThan(0);
  });

  it('analyzes market position and finds leading dimensions', () => {
    const analysis = marketPositionAnalyzer.analyze('product_quality', 85, { 'AcmeCorp': 75, 'BetaCo': 70 }, 72);
    expect(analysis.ourRank).toBe(1);
    const leading = marketPositionAnalyzer.getLeadingDimensions();
    expect(leading.length).toBeGreaterThan(0);
  });

  it('records win/loss and calculates win rate by competitor', () => {
    const comp = competitorProfileManager.getAllProfiles()[0];
    winLossAnalyzer.record('opp-1', 'win', 'better_product', 50000, 45, 'enterprise', comp.competitorId);
    winLossAnalyzer.record('opp-2', 'loss', 'price', 30000, 60, 'smb', comp.competitorId, ['integration_gaps']);
    const winRate = winLossAnalyzer.getWinRate();
    expect(winRate).toBe(50);
    const topReasons = winLossAnalyzer.getTopLossReasons();
    expect(topReasons.length).toBeGreaterThan(0);
    expect(topReasons[0].reason).toBe('price');
  });

  it('raises competitive alerts and filters by severity', () => {
    const comp = competitorProfileManager.getAllProfiles()[0];
    competitiveAlertManager.raise('product_launch', comp.competitorId, 'Launched enterprise tier', 'high', 'Accelerate roadmap response');
    const alerts = competitiveAlertManager.getUnacknowledged('high');
    expect(alerts.length).toBeGreaterThan(0);
    competitiveAlertManager.acknowledge(alerts[0].alertId);
    const afterAck = competitiveAlertManager.getUnacknowledged('high');
    expect(afterAck.length).toBe(0);
  });
});
