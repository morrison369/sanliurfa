/**
 * Phase 331: Knowledge Worker Intelligence
 * Productivity tracking, collaboration analytics, expertise mapping, flow state detection
 */

import { logger } from './logger';

interface WorkerProductivityRecord {
  productivityId: string;
  workerId: string;
  workerName: string;
  department: string;
  period: string;
  deepWorkHours: number;           // focused, uninterrupted work
  meetingHours: number;
  adminHours: number;
  collaborationHours: number;
  totalTrackedHours: number;
  deepWorkRatioPct: number;        // deep work / total
  outputScore: number;             // 0-100 based on deliverables
  qualityScore: number;            // 0-100 based on peer feedback
  focusScore: number;              // 0-100 based on interruptions
  compositeProductivityScore: number;
  flowStateSessionsCount: number;  // uninterrupted sessions > 90 min
  avgFlowDurationMinutes: number;
  interruptionsPerDay: number;
  trend: 'improving' | 'stable' | 'declining';
  calculatedAt: number;
}

interface CollaborationRecord {
  collabId: string;
  workerId: string;
  workerName: string;
  period: string;
  emailsSent: number;
  emailsReceived: number;
  meetingsHosted: number;
  meetingsAttended: number;
  documentEdits: number;
  commentsMade: number;
  codeReviewsCompleted?: number;
  knowledgeArticlesCreated: number;
  responseTimeAvgMinutes: number;
  collaborationScore: number;      // 0-100
  networkStrength: number;         // number of unique collaborators
  siloRisk: boolean;               // low network strength
  updatedAt: number;
}

interface ExpertiseRecord {
  expertiseId: string;
  workerId: string;
  workerName: string;
  department: string;
  domains: { domain: string; level: 'novice' | 'intermediate' | 'expert' | 'thought_leader'; evidenceCount: number; lastDemonstrated: number }[];
  topDomains: string[];
  uniqueExpertiseAreas: string[];  // areas where this person is top expert
  knowledgeSharingScore: number;   // 0-100 based on mentoring, articles, reviews
  isKeyPerson: boolean;            // flight risk concern
  successorCount: number;
  updatedAt: number;
}

interface TeamFlowRecord {
  flowId: string;
  teamId: string;
  teamName: string;
  period: string;
  avgDeepWorkHours: number;
  avgMeetingHours: number;
  meetingToWorkRatio: number;
  avgCollaborationScore: number;
  flowBlockers: string[];          // e.g. 'excessive meetings', 'context switching'
  focusTimeProtectedHours: number; // scheduled no-meeting blocks
  teamFlowScore: number;           // 0-100
  recommendations: string[];
  calculatedAt: number;
}

class WorkerProductivityTracker {
  private records: Map<string, WorkerProductivityRecord> = new Map();
  private counter = 0;

  track(workerId: string, workerName: string, department: string, period: string, deepWork: number, meetings: number, admin: number, collaboration: number, outputScore: number, qualityScore: number, flowSessions: number, avgFlowMin: number, interruptionsPerDay: number): WorkerProductivityRecord {
    const productivityId = `wprod-${Date.now()}-${++this.counter}`;
    const total = deepWork + meetings + admin + collaboration;
    const deepWorkRatio = total > 0 ? Math.round((deepWork / total) * 100 * 10) / 10 : 0;
    const focusScore = Math.max(0, Math.round(100 - interruptionsPerDay * 5));
    const composite = Math.round(outputScore * 0.35 + qualityScore * 0.30 + focusScore * 0.20 + deepWorkRatio * 0.15);

    const prev = this.records.get(workerId);
    const trend: WorkerProductivityRecord['trend'] = prev
      ? (composite > prev.compositeProductivityScore + 3 ? 'improving' : composite < prev.compositeProductivityScore - 3 ? 'declining' : 'stable')
      : 'stable';

    const record: WorkerProductivityRecord = {
      productivityId, workerId, workerName, department, period,
      deepWorkHours: deepWork, meetingHours: meetings, adminHours: admin, collaborationHours: collaboration,
      totalTrackedHours: total, deepWorkRatioPct: deepWorkRatio,
      outputScore, qualityScore, focusScore, compositeProductivityScore: composite,
      flowStateSessionsCount: flowSessions, avgFlowDurationMinutes: avgFlowMin,
      interruptionsPerDay, trend, calculatedAt: Date.now()
    };
    this.records.set(workerId, record);
    logger.debug('Worker productivity tracked', { workerId, composite, deepWorkRatio, trend });
    return record;
  }

