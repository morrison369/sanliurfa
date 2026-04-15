/**
 * Phase 340: Employee Experience Intelligence
 * Engagement pulse, sentiment tracking, retention risk, experience journey
 */

import { logger } from './logger';

interface EngagementRecord {
  engagementId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  managerId: string;
  tenureMonths: number;
  engagementScore: number;         // 0-100
  eNpsScore: number;               // -100 to 100 (employee NPS)
  satisfactionScore: number;       // 0-100
  wellbeingScore: number;          // 0-100
  growthScore: number;             // perceived career growth 0-100
  managerScore: number;            // manager effectiveness 0-100
  peersScore: number;              // team dynamics 0-100
  purposeScore: number;            // alignment with company mission 0-100
  workLifeBalanceScore: number;    // 0-100
  category: 'highly_engaged' | 'engaged' | 'neutral' | 'disengaged' | 'actively_disengaged';
  trendDirection: 'improving' | 'stable' | 'declining';
  surveyDate: number;
  createdAt: number;
}

interface RetentionRiskRecord {
  riskId: string;
  employeeId: string;
  employeeName: string;
  department: string;
  role: string;
  flightRiskPct: number;           // 0-100 probability of leaving
  riskCategory: 'critical' | 'high' | 'medium' | 'low';
  riskFactors: string[];
  replacementCostUSD: number;
  replacementTimeWeeks: number;
  isKeyPerson: boolean;
  retentionActions: string[];
  actionOwner: string;
  actionStatus: 'none' | 'planned' | 'in_progress' | 'resolved';
  assessedAt: number;
}

interface ExperienceJourneyRecord {
  journeyId: string;
  employeeId: string;
  employeeName: string;
  currentStage: 'pre_boarding' | 'onboarding' | 'early_career' | 'growth' | 'senior' | 'transition';
  stageDurationMonths: number;
  stageHealthScore: number;
  keyMilestones: { milestone: string; targetDate: number; completedDate?: number; status: 'pending' | 'complete' | 'overdue' }[];
  painPoints: string[];
  highlights: string[];
  nextAction: string;
  nextActionDue: number;
  hrPartner?: string;
  updatedAt: number;
}

interface PulseCheckRecord {
  pulseId: string;
  period: string;
  teamId: string;
  teamName: string;
  responseRatePct: number;
  avgEngagementScore: number;
  avgSatisfactionScore: number;
  avgWellbeingScore: number;
  topConcerns: string[];
  topHighlights: string[];
  engagementDistribution: { highly_engaged: number; engaged: number; neutral: number; disengaged: number; actively_disengaged: number };
  trendVsPrevious: 'improving' | 'stable' | 'declining';
  actionItems: string[];
  createdAt: number;
}

class EngagementTracker {
  private records: Map<string, EngagementRecord> = new Map();
  private counter = 0;

  survey(employeeId: string, employeeName: string, department: string, managerId: string, tenureMonths: number, satisfaction: number, wellbeing: number, growth: number, manager: number, peers: number, purpose: number, workLifeBalance: number, eNps: number): EngagementRecord {
    const engagementId = `eng-${Date.now()}-${++this.counter}`;
    const engagementScore = Math.round(
      satisfaction * 0.15 + wellbeing * 0.15 + growth * 0.15 +
      manager * 0.20 + peers * 0.10 + purpose * 0.15 + workLifeBalance * 0.10
    );
    const category: EngagementRecord['category'] =
      engagementScore >= 80 ? 'highly_engaged' : engagementScore >= 65 ? 'engaged' :
      engagementScore >= 45 ? 'neutral' : engagementScore >= 25 ? 'disengaged' : 'actively_disengaged';

    const prev = this.records.get(employeeId);
    const trend: EngagementRecord['trendDirection'] = prev
      ? (engagementScore > prev.engagementScore + 3 ? 'improving' : engagementScore < prev.engagementScore - 3 ? 'declining' : 'stable')
      : 'stable';

    const record: EngagementRecord = {
      engagementId, employeeId, employeeName, department, managerId, tenureMonths,
      engagementScore, eNpsScore: Math.max(-100, Math.min(100, eNps)), satisfactionScore: satisfaction,
      wellbeingScore: wellbeing, growthScore: growth, managerScore: manager, peersScore: peers,
      purposeScore: purpose, workLifeBalanceScore: workLifeBalance, category, trendDirection: trend,
      surveyDate: Date.now(), createdAt: Date.now()
    };
    this.records.set(employeeId, record);
    logger.debug('Engagement surveyed', { employeeId, engagementScore, category, trend });
    return record;
  }

