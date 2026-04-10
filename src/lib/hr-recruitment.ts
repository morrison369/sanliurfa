/**
 * Phase 72: Recruitment & Talent Acquisition
 * Job postings, applications, candidate tracking, offers
 */

import { deterministicNumber } from './deterministic';
import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type JobStatus = 'open' | 'on_hold' | 'filled' | 'closed';
export type ApplicationStatus = 'new' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted';
export type InterviewType = 'phone' | 'technical' | 'behavioral' | 'final' | 'panel';

export interface JobPosting {
  id: string;
  title: string;
  department: string;
  description: string;
  status: JobStatus;
  postedDate: number;
  closingDate?: number;
  openPositions: number;
  createdAt: number;
}

export interface JobApplication {
  id: string;
  candidateId: string;
  jobId: string;
  status: ApplicationStatus;
  resume?: string;
  coverLetter?: string;
  appliedDate: number;
  submittedDate?: number;
}

export interface Candidate {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  currentCompany?: string;
  currentTitle?: string;
  yearsExperience: number;
  skills: string[];
  source: 'linkedin' | 'referral' | 'job_board' | 'direct' | 'other';
  createdAt: number;
}

export interface Interview {
  id: string;
  applicationId: string;
  type: InterviewType;
  interviewer: string;
  scheduledDate: number;
  completedDate?: number;
  score?: number;
  notes?: string;
  createdAt: number;
}

export interface JobOffer {
  id: string;
  applicationId: string;
  title: string;
  salary: number;
  startDate: number;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  createdAt: number;
}

// ==================== JOB MANAGER ====================

export class JobManager {
  private jobs = new Map<string, JobPosting>();
  private jobCount = 0;

  /**
   * Create posting
   */
  createPosting(job: Omit<JobPosting, 'id' | 'createdAt'>): JobPosting {
    const id = 'job-' + Date.now() + '-' + this.jobCount++;

    const newJob: JobPosting = {
      ...job,
      id,
      createdAt: Date.now()
    };

    this.jobs.set(id, newJob);
    logger.info('Job posting created', { jobId: id, title: job.title });

    return newJob;
  }

  /**
   * Get posting
   */
  getPosting(jobId: string): JobPosting | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * List postings
   */
  listPostings(status?: JobStatus): JobPosting[] {
    let jobs = Array.from(this.jobs.values());

    if (status) {
      jobs = jobs.filter(j => j.status === status);
    }

    return jobs;
  }

  /**
   * Update posting
   */
  updatePosting(jobId: string, updates: Partial<JobPosting>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      Object.assign(job, updates);
      logger.debug('Job posting updated', { jobId });
    }
  }

  /**
   * Close posting
   */
  closePosting(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'closed';
      logger.info('Job posting closed', { jobId });
    }
  }
}

// ==================== APPLICATION TRACKER ====================

export class ApplicationTracker {
  private applications = new Map<string, JobApplication>();
  private appCount = 0;

  /**
   * Create application
   */
  createApplication(app: Omit<JobApplication, 'id'>): JobApplication {
    const id = 'app-' + Date.now() + '-' + this.appCount++;

    const newApp: JobApplication = {
      ...app,
      id
    };

    this.applications.set(id, newApp);
    logger.info('Application created', { applicationId: id, candidateId: app.candidateId });

    return newApp;
  }

  /**
   * Get application
   */
  getApplication(applicationId: string): JobApplication | null {
    return this.applications.get(applicationId) || null;
  }

  /**
   * List applications
   */
  listApplications(jobId?: string, status?: ApplicationStatus): JobApplication[] {
    let apps = Array.from(this.applications.values());

    if (jobId) {
      apps = apps.filter(a => a.jobId === jobId);
    }

    if (status) {
      apps = apps.filter(a => a.status === status);
    }

    return apps;
  }

  /**
   * Move to stage
   */
  moveToStage(applicationId: string, newStatus: ApplicationStatus): void {
    const app = this.applications.get(applicationId);
    if (app) {
      app.status = newStatus;
      logger.debug('Application moved to stage', { applicationId, status: newStatus });
    }
  }

  /**
   * Reject application
   */
  rejectApplication(applicationId: string, reason: string): void {
    const app = this.applications.get(applicationId);
    if (app) {
      app.status = 'rejected';
      logger.info('Application rejected', { applicationId, reason });
    }
  }
}

// ==================== CANDIDATE MANAGER ====================

export class CandidateManager {
  private candidates = new Map<string, Candidate>();
  private candidateCount = 0;

  /**
   * Create candidate
   */
  createCandidate(candidate: Omit<Candidate, 'id' | 'createdAt'>): Candidate {
    const id = 'cand-' + Date.now() + '-' + this.candidateCount++;

    const newCandidate: Candidate = {
      ...candidate,
      id,
      createdAt: Date.now()
    };

    this.candidates.set(id, newCandidate);
    logger.info('Candidate created', { candidateId: id, source: candidate.source });

    return newCandidate;
  }

  /**
   * Get candidate
   */
  getCandidate(candidateId: string): Candidate | null {
    return this.candidates.get(candidateId) || null;
  }

  /**
   * Search candidates
   */
  searchCandidates(query: string): Candidate[] {
    const lower = query.toLowerCase();

    return Array.from(this.candidates.values()).filter(
      c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower) ||
        c.skills.some(s => s.toLowerCase().includes(lower))
    );
  }

  /**
   * Get candidate applications
   */
  getCandidateApplications(candidateId: string): JobApplication[] {
    return [];
  }

  /**
   * Score candidate
   */
  scoreCandidate(candidateId: string): number {
    const candidate = this.candidates.get(candidateId);
    if (!candidate) return 0;

    let score = 0;
    score += candidate.yearsExperience * 5;
    score += candidate.skills.length * 10;
    score += deterministicNumber(
      `candidate-score:${candidateId}:${candidate.skills.join(',')}:${candidate.yearsExperience}`,
      0,
      20,
      2
    );

    return Math.min(100, score);
  }
}

// ==================== OFFER MANAGER ====================

export class OfferManager {
  private offers = new Map<string, JobOffer>();
  private offerCount = 0;

  /**
   * Create offer
   */
  createOffer(offer: Omit<JobOffer, 'id' | 'createdAt'>): JobOffer {
    const id = 'offer-' + Date.now() + '-' + this.offerCount++;

    const newOffer: JobOffer = {
      ...offer,
      status: offer.status || 'pending',
      id,
      createdAt: Date.now()
    };

    this.offers.set(id, newOffer);
    logger.info('Job offer created', { offerId: id, salary: offer.salary });

    return newOffer;
  }

  /**
   * Get offer
   */
  getOffer(offerId: string): JobOffer | null {
    return this.offers.get(offerId) || null;
  }

  /**
   * Send offer
   */
  sendOffer(offerId: string, email: string): void {
    const offer = this.offers.get(offerId);
    if (offer) {
      logger.info('Offer sent', { offerId, email });
    }
  }

  /**
   * Accept offer
   */
  acceptOffer(offerId: string): void {
    const offer = this.offers.get(offerId);
    if (offer) {
      offer.status = 'accepted';
      logger.info('Offer accepted', { offerId });
    }
  }

  /**
   * Reject offer
   */
  rejectOffer(offerId: string): void {
    const offer = this.offers.get(offerId);
    if (offer) {
      offer.status = 'rejected';
      logger.info('Offer rejected', { offerId });
    }
  }
}

// ==================== EXPORTS ====================

export const jobManager = new JobManager();
export const applicationTracker = new ApplicationTracker();
export const candidateManager = new CandidateManager();
export const offerManager = new OfferManager();
