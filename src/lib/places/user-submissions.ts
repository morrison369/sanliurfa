/**
 * User Generated Content - Place Submissions
 * Users can suggest new places to be added
 */

import { generateId } from '../utils';

// Submission status
export type SubmissionStatus = 'draft' | 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_info';

// Place submission
export interface PlaceSubmission {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  
  // Place details
  name: string;
  category: string;
  description: string;
  shortDescription?: string;
  
  // Location
  address: string;
  district: string;
  latitude?: number;
  longitude?: number;
  
  // Contact
  phone?: string;
  website?: string;
  email?: string;
  
  // Hours
  openingHours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  
  // Features
  features: string[];
  priceRange?: 'free' | 'cheap' | 'moderate' | 'expensive' | 'luxury';
  
  // Media
  photos: string[];
  videos?: string[];
  
  // Verification
  isOwner: boolean;
  ownershipProof?: string;
  
  // Status
  status: SubmissionStatus;
  adminNotes?: string;
  
  // Engagement
  upvotes: number;
  upvotedBy: string[];
  comments: SubmissionComment[];
  
  // Metadata
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

// Submission comment
export interface SubmissionComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  isAdmin: boolean;
  createdAt: string;
}

// Submission with user info
export interface SubmissionWithStats extends PlaceSubmission {
  userReputation: number;
  similarPlaces: string[];
}

// In-memory store
const submissions: Map<string, PlaceSubmission> = new Map();

// Categories for places
export const PLACE_CATEGORIES = [
  { id: 'tarihi-yerler', name: 'Tarihi Yerler', icon: 'Landmark' },
  { id: 'restoran', name: 'Restoran', icon: 'UtensilsCrossed' },
  { id: 'cafe', name: 'Kafe', icon: 'Coffee' },
  { id: 'otel', name: 'Otel', icon: 'Hotel' },
  { id: 'park', name: 'Park', icon: 'Trees' },
  { id: 'muzee', name: 'Müze', icon: 'Building2' },
  { id: 'alisveris', name: 'Alışveriş', icon: 'ShoppingBag' },
  { id: 'eglence', name: 'Eğlence', icon: 'PartyPopper' },
  { id: 'spor', name: 'Spor', icon: 'Dumbbell' },
  { id: 'saglik', name: 'Sağlık', icon: 'HeartPulse' },
  { id: 'egitim', name: 'Eğitim', icon: 'GraduationCap' },
  { id: 'dini', name: 'Dini Mekanlar', icon: 'Mosque' },
  { id: 'dogal', name: 'Doğal Güzellikler', icon: 'Mountain' },
  { id: 'piknik', name: 'Piknik Alanları', icon: 'Tent' },
] as const;

// Place features
export const PLACE_FEATURES = [
  'Otopark',
  'WiFi',
  'Engelli Erişimi',
  'Klima',
  'Açık Alan',
  'Kapalı Alan',
  'Canlı Müzik',
  'Çocuk Dostu',
  'Evcil Hayvan Dostu',
  'Rezervasyon',
  'Paket Servis',
  'Vale',
  'Kredi Kartı',
  'Nakit',
  'Türkçe Menü',
  'İngilizce Menü',
  'Arapça Menü',
  'Mescit',
  'Bebek Bakım Odası',
  'Şarap Servisi',
  'Kahvaltı',
  'Gece Açık',
  'Sigara İçilebilir Alan',
  'Sigara İçilemez',
] as const;

/**
 * Submit a new place
 */
