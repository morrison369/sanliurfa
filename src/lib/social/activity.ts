/**
 * Social Activity Feed System
 * User activities, follows, likes, and timeline
 */

import { generateId } from '../utils';

// Activity types
export type ActivityType = 
  | 'review_created'
  | 'review_liked'
  | 'place_visited'
  | 'place_saved'
  | 'place_shared'
  | 'friend_followed'
  | 'achievement_earned'
  | 'photo_uploaded'
  | 'check_in'
  | 'comment_posted';

// Activity record
export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: ActivityType;
  
  // Related entities
  placeId?: string;
  placeName?: string;
  placeThumbnail?: string;
  reviewId?: string;
  reviewContent?: string;
  reviewRating?: number;
  targetUserId?: string;
  targetUserName?: string;
  photoUrl?: string;
  achievementId?: string;
  achievementName?: string;
  
  // Metadata
  metadata?: Record<string, unknown>;
  
  // Engagement
  likes: number;
  likedBy: string[];
  comments: ActivityComment[];
  
  // Privacy
  isPublic: boolean;
  
  createdAt: string;
}

// Activity comment
export interface ActivityComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  createdAt: string;
}

// User stats
export interface UserActivityStats {
  totalReviews: number;
  totalPhotos: number;
  totalCheckins: number;
  totalSaves: number;
  totalFollowers: number;
  totalFollowing: number;
  reputation: number;
  level: number;
  achievements: string[];
}

// Timeline feed item
export interface TimelineItem extends Activity {
  isOwnActivity: boolean;
  isFollowing: boolean;
}

// In-memory stores
const activities: Map<string, Activity> = new Map();
const userStats: Map<string, UserActivityStats> = new Map();

/**
 * Create activity
 */
export function createActivity(data: Omit<Activity, 'id' | 'likes' | 'likedBy' | 'comments' | 'createdAt'>): Activity {
  const activity: Activity = {
    ...data,
    id: generateId(),
    likes: 0,
    likedBy: [],
    comments: [],
    createdAt: new Date().toISOString(),
  };

  activities.set(activity.id, activity);
  
  // Update user stats
  updateUserStats(activity.userId, activity.type);
  
  return activity;
}

/**
 * Record review activity
 */
export function recordReviewActivity(
  userId: string,
  userName: string,
  placeId: string,
  placeName: string,
  reviewId: string,
  reviewContent: string,
  rating: number,
  placeThumbnail?: string,
  userAvatar?: string
): Activity {
  return createActivity({
    userId,
    userName,
    userAvatar,
    type: 'review_created',
    placeId,
    placeName,
    placeThumbnail,
    reviewId,
    reviewContent: reviewContent.substring(0, 200),
    reviewRating: rating,
    isPublic: true,
  });
}

/**
 * Record place visit
 */
export function recordVisitActivity(
  userId: string,
  userName: string,
  placeId: string,
  placeName: string,
  placeThumbnail?: string,
  userAvatar?: string
): Activity {
  return createActivity({
    userId,
    userName,
    userAvatar,
    type: 'place_visited',
    placeId,
    placeName,
    placeThumbnail,
    isPublic: true,
  });
}

/**
 * Record place save
 */
export function recordSaveActivity(
  userId: string,
  userName: string,
  placeId: string,
  placeName: string,
  placeThumbnail?: string,
  userAvatar?: string
): Activity {
  return createActivity({
    userId,
    userName,
    userAvatar,
    type: 'place_saved',
    placeId,
    placeName,
    placeThumbnail,
    isPublic: true,
  });
}

/**
 * Record follow activity
 */
export function recordFollowActivity(
  userId: string,
  userName: string,
  targetUserId: string,
  targetUserName: string,
  userAvatar?: string
): Activity {
  return createActivity({
    userId,
    userName,
    userAvatar,
    type: 'friend_followed',
    targetUserId,
    targetUserName,
    isPublic: true,
  });
}

/**
 * Record photo upload
 */
export function recordPhotoActivity(
  userId: string,
  userName: string,
  placeId: string,
  placeName: string,
  photoUrl: string,
  placeThumbnail?: string,
  userAvatar?: string
): Activity {
  return createActivity({
    userId,
    userName,
    userAvatar,
    type: 'photo_uploaded',
    placeId,
    placeName,
    placeThumbnail,
    photoUrl,
    isPublic: true,
  });
}

