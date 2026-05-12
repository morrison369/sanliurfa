/**
 * Place Reviews & Ratings System
 * User reviews, ratings, photos, and interactions
 */

import { generateId } from '../utils';

// Review type
export interface Review {
  id: string;
  placeId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 1-5
  title?: string;
  content: string;
  photos: string[];
  visitDate?: string;
  visitType?: 'solo' | 'couple' | 'family' | 'friends' | 'business';
  pros: string[];
  cons: string[];
  likes: number;
  likedBy: string[];
  replies: ReviewReply[];
  isVerified: boolean; // verified visit
  helpfulCount: number;
  markedHelpfulBy: string[];
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  createdAt: string;
  updatedAt: string;
}

// Review reply
export interface ReviewReply {
  id: string;
  reviewId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  isOwner: boolean; // place owner reply
  createdAt: string;
}

// Rating breakdown
export interface RatingBreakdown {
  average: number;
  total: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

// Review filter options
export interface ReviewFilter {
  rating?: number;
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | 'helpful';
  visitType?: Review['visitType'];
  hasPhotos?: boolean;
  verifiedOnly?: boolean;
}

// In-memory store
const reviews: Map<string, Review> = new Map();

/**
 * Create a review
 */
export function createReview(data: Omit<Review, 'id' | 'likes' | 'likedBy' | 'replies' | 'helpfulCount' | 'markedHelpfulBy' | 'status' | 'createdAt' | 'updatedAt'>): Review {
  const review: Review = {
    ...data,
    id: generateId(),
    likes: 0,
    likedBy: [],
    replies: [],
    helpfulCount: 0,
    markedHelpfulBy: [],
    status: 'pending', // requires moderation
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  reviews.set(review.id, review);
  
  // Update place rating
  updatePlaceRating(review.placeId);
  
  return review;
}

/**
 * Update a review
 */
export function updateReview(
  reviewId: string,
  userId: string,
  updates: Partial<Pick<Review, 'rating' | 'title' | 'content' | 'photos' | 'visitDate' | 'visitType' | 'pros' | 'cons'>>
): Review {
  const review = reviews.get(reviewId);
  if (!review) throw new Error('Review not found');
  if (review.userId !== userId) throw new Error('Unauthorized');

  Object.assign(review, updates);
  review.updatedAt = new Date().toISOString();

  updatePlaceRating(review.placeId);
  return review;
}

/**
 * Delete review
 */
export function deleteReview(reviewId: string, userId: string): boolean {
  const review = reviews.get(reviewId);
  if (!review) return false;
  if (review.userId !== userId) return false;

  reviews.delete(reviewId);
  updatePlaceRating(review.placeId);
  return true;
}

/**
 * Approve/reject review (admin/moderator)
 */
export function moderateReview(
  reviewId: string,
  status: 'approved' | 'rejected' | 'flagged'
): Review {
  const review = reviews.get(reviewId);
  if (!review) throw new Error('Review not found');

  review.status = status;
  review.updatedAt = new Date().toISOString();

  if (status === 'approved') {
    // Send notification to user
    // notifications.reviewApproved(review.userId, review.placeId);
  }

  return review;
}

/**
 * Like/unlike review
 */
export function toggleLikeReview(reviewId: string, userId: string): Review {
  const review = reviews.get(reviewId);
  if (!review) throw new Error('Review not found');

  const index = review.likedBy.indexOf(userId);
  if (index > -1) {
    review.likedBy.splice(index, 1);
    review.likes--;
  } else {
    review.likedBy.push(userId);
    review.likes++;
  }

  return review;
}

/**
 * Mark review as helpful
 */
export function markHelpful(reviewId: string, userId: string): Review {
  const review = reviews.get(reviewId);
  if (!review) throw new Error('Review not found');

  if (!review.markedHelpfulBy.includes(userId)) {
    review.markedHelpfulBy.push(userId);
    review.helpfulCount++;
  }

  return review;
}

/**
 * Add reply to review
 */
export function addReply(
  reviewId: string,
  userId: string,
  userName: string,
  content: string,
  isOwner: boolean = false,
  userAvatar?: string
): ReviewReply {
  const review = reviews.get(reviewId);
  if (!review) throw new Error('Review not found');

  const reply: ReviewReply = {
    id: generateId(),
    reviewId,
    userId,
    userName,
    ...(userAvatar ? { userAvatar } : {}),
    content,
    isOwner,
    createdAt: new Date().toISOString(),
  };

  review.replies.push(reply);
  review.updatedAt = new Date().toISOString();

  return reply;
}

/**
 * Delete reply
 */
export function deleteReply(reviewId: string, replyId: string, userId: string): boolean {
  const review = reviews.get(reviewId);
  if (!review) return false;

  const index = review.replies.findIndex(r => r.id === replyId && r.userId === userId);
  if (index === -1) return false;

  review.replies.splice(index, 1);
  return true;
}

/**
 * Get reviews for a place
 */
export function getPlaceReviews(
  placeId: string,
  filter: ReviewFilter = {}
): Review[] {
  const { rating, sortBy = 'newest', visitType, hasPhotos, verifiedOnly } = filter;

  let placeReviews = Array.from(reviews.values())
    .filter(r => r.placeId === placeId && r.status === 'approved');

  if (rating) {
    placeReviews = placeReviews.filter(r => r.rating === rating);
  }

  if (visitType) {
    placeReviews = placeReviews.filter(r => r.visitType === visitType);
  }

  if (hasPhotos) {
    placeReviews = placeReviews.filter(r => r.photos.length > 0);
  }

  if (verifiedOnly) {
    placeReviews = placeReviews.filter(r => r.isVerified);
  }

  // Sort
  placeReviews.sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'highest':
        return b.rating - a.rating;
      case 'lowest':
        return a.rating - b.rating;
      case 'helpful':
        return b.helpfulCount - a.helpfulCount;
      default:
        return 0;
    }
  });

  return placeReviews;
}

