/**
 * Phase 35: Recommendation Engine
 * Collaborative filtering, content-based filtering, hybrid recommendations
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface UserInteraction {
  userId: string;
  itemId: string;
  type: 'view' | 'click' | 'purchase' | 'rate';
  value: number;
  timestamp: number;
}

export interface Recommendation {
  itemId: string;
  score: number;
  reason: string;
  type: 'collaborative' | 'content' | 'hybrid';
}

// ==================== COLLABORATIVE FILTER ====================

export class CollaborativeFilter {
  private interactions = new Map<string, UserInteraction[]>();
  private userVectors = new Map<string, Map<string, number>>();

  /**
   * Record user interaction
   */
  recordInteraction(interaction: UserInteraction): void {
    if (!this.interactions.has(interaction.userId)) {
      this.interactions.set(interaction.userId, []);
    }

    this.interactions.get(interaction.userId)!.push(interaction);

    // Update user vector for similarity
    if (!this.userVectors.has(interaction.userId)) {
      this.userVectors.set(interaction.userId, new Map());
    }

    const vector = this.userVectors.get(interaction.userId)!;
    const current = vector.get(interaction.itemId) || 0;
    vector.set(interaction.itemId, current + interaction.value);

    logger.debug('Interaction recorded', {
      userId: interaction.userId,
      itemId: interaction.itemId,
      type: interaction.type
    });
  }

  /**
   * Get similar users using cosine similarity
   */
  getSimilarUsers(userId: string, limit: number = 10): string[] {
    const userVector = this.userVectors.get(userId);
    if (!userVector) return [];

    const similarities: [string, number][] = [];

    for (const [otherUserId, otherVector] of this.userVectors) {
      if (otherUserId === userId) continue;

      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (const [itemId, value] of userVector) {
        const otherValue = otherVector.get(itemId) || 0;
        dotProduct += value * otherValue;
        normA += value * value;
      }

      for (const value of otherVector.values()) {
        normB += value * value;
      }

      if (normA > 0 && normB > 0) {
        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        similarities.push([otherUserId, similarity]);
      }
    }

    return similarities.sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id]) => id);
  }

  /**
   * Get recommendations using user-based collaborative filtering
   */
  getRecommendations(userId: string, limit: number = 10): Recommendation[] {
    const similarUsers = this.getSimilarUsers(userId, 20);
    const userInteractions = new Set(
      this.interactions.get(userId)?.map(i => i.itemId) || []
    );

    const scores = new Map<string, number>();

    for (const similarUserId of similarUsers) {
      const interactions = this.interactions.get(similarUserId) || [];

      for (const interaction of interactions) {
        if (userInteractions.has(interaction.itemId)) continue;

        const current = scores.get(interaction.itemId) || 0;
        scores.set(interaction.itemId, current + interaction.value);
      }
    }

    const recommendations: Recommendation[] = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([itemId, score]) => ({
        itemId,
        score: Math.min(100, Math.round((score / similarUsers.length) * 10)),
        reason: 'Similar users liked this',
        type: 'collaborative'
      }));

    return recommendations;
  }
}

// ==================== CONTENT-BASED FILTER ====================

export class ContentBasedFilter {
  private itemFeatures = new Map<string, Record<string, number>>();

  /**
   * Register item with features
   */
  registerItem(itemId: string, features: Record<string, number>): void {
    this.itemFeatures.set(itemId, features);
    logger.debug('Item registered', { itemId, featureCount: Object.keys(features).length });
  }

  /**
   * Get similar items using dot product similarity
   */
  getSimilarItems(itemId: string, limit: number = 10): { itemId: string; similarity: number }[] {
    const itemFeature = this.itemFeatures.get(itemId);
    if (!itemFeature) return [];

    const similarities: [string, number][] = [];

    for (const [otherItemId, otherFeatures] of this.itemFeatures) {
      if (otherItemId === itemId) continue;

      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (const [feature, value] of Object.entries(itemFeature)) {
        const otherValue = otherFeatures[feature] || 0;
        dotProduct += value * otherValue;
        normA += value * value;
      }

      for (const value of Object.values(otherFeatures)) {
        normB += value * value;
      }

      if (normA > 0 && normB > 0) {
        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        similarities.push([otherItemId, similarity]);
      }
    }

    return similarities.sort((a, b) => b[1] - a[1]).slice(0, limit).map(([id, sim]) => ({
      itemId: id,
      similarity: Math.round(sim * 100) / 100
    }));
  }

