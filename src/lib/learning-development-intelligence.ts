/**
 * Phase 222: Learning & Development Intelligence
 * Learning path management, skill development tracking, training effectiveness, L&D analytics
 */

import { logger } from './logger';

interface LearningPath {
  pathId: string;
  name: string;
  targetRole: string;
  modules: Array<{ moduleId: string; name: string; durationHours: number; required: boolean }>;
  totalHours: number;
  skillsGained: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  createdAt: number;
}

interface LearnerProgress {
  progressId: string;
  learnerId: string;
  pathId: string;
  completedModules: string[];
  completionPct: number;
  hoursSpent: number;
  lastActivityAt: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  startedAt: number;
  completedAt?: number;
}

interface TrainingEffectiveness {
  effectivenessId: string;
  pathId: string;
  cohortSize: number;
  completionRate: number;
  avgScoreBeforeTraining: number;
  avgScoreAfterTraining: number;
  skillImprovementPct: number;
  knowledgeRetention30Days: number;
  businessImpactScore: number;
  measuredAt: number;
}

interface LDAnalyticsSummary {
  summaryId: string;
  period: string;
  totalLearners: number;
  activelearners: number;
  avgCompletionRate: number;
  totalHoursConsumed: number;
  topPerformingPaths: string[];
  skillGapsClosed: number;
  capturedAt: number;
}

class LearningPathManager {
  private paths: Map<string, LearningPath> = new Map();
  private counter = 0;

  create(name: string, targetRole: string, modules: LearningPath['modules'], skillsGained: string[], difficulty: LearningPath['difficulty']): LearningPath {
    const pathId = `lpath-${Date.now()}-${++this.counter}`;
    const totalHours = modules.reduce((s, m) => s + m.durationHours, 0);
    const path: LearningPath = {
      pathId, name, targetRole, modules, totalHours, skillsGained, difficulty, createdAt: Date.now()
    };
    this.paths.set(pathId, path);
    logger.debug('Learning path created', { pathId, name, targetRole, totalHours });
    return path;
  }

  getByRole(targetRole: string): LearningPath[] {
    return Array.from(this.paths.values()).filter(p => p.targetRole === targetRole);
  }

  getByDifficulty(difficulty: LearningPath['difficulty']): LearningPath[] {
    return Array.from(this.paths.values()).filter(p => p.difficulty === difficulty);
  }

  getPath(pathId: string): LearningPath | undefined {
    return this.paths.get(pathId);
  }

  getAllPaths(): LearningPath[] {
    return Array.from(this.paths.values());
  }
}

class LearnerProgressTracker {
  private progress: Map<string, LearnerProgress> = new Map();
  private counter = 0;

  enroll(learnerId: string, pathId: string): LearnerProgress {
    const progressId = `lprog-${Date.now()}-${++this.counter}`;
    const record: LearnerProgress = {
      progressId, learnerId, pathId, completedModules: [],
      completionPct: 0, hoursSpent: 0, lastActivityAt: Date.now(),
      status: 'not_started', startedAt: Date.now()
    };
    this.progress.set(`${learnerId}:${pathId}`, record);
    return record;
  }

  completeModule(learnerId: string, pathId: string, moduleId: string, hoursSpent: number, totalModules: number): boolean {
    const record = this.progress.get(`${learnerId}:${pathId}`);
    if (!record) return false;
    if (!record.completedModules.includes(moduleId)) record.completedModules.push(moduleId);
    record.hoursSpent += hoursSpent;
    record.completionPct = totalModules > 0 ? (record.completedModules.length / totalModules) * 100 : 0;
    record.lastActivityAt = Date.now();
    record.status = record.completionPct >= 100 ? 'completed' : 'in_progress';
    if (record.status === 'completed') record.completedAt = Date.now();
    return true;
  }

  getProgress(learnerId: string, pathId: string): LearnerProgress | undefined {
    return this.progress.get(`${learnerId}:${pathId}`);
  }

  getLearnerPaths(learnerId: string): LearnerProgress[] {
    return Array.from(this.progress.values()).filter(p => p.learnerId === learnerId);
  }