/**
 * Record check-in
 */
export function recordCheckin(
  userId: string,
  userName: string,
  placeId: string,
  placeName: string,
  placeThumbnail?: string,
  userAvatar?: string
): Activity {
  return createActivity({
    userId,
    userName,
    userAvatar,
    type: 'check_in',
    placeId,
    placeName,
    placeThumbnail,
    isPublic: true,
  });
}

/**
 * Record achievement
 */
export function recordAchievement(
  userId: string,
  userName: string,
  achievementId: string,
  achievementName: string,
  userAvatar?: string
): Activity {
  return createActivity({
    userId,
    userName,
    userAvatar,
    type: 'achievement_earned',
    achievementId,
    achievementName,
    isPublic: true,
  });
}

/**
 * Like activity
 */
export function likeActivity(activityId: string, userId: string): Activity {
  const activity = activities.get(activityId);
  if (!activity) throw new Error('Activity not found');

  if (!activity.likedBy.includes(userId)) {
    activity.likedBy.push(userId);
    activity.likes++;
    
    // Notify activity owner
    // notifications.activityLiked(activity.userId, userId, activityId);
  }

  return activity;
}

/**
 * Unlike activity
 */
export function unlikeActivity(activityId: string, userId: string): Activity {
  const activity = activities.get(activityId);
  if (!activity) throw new Error('Activity not found');

  const index = activity.likedBy.indexOf(userId);
  if (index > -1) {
    activity.likedBy.splice(index, 1);
    activity.likes--;
  }

  return activity;
}

/**
 * Comment on activity
 */
export function commentOnActivity(
  activityId: string,
  userId: string,
  userName: string,
  content: string,
  userAvatar?: string
): ActivityComment {
  const activity = activities.get(activityId);
  if (!activity) throw new Error('Activity not found');

  const comment: ActivityComment = {
    id: generateId(),
    userId,
    userName,
    userAvatar,
    content,
    createdAt: new Date().toISOString(),
  };

  activity.comments.push(comment);
  
  // Notify activity owner
  // notifications.activityCommented(activity.userId, userId, activityId);

  return comment;
}

/**
 * Get user's activity feed (what they did)
 */