/**
 * Get user's reviews
 */
export function getUserReviews(userId: string): Review[] {
  return Array.from(reviews.values())
    .filter(r => r.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Get review by ID
 */
export function getReviewById(reviewId: string): Review | null {
  return reviews.get(reviewId) || null;
}

/**
 * Get rating breakdown for a place
 */
export function getRatingBreakdown(placeId: string): RatingBreakdown {
  const placeReviews = Array.from(reviews.values())
    .filter(r => r.placeId === placeId && r.status === 'approved');

  const total = placeReviews.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  placeReviews.forEach(r => {
    distribution[r.rating as keyof typeof distribution]++;
    sum += r.rating;
  });

  return {
    average: total > 0 ? sum / total : 0,
    total,
    distribution,
  };
}

/**
 * Check if user has reviewed place
 */
export function hasUserReviewed(placeId: string, userId: string): boolean {
  return Array.from(reviews.values()).some(
    r => r.placeId === placeId && r.userId === userId
  );
}

/**
 * Get user's review for a place
 */
export function getUserReviewForPlace(placeId: string, userId: string): Review | null {
  return Array.from(reviews.values()).find(
    r => r.placeId === placeId && r.userId === userId
  ) || null;
}

/**
 * Update place rating (trigger after review changes)
 */
function updatePlaceRating(placeId: string): void {
  // In production: update database
  // emit event for real-time updates
  getRatingBreakdown(placeId);
  
  // Emit to WebSocket/SSE
  // events.emit('place.rating.updated', { placeId, breakdown });
}

/**
 * Get pending reviews for moderation
 */
export function getPendingReviews(): Review[] {
  return Array.from(reviews.values())
    .filter(r => r.status === 'pending')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Report review
 */
export function reportReview(
  reviewId: string,
  _reporterId: string,
  _reason: string
): void {
  const review = reviews.get(reviewId);
  if (!review) return;

  // In production: save to reports table
  // Flag review if multiple reports
  // adminNotifications.reportReceived(reviewId, reporterId, reason);
}

/**
 * Review statistics for admin
 */
export interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  averageRating: number;
  withPhotos: number;
  verified: number;
}

export function getReviewStats(): ReviewStats {
  const all = Array.from(reviews.values());
  const approved = all.filter(r => r.status === 'approved');
  const totalRating = approved.reduce((sum, r) => sum + r.rating, 0);

  return {
    total: all.length,
    pending: all.filter(r => r.status === 'pending').length,
    approved: approved.length,
    rejected: all.filter(r => r.status === 'rejected').length,
    flagged: all.filter(r => r.status === 'flagged').length,
    averageRating: approved.length > 0 ? totalRating / approved.length : 0,
    withPhotos: approved.filter(r => r.photos.length > 0).length,
    verified: approved.filter(r => r.isVerified).length,
  };
}

// Predefined pros/cons tags
export const PROS_TAGS = [
  'Mükemmel yemek',
  'Güzel ambiyans',
  'Hızlı servis',
  'Uygun fiyat',
  'Harika manzara',
  'Samimi personel',
  'Temiz ortam',
  'Geniş menü',
  'Organik ürünler',
  'Tarihi atmosfer',
];

export const CONS_TAGS = [
  'Yüksek fiyat',
  'Yavaş servis',
  'Gürültülü',
  'Kötü park yeri',
  'Kalabalık',
  'Temizlik sorunu',
  'Sınırlı menü',
  'Kötü hizmet',
  'Sıcak değil',
  'Pahalı',
];

export const VISIT_TYPES = [
  { value: 'solo', label: 'Yalnız', icon: 'User' },
  { value: 'couple', label: 'Çift', icon: 'Heart' },
  { value: 'family', label: 'Aile', icon: 'Users' },
  { value: 'friends', label: 'Arkadaşlar', icon: 'Users2' },
  { value: 'business', label: 'İş', icon: 'Briefcase' },
] as const;


/**
 * Get place rating breakdown (alias for getRatingBreakdown)
 */
export function getPlaceRatingBreakdown(placeId: string): RatingBreakdown {
  return getRatingBreakdown(placeId);
}
