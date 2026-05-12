/**
 * Unit Tests — innovation-management.ts singleton class managers
 *
 * 4 in-memory class manager (no DB):
 * - IdeaPipelineManager (submit/advance/vote/getByStage/getTopVoted)
 * - InnovationScorer (score with composite formula + recommendation thresholds)
 * - ExperimentTracker (create/start/complete + getSuccessRate)
 * - InnovationPortfolioManager (add/recordActualROI/byHorizon/totalInvestment/avgExpectedROI)
 *
 * Singleton state shared — testler unique title/ideaId kullanır, exact count
 * yerine relative artış kontrolü yapar.
 */

import { describe, it, expect } from 'vitest';
import {
  ideaPipelineManager,
  innovationScorer,
  experimentTracker,
  innovationPortfolioManager,
} from '../innovation-management';

describe('IdeaPipelineManager', () => {
  it('submit → idea döner, ideaId/title/category/stage="submitted"', () => {
    const idea = ideaPipelineManager.submit(
      'Test Idea Unique-1',
      'Description',
      'user-1',
      'product',
    );
    expect(idea.title).toBe('Test Idea Unique-1');
    expect(idea.category).toBe('product');
    expect(idea.stage).toBe('submitted');
    expect(idea.votes).toBe(0);
    expect(idea.ideaId).toMatch(/^idea-\d+-\d+$/);
  });

  it('submit ile tags varsayılan boş array', () => {
    const idea = ideaPipelineManager.submit('No Tags Idea-2', 'd', 'u', 'process');
    expect(idea.tags).toEqual([]);
  });

  it('submit ile tags geçilebilir', () => {
    const idea = ideaPipelineManager.submit('Tagged Idea-3', 'd', 'u', 'product', ['ai', 'ml']);
    expect(idea.tags).toEqual(['ai', 'ml']);
  });

  it('advance — stage değiştirir, true döner', () => {
    const idea = ideaPipelineManager.submit('Advance Idea-4', 'd', 'u', 'product');
    expect(ideaPipelineManager.advance(idea.ideaId, 'under_review')).toBe(true);
    const updated = ideaPipelineManager.getIdea(idea.ideaId);
    expect(updated?.stage).toBe('under_review');
  });

  it('advance — bilinmeyen ideaId false', () => {
    expect(ideaPipelineManager.advance('non-existent', 'piloting')).toBe(false);
  });

  it('vote — votes sayacı +1', () => {
    const idea = ideaPipelineManager.submit('Vote Idea-5', 'd', 'u', 'product');
    expect(idea.votes).toBe(0);
    ideaPipelineManager.vote(idea.ideaId);
    ideaPipelineManager.vote(idea.ideaId);
    expect(ideaPipelineManager.getIdea(idea.ideaId)?.votes).toBe(2);
  });

  it('vote — bilinmeyen ideaId false', () => {
    expect(ideaPipelineManager.vote('non-existent')).toBe(false);
  });

  it('getByStage — submitted ideaları filter', () => {
    const idea = ideaPipelineManager.submit('Stage Filter-6', 'd', 'u', 'technology');
    const submitted = ideaPipelineManager.getByStage('submitted');
    expect(submitted.some((i) => i.ideaId === idea.ideaId)).toBe(true);
  });

  it('getByStage — başka stage\'i içermez', () => {
    const idea = ideaPipelineManager.submit('Stage Other-7', 'd', 'u', 'product');
    ideaPipelineManager.advance(idea.ideaId, 'piloting');
    const submitted = ideaPipelineManager.getByStage('submitted');
    expect(submitted.some((i) => i.ideaId === idea.ideaId)).toBe(false);
  });

  it('getTopVoted — votes desc sıralı', () => {
    const a = ideaPipelineManager.submit('Top A-8', 'd', 'u', 'product');
    const b = ideaPipelineManager.submit('Top B-9', 'd', 'u', 'product');
    ideaPipelineManager.vote(b.ideaId);
    ideaPipelineManager.vote(b.ideaId);
    ideaPipelineManager.vote(a.ideaId);
    const top = ideaPipelineManager.getTopVoted(50);
    const aIdx = top.findIndex((i) => i.ideaId === a.ideaId);
    const bIdx = top.findIndex((i) => i.ideaId === b.ideaId);
    expect(bIdx).toBeLessThan(aIdx);
  });

  it('getTopVoted — limit parametresi', () => {
    const top = ideaPipelineManager.getTopVoted(2);
    expect(top.length).toBeLessThanOrEqual(2);
  });

  it('getIdea — bilinmeyen → undefined', () => {
    expect(ideaPipelineManager.getIdea('non-existent')).toBeUndefined();
  });
});

