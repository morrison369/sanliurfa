/**
 * Phase 81: Governance & Board Management
 * Board structures, meeting management, resolution tracking, governance policies, board member management
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type BoardRole = 'chairman' | 'ceo' | 'director' | 'independent_director' | 'secretary' | 'treasurer';
export type MeetingType = 'board' | 'committee' | 'annual_general' | 'extraordinary_general' | 'shareholder';
export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
export type ResolutionType = 'ordinary' | 'special' | 'unanimous_consent';
export type ResolutionStatus = 'proposed' | 'voted' | 'approved' | 'rejected';

export interface BoardMember {
  id: string;
  name: string;
  email: string;
  role: BoardRole;
  appointmentDate: number;
  endDate?: number;
  expertise: string[];
  status: 'active' | 'inactive';
  createdAt: number;
}

export interface BoardMeeting {
  id: string;
  type: MeetingType;
  scheduledDate: number;
  location?: string;
  agenda: string[];
  attendees: string[];
  status: MeetingStatus;
  minutes?: string;
  createdAt: number;
}

export interface Resolution {
  id: string;
  meetingId: string;
  title: string;
  type: ResolutionType;
  description: string;
  proposedBy: string;
  votedDate?: number;
  status: ResolutionStatus;
  votes?: { for: number; against: number; abstain: number };
  createdAt: number;
}

export interface GovernancePolicy {
  id: string;
  name: string;
  category: string;
  content: string;
  version: number;
  effectiveDate: number;
  lastReviewDate: number;
  nextReviewDate: number;
  createdAt: number;
}

// ==================== BOARD MANAGER ====================

export class BoardManager {
  private members = new Map<string, BoardMember>();
  private memberCount = 0;

  /**
   * Add board member
   */
  addBoardMember(member: Omit<BoardMember, 'id' | 'createdAt'>): BoardMember {
    const id = 'member-' + Date.now() + '-' + this.memberCount++;

    const newMember: BoardMember = {
      ...member,
      id,
      createdAt: Date.now()
    };

    this.members.set(id, newMember);
    logger.info('Board member added', { memberId: id, name: member.name, role: member.role });

    return newMember;
  }

  /**
   * Get board member
   */
  getBoardMember(memberId: string): BoardMember | null {
    return this.members.get(memberId) || null;
  }

  /**
   * List board members
   */
  listBoardMembers(role?: BoardRole, status?: string): BoardMember[] {
    let members = Array.from(this.members.values());

    if (role) {
      members = members.filter(m => m.role === role);
    }

    if (status) {
      members = members.filter(m => m.status === status);
    }

    return members;
  }

  /**
   * Update board member
   */
  updateBoardMember(memberId: string, updates: Partial<BoardMember>): void {
    const member = this.members.get(memberId);
    if (member) {
      Object.assign(member, updates);
      logger.debug('Board member updated', { memberId });
    }
  }

  /**
   * Remove board member
   */
  removeBoardMember(memberId: string, reason: string): void {
    const member = this.members.get(memberId);
    if (member) {
      member.status = 'inactive';
      member.endDate = Date.now();
      logger.info('Board member removed', { memberId, reason });
    }
  }

  /**
   * Get board composition
   */
  getBoardComposition(): Record<BoardRole, number> {
    const composition: Record<BoardRole, number> = {
      chairman: 0,
      ceo: 0,
      director: 0,
      independent_director: 0,
      secretary: 0,
      treasurer: 0
    };

    this.listBoardMembers(undefined, 'active').forEach(m => {
      composition[m.role]++;
    });

    return composition;
  }
}

// ==================== MEETING MANAGER ====================

export class MeetingManager {
  private meetings = new Map<string, BoardMeeting>();
  private meetingCount = 0;

  /**
   * Schedule meeting
   */
  scheduleMeeting(meeting: Omit<BoardMeeting, 'id' | 'createdAt'>): BoardMeeting {
    const id = 'meeting-' + Date.now() + '-' + this.meetingCount++;

    const newMeeting: BoardMeeting = {
      ...meeting,
      id,
      createdAt: Date.now()
    };

    this.meetings.set(id, newMeeting);
    logger.info('Meeting scheduled', { meetingId: id, type: meeting.type, scheduledDate: meeting.scheduledDate });

    return newMeeting;
  }

  /**
   * Get meeting
   */
  getMeeting(meetingId: string): BoardMeeting | null {
    return this.meetings.get(meetingId) || null;
  }

  /**
   * List meetings
   */
  listMeetings(type?: MeetingType, status?: MeetingStatus): BoardMeeting[] {
    let meetings = Array.from(this.meetings.values());

    if (type) {
      meetings = meetings.filter(m => m.type === type);
    }

    if (status) {
      meetings = meetings.filter(m => m.status === status);
    }

    return meetings;
  }