export function submitPlace(data: Omit<PlaceSubmission, 'id' | 'status' | 'upvotes' | 'upvotedBy' | 'comments' | 'createdAt' | 'updatedAt'>): PlaceSubmission {
  const submission: PlaceSubmission = {
    ...data,
    id: generateId(),
    status: 'pending',
    upvotes: 0,
    upvotedBy: [],
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  submissions.set(submission.id, submission);
  
  // Notify admins
  // adminNotifications.newSubmission(submission);
  
  return submission;
}

/**
 * Save as draft
 */
export function saveDraft(data: Omit<PlaceSubmission, 'id' | 'status' | 'upvotes' | 'upvotedBy' | 'comments' | 'createdAt' | 'updatedAt'>): PlaceSubmission {
  const submission: PlaceSubmission = {
    ...data,
    id: generateId(),
    status: 'draft',
    upvotes: 0,
    upvotedBy: [],
    comments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  submissions.set(submission.id, submission);
  return submission;
}

/**
 * Update submission
 */
export function updateSubmission(
  submissionId: string,
  userId: string,
  updates: Partial<Omit<PlaceSubmission, 'id' | 'userId' | 'status' | 'upvotes' | 'upvotedBy' | 'comments' | 'createdAt'>>
): PlaceSubmission {
  const submission = submissions.get(submissionId);
  if (!submission) throw new Error('Submission not found');
  if (submission.userId !== userId) throw new Error('Unauthorized');
  if (submission.status === 'approved') throw new Error('Cannot edit approved submission');

  Object.assign(submission, updates);
  submission.updatedAt = new Date().toISOString();

  return submission;
}

/**
 * Submit draft for review
 */
export function submitForReview(submissionId: string, userId: string): PlaceSubmission {
  const submission = submissions.get(submissionId);
  if (!submission) throw new Error('Submission not found');
  if (submission.userId !== userId) throw new Error('Unauthorized');

  submission.status = 'pending';
  submission.updatedAt = new Date().toISOString();

  return submission;
}

/**
 * Approve submission (admin)
 */
export function approveSubmission(
  submissionId: string,
  adminId: string,
  notes?: string
): PlaceSubmission {
  const submission = submissions.get(submissionId);
  if (!submission) throw new Error('Submission not found');

  submission.status = 'approved';
  submission.reviewedAt = new Date().toISOString();
  submission.reviewedBy = adminId;
  if (notes) submission.adminNotes = notes;

  // Create the actual place
  // const place = createPlaceFromSubmission(submission);
  
  // Notify user
  // notifications.submissionApproved(submission.userId, submission.id);

  return submission;
}

/**
 * Reject submission (admin)
 */
export function rejectSubmission(
  submissionId: string,
  adminId: string,
  reason: string
): PlaceSubmission {
  const submission = submissions.get(submissionId);
  if (!submission) throw new Error('Submission not found');

  submission.status = 'rejected';
  submission.reviewedAt = new Date().toISOString();
  submission.reviewedBy = adminId;
  submission.adminNotes = reason;

  // Notify user
  // notifications.submissionRejected(submission.userId, submission.id, reason);

  return submission;
}

/**
 * Request more info (admin)
 */
export function requestMoreInfo(
  submissionId: string,
  adminId: string,
  requestedInfo: string
): PlaceSubmission {
  const submission = submissions.get(submissionId);
  if (!submission) throw new Error('Submission not found');

  submission.status = 'needs_info';
  submission.updatedAt = new Date().toISOString();

  // Add admin comment
  addComment(submissionId, adminId, 'Admin', requestedInfo, true);

  // Notify user
  // notifications.moreInfoRequested(submission.userId, submission.id);

  return submission;
}

/**
 * Upvote submission
 */
export function upvoteSubmission(submissionId: string, userId: string): PlaceSubmission {
  const submission = submissions.get(submissionId);
  if (!submission) throw new Error('Submission not found');

  if (!submission.upvotedBy.includes(userId)) {
    submission.upvotedBy.push(userId);
    submission.upvotes++;
  }

  return submission;
}

/**
 * Add comment to submission
 */
export function addComment(
  submissionId: string,
  userId: string,
  userName: string,
  content: string,
  isAdmin: boolean = false
): SubmissionComment {
  const submission = submissions.get(submissionId);
  if (!submission) throw new Error('Submission not found');

  const comment: SubmissionComment = {
    id: generateId(),
    userId,
    userName,
    content,
    isAdmin,
    createdAt: new Date().toISOString(),
  };

  submission.comments.push(comment);
  submission.updatedAt = new Date().toISOString();

  return comment;
}

/**
 * Get user's submissions
 */
export function getUserSubmissions(userId: string): PlaceSubmission[] {
  return Array.from(submissions.values())
    .filter(s => s.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get pending submissions (admin)
 */
export function getPendingSubmissions(): PlaceSubmission[] {
  return Array.from(submissions.values())
    .filter(s => s.status === 'pending' || s.status === 'in_review')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Get all submissions with filter
 */
export function getSubmissions(filter?: {
  status?: SubmissionStatus;
  category?: string;
  userId?: string;
}): PlaceSubmission[] {
  let result = Array.from(submissions.values());

  if (filter?.status) {
    result = result.filter(s => s.status === filter.status);
  }

  if (filter?.category) {
    result = result.filter(s => s.category === filter.category);
  }

  if (filter?.userId) {
    result = result.filter(s => s.userId === filter.userId);
  }

  return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get submission by ID
 */
export function getSubmissionById(submissionId: string): PlaceSubmission | null {
  return submissions.get(submissionId) || null;
}

/**
 * Delete submission
 */
export function deleteSubmission(submissionId: string, userId: string): boolean {
  const submission = submissions.get(submissionId);
  if (!submission) return false;
  if (submission.userId !== userId) return false;
  if (submission.status === 'approved') return false;

  return submissions.delete(submissionId);
}

/**
 * Get submission statistics
 */
export function getSubmissionStats() {
  const all = Array.from(submissions.values());
  
  return {
    total: all.length,
    pending: all.filter(s => s.status === 'pending').length,
    approved: all.filter(s => s.status === 'approved').length,
    rejected: all.filter(s => s.status === 'rejected').length,
    draft: all.filter(s => s.status === 'draft').length,
    byCategory: PLACE_CATEGORIES.map(cat => ({
      category: cat.name,
      count: all.filter(s => s.category === cat.id && s.status === 'approved').length,
    })),
    topContributors: getTopContributors(),
  };
}

/**
 * Get top contributors
 */
function getTopContributors() {
  const userCounts: Record<string, { name: string; approved: number; total: number }> = {};

  submissions.forEach(s => {
    if (!userCounts[s.userId]) {
      userCounts[s.userId] = { name: s.userName, approved: 0, total: 0 };
    }
    userCounts[s.userId].total++;
    if (s.status === 'approved') {
      userCounts[s.userId].approved++;
    }
  });

  return Object.entries(userCounts)
    .map(([id, stats]) => ({ id, ...stats }))
    .sort((a, b) => b.approved - a.approved)
    .slice(0, 10);
}

/**
 * Auto-detect duplicate submissions
 */
export function findPotentialDuplicates(name: string, address: string): PlaceSubmission[] {
  const normalizedName = name.toLowerCase().trim();
  const normalizedAddress = address.toLowerCase().trim();

  return Array.from(submissions.values()).filter(s => {
    const nameMatch = s.name.toLowerCase().includes(normalizedName) ||
                      normalizedName.includes(s.name.toLowerCase());
    const addressMatch = s.address.toLowerCase().includes(normalizedAddress) ||
                         normalizedAddress.includes(s.address.toLowerCase());
    return nameMatch || addressMatch;
  });
}

/**
 * Check if similar place exists
 */
export function checkSimilarPlaces(_name: string, _lat?: number, _lon?: number): boolean {
  // In production: check against actual places database
  // Check within 100m radius if coordinates provided
  // Check name similarity
  return false;
}
