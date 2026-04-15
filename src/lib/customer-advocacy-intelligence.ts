/**
 * Phase 336: Customer Advocacy Intelligence
 * NPS champions, referral tracking, case study pipeline, advocacy ROI
 */

import { logger } from './logger';

interface AdvocateRecord {
  advocateId: string;
  customerId: string;
  customerName: string;
  contactName: string;
  contactTitle: string;
  npsScore: number;
  advocacyScore: number;           // 0-100 composite
  tier: 'champion' | 'advocate' | 'supporter' | 'neutral';
  activitiesCompleted: string[];   // e.g. ['case_study', 'referral', 'review']
  activitiesPending: string[];
  referralsGiven: number;
  referralsConverted: number;
  revenueInfluenced: number;
  testimonialsCount: number;
  speakingEngagements: number;
  caseStudyPublished: boolean;
  preferredActivities: string[];
  engagementFrequency: 'monthly' | 'quarterly' | 'annually';
  lastEngagedAt: number;
  isAtRisk: boolean;              // declining NPS or no recent activity
  createdAt: number;
}

interface ReferralRecord {
  referralId: string;
  advocateId: string;
  advocateName: string;
  referredCompanyName: string;
  referredContactName: string;
  referredContactEmail: string;
  referralStatus: 'submitted' | 'contacted' | 'qualified' | 'opportunity' | 'won' | 'lost';
  estimatedValueUSD: number;
  actualValueUSD?: number;
  referralSource: string;         // e.g. 'event', 'direct_ask', 'organic'
  daysInPipeline: number;
  incentiveEarnedUSD: number;
  submittedAt: number;
  closedAt?: number;
}

interface CaseStudyRecord {
  caseStudyId: string;
  customerId: string;
  customerName: string;
  title: string;
  industry: string;
  useCase: string;
  challenge: string;
  solution: string;
  results: { metric: string; before: string; after: string; improvement: string }[];
  status: 'draft' | 'customer_review' | 'approved' | 'published';
  publishedUrl?: string;
  viewCount: number;
  downloadCount: number;
  leadInfluenced: number;
  revenueInfluencedUSD: number;
  createdAt: number;
  publishedAt?: number;
}

interface AdvocacyProgramRecord {
  programId: string;
  period: string;
  totalAdvocates: number;
  championCount: number;
  activeAdvocateCount: number;
  referralsGenerated: number;
  referralsConverted: number;
  referralConversionRatePct: number;
  revenueFromReferralsUSD: number;
  caseStudiesPublished: number;
  reviewsGenerated: number;
  programCostUSD: number;
  roiPct: number;
  avgAdvocacyScore: number;
  atRiskAdvocateCount: number;
  calculatedAt: number;
}

class AdvocateManager {
  private advocates: Map<string, AdvocateRecord> = new Map();
  private counter = 0;

  enroll(customerId: string, customerName: string, contactName: string, contactTitle: string, npsScore: number, preferredActivities: string[], engagementFreq: AdvocateRecord['engagementFrequency']): AdvocateRecord {
    const advocateId = `adv-${Date.now()}-${++this.counter}`;
    const tier: AdvocateRecord['tier'] = npsScore >= 9 ? 'champion' : npsScore >= 8 ? 'advocate' : npsScore >= 7 ? 'supporter' : 'neutral';
    const advocacyScore = Math.round(npsScore * 5 + preferredActivities.length * 5);

    const record: AdvocateRecord = {
      advocateId, customerId, customerName, contactName, contactTitle, npsScore,
      advocacyScore: Math.min(100, advocacyScore), tier,
      activitiesCompleted: [], activitiesPending: preferredActivities,
      referralsGiven: 0, referralsConverted: 0, revenueInfluenced: 0,
      testimonialsCount: 0, speakingEngagements: 0, caseStudyPublished: false,
      preferredActivities, engagementFrequency: engagementFreq,
      lastEngagedAt: Date.now(), isAtRisk: false, createdAt: Date.now()
    };
    this.advocates.set(advocateId, record);
    logger.debug('Advocate enrolled', { advocateId, customerName, tier, npsScore });
    return record;
  }

