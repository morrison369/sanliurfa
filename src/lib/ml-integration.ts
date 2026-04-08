/**
 * Phase 15: Machine Learning Integration
 * Recommendations engine, personalization, churn prediction, user segmentation
 */

import { logger } from './logging';

// ==================== RECOMMENDATIONS ENGINE ====================

export interface UserProfile {
  userId: string;
  interests: Map<string, number>; // interest -> weight
  behavior: Map<string, number>; // behavior -> frequency
  engagementScore: number; // 0-100
  lastActive: number;
}

export interface RecommendationItem {
  itemId: string;
  type: string;
  score: number; // 0-100 relevance score
  reasons: string[];
}

/**
 * Collaborative filtering for recommendations
 */
export class RecommendationEngine {
  private userProfiles = new Map<string, UserProfile>();
  private itemClusters = new Map<string, Set<string>>(); // Items grouped by similarity
  private userSimilarity = new Map<string, Map<string, number>>(); // User-to-user similarity

  /**
   * Update user profile based on interaction
   */
  recordInteraction(userId: string, itemId: string, interactionType: 'view' | 'like' | 'purchase'): void {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = {
        userId,
        interests: new Map(),
        behavior: new Map(),
        engagementScore: 50,
        lastActive: Date.now()
      };
      this.userProfiles.set(userId, profile);
    }

    // Update engagement score
    const weight = { view: 1, like: 5, purchase: 10 }[interactionType];
    profile.engagementScore = Math.min(100, profile.engagementScore + weight);

    // Track behavior
    const currentCount = profile.behavior.get(interactionType) || 0;
    profile.behavior.set(interactionType, currentCount + 1);

    profile.lastActive = Date.now();
  }

  /**
   * Get personalized recommendations for user
   */
  getRecommendations(userId: string, limit: number = 10): RecommendationItem[] {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return this.getPopularItems(limit);
    }

    // Find similar users (collaborative filtering)
    const similarUsers = this.findSimilarUsers(userId, 5);

    // Collect items from similar users that current user hasn't interacted with
    const recommendations = new Map<string, RecommendationItem>();

    for (const similarUserId of similarUsers) {
      const similarProfile = this.userProfiles.get(similarUserId);
      if (!similarProfile) continue;

      // Score items from similar user
      for (const [behavior, frequency] of similarProfile.behavior) {
        const score = frequency * 20 * (1 + profile.engagementScore / 100);

        if (!recommendations.has(behavior)) {
          recommendations.set(behavior, {
            itemId: behavior,
            type: 'collaborative',
            score: 0,
            reasons: []
          });
        }

        const item = recommendations.get(behavior)!;
        item.score = Math.min(100, item.score + score);
        item.reasons.push(`Similar users liked this`);
      }
    }

    // Content-based filtering: recommend similar items to user's interests
    for (const [interest, weight] of profile.interests) {
      const similarItems = this.findSimilarItems(interest, 3);

      for (const itemId of similarItems) {
        if (!recommendations.has(itemId)) {
          recommendations.set(itemId, {
            itemId,
            type: 'content-based',
            score: weight * 15,
            reasons: [`Similar to your interests`]
          });
        }
      }
    }

    // Sort by score and return top N
    return Array.from(recommendations.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Get popular items (fallback for new users)
   */
  private getPopularItems(limit: number): RecommendationItem[] {
    // In production, fetch from database
    return [];
  }

  /**
   * Find users with similar interests
   */
  private findSimilarUsers(userId: string, limit: number): string[] {
    const profile = this.userProfiles.get(userId);
    if (!profile) return [];

    const similarities: Array<[string, number]> = [];

    for (const [otherId, otherProfile] of this.userProfiles) {
      if (otherId === userId) continue;

      // Cosine similarity between interest vectors
      let similarity = 0;
      let magnitude1 = 0;
      let magnitude2 = 0;

      for (const [interest, weight1] of profile.interests) {
        const weight2 = otherProfile.interests.get(interest) || 0;
        similarity += weight1 * weight2;
        magnitude1 += weight1 * weight1;
      }

      for (const weight of otherProfile.interests.values()) {
        magnitude2 += weight * weight;
      }

      if (magnitude1 > 0 && magnitude2 > 0) {
        const cosine = similarity / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
        similarities.push([otherId, cosine]);
      }
    }

    return similarities
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => id);
  }

  /**
   * Find items similar to given item
   */
  private findSimilarItems(itemId: string, limit: number): string[] {
    const cluster = this.itemClusters.get(itemId);
    return cluster ? Array.from(cluster).slice(0, limit) : [];
  }
}

// ==================== CHURN PREDICTION ====================

export interface ChurnPrediction {
  userId: string;
  churnRisk: number; // 0-100 probability
  riskFactors: string[];
  retentionScore: number;
  recommendedAction: string;
}

/**
 * Predict user churn risk
 */