  getTopPerformers(limit = 10): WorkerProductivityRecord[] {
    return Array.from(this.records.values()).sort((a, b) => b.compositeProductivityScore - a.compositeProductivityScore).slice(0, limit);
  }

  getDeclining(): WorkerProductivityRecord[] {
    return Array.from(this.records.values()).filter(r => r.trend === 'declining');
  }

  getAverageDeepWorkRatio(): number {
    const all = Array.from(this.records.values());
    return all.length > 0 ? Math.round(all.reduce((s, r) => s + r.deepWorkRatioPct, 0) / all.length * 10) / 10 : 0;
  }

  getAll(): WorkerProductivityRecord[] {
    return Array.from(this.records.values());
  }
}

class CollaborationAnalyzer {
  private records: Map<string, CollaborationRecord> = new Map();
  private counter = 0;

  analyze(workerId: string, workerName: string, period: string, emailsSent: number, emailsReceived: number, meetingsHosted: number, meetingsAttended: number, docEdits: number, comments: number, kbArticles: number, responseTimeAvg: number, uniqueCollaborators: number, codeReviews?: number): CollaborationRecord {
    const collabId = `collab-${Date.now()}-${++this.counter}`;
    const responsePenalty = responseTimeAvg > 480 ? 20 : responseTimeAvg > 240 ? 10 : 0;
    const collaborationScore = Math.max(0, Math.min(100, Math.round(
      Math.min(uniqueCollaborators * 2, 40) +
      Math.min(kbArticles * 5, 20) +
      Math.min(comments * 0.5, 20) +
      Math.min((meetingsHosted + meetingsAttended) * 2, 20) -
      responsePenalty
    )));

    const record: CollaborationRecord = {
      collabId, workerId, workerName, period,
      emailsSent, emailsReceived, meetingsHosted, meetingsAttended,
      documentEdits: docEdits, commentsMade: comments,
      codeReviewsCompleted: codeReviews, knowledgeArticlesCreated: kbArticles,
      responseTimeAvgMinutes: responseTimeAvg, collaborationScore,
      networkStrength: uniqueCollaborators, siloRisk: uniqueCollaborators < 5,
      updatedAt: Date.now()
    };
    this.records.set(workerId, record);
    return record;
  }

  getSiloRisks(): CollaborationRecord[] {
    return Array.from(this.records.values()).filter(r => r.siloRisk);
  }

  getTopCollaborators(limit = 5): CollaborationRecord[] {
    return Array.from(this.records.values()).sort((a, b) => b.collaborationScore - a.collaborationScore).slice(0, limit);
  }

  getAll(): CollaborationRecord[] {
    return Array.from(this.records.values());
  }
}

class ExpertiseMapper {
  private experts: Map<string, ExpertiseRecord> = new Map();
  private counter = 0;

  map(workerId: string, workerName: string, department: string, domains: ExpertiseRecord['domains'], knowledgeSharingScore: number, successorCount: number): ExpertiseRecord {
    const expertiseId = `exp-${Date.now()}-${++this.counter}`;
    const topDomains = [...domains].sort((a, b) => {
      const levels = { thought_leader: 4, expert: 3, intermediate: 2, novice: 1 };
      return levels[b.level] - levels[a.level];
    }).slice(0, 3).map(d => d.domain);
    const uniqueAreas = domains.filter(d => d.level === 'thought_leader' || d.level === 'expert').map(d => d.domain);
    const isKeyPerson = uniqueAreas.length > 0 && successorCount < 2;

    const record: ExpertiseRecord = {
      expertiseId, workerId, workerName, department, domains,
      topDomains, uniqueExpertiseAreas: uniqueAreas,
      knowledgeSharingScore, isKeyPerson, successorCount, updatedAt: Date.now()
    };
    this.experts.set(workerId, record);
    return record;
  }