describe('InnovationScorer', () => {
  it('score → composite formula (n*0.25 + f*0.25 + i*0.3 + a*0.2)', () => {
    const score = innovationScorer.score('idea-score-1', 80, 70, 90, 60);
    // 80*0.25 + 70*0.25 + 90*0.3 + 60*0.2 = 20 + 17.5 + 27 + 12 = 76.5
    expect(score.compositeScore).toBeCloseTo(76.5, 1);
  });

  it('recommendation — composite >= 75 → "pursue"', () => {
    const score = innovationScorer.score('idea-rec-1', 100, 100, 100, 100);
    expect(score.compositeScore).toBe(100);
    expect(score.recommendation).toBe('pursue');
  });

  it('recommendation — composite >= 55 < 75 → "monitor"', () => {
    const score = innovationScorer.score('idea-rec-2', 60, 60, 60, 60);
    expect(score.compositeScore).toBe(60);
    expect(score.recommendation).toBe('monitor');
  });

  it('recommendation — composite >= 35 < 55 → "park"', () => {
    const score = innovationScorer.score('idea-rec-3', 40, 40, 40, 40);
    expect(score.compositeScore).toBe(40);
    expect(score.recommendation).toBe('park');
  });

  it('recommendation — composite < 35 → "reject"', () => {
    const score = innovationScorer.score('idea-rec-4', 20, 20, 20, 20);
    expect(score.compositeScore).toBe(20);
    expect(score.recommendation).toBe('reject');
  });

  it('clamp — 100\'den büyük → 100\'e sıkıştırılır', () => {
    const score = innovationScorer.score('idea-clamp-1', 150, 200, 999, 1000);
    expect(score.noveltyScore).toBe(100);
    expect(score.feasibilityScore).toBe(100);
    expect(score.impactScore).toBe(100);
    expect(score.alignmentScore).toBe(100);
  });

  it('clamp — negatif → 0\'a sıkıştırılır', () => {
    const score = innovationScorer.score('idea-clamp-2', -10, -50, -999, -100);
    expect(score.noveltyScore).toBe(0);
    expect(score.feasibilityScore).toBe(0);
    expect(score.impactScore).toBe(0);
    expect(score.alignmentScore).toBe(0);
  });

  it('getScore — mevcut score döner', () => {
    innovationScorer.score('idea-get-1', 80, 80, 80, 80);
    const result = innovationScorer.getScore('idea-get-1');
    expect(result?.ideaId).toBe('idea-get-1');
  });

  it('getScore — bilinmeyen → undefined', () => {
    expect(innovationScorer.getScore('non-existent-score')).toBeUndefined();
  });

  it('getByRecommendation — pursue filter', () => {
    innovationScorer.score('idea-pursue-1', 100, 100, 100, 100);
    const pursue = innovationScorer.getByRecommendation('pursue');
    expect(pursue.length).toBeGreaterThan(0);
    expect(pursue.every((s) => s.recommendation === 'pursue')).toBe(true);
  });

  it('getTopScored — composite desc sıralı', () => {
    const top = innovationScorer.getTopScored(20);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].compositeScore).toBeGreaterThanOrEqual(top[i].compositeScore);
    }
  });
});