export class ChurnPredictor {
  /**
   * Calculate churn risk based on user behavior
   */
  predictChurn(userData: {
    lastActiveDate: number;
    accountAgeMonths: number;
    monthlyInteractions: number;
    totalTransactions: number;
    avgSessionDuration: number;
  }): ChurnPrediction {
    const now = Date.now();
    const daysSinceLastActive = (now - userData.lastActiveDate) / (24 * 60 * 60 * 1000);

    let riskScore = 0;
    const riskFactors: string[] = [];

    // Factor 1: Inactivity (highest predictor)
    if (daysSinceLastActive > 30) {
      riskScore += 40;
      riskFactors.push('No activity in 30+ days');
    } else if (daysSinceLastActive > 14) {
      riskScore += 20;
      riskFactors.push('Low activity in past 2 weeks');
    }

    // Factor 2: Short account age
    if (userData.accountAgeMonths < 3) {
      riskScore += 25;
      riskFactors.push('New user (high early churn risk)');
    } else if (userData.accountAgeMonths < 6) {
      riskScore += 10;
      riskFactors.push('Relatively new user');
    }

    // Factor 3: Low engagement
    if (userData.monthlyInteractions < 5) {
      riskScore += 20;
      riskFactors.push('Low monthly engagement');
    }

    // Factor 4: No transactions
    if (userData.totalTransactions === 0) {
      riskScore += 15;
      riskFactors.push('No transactions to date');
    }

    // Factor 5: Short sessions
    if (userData.avgSessionDuration < 300) {
      riskScore += 10;
      riskFactors.push('Short average session duration');
    }

    const retentionScore = 100 - Math.min(100, riskScore);

    // Recommend action
    let recommendedAction = 'Monitor';
    if (riskScore > 70) {
      recommendedAction = 'Urgent: Send re-engagement campaign';
    } else if (riskScore > 50) {
      recommendedAction = 'Send personalized offer or content';
    } else if (riskScore > 25) {
      recommendedAction = 'Increase engagement touchpoints';
    }

    return {
      userId: '',
      churnRisk: Math.min(100, riskScore),
      riskFactors,
      retentionScore,
      recommendedAction
    };
  }
}

// ==================== USER SEGMENTATION ====================

export interface UserSegment {
  segmentId: string;
  name: string;
  description: string;
  criteria: Record<string, any>; // Segmentation rules
  size: number;
}

export interface SegmentedUser {
  userId: string;
  segments: string[]; // Segment IDs user belongs to
}

/**
 * User segmentation for targeted campaigns
 */
export class UserSegmenter {
  private segments = new Map<string, UserSegment>();
  private userSegments = new Map<string, string[]>();

  /**
   * Define a user segment
   */
  defineSegment(segmentId: string, name: string, description: string, criteria: Record<string, any>): void {
    this.segments.set(segmentId, {
      segmentId,
      name,
      description,
      criteria,
      size: 0
    });
  }

  /**
   * Assign user to segments based on criteria
   */
  segmentUser(userId: string, userData: Record<string, any>): string[] {
    const assignedSegments: string[] = [];

    for (const [segmentId, segment] of this.segments) {
      if (this.matchesCriteria(userData, segment.criteria)) {
        assignedSegments.push(segmentId);
      }
    }

    if (assignedSegments.length > 0) {
      this.userSegments.set(userId, assignedSegments);
    }

    return assignedSegments;
  }

  /**
   * Get segments for user
   */
  getUserSegments(userId: string): string[] {
    return this.userSegments.get(userId) || [];
  }

  /**
   * Get all users in segment
   */
  getUsersInSegment(segmentId: string): string[] {
    const users: string[] = [];
    for (const [userId, segments] of this.userSegments) {
      if (segments.includes(segmentId)) {
        users.push(userId);
      }
    }
    return users;
  }

  /**
   * Check if user data matches segment criteria
   */
  private matchesCriteria(userData: Record<string, any>, criteria: Record<string, any>): boolean {
    for (const [key, value] of Object.entries(criteria)) {
      if (!userData.hasOwnProperty(key)) return false;

      const userValue = userData[key];

      if (typeof value === 'object' && value !== null) {
        // Range check: { min: 0, max: 100 }
        if (value.min !== undefined && userValue < value.min) return false;
        if (value.max !== undefined && userValue > value.max) return false;
      } else if (Array.isArray(value)) {
        // Multiple options
        if (!value.includes(userValue)) return false;
      } else if (userValue !== value) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get segment statistics
   */
  getSegmentStats(): Record<string, { name: string; size: number }> {
    const stats: Record<string, { name: string; size: number }> = {};

    for (const [segmentId, segment] of this.segments) {
      const users = this.getUsersInSegment(segmentId);
      stats[segmentId] = {
        name: segment.name,
        size: users.length
      };
    }

    return stats;
  }
}

// ==================== FEATURE IMPORTANCE ====================

/**
 * Track which features drive user behavior
 */
export class FeatureImportance {
  private featureInteractions = new Map<string, number>();
  private featureConversions = new Map<string, number>();

  /**
   * Record feature interaction
   */
  recordInteraction(feature: string): void {
    this.featureInteractions.set(feature, (this.featureInteractions.get(feature) || 0) + 1);
  }

  /**
   * Record conversion after feature interaction
   */
  recordConversion(feature: string): void {
    this.featureConversions.set(feature, (this.featureConversions.get(feature) || 0) + 1);
  }

  /**
   * Calculate conversion rate per feature
   */
  getFeatureMetrics(): Array<{ feature: string; interactions: number; conversions: number; rate: number }> {
    const metrics: Array<{ feature: string; interactions: number; conversions: number; rate: number }> = [];

    for (const [feature, interactions] of this.featureInteractions) {
      const conversions = this.featureConversions.get(feature) || 0;
      const rate = interactions > 0 ? conversions / interactions : 0;

      metrics.push({
        feature,
        interactions,
        conversions,
        rate
      });
    }

    return metrics.sort((a, b) => b.rate - a.rate);
  }
}

// ==================== EXPORTS ====================

export const recommendationEngine = new RecommendationEngine();
export const churnPredictor = new ChurnPredictor();
export const userSegmenter = new UserSegmenter();
export const featureImportance = new FeatureImportance();
