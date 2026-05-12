/**
 * Phase 223: Innovation Management
 * Idea pipeline, innovation scoring, experiment tracking, portfolio management
 */

import { logger } from './logger';

interface InnovationIdea {
  ideaId: string;
  title: string;
  description: string;
  submittedBy: string;
  category: 'product' | 'process' | 'business_model' | 'technology' | 'customer_experience';
  stage: 'submitted' | 'under_review' | 'prototyping' | 'piloting' | 'scaling' | 'archived';
  votes: number;
  feasibilityScore: number;  // 0-100
  potentialImpactScore: number;  // 0-100
  tags: string[];
  submittedAt: number;
  updatedAt: number;
}

interface InnovationScore {
  scoreId: string;
  ideaId: string;
  noveltyScore: number;     // 0-100
  feasibilityScore: number; // 0-100
  impactScore: number;      // 0-100
  alignmentScore: number;   // 0-100
  compositeScore: number;   // weighted composite
  recommendation: 'pursue' | 'monitor' | 'park' | 'reject';
  scoredAt: number;
}

interface InnovationExperiment {
  experimentId: string;
  ideaId: string;
  hypothesis: string;
  metrics: string[];
  targetValues: Record<string, number>;
  actualValues: Record<string, number>;
  status: 'planned' | 'running' | 'completed' | 'failed';
  successCriteriaMet: boolean;
  startedAt: number;
  completedAt?: number;
}

interface InnovationPortfolioItem {
  portfolioId: string;
  ideaId: string;
  investmentAmount: number;
  expectedROI: number;
  actualROI?: number;
  riskLevel: 'low' | 'medium' | 'high' | 'moonshot';
  horizon: 'short_term' | 'medium_term' | 'long_term';
  addedAt: number;
}

class IdeaPipelineManager {
  private ideas: Map<string, InnovationIdea> = new Map();
  private counter = 0;

  submit(title: string, description: string, submittedBy: string, category: InnovationIdea['category'], tags: string[] = []): InnovationIdea {
    const ideaId = `idea-${Date.now()}-${++this.counter}`;
    const idea: InnovationIdea = {
      ideaId, title, description, submittedBy, category,
      stage: 'submitted', votes: 0,
      feasibilityScore: 0, potentialImpactScore: 0,
      tags, submittedAt: Date.now(), updatedAt: Date.now()
    };
    this.ideas.set(ideaId, idea);
    logger.debug('Innovation idea submitted', { ideaId, title, category });
    return idea;
  }

  advance(ideaId: string, stage: InnovationIdea['stage']): boolean {
    const idea = this.ideas.get(ideaId);
    if (!idea) return false;
    idea.stage = stage;
    idea.updatedAt = Date.now();
    return true;
  }

  vote(ideaId: string): boolean {
    const idea = this.ideas.get(ideaId);
    if (!idea) return false;
    idea.votes++;
    return true;
  }

  getByStage(stage: InnovationIdea['stage']): InnovationIdea[] {
    return Array.from(this.ideas.values()).filter(i => i.stage === stage);
  }

  getTopVoted(limit = 10): InnovationIdea[] {
    return Array.from(this.ideas.values())
      .sort((a, b) => b.votes - a.votes)
      .slice(0, limit);
  }

  getIdea(ideaId: string): InnovationIdea | undefined {
    return this.ideas.get(ideaId);
  }
}

class InnovationScorer {
  private scores: Map<string, InnovationScore> = new Map();
  private counter = 0;

  score(ideaId: string, novelty: number, feasibility: number, impact: number, alignment: number): InnovationScore {
    const compositeScore = novelty * 0.25 + feasibility * 0.25 + impact * 0.3 + alignment * 0.2;
    const recommendation: InnovationScore['recommendation'] =
      compositeScore >= 75 ? 'pursue' :
      compositeScore >= 55 ? 'monitor' :
      compositeScore >= 35 ? 'park' : 'reject';

    const scoreId = `innscore-${Date.now()}-${++this.counter}`;
    const score: InnovationScore = {
      scoreId, ideaId,
      noveltyScore: Math.max(0, Math.min(100, novelty)),
      feasibilityScore: Math.max(0, Math.min(100, feasibility)),
      impactScore: Math.max(0, Math.min(100, impact)),
      alignmentScore: Math.max(0, Math.min(100, alignment)),
      compositeScore, recommendation, scoredAt: Date.now()
    };
    this.scores.set(ideaId, score);
    return score;
  }

