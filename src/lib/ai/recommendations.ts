/**
 * AI Recommendation Engine
 * Machine learning based content recommendations
 */

import { query } from '../postgres';

export interface Recommendation {
  itemId: string;
  itemType: 'place' | 'blog' | 'event' | 'collection';
  score: number;
  reason: string;
  metadata?: Record<string, any>;
}

export interface UserProfile {
  userId: string;
  interests: string[];
  preferredCategories: string[];
  priceRange: { min: number; max: number };
  visitPatterns: Record<string, number>;
  lastVisited: Record<string, Date>;
}

/**
 * Get personalized recommendations for user
 */
export async function getPersonalizedRecommendations(
  userId: string,
  options: {
    type?: 'place' | 'blog' | 'event' | 'all';
    limit?: number;
    excludeVisited?: boolean;
  } = {}
): Promise<Recommendation[]> {
  const { type = 'all', limit = 10, excludeVisited = true } = options;

  // Get user profile
  const profile = await buildUserProfile(userId);
  
  if (!profile) {
    // Return popular items if no profile
    return getPopularRecommendations(type, limit);
  }

  const recommendations: Recommendation[] = [];

  // Collaborative filtering - users like you also liked
  const collaborative = await getCollaborativeRecommendations(userId, limit / 3);
  recommendations.push(...collaborative);

  // Content-based - similar to what you viewed
  const contentBased = await getContentBasedRecommendations(profile, limit / 3);
  recommendations.push(...contentBased);

  // Trending in your area
  const trending = await getTrendingInArea(profile, limit / 3);
  recommendations.push(...trending);

  // Score and deduplicate
  const scored = scoreRecommendations(recommendations, profile);
  const unique = deduplicateRecommendations(scored);

  // Filter visited if requested
  let filtered = unique;
  if (excludeVisited) {
    const visited = await getUserVisitedItems(userId);
    filtered = unique.filter(r => !visited.includes(r.itemId));
  }

  return filtered.slice(0, limit);
}

/**
 * Build user profile from behavior
 */
async function buildUserProfile(userId: string): Promise<UserProfile | null> {
  // Get user interactions
  const interactions = await query(
    `SELECT 
      entity_type,
      entity_id,
      action,
      created_at
    FROM user_activities
    WHERE user_id = $1
    AND created_at >= NOW() - INTERVAL '90 days'
    ORDER BY created_at DESC`,
    [userId]
  );

  if (interactions.rows.length === 0) return null;

  // Get category preferences
  const categories = await query(
    `SELECT p.category_id, COUNT(*) as count
    FROM user_activities ua
    JOIN places p ON ua.entity_id = p.id
    WHERE ua.user_id = $1 AND ua.entity_type = 'place'
    GROUP BY p.category_id
    ORDER BY count DESC
    LIMIT 5`,
    [userId]
  );

  // Calculate visit patterns by day/hour
  const patterns: Record<string, number> = {};
  interactions.rows.forEach(row => {
    const date = new Date(row.created_at);
    const dayHour = `${date.getDay()}_${date.getHours()}`;
    patterns[dayHour] = (patterns[dayHour] || 0) + 1;
  });

  // Get last visited items
  const lastVisited: Record<string, Date> = {};
  interactions.rows.forEach(row => {
    if (!lastVisited[row.entity_id]) {
      lastVisited[row.entity_id] = new Date(row.created_at);
    }
  });

  return {
    userId,
    interests: categories.rows.map(r => r.category_id),
    preferredCategories: categories.rows.slice(0, 3).map(r => r.category_id),
    priceRange: { min: 0, max: 1000 }, // Calculate from behavior
    visitPatterns: patterns,
    lastVisited,
  };
}

/**
 * Collaborative filtering recommendations
 */
