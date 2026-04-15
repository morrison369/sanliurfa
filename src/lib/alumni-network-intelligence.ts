/**
 * Phase 287: Alumni Network Intelligence
 * Alumni engagement, career tracking, mentorship analytics, network value
 */

import { logger } from './logger';

interface AlumniProfileRecord {
  alumniId: string;
  fullName: string;
  graduationYear: number;
  degreeProgram: string;
  currentEmployer?: string;
  currentRole?: string;
  industry?: string;
  location?: string;
  engagementScore: number;       // 0-100
  engagementTier: 'champion' | 'active' | 'passive' | 'dormant';
  mentorStatus: 'mentor' | 'mentee' | 'both' | 'none';
  donorStatus: 'major' | 'regular' | 'occasional' | 'never';
  lifetimeGivingUSD: number;
  lastEngagedAt?: number;
  tags: string[];
  createdAt: number;
}

interface AlumniEngagementRecord {
  recordId: string;
  alumniId: string;
  activityType: 'event_attended' | 'donation' | 'mentorship_session' | 'referral' | 'volunteering' | 'content_shared' | 'survey_completed';
  activityDate: number;
  valueScore: number;            // points for this activity
  notes?: string;
  createdAt: number;
}

interface MentorshipProgramRecord {
  programId: string;
  programName: string;
  cohortYear: string;
  mentorCount: number;
  menteeCount: number;
  matchRatePct: number;
  avgSessionsPerPair: number;
  completionRatePct: number;
  menteeCareerOutcomeScore: number;  // 0-100 (job placements, promotions)
  mentorSatisfactionScore: number;   // 0-100
  npsScore: number;
  status: 'recruiting' | 'active' | 'completed';
  startDate: number;
  endDate?: number;
  createdAt: number;
}

interface AlumniNetworkValueRecord {
  recordId: string;
  period: string;
  totalAlumni: number;
  activeAlumni: number;
  engagementRatePct: number;
  totalDonationsUSD: number;
  newDonorsCount: number;
  jobReferralsGenerated: number;
  mentorshipPairsActive: number;
  eventsHosted: number;
  networkValueEstimateUSD: number;  // brand, referrals, donations
  calculatedAt: number;
}

class AlumniProfileManager {
  private profiles: Map<string, AlumniProfileRecord> = new Map();
  private counter = 0;

  register(fullName: string, graduationYear: number, degree: string, employer?: string, role?: string, industry?: string): AlumniProfileRecord {
    const alumniId = `alumni-${Date.now()}-${++this.counter}`;
    const profile: AlumniProfileRecord = {
      alumniId, fullName, graduationYear, degreeProgram: degree, currentEmployer: employer,
      currentRole: role, industry, engagementScore: 0, engagementTier: 'dormant',
      mentorStatus: 'none', donorStatus: 'never', lifetimeGivingUSD: 0, tags: [], createdAt: Date.now()
    };
    this.profiles.set(alumniId, profile);
    logger.debug('Alumni registered', { alumniId, fullName, graduationYear });
    return profile;
  }

  updateEngagement(alumniId: string, scoreIncrement: number): boolean {
    const profile = this.profiles.get(alumniId);
    if (!profile) return false;
    profile.engagementScore = Math.min(100, profile.engagementScore + scoreIncrement);
    profile.lastEngagedAt = Date.now();
    profile.engagementTier =
      profile.engagementScore >= 75 ? 'champion' :
      profile.engagementScore >= 50 ? 'active' :
      profile.engagementScore >= 20 ? 'passive' : 'dormant';
    return true;
  }

  recordDonation(alumniId: string, amount: number): boolean {
    const profile = this.profiles.get(alumniId);
    if (!profile) return false;
    profile.lifetimeGivingUSD += amount;
    profile.donorStatus =
      profile.lifetimeGivingUSD >= 50000 ? 'major' :
      profile.lifetimeGivingUSD >= 5000 ? 'regular' : 'occasional';
    return true;
  }

  getChampions(): AlumniProfileRecord[] {
    return Array.from(this.profiles.values()).filter(p => p.engagementTier === 'champion');
  }

  getDormant(): AlumniProfileRecord[] {
    return Array.from(this.profiles.values()).filter(p => p.engagementTier === 'dormant');
  }

  getByGraduationYear(year: number): AlumniProfileRecord[] {
    return Array.from(this.profiles.values()).filter(p => p.graduationYear === year);
  }

  getProfile(alumniId: string): AlumniProfileRecord | undefined {
    return this.profiles.get(alumniId);
  }
}

class AlumniEngagementTracker {
  private activities: Map<string, AlumniEngagementRecord[]> = new Map();
  private counter = 0;

  private activityValues: Record<AlumniEngagementRecord['activityType'], number> = {
    event_attended: 10, donation: 20, mentorship_session: 15, referral: 25,
    volunteering: 12, content_shared: 5, survey_completed: 8
  };