describe('ExperimentTracker', () => {
  it('create — experiment oluşur, status="planned"', () => {
    const exp = experimentTracker.create(
      'idea-exp-1',
      'Higher CTR with red button',
      ['ctr'],
      { ctr: 5.0 },
    );
    expect(exp.status).toBe('planned');
    expect(exp.successCriteriaMet).toBe(false);
    expect(exp.experimentId).toMatch(/^exp-\d+-\d+$/);
  });

  it('start — status "running"', () => {
    const exp = experimentTracker.create('idea-start-1', 'h', ['m'], { m: 10 });
    expect(experimentTracker.start(exp.experimentId)).toBe(true);
    const updated = experimentTracker.getExperiment(exp.experimentId);
    expect(updated?.status).toBe('running');
  });

  it('start — bilinmeyen → false', () => {
    expect(experimentTracker.start('non-existent')).toBe(false);
  });

  it('complete — actualValues set, completedAt set', () => {
    const exp = experimentTracker.create('idea-comp-1', 'h', ['m'], { m: 10 });
    experimentTracker.complete(exp.experimentId, { m: 15 });
    const updated = experimentTracker.getExperiment(exp.experimentId);
    expect(updated?.actualValues).toEqual({ m: 15 });
    expect(updated?.completedAt).toBeDefined();
  });

  it('complete — tüm metric target karşılanırsa successCriteriaMet=true, status=completed', () => {
    const exp = experimentTracker.create('idea-success-1', 'h', ['ctr', 'cvr'], { ctr: 5, cvr: 2 });
    experimentTracker.complete(exp.experimentId, { ctr: 6, cvr: 3 });
    const updated = experimentTracker.getExperiment(exp.experimentId);
    expect(updated?.successCriteriaMet).toBe(true);
    expect(updated?.status).toBe('completed');
  });

  it('complete — herhangi bir metric karşılanmazsa successCriteriaMet=false, status=failed', () => {
    const exp = experimentTracker.create('idea-fail-1', 'h', ['ctr', 'cvr'], { ctr: 5, cvr: 2 });
    experimentTracker.complete(exp.experimentId, { ctr: 6, cvr: 1 }); // cvr target karşılanmadı
    const updated = experimentTracker.getExperiment(exp.experimentId);
    expect(updated?.successCriteriaMet).toBe(false);
    expect(updated?.status).toBe('failed');
  });

  it('complete — eksik actualValues metric → 0 sayılır → fail', () => {
    const exp = experimentTracker.create('idea-missing-1', 'h', ['ctr'], { ctr: 5 });
    experimentTracker.complete(exp.experimentId, {}); // ctr verilmedi → 0 < 5
    expect(experimentTracker.getExperiment(exp.experimentId)?.successCriteriaMet).toBe(false);
  });

  it('complete — bilinmeyen → false', () => {
    expect(experimentTracker.complete('non-existent', {})).toBe(false);
  });

  it('getSuccessRate — finished experiment yüzdesi', () => {
    const rate = experimentTracker.getSuccessRate();
    expect(rate).toBeGreaterThanOrEqual(0);
    expect(rate).toBeLessThanOrEqual(100);
  });
});

describe('InnovationPortfolioManager', () => {
  it('add — portfolio item döner', () => {
    const item = innovationPortfolioManager.add('idea-port-1', 100000, 25, 'medium', 'short_term');
    expect(item.investmentAmount).toBe(100000);
    expect(item.expectedROI).toBe(25);
    expect(item.riskLevel).toBe('medium');
    expect(item.horizon).toBe('short_term');
    expect(item.portfolioId).toMatch(/^innport-\d+-\d+$/);
  });

  it('recordActualROI — mevcut item update', () => {
    innovationPortfolioManager.add('idea-roi-1', 50000, 20, 'low', 'short_term');
    expect(innovationPortfolioManager.recordActualROI('idea-roi-1', 35)).toBe(true);
  });

  it('recordActualROI — bilinmeyen → false', () => {
    expect(innovationPortfolioManager.recordActualROI('non-existent', 10)).toBe(false);
  });

  it('getByHorizon — horizon filter (long_term)', () => {
    innovationPortfolioManager.add('idea-horizon-1', 1000000, 50, 'moonshot', 'long_term');
    const long = innovationPortfolioManager.getByHorizon('long_term');
    expect(long.length).toBeGreaterThan(0);
    expect(long.every((i) => i.horizon === 'long_term')).toBe(true);
  });

  it('getTotalInvestment — toplam yatırım sum', () => {
    const total = innovationPortfolioManager.getTotalInvestment();
    expect(total).toBeGreaterThan(0);
    expect(typeof total).toBe('number');
  });

  it('getAvgExpectedROI — ortalama ROI', () => {
    const avg = innovationPortfolioManager.getAvgExpectedROI();
    expect(avg).toBeGreaterThan(0);
    expect(typeof avg).toBe('number');
  });
});