  recordActivity(advocateId: string, activity: string, revenueInfluenced = 0): boolean {
    const adv = this.advocates.get(advocateId);
    if (!adv) return false;
    if (!adv.activitiesCompleted.includes(activity)) adv.activitiesCompleted.push(activity);
    adv.activitiesPending = adv.activitiesPending.filter(a => a !== activity);
    adv.revenueInfluenced += revenueInfluenced;
    adv.lastEngagedAt = Date.now();
    if (activity === 'case_study') adv.caseStudyPublished = true;
    if (activity === 'speaking') adv.speakingEngagements++;
    if (activity === 'testimonial') adv.testimonialsCount++;
    adv.advocacyScore = Math.min(100, adv.advocacyScore + 5);
    return true;
  }

  markAtRisk(advocateId: string): boolean {
    const adv = this.advocates.get(advocateId);
    if (!adv) return false;
    adv.isAtRisk = true;
    return true;
  }

  getChampions(): AdvocateRecord[] {
    return Array.from(this.advocates.values()).filter(a => a.tier === 'champion');
  }

  getAtRisk(): AdvocateRecord[] {
    return Array.from(this.advocates.values()).filter(a => a.isAtRisk);
  }

  getAll(): AdvocateRecord[] {
    return Array.from(this.advocates.values());
  }

  getAdvocate(id: string): AdvocateRecord | undefined {
    return this.advocates.get(id);
  }
}

class ReferralManager {
  private referrals: ReferralRecord[] = [];
  private counter = 0;

  submit(advocateId: string, advocateName: string, referredCompany: string, referredContact: string, referredEmail: string, estimatedValue: number, source: string): ReferralRecord {
    const referralId = `ref-${Date.now()}-${++this.counter}`;
    const record: ReferralRecord = {
      referralId, advocateId, advocateName, referredCompanyName: referredCompany,
      referredContactName: referredContact, referredContactEmail: referredEmail,
      referralStatus: 'submitted', estimatedValueUSD: estimatedValue,
      referralSource: source, daysInPipeline: 0,
      incentiveEarnedUSD: 0, submittedAt: Date.now()
    };
    this.referrals.push(record);
    logger.debug('Referral submitted', { referralId, advocateName, referredCompany });
    return record;
  }

  advance(referralId: string, status: ReferralRecord['referralStatus'], actualValue?: number): boolean {
    const ref = this.referrals.find(r => r.referralId === referralId);
    if (!ref) return false;
    ref.referralStatus = status;
    ref.daysInPipeline = Math.floor((Date.now() - ref.submittedAt) / 86400000);
    if (status === 'won') {
      ref.actualValueUSD = actualValue;
      ref.closedAt = Date.now();
      ref.incentiveEarnedUSD = Math.round((actualValue || ref.estimatedValueUSD) * 0.05); // 5% incentive
    }
    return true;
  }

  getConversionRate(): number {
    const total = this.referrals.length;
    const won = this.referrals.filter(r => r.referralStatus === 'won').length;
    return total > 0 ? Math.round((won / total) * 100 * 10) / 10 : 0;
  }

  getTotalRevenueFromReferrals(): number {
    return this.referrals.filter(r => r.referralStatus === 'won').reduce((s, r) => s + (r.actualValueUSD || 0), 0);
  }

  getAll(): ReferralRecord[] {
    return [...this.referrals];
  }
}

class CaseStudyManager {
  private caseStudies: Map<string, CaseStudyRecord> = new Map();
  private counter = 0;

  create(customerId: string, customerName: string, title: string, industry: string, useCase: string, challenge: string, solution: string, results: CaseStudyRecord['results']): CaseStudyRecord {
    const caseStudyId = `cs-${Date.now()}-${++this.counter}`;
    const record: CaseStudyRecord = {
      caseStudyId, customerId, customerName, title, industry, useCase, challenge, solution,
      results, status: 'draft', viewCount: 0, downloadCount: 0,
      leadInfluenced: 0, revenueInfluencedUSD: 0, createdAt: Date.now()
    };
    this.caseStudies.set(caseStudyId, record);
    return record;
  }