  getDisengaged(): EngagementRecord[] {
    return Array.from(this.records.values()).filter(r => r.category === 'disengaged' || r.category === 'actively_disengaged');
  }

  getDeclining(): EngagementRecord[] {
    return Array.from(this.records.values()).filter(r => r.trendDirection === 'declining');
  }

  getAvgEngagementScore(): number {
    const all = Array.from(this.records.values());
    return all.length > 0 ? Math.round(all.reduce((s, r) => s + r.engagementScore, 0) / all.length * 10) / 10 : 0;
  }

  getAll(): EngagementRecord[] {
    return Array.from(this.records.values());
  }
}

class RetentionRiskDetector {
  private risks: Map<string, RetentionRiskRecord> = new Map();
  private counter = 0;

  assess(employeeId: string, employeeName: string, department: string, role: string, engagement: EngagementRecord, annualSalaryUSD: number, isKeyPerson: boolean, marketDemandMultiplier: number): RetentionRiskRecord {
    const riskId = `retrisk-${Date.now()}-${++this.counter}`;
    const riskFactors: string[] = [];
    if (engagement.engagementScore < 40) riskFactors.push('Very low engagement score');
    if (engagement.growthScore < 40) riskFactors.push('Perceived lack of growth opportunity');
    if (engagement.managerScore < 40) riskFactors.push('Poor manager relationship');
    if (engagement.trendDirection === 'declining') riskFactors.push('Declining engagement trend');
    if (engagement.tenureMonths >= 18 && engagement.tenureMonths <= 36) riskFactors.push('High-risk tenure window (18-36 months)');
    if (engagement.eNpsScore < -20) riskFactors.push('Negative employee NPS');

    const baseRisk = 100 - engagement.engagementScore;
    const flightRisk = Math.min(100, Math.round(baseRisk * 0.7 + riskFactors.length * 5 + (isKeyPerson ? 10 : 0)));
    const riskCategory: RetentionRiskRecord['riskCategory'] =
      flightRisk >= 75 ? 'critical' : flightRisk >= 50 ? 'high' : flightRisk >= 25 ? 'medium' : 'low';
    const replacementCost = Math.round(annualSalaryUSD * 1.5 * marketDemandMultiplier);
    const replacementWeeks = isKeyPerson ? 24 : 12;

    const actions: string[] = [];
    if (flightRisk >= 75) actions.push('Schedule 1:1 with HR and senior leadership immediately');
    if (engagement.growthScore < 50) actions.push('Discuss career development plan and promotion timeline');
    if (engagement.managerScore < 50) actions.push('Consider manager coaching or team reassignment');
    if (engagement.wellbeingScore < 50) actions.push('Offer flexible work arrangement or wellness support');

    const record: RetentionRiskRecord = {
      riskId, employeeId, employeeName, department, role,
      flightRiskPct: flightRisk, riskCategory, riskFactors,
      replacementCostUSD: replacementCost, replacementTimeWeeks: replacementWeeks,
      isKeyPerson, retentionActions: actions, actionOwner: 'HR', actionStatus: 'none',
      assessedAt: Date.now()
    };
    this.risks.set(employeeId, record);
    return record;
  }

  getCriticalRisks(): RetentionRiskRecord[] {
    return Array.from(this.risks.values()).filter(r => r.riskCategory === 'critical');
  }

  getTotalReplacementCostAtRisk(): number {
    return Array.from(this.risks.values())
      .filter(r => r.riskCategory === 'critical' || r.riskCategory === 'high')
      .reduce((s, r) => s + r.replacementCostUSD, 0);
  }

  getAll(): RetentionRiskRecord[] {
    return Array.from(this.risks.values());
  }
}

class ExperienceJourneyManager {
  private journeys: Map<string, ExperienceJourneyRecord> = new Map();
  private counter = 0;