async function getCollaborativeRecommendations(
  userId: string,
  limit: number
): Promise<Recommendation[]> {
  // Find similar users based on common interactions
  const similarUsers = await query(
    `SELECT DISTINCT ua2.user_id,
      COUNT(*) as common_interactions
    FROM user_activities ua1
    JOIN user_activities ua2 ON ua1.entity_id = ua2.entity_id
    WHERE ua1.user_id = $1
    AND ua2.user_id != $1
    AND ua1.created_at >= NOW() - INTERVAL '90 days'
    GROUP BY ua2.user_id
    HAVING COUNT(*) >= 3
    ORDER BY common_interactions DESC
    LIMIT 20`,
    [userId]
  );

  if (similarUsers.rows.length === 0) return [];

  const similarUserIds = similarUsers.rows.map(r => r.user_id);

  // Get items liked by similar users but not by current user
  const recommendations = await query(
    `SELECT 
      p.id as item_id,
      'place' as item_type,
      p.name,
      COUNT(*) as similarity_score,
      AVG(r.rating) as avg_rating
    FROM user_activities ua
    JOIN places p ON ua.entity_id = p.id
    LEFT JOIN reviews r ON p.id = r.place_id
    WHERE ua.user_id = ANY($1)
    AND ua.entity_id NOT IN (
      SELECT entity_id FROM user_activities WHERE user_id = $2
    )
    AND p.status = 'active'
    GROUP BY p.id, p.name
    ORDER BY similarity_score DESC, avg_rating DESC
    LIMIT $3`,
    [similarUserIds, userId, limit]
  );

  return recommendations.rows.map(row => ({
    itemId: row.item_id,
    itemType: row.item_type,
    score: parseFloat(row.similarity_score) * parseFloat(row.avg_rating || 5),
    reason: 'Benzer kullanicilar tarafindan begenildi',
    metadata: { name: row.name },
  }));
}

/**
 * Content-based recommendations
 */
async function getContentBasedRecommendations(
  profile: UserProfile,
  limit: number
): Promise<Recommendation[]> {
  if (profile.interests.length === 0) return [];

  const recommendations = await query(
    `SELECT 
      p.id as item_id,
      'place' as item_type,
      p.name,
      p.category_id,
      p.rating,
      similarity(p.name || ' ' || p.description, $1) as content_score
    FROM places p
    WHERE p.category_id = ANY($2)
    AND p.status = 'active'
    ORDER BY content_score DESC, p.rating DESC
    LIMIT $3`,
    [profile.interests.join(' '), profile.interests, limit]
  );

  return recommendations.rows.map(row => ({
    itemId: row.item_id,
    itemType: row.item_type,
    score: parseFloat(row.content_score) * parseFloat(row.rating),
    reason: 'Ilgi alanlariniza uygun',
    metadata: { category: row.category_id, name: row.name },
  }));
}

/**
 * Get trending items in user's area
 */
async function getTrendingInArea(
  _profile: UserProfile,
  limit: number
): Promise<Recommendation[]> {
  // Get trending places based on recent activity
  const trending = await query(
    `SELECT 
      p.id as item_id,
      'place' as item_type,
      p.name,
      p.rating,
      COUNT(ua.id) as recent_views,
      AVG(r.rating) as avg_rating
    FROM places p
    LEFT JOIN user_activities ua ON p.id = ua.entity_id 
      AND ua.created_at >= NOW() - INTERVAL '7 days'
    LEFT JOIN reviews r ON p.id = r.place_id
    WHERE p.status = 'active'
    GROUP BY p.id, p.name, p.rating
    HAVING COUNT(ua.id) > 0
    ORDER BY recent_views DESC, p.rating DESC
    LIMIT $1`,
    [limit]
  );

  return trending.rows.map(row => ({
    itemId: row.item_id,
    itemType: row.item_type,
    score: parseInt(row.recent_views, 10) * parseFloat(row.rating),
    reason: 'Son zamanlarda populer',
    metadata: { views: row.recent_views, name: row.name },
  }));
}

/**
 * Get popular recommendations (for new users)
 */
async function getPopularRecommendations(
  _type: string,
  limit: number
): Promise<Recommendation[]> {
  const result = await query(
    `SELECT 
      p.id as item_id,
      'place' as item_type,
      p.name,
      p.rating,
      p.review_count,
      (p.rating * LOG(p.review_count + 1)) as popularity_score
    FROM places p
    WHERE p.status = 'active'
    ORDER BY popularity_score DESC
    LIMIT $1`,
    [limit]
  );

  return result.rows.map(row => ({
    itemId: row.item_id,
    itemType: row.item_type,
    score: parseFloat(row.popularity_score),
    reason: 'En cok begenilen mekanlar',
    metadata: { 
      name: row.name, 
      rating: row.rating,
      reviews: row.review_count 
    },
  }));
}