  getKeyPersonRisks(): ExpertiseRecord[] {
    return Array.from(this.experts.values()).filter(e => e.isKeyPerson);
  }

  findExpertsByDomain(domain: string): ExpertiseRecord[] {
    return Array.from(this.experts.values())
      .filter(e => e.domains.some(d => d.domain === domain && (d.level === 'expert' || d.level === 'thought_leader')))
      .sort((a, b) => b.knowledgeSharingScore - a.knowledgeSharingScore);
  }

  getAll(): ExpertiseRecord[] {
    return Array.from(this.experts.values());
  }
}

class TeamFlowAnalyzer {
  private flows: TeamFlowRecord[] = [];
  private counter = 0;

  analyze(teamId: string, teamName: string, period: string, workers: WorkerProductivityRecord[], focusTimeHours: number): TeamFlowRecord {
    const flowId = `teamflow-${Date.now()}-${++this.counter}`;
    const n = workers.length || 1;
    const avgDeepWork = Math.round(workers.reduce((s, w) => s + w.deepWorkHours, 0) / n * 10) / 10;
    const avgMeetings = Math.round(workers.reduce((s, w) => s + w.meetingHours, 0) / n * 10) / 10;
    const meetingRatio = avgDeepWork > 0 ? Math.round((avgMeetings / avgDeepWork) * 100) / 100 : 0;
    const avgCollab = Math.round(workers.reduce((s, w) => s + w.compositeProductivityScore, 0) / n * 10) / 10;

    const blockers: string[] = [];
    if (meetingRatio > 0.5) blockers.push('Excessive meetings relative to deep work');
    if (workers.some(w => w.interruptionsPerDay > 8)) blockers.push('High interruption rate');
    if (avgDeepWork < 2) blockers.push('Insufficient deep work time');

    const teamFlowScore = Math.max(0, Math.min(100, Math.round(
      avgCollab * 0.4 + (100 - meetingRatio * 50) * 0.3 + Math.min(focusTimeHours * 10, 30)
    )));

    const recs: string[] = [];
    if (meetingRatio > 0.5) recs.push('Implement meeting-free mornings (9am-12pm)');
    if (focusTimeHours < 2) recs.push('Schedule 2+ hours of protected focus time daily');
    if (blockers.length > 2) recs.push('Conduct team flow audit and restructure collaboration norms');

    const record: TeamFlowRecord = {
      flowId, teamId, teamName, period, avgDeepWorkHours: avgDeepWork,
      avgMeetingHours: avgMeetings, meetingToWorkRatio: meetingRatio,
      avgCollaborationScore: avgCollab, flowBlockers: blockers,
      focusTimeProtectedHours: focusTimeHours, teamFlowScore, recommendations: recs,
      calculatedAt: Date.now()
    };
    this.flows.push(record);
    logger.debug('Team flow analyzed', { teamId, teamFlowScore, meetingRatio, blockers: blockers.length });
    return record;
  }

  getLowFlowTeams(threshold = 50): TeamFlowRecord[] {
    return this.flows.filter(f => f.teamFlowScore < threshold);
  }

  getLatest(teamId: string): TeamFlowRecord | undefined {
    return [...this.flows].filter(f => f.teamId === teamId).slice(-1)[0];
  }
}

export const workerProductivityTracker = new WorkerProductivityTracker();
export const collaborationAnalyzer = new CollaborationAnalyzer();
export const expertiseMapper = new ExpertiseMapper();
export const teamFlowAnalyzer = new TeamFlowAnalyzer();

export { WorkerProductivityRecord, CollaborationRecord, ExpertiseRecord, TeamFlowRecord };