  getTopScored(limit = 10): InnovationScore[] {
    return Array.from(this.scores.values())
      .sort((a, b) => b.compositeScore - a.compositeScore)
      .slice(0, limit);
  }

  getScore(ideaId: string): InnovationScore | undefined {
    return this.scores.get(ideaId);
  }

  getByRecommendation(recommendation: InnovationScore['recommendation']): InnovationScore[] {
    return Array.from(this.scores.values()).filter(s => s.recommendation === recommendation);
  }
}

class ExperimentTracker {
  private experiments: Map<string, InnovationExperiment> = new Map();
  private counter = 0;

  create(ideaId: string, hypothesis: string, metrics: string[], targetValues: Record<string, number>): InnovationExperiment {
    const experimentId = `exp-${Date.now()}-${++this.counter}`;
    const experiment: InnovationExperiment = {
      experimentId, ideaId, hypothesis, metrics, targetValues,
      actualValues: {}, status: 'planned', successCriteriaMet: false, startedAt: Date.now()
    };
    this.experiments.set(experimentId, experiment);
    return experiment;
  }

  start(experimentId: string): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp) return false;
    exp.status = 'running';
    return true;
  }

  complete(experimentId: string, actualValues: Record<string, number>): boolean {
    const exp = this.experiments.get(experimentId);
    if (!exp) return false;
    exp.actualValues = actualValues;
    exp.completedAt = Date.now();
    const metTargets = Object.entries(exp.targetValues)
      .every(([metric, target]) => (actualValues[metric] ?? 0) >= target);
    exp.successCriteriaMet = metTargets;
    exp.status = metTargets ? 'completed' : 'failed';
    logger.debug('Experiment completed', { experimentId, successCriteriaMet: exp.successCriteriaMet });
    return true;
  }

  getSuccessRate(): number {
    const finished = Array.from(this.experiments.values()).filter(e => e.status !== 'planned' && e.status !== 'running');
    if (!finished.length) return 0;
    return (finished.filter(e => e.successCriteriaMet).length / finished.length) * 100;
  }

  getExperiment(experimentId: string): InnovationExperiment | undefined {
    return this.experiments.get(experimentId);
  }
}

class InnovationPortfolioManager {
  private portfolio: Map<string, InnovationPortfolioItem> = new Map();
  private counter = 0;

  add(ideaId: string, investmentAmount: number, expectedROI: number, riskLevel: InnovationPortfolioItem['riskLevel'], horizon: InnovationPortfolioItem['horizon']): InnovationPortfolioItem {
    const portfolioId = `innport-${Date.now()}-${++this.counter}`;
    const item: InnovationPortfolioItem = {
      portfolioId, ideaId, investmentAmount, expectedROI,
      riskLevel, horizon, addedAt: Date.now()
    };
    this.portfolio.set(ideaId, item);
    return item;
  }

  recordActualROI(ideaId: string, actualROI: number): boolean {
    const item = this.portfolio.get(ideaId);
    if (!item) return false;
    item.actualROI = actualROI;
    return true;
  }

  getByHorizon(horizon: InnovationPortfolioItem['horizon']): InnovationPortfolioItem[] {
    return Array.from(this.portfolio.values()).filter(i => i.horizon === horizon);
  }

  getTotalInvestment(): number {
    return Array.from(this.portfolio.values()).reduce((s, i) => s + i.investmentAmount, 0);
  }

  getAvgExpectedROI(): number {
    const all = Array.from(this.portfolio.values());
    if (!all.length) return 0;
    return all.reduce((s, i) => s + i.expectedROI, 0) / all.length;
  }
}

export const ideaPipelineManager = new IdeaPipelineManager();
export const innovationScorer = new InnovationScorer();
export const experimentTracker = new ExperimentTracker();
export const innovationPortfolioManager = new InnovationPortfolioManager();

export type {InnovationIdea, InnovationScore, InnovationExperiment, InnovationPortfolioItem};