/**
 * Score recommendations based on user profile
 */
function scoreRecommendations(
  recommendations: Recommendation[],
  profile: UserProfile
): Recommendation[] {
  return recommendations.map(rec => {
    let score = rec.score;

    // Boost based on time pattern
    const now = new Date();
    const dayHour = `${now.getDay()}_${now.getHours()}`;
    const timeBoost = profile.visitPatterns[dayHour] || 0;
    score += timeBoost * 0.1;

    // Decay based on last visit
    if (profile.lastVisited[rec.itemId]) {
      const daysSince = (Date.now() - profile.lastVisited[rec.itemId].getTime()) / (1000 * 60 * 60 * 24);
      score *= Math.exp(-daysSince / 30); // Decay over 30 days
    }

    return { ...rec, score };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Deduplicate recommendations
 */
function deduplicateRecommendations(
  recommendations: Recommendation[]
): Recommendation[] {
  const seen = new Set<string>();
  return recommendations.filter(rec => {
    if (seen.has(rec.itemId)) return false;
    seen.add(rec.itemId);
    return true;
  });
}

/**
 * Get user's visited items
 */
async function getUserVisitedItems(userId: string): Promise<string[]> {
  const result = await query(
    `SELECT DISTINCT entity_id FROM user_activities WHERE user_id = $1`,
    [userId]
  );
  return result.rows.map(r => r.entity_id);
}

/**
 * Record recommendation feedback
 */
export async function recordRecommendationFeedback(
  userId: string,
  recommendation: Recommendation,
  feedback: 'clicked' | 'dismissed' | 'visited' | 'saved'
): Promise<void> {
  await query(
    `INSERT INTO recommendation_feedback 
     (user_id, item_id, item_type, recommendation_score, feedback, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, recommendation.itemId, recommendation.itemType, 
     recommendation.score, feedback]
  );

  // Update recommendation model weights based on feedback
  if (feedback === 'clicked' || feedback === 'visited') {
    await updateModelWeights(userId, recommendation, 1);
  } else if (feedback === 'dismissed') {
    await updateModelWeights(userId, recommendation, -0.5);
  }
}

/**
 * Update model weights based on feedback
 */
async function updateModelWeights(
  userId: string,
  recommendation: Recommendation,
  weight: number
): Promise<void> {
  // Store weight updates for batch processing
  await query(
    `INSERT INTO recommendation_weights 
     (user_id, item_type, reason, weight_delta, created_at)
     VALUES ($1, $2, $3, $4, NOW())
     ON CONFLICT (user_id, item_type, reason) DO UPDATE SET
       weight_delta = recommendation_weights.weight_delta + $4`,
    [userId, recommendation.itemType, recommendation.reason, weight]
  );
}

/**
 * Get "Because you viewed X" recommendations
 */
export async function getSimilarItems(
  itemId: string,
  _itemType: 'place' | 'blog' | 'event',
  limit: number = 5
): Promise<Recommendation[]> {
  // Get item details
  const item = await query(
    `SELECT * FROM places WHERE id = $1`,
    [itemId]
  );

  if (item.rows.length === 0) return [];

  const place = item.rows[0];

  // Find similar items by category and features
  const similar = await query(
    `SELECT 
      p.id as item_id,
      'place' as item_type,
      p.name,
      p.rating,
      similarity(p.description, $1) as text_similarity,
      (CASE WHEN p.category_id = $2 THEN 1 ELSE 0 END) as category_match
    FROM places p
    WHERE p.id != $3
    AND p.status = 'active'
    ORDER BY category_match DESC, text_similarity DESC, p.rating DESC
    LIMIT $4`,
    [place.description, place.category_id, itemId, limit]
  );

  return similar.rows.map(row => ({
    itemId: row.item_id,
    itemType: row.item_type,
    score: parseFloat(row.text_similarity) + parseFloat(row.category_match),
    reason: 'Buna benzer',
    metadata: { name: row.name, rating: row.rating },
  }));
}