  /**
   * Update meeting
   */
  updateMeeting(meetingId: string, updates: Partial<BoardMeeting>): void {
    const meeting = this.meetings.get(meetingId);
    if (meeting) {
      Object.assign(meeting, updates);
      logger.debug('Meeting updated', { meetingId });
    }
  }

  /**
   * Record minutes
   */
  recordMinutes(meetingId: string, minutes: string): void {
    const meeting = this.meetings.get(meetingId);
    if (meeting) {
      meeting.minutes = minutes;
      meeting.status = 'completed';
      logger.info('Minutes recorded', { meetingId });
    }
  }

  /**
   * Get meeting history
   */
  getMeetingHistory(memberId?: string, limit?: number): BoardMeeting[] {
    let meetings = this.listMeetings(undefined, 'completed').sort((a, b) => b.scheduledDate - a.scheduledDate);

    if (memberId) {
      meetings = meetings.filter(m => m.attendees.includes(memberId));
    }

    return meetings.slice(0, limit || 10);
  }
}

// ==================== RESOLUTION MANAGER ====================

export class ResolutionManager {
  private resolutions = new Map<string, Resolution>();
  private resolutionCount = 0;

  /**
   * Propose resolution
   */
  proposeResolution(resolution: Omit<Resolution, 'id' | 'createdAt'>): Resolution {
    const id = 'resolution-' + Date.now() + '-' + this.resolutionCount++;

    const newResolution: Resolution = {
      ...resolution,
      id,
      createdAt: Date.now()
    };

    this.resolutions.set(id, newResolution);
    logger.info('Resolution proposed', { resolutionId: id, meetingId: resolution.meetingId, title: resolution.title });

    return newResolution;
  }

  /**
   * Get resolution
   */
  getResolution(resolutionId: string): Resolution | null {
    return this.resolutions.get(resolutionId) || null;
  }

  /**
   * Get meeting resolutions
   */
  getMeetingResolutions(meetingId: string): Resolution[] {
    return Array.from(this.resolutions.values()).filter(r => r.meetingId === meetingId);
  }

  /**
   * Record vote
   */
  recordVote(resolutionId: string, forVotes: number, againstVotes: number, abstainVotes: number): void {
    const resolution = this.resolutions.get(resolutionId);
    if (resolution) {
      resolution.votes = { for: forVotes, against: againstVotes, abstain: abstainVotes };
      resolution.votedDate = Date.now();
      logger.info('Vote recorded', { resolutionId, for: forVotes, against: againstVotes });
    }
  }

  /**
   * Approve resolution
   */
  approveResolution(resolutionId: string): void {
    const resolution = this.resolutions.get(resolutionId);
    if (resolution) {
      resolution.status = 'approved';
      logger.info('Resolution approved', { resolutionId });
    }
  }

  /**
   * Get resolution history
   */
  getResolutionHistory(limit?: number): Resolution[] {
    return Array.from(this.resolutions.values())
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit || 10);
  }
}

// ==================== POLICY MANAGER ====================

export class PolicyManager {
  private policies = new Map<string, GovernancePolicy>();
  private policyCount = 0;

  /**
   * Create policy
   */
  createPolicy(policy: Omit<GovernancePolicy, 'id' | 'createdAt'>): GovernancePolicy {
    const id = 'gpolicy-' + Date.now() + '-' + this.policyCount++;

    const newPolicy: GovernancePolicy = {
      ...policy,
      id,
      createdAt: Date.now()
    };

    this.policies.set(id, newPolicy);
    logger.info('Governance policy created', { policyId: id, name: policy.name, category: policy.category });

    return newPolicy;
  }

  /**
   * Get policy
   */
  getPolicy(policyId: string): GovernancePolicy | null {
    return this.policies.get(policyId) || null;
  }

  /**
   * List policies
   */
  listPolicies(category?: string): GovernancePolicy[] {
    let policies = Array.from(this.policies.values());

    if (category) {
      policies = policies.filter(p => p.category === category);
    }

    return policies;
  }

  /**
   * Update policy
   */
  updatePolicy(policyId: string, updates: Partial<GovernancePolicy>): void {
    const policy = this.policies.get(policyId);
    if (policy) {
      Object.assign(policy, updates);
      logger.debug('Policy updated', { policyId });
    }
  }

  /**
   * Publish policy
   */
  publishPolicy(policyId: string): void {
    const policy = this.policies.get(policyId);
    if (policy) {
      policy.effectiveDate = Date.now();
      logger.info('Policy published', { policyId });
    }
  }

  /**
   * Get policies for review
   */
  getPoliciesForReview(): GovernancePolicy[] {
    const now = Date.now();
    return Array.from(this.policies.values()).filter(p => p.nextReviewDate < now);
  }
}

// ==================== EXPORTS ====================

export const boardManager = new BoardManager();
export const meetingManager = new MeetingManager();
export const resolutionManager = new ResolutionManager();
export const policyManager = new PolicyManager();