  getAtRisk(inactivityDays = 14): LearnerProgress[] {
    const threshold = Date.now() - inactivityDays * 86400 * 1000;
    return Array.from(this.progress.values())
      .filter(p => p.status === 'in_progress' && p.lastActivityAt < threshold);
  }
}

class TrainingEffectivenessAnalyzer {
  private records: Map<string, TrainingEffectiveness> = new Map();
  private counter = 0;

  measure(pathId: string, cohortSize: number, completionRate: number, scoreBefore: number, scoreAfter: number, retention30Days: number): TrainingEffectiveness {
    const effectivenessId = `traineff-${Date.now()}-${++this.counter}`;
    const skillImprovementPct = scoreBefore > 0 ? ((scoreAfter - scoreBefore) / scoreBefore) * 100 : 0;
    const businessImpactScore = Math.min(100, completionRate * 0.3 + skillImprovementPct * 0.4 + retention30Days * 0.3);
    const record: TrainingEffectiveness = {
      effectivenessId, pathId, cohortSize, completionRate,
      avgScoreBeforeTraining: scoreBefore, avgScoreAfterTraining: scoreAfter,
      skillImprovementPct, knowledgeRetention30Days: retention30Days,
      businessImpactScore, measuredAt: Date.now()
    };
    this.records.set(pathId, record);
    logger.debug('Training effectiveness measured', { pathId, skillImprovementPct, businessImpactScore });
    return record;
  }

  getTopEffectivePaths(limit = 5): TrainingEffectiveness[] {
    return Array.from(this.records.values())
      .sort((a, b) => b.businessImpactScore - a.businessImpactScore)
      .slice(0, limit);
  }

  getEffectiveness(pathId: string): TrainingEffectiveness | undefined {
    return this.records.get(pathId);
  }

  getAvgImprovement(): number {
    const all = Array.from(this.records.values());
    if (!all.length) return 0;
    return all.reduce((s, r) => s + r.skillImprovementPct, 0) / all.length;
  }
}

class LDAnalyticsAggregator {
  private summaries: LDAnalyticsSummary[] = [];
  private counter = 0;

  aggregate(period: string, allProgress: LearnerProgress[], topPaths: string[], skillGapsClosed: number): LDAnalyticsSummary {
    const uniqueLearners = new Set(allProgress.map(p => p.learnerId)).size;
    const activeLearners = allProgress.filter(p => p.status === 'in_progress').length;
    const completed = allProgress.filter(p => p.status === 'completed');
    const avgCompletion = allProgress.length > 0 ? (completed.length / allProgress.length) * 100 : 0;
    const totalHours = allProgress.reduce((s, p) => s + p.hoursSpent, 0);

    const summaryId = `ldsum-${Date.now()}-${++this.counter}`;
    const summary: LDAnalyticsSummary = {
      summaryId, period, totalLearners: uniqueLearners,
      activelearners: activeLearners, avgCompletionRate: avgCompletion,
      totalHoursConsumed: totalHours, topPerformingPaths: topPaths,
      skillGapsClosed, capturedAt: Date.now()
    };
    this.summaries.push(summary);
    return summary;
  }

  getLatest(): LDAnalyticsSummary | undefined {
    return this.summaries[this.summaries.length - 1];
  }

  getTrend(): 'improving' | 'stable' | 'declining' {
    if (this.summaries.length < 2) return 'stable';
    const prev = this.summaries[this.summaries.length - 2];
    const curr = this.summaries[this.summaries.length - 1];
    const diff = curr.avgCompletionRate - prev.avgCompletionRate;
    return diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable';
  }
}

export const learningPathManager = new LearningPathManager();
export const learnerProgressTracker = new LearnerProgressTracker();
export const trainingEffectivenessAnalyzer = new TrainingEffectivenessAnalyzer();
export const ldAnalyticsAggregator = new LDAnalyticsAggregator();

export { LearningPath, LearnerProgress, TrainingEffectiveness, LDAnalyticsSummary };