  publish(caseStudyId: string, url: string): boolean {
    const cs = this.caseStudies.get(caseStudyId);
    if (!cs) return false;
    cs.status = 'published';
    cs.publishedUrl = url;
    cs.publishedAt = Date.now();
    return true;
  }

  trackPerformance(caseStudyId: string, views: number, downloads: number, leadsInfluenced: number, revenueInfluenced: number): boolean {
    const cs = this.caseStudies.get(caseStudyId);
    if (!cs) return false;
    cs.viewCount += views;
    cs.downloadCount += downloads;
    cs.leadInfluenced += leadsInfluenced;
    cs.revenueInfluencedUSD += revenueInfluenced;
    return true;
  }

  getPublished(): CaseStudyRecord[] {
    return Array.from(this.caseStudies.values()).filter(c => c.status === 'published');
  }

  getTopPerforming(limit = 5): CaseStudyRecord[] {
    return Array.from(this.caseStudies.values()).filter(c => c.status === 'published').sort((a, b) => b.revenueInfluencedUSD - a.revenueInfluencedUSD).slice(0, limit);
  }
}

class AdvocacyProgramAnalyzer {
  private programs: AdvocacyProgramRecord[] = [];
  private counter = 0;

  analyze(period: string, advocates: AdvocateRecord[], referrals: ReferralRecord[], caseStudies: CaseStudyRecord[], programCost: number): AdvocacyProgramRecord {
    const programId = `advprog-${Date.now()}-${++this.counter}`;
    const active = advocates.filter(a => Date.now() - a.lastEngagedAt < 90 * 86400000);
    const champions = advocates.filter(a => a.tier === 'champion');
    const wonReferrals = referrals.filter(r => r.referralStatus === 'won');
    const referralRevenue = wonReferrals.reduce((s, r) => s + (r.actualValueUSD || 0), 0);
    const conversionRate = referrals.length > 0 ? Math.round((wonReferrals.length / referrals.length) * 100 * 10) / 10 : 0;
    const publishedCS = caseStudies.filter(c => c.status === 'published');
    const reviews = advocates.reduce((s, a) => s + a.testimonialsCount, 0);
    const avgScore = advocates.length > 0 ? Math.round(advocates.reduce((s, a) => s + a.advocacyScore, 0) / advocates.length * 10) / 10 : 0;
    const totalBenefit = referralRevenue + publishedCS.reduce((s, c) => s + c.revenueInfluencedUSD, 0);
    const roi = programCost > 0 ? Math.round(((totalBenefit - programCost) / programCost) * 100 * 10) / 10 : 0;

    const record: AdvocacyProgramRecord = {
      programId, period, totalAdvocates: advocates.length, championCount: champions.length,
      activeAdvocateCount: active.length, referralsGenerated: referrals.length,
      referralsConverted: wonReferrals.length, referralConversionRatePct: conversionRate,
      revenueFromReferralsUSD: referralRevenue, caseStudiesPublished: publishedCS.length,
      reviewsGenerated: reviews, programCostUSD: programCost, roiPct: roi,
      avgAdvocacyScore: avgScore, atRiskAdvocateCount: advocates.filter(a => a.isAtRisk).length,
      calculatedAt: Date.now()
    };
    this.programs.push(record);
    logger.debug('Advocacy program analyzed', { period, totalAdvocates: advocates.length, roi });
    return record;
  }

  getLatest(): AdvocacyProgramRecord | undefined {
    return this.programs[this.programs.length - 1];
  }
}

export const advocateManager = new AdvocateManager();
export const referralManager = new ReferralManager();
export const caseStudyManager = new CaseStudyManager();
export const advocacyProgramAnalyzer = new AdvocacyProgramAnalyzer();

export { AdvocateRecord, ReferralRecord, CaseStudyRecord, AdvocacyProgramRecord };