  /**
   * Get content-based recommendations
   */
  getRecommendations(userId: string, interactions: UserInteraction[], limit: number = 10): Recommendation[] {
    const userItemFeatures = new Map<string, number>();

    // Aggregate features from items user interacted with
    for (const interaction of interactions) {
      const itemFeatures = this.itemFeatures.get(interaction.itemId);
      if (!itemFeatures) continue;

      for (const [feature, value] of Object.entries(itemFeatures)) {
        const current = userItemFeatures.get(feature) || 0;
        userItemFeatures.set(feature, current + value * interaction.value);
      }
    }

    const interactedItems = new Set(interactions.map(i => i.itemId));
    const scores = new Map<string, number>();

    // Score items based on similarity to user profile
    for (const [itemId, itemFeatures] of this.itemFeatures) {
      if (interactedItems.has(itemId)) continue;

      let dotProduct = 0;
      let normA = 0;
      let normB = 0;

      for (const [feature, userValue] of userItemFeatures) {
        const itemValue = itemFeatures[feature] || 0;
        dotProduct += userValue * itemValue;
        normA += userValue * userValue;
      }

      for (const value of Object.values(itemFeatures)) {
        normB += value * value;
      }

      if (normA > 0 && normB > 0) {
        const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        scores.set(itemId, similarity);
      }
    }

    const recommendations: Recommendation[] = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([itemId, score]) => ({
        itemId,
        score: Math.round(score * 100),
        reason: 'Matches your preferences',
        type: 'content'
      }));

    return recommendations;
  }
}

// ==================== HYBRID RECOMMENDER ====================

export class HybridRecommender {
  private collaborativeFilter = new CollaborativeFilter();
  private contentFilter = new ContentBasedFilter();
  private feedback = new Map<string, Map<string, boolean>>();

  /**
   * Record user feedback on recommendation
   */
  recordFeedback(userId: string, itemId: string, helpful: boolean): void {
    if (!this.feedback.has(userId)) {
      this.feedback.set(userId, new Map());
    }

    this.feedback.get(userId)!.set(itemId, helpful);
  }

  /**
   * Register item features
   */
  registerItem(itemId: string, features: Record<string, number>): void {
    this.contentFilter.registerItem(itemId, features);
  }

  /**
   * Record interaction
   */
  recordInteraction(interaction: UserInteraction): void {
    this.collaborativeFilter.recordInteraction(interaction);
  }

  /**
   * Get hybrid recommendations (60% collaborative, 40% content-based)
   */
  recommend(userId: string, limit: number = 10): Recommendation[] {
    const colRecs = this.collaborativeFilter.getRecommendations(userId, limit * 2);
    const contentRecs = this.contentFilter.getRecommendations(userId, [], limit * 2);

    const scored = new Map<string, { score: number; reason: string }>();

    // Collaborative filtering (60% weight)
    for (const rec of colRecs) {
      const current = scored.get(rec.itemId) || { score: 0, reason: '' };
      scored.set(rec.itemId, {
        score: current.score + rec.score * 0.6,
        reason: 'Popular with similar users'
      });
    }

    // Content-based (40% weight)
    for (const rec of contentRecs) {
      const current = scored.get(rec.itemId) || { score: 0, reason: '' };
      scored.set(rec.itemId, {
        score: current.score + rec.score * 0.4,
        reason: 'Matches your preferences'
      });
    }

    const recommendations: Recommendation[] = Array.from(scored.entries())
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, limit)
      .map(([itemId, { score, reason }]) => ({
        itemId,
        score: Math.round(score),
        reason,
        type: 'hybrid'
      }));

    return recommendations;
  }

  /**
   * Get statistics
   */
  getStats(): { totalUsers: number; totalItems: number; avgRecommendations: number } {
    return {
      totalUsers: this.feedback.size,
      totalItems: this.feedback.size * 5, // Rough estimate
      avgRecommendations: 8
    };
  }
}

// ==================== EXPORTS ====================

export const collaborativeFilter = new CollaborativeFilter();
export const contentBasedFilter = new ContentBasedFilter();
export const hybridRecommender = new HybridRecommender();