  setStage(employeeId: string, employeeName: string, stage: ExperienceJourneyRecord['currentStage'], stageHealth: number, milestones: ExperienceJourneyRecord['keyMilestones'], painPoints: string[], highlights: string[], nextAction: string, hrPartner?: string): ExperienceJourneyRecord {
    const journeyId = `expjrn-${Date.now()}-${++this.counter}`;
    const nextActionDue = milestones.find(m => m.status === 'pending')?.targetDate || Date.now() + 30 * 86400000;
    const record: ExperienceJourneyRecord = {
      journeyId, employeeId, employeeName, currentStage: stage,
      stageDurationMonths: 0, stageHealthScore: stageHealth,
      keyMilestones: milestones, painPoints, highlights, nextAction, nextActionDue,
      hrPartner, updatedAt: Date.now()
    };
    this.journeys.set(employeeId, record);
    return record;
  }

  getOnboardingAtRisk(): ExperienceJourneyRecord[] {
    return Array.from(this.journeys.values()).filter(j => j.currentStage === 'onboarding' && j.stageHealthScore < 60);
  }

  getAll(): ExperienceJourneyRecord[] {
    return Array.from(this.journeys.values());
  }
}

class PulseCheckEngine {
  private checks: PulseCheckRecord[] = [];
  private counter = 0;

  run(period: string, teamId: string, teamName: string, responses: EngagementRecord[], responseRatePct: number, concerns: string[], highlights: string[], actions: string[]): PulseCheckRecord {
    const pulseId = `pulse-${Date.now()}-${++this.counter}`;
    const n = responses.length || 1;
    const avgEng = Math.round(responses.reduce((s, r) => s + r.engagementScore, 0) / n * 10) / 10;
    const avgSat = Math.round(responses.reduce((s, r) => s + r.satisfactionScore, 0) / n * 10) / 10;
    const avgWell = Math.round(responses.reduce((s, r) => s + r.wellbeingScore, 0) / n * 10) / 10;
    const dist = {
      highly_engaged: responses.filter(r => r.category === 'highly_engaged').length,
      engaged: responses.filter(r => r.category === 'engaged').length,
      neutral: responses.filter(r => r.category === 'neutral').length,
      disengaged: responses.filter(r => r.category === 'disengaged').length,
      actively_disengaged: responses.filter(r => r.category === 'actively_disengaged').length
    };
    const prev = this.checks.filter(c => c.teamId === teamId).slice(-1)[0];
    const trend: PulseCheckRecord['trendVsPrevious'] = prev
      ? (avgEng > prev.avgEngagementScore + 3 ? 'improving' : avgEng < prev.avgEngagementScore - 3 ? 'declining' : 'stable')
      : 'stable';

    const record: PulseCheckRecord = {
      pulseId, period, teamId, teamName, responseRatePct,
      avgEngagementScore: avgEng, avgSatisfactionScore: avgSat, avgWellbeingScore: avgWell,
      topConcerns: concerns, topHighlights: highlights, engagementDistribution: dist,
      trendVsPrevious: trend, actionItems: actions, createdAt: Date.now()
    };
    this.checks.push(record);
    logger.debug('Pulse check run', { pulseId, teamId, avgEng, trend });
    return record;
  }

  getTeamTrend(teamId: string): PulseCheckRecord[] {
    return this.checks.filter(c => c.teamId === teamId);
  }

  getLowEngagementTeams(threshold = 55): PulseCheckRecord[] {
    const latestByTeam = new Map<string, PulseCheckRecord>();
    this.checks.forEach(c => {
      const existing = latestByTeam.get(c.teamId);
      if (!existing || c.createdAt > existing.createdAt) latestByTeam.set(c.teamId, c);
    });
    return Array.from(latestByTeam.values()).filter(c => c.avgEngagementScore < threshold);
  }
}

export const engagementTracker = new EngagementTracker();
export const retentionRiskDetector = new RetentionRiskDetector();
export const experienceJourneyManager = new ExperienceJourneyManager();
export const pulseCheckEngine = new PulseCheckEngine();

export { EngagementRecord, RetentionRiskRecord, ExperienceJourneyRecord, PulseCheckRecord };