export function getUserActivities(
  userId: string,
  options: { limit?: number; offset?: number } = {}
): Activity[] {
  const { limit = 20, offset = 0 } = options;
  
  return Array.from(activities.values())
    .filter(a => a.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(offset, offset + limit);
}

/**
 * Get timeline (activities from followed users)
 */
export function getTimeline(
  userId: string,
  followingIds: string[],
  options: { limit?: number; offset?: number } = {}
): TimelineItem[] {
  const { limit = 20, offset = 0 } = options;
  
  const relevantIds = [userId, ...followingIds];
  
  return Array.from(activities.values())
    .filter(a => relevantIds.includes(a.userId) && a.isPublic)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(offset, offset + limit)
    .map(a => ({
      ...a,
      isOwnActivity: a.userId === userId,
      isFollowing: followingIds.includes(a.userId),
    }));
}

/**
 * Get public feed (discover)
 */
export function getPublicFeed(options: { limit?: number; offset?: number } = {}): Activity[] {
  const { limit = 20, offset = 0 } = options;
  
  return Array.from(activities.values())
    .filter(a => a.isPublic)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(offset, offset + limit);
}

/**
 * Get place activities
 */
export function getPlaceActivities(placeId: string): Activity[] {
  return Array.from(activities.values())
    .filter(a => a.placeId === placeId && a.isPublic)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Update user stats
 */
function updateUserStats(userId: string, activityType: ActivityType): void {
  let stats = userStats.get(userId);
  
  if (!stats) {
    stats = {
      totalReviews: 0,
      totalPhotos: 0,
      totalCheckins: 0,
      totalSaves: 0,
      totalFollowers: 0,
      totalFollowing: 0,
      reputation: 0,
      level: 1,
      achievements: [],
    };
  }

  switch (activityType) {
    case 'review_created':
      stats.totalReviews++;
      stats.reputation += 10;
      break;
    case 'photo_uploaded':
      stats.totalPhotos++;
      stats.reputation += 5;
      break;
    case 'check_in':
      stats.totalCheckins++;
      stats.reputation += 2;
      break;
    case 'place_saved':
      stats.totalSaves++;
      break;
    case 'friend_followed':
      stats.totalFollowing++;
      break;
  }

  // Calculate level
  stats.level = Math.floor(stats.reputation / 100) + 1;

  userStats.set(userId, stats);
}

/**
 * Get user stats
 */
export function getUserStats(userId: string): UserActivityStats {
  return userStats.get(userId) || {
    totalReviews: 0,
    totalPhotos: 0,
    totalCheckins: 0,
    totalSaves: 0,
    totalFollowers: 0,
    totalFollowing: 0,
    reputation: 0,
    level: 1,
    achievements: [],
  };
}

/**
 * Update follower count
 */
export function updateFollowerCount(userId: string, delta: number): void {
  const stats = userStats.get(userId);
  if (stats) {
    stats.totalFollowers = Math.max(0, stats.totalFollowers + delta);
  }
}

/**
 * Add achievement
 */
export function addAchievement(userId: string, achievementId: string): void {
  const stats = userStats.get(userId);
  if (stats && !stats.achievements.includes(achievementId)) {
    stats.achievements.push(achievementId);
  }
}

/**
 * Get trending activities
 */
export function getTrendingActivities(limit: number = 10): Activity[] {
  return Array.from(activities.values())
    .filter(a => a.isPublic)
    .sort((a, b) => {
      // Score based on recency and engagement
      const scoreA = a.likes + a.comments.length;
      const scoreB = b.likes + b.comments.length;
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

/**
 * Get recent activity by type
 */
export function getRecentByType(type: ActivityType, limit: number = 10): Activity[] {
  return Array.from(activities.values())
    .filter(a => a.type === type && a.isPublic)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// Achievement definitions
export const ACHIEVEMENTS = [
  { id: 'first_review', name: 'İlk İnceleme', description: 'İlk mekan incelemenizi yazın', icon: 'Star' },
  { id: 'reviewer_10', name: 'Eleştirmen', description: '10 mekan inceleyin', icon: 'Award' },
  { id: 'reviewer_50', name: 'Gurme', description: '50 mekan inceleyin', icon: 'Medal' },
  { id: 'photographer', name: 'Fotoğrafçı', description: '10 fotoğraf yükleyin', icon: 'Camera' },
  { id: 'explorer', name: 'Kaşif', description: '20 farklı mekan ziyaret edin', icon: 'MapPin' },
  { id: 'socialite', name: 'Sosyal', description: '10 arkadaş edinin', icon: 'Users' },
  { id: 'local_guide', name: 'Yerel Rehber', description: '100 kişi tarafından takip edilin', icon: 'Compass' },
  { id: 'early_bird', name: 'Erken Kuş', description: 'Sabah 7\'den önce check-in yapın', icon: 'Sunrise' },
  { id: 'night_owl', name: 'Gece Kuşu', description: 'Gece yarısından sonra check-in yapın', icon: 'Moon' },
  { id: 'foodie', name: 'Lezzet Avcısı', description: '10 restoran değerlendirin', icon: 'Utensils' },
] as const;

/**
 * Check and award achievements
 */
export function checkAchievements(userId: string): string[] {
  const stats = getUserStats(userId);
  const newAchievements: string[] = [];

  if (stats.totalReviews >= 1 && !stats.achievements.includes('first_review')) {
    newAchievements.push('first_review');
  }
  if (stats.totalReviews >= 10 && !stats.achievements.includes('reviewer_10')) {
    newAchievements.push('reviewer_10');
  }
  if (stats.totalReviews >= 50 && !stats.achievements.includes('reviewer_50')) {
    newAchievements.push('reviewer_50');
  }
  if (stats.totalPhotos >= 10 && !stats.achievements.includes('photographer')) {
    newAchievements.push('photographer');
  }
  if (stats.totalCheckins >= 20 && !stats.achievements.includes('explorer')) {
    newAchievements.push('explorer');
  }
  if (stats.totalFollowing >= 10 && !stats.achievements.includes('socialite')) {
    newAchievements.push('socialite');
  }
  if (stats.totalFollowers >= 100 && !stats.achievements.includes('local_guide')) {
    newAchievements.push('local_guide');
  }

  newAchievements.forEach(id => addAchievement(userId, id));

  return newAchievements;
}