  record(alumniId: string, type: AlumniEngagementRecord['activityType'], notes?: string): AlumniEngagementRecord {
    const recordId = `alumact-${Date.now()}-${++this.counter}`;
    const valueScore = this.activityValues[type];
    const record: AlumniEngagementRecord = {
      recordId, alumniId, activityType: type, activityDate: Date.now(), valueScore, notes, createdAt: Date.now()
    };
    const existing = this.activities.get(alumniId) || [];
    existing.push(record);
    this.activities.set(alumniId, existing);
    return record;
  }

  getActivityHistory(alumniId: string): AlumniEngagementRecord[] {
    return this.activities.get(alumniId) || [];
  }

  getTotalEngagementScore(alumniId: string): number {
    return (this.activities.get(alumniId) || []).reduce((s, a) => s + a.valueScore, 0);
  }

  getMostActiveAlumni(limit = 10): { alumniId: string; totalScore: number }[] {
    return Array.from(this.activities.entries())
      .map(([alumniId, acts]) => ({ alumniId, totalScore: acts.reduce((s, a) => s + a.valueScore, 0) }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit);
  }
}

class MentorshipProgramManager {
  private programs: Map<string, MentorshipProgramRecord> = new Map();
  private counter = 0;

  create(name: string, cohortYear: string, mentorCount: number, menteeCount: number): MentorshipProgramRecord {
    const programId = `mentor-${Date.now()}-${++this.counter}`;
    const matchRate = Math.min(100, (Math.min(mentorCount, menteeCount) / Math.max(menteeCount, 1)) * 100);
    const record: MentorshipProgramRecord = {
      programId, programName: name, cohortYear, mentorCount, menteeCount,
      matchRatePct: matchRate, avgSessionsPerPair: 0, completionRatePct: 0,
      menteeCareerOutcomeScore: 0, mentorSatisfactionScore: 0, npsScore: 0,
      status: 'recruiting', startDate: Date.now(), createdAt: Date.now()
    };
    this.programs.set(programId, record);
    return record;
  }

  updateOutcomes(programId: string, avgSessions: number, completionRate: number, careerOutcome: number, mentorSatisfaction: number, nps: number): boolean {
    const program = this.programs.get(programId);
    if (!program) return false;
    program.avgSessionsPerPair = avgSessions;
    program.completionRatePct = completionRate;
    program.menteeCareerOutcomeScore = careerOutcome;
    program.mentorSatisfactionScore = mentorSatisfaction;
    program.npsScore = nps;
    program.status = completionRate >= 80 ? 'completed' : 'active';
    return true;
  }

  getActivePrograms(): MentorshipProgramRecord[] {
    return Array.from(this.programs.values()).filter(p => p.status === 'active');
  }

  getAvgNPS(): number {
    const completed = Array.from(this.programs.values()).filter(p => p.status === 'completed');
    if (!completed.length) return 0;
    return completed.reduce((s, p) => s + p.npsScore, 0) / completed.length;
  }
}

class AlumniNetworkValueCalculator {
  private records: AlumniNetworkValueRecord[] = [];
  private counter = 0;

  calculate(period: string, totalAlumni: number, activeAlumni: number, totalDonations: number, newDonors: number, referrals: number, mentorshipPairs: number, eventsHosted: number): AlumniNetworkValueRecord {
    const engagementRate = totalAlumni > 0 ? (activeAlumni / totalAlumni) * 100 : 0;
    // Network value: donations + referral value (avg $15k per hire) + event value ($5k each)
    const networkValue = totalDonations + referrals * 15000 + eventsHosted * 5000 + mentorshipPairs * 2000;

    const recordId = `alumval-${Date.now()}-${++this.counter}`;
    const record: AlumniNetworkValueRecord = {
      recordId, period, totalAlumni, activeAlumni, engagementRatePct: engagementRate,
      totalDonationsUSD: totalDonations, newDonorsCount: newDonors, jobReferralsGenerated: referrals,
      mentorshipPairsActive: mentorshipPairs, eventsHosted, networkValueEstimateUSD: networkValue,
      calculatedAt: Date.now()
    };
    this.records.push(record);
    logger.debug('Alumni network value calculated', { period, networkValue, engagementRate });
    return record;
  }

  getLatest(): AlumniNetworkValueRecord | undefined {
    return this.records[this.records.length - 1];
  }

  getValueTrend(): number[] {
    return this.records.map(r => r.networkValueEstimateUSD);
  }
}

export const alumniProfileManager = new AlumniProfileManager();
export const alumniEngagementTracker = new AlumniEngagementTracker();
export const mentorshipProgramManager = new MentorshipProgramManager();
export const alumniNetworkValueCalculator = new AlumniNetworkValueCalculator();

export { AlumniProfileRecord, AlumniEngagementRecord, MentorshipProgramRecord, AlumniNetworkValueRecord };
