/**
 * Feature Flags System
 * Dynamic feature toggling for gradual rollouts and A/B testing
 */

import { query } from '../postgres';
import { getRedisClient } from '../cache';
import { logger } from '../logging';

export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  allowedUsers?: string[];
  allowedGroups?: string[];
  startDate?: Date;
  endDate?: Date;
  metadata?: Record<string, unknown>;
}

export interface UserContext {
  userId?: string;
  email?: string;
  groups?: string[];
  sessionId?: string;
}

class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private cacheKey = 'feature_flags';
  private cacheTTL = 300; // 5 minutes

  /**
   * Load flags from database to memory cache
   */
  async loadFlags(): Promise<void> {
    try {
      // Try Redis first
      const redis = await getRedisClient();
      const cached = await redis.get(this.cacheKey);
      
      if (cached) {
        const flags = JSON.parse(cached);
        this.flags = new Map(Object.entries(flags));
        return;
      }

      // Load from database
      const result = await query(
        'SELECT * FROM feature_flags WHERE deleted_at IS NULL',
        []
      );

      this.flags.clear();
      for (const row of result.rows || []) {
        this.flags.set(row.name, {
          name: row.name,
          enabled: row.enabled,
          rolloutPercentage: row.rollout_percentage,
          allowedUsers: row.allowed_users || [],
          allowedGroups: row.allowed_groups || [],
          startDate: row.start_date ? new Date(row.start_date) : undefined,
          endDate: row.end_date ? new Date(row.end_date) : undefined,
          metadata: row.metadata || {},
        });
      }

      // Cache in Redis
      await (redis as any).setex(
        this.cacheKey,
        this.cacheTTL,
        JSON.stringify(Object.fromEntries(this.flags))
      );
    } catch (error) {
      logger.error('Failed to load feature flags:', error);
    }
  }

  /**
   * Check if a feature is enabled for a user
   */
  isEnabled(flagName: string, context?: UserContext): boolean {
    const flag = this.flags.get(flagName);

    if (!flag) {
      return false;
    }

    // Check global enable
    if (!flag.enabled) {
      return false;
    }

    // Check date range
    const now = new Date();
    if (flag.startDate && now < flag.startDate) {
      return false;
    }
    if (flag.endDate && now > flag.endDate) {
      return false;
    }

    // If no context, use rollout percentage only
    if (!context) {
      return Math.random() * 100 < flag.rolloutPercentage;
    }

    // Check allowed users
    if (flag.allowedUsers?.includes(context.userId || '')) {
      return true;
    }

    // Check allowed groups
    if (flag.allowedGroups && context.groups) {
      if (flag.allowedGroups.some(g => context.groups?.includes(g))) {
        return true;
      }
    }

    // Use consistent hashing for rollout percentage
    if (context.userId) {
      const hash = this.hashString(context.userId + flagName);
      return (hash % 100) < flag.rolloutPercentage;
    }

    // Fallback to random for anonymous users
    return Math.random() * 100 < flag.rolloutPercentage;
  }

  /**
   * Get all flags for a user
   */
  getAllFlags(context?: UserContext): Record<string, boolean> {
    const result: Record<string, boolean> = {};
    for (const [name] of this.flags) {
      result[name] = this.isEnabled(name, context);
    }
    return result;
  }

  /**
   * Create or update a feature flag
   */
  async setFlag(flag: FeatureFlag): Promise<void> {
    await query(
      `INSERT INTO feature_flags 
       (name, enabled, rollout_percentage, allowed_users, allowed_groups, start_date, end_date, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (name) DO UPDATE SET
       enabled = EXCLUDED.enabled,
       rollout_percentage = EXCLUDED.rollout_percentage,
       allowed_users = EXCLUDED.allowed_users,
       allowed_groups = EXCLUDED.allowed_groups,
       start_date = EXCLUDED.start_date,
       end_date = EXCLUDED.end_date,
       metadata = EXCLUDED.metadata,
       updated_at = NOW()`,
      [
        flag.name,
        flag.enabled,
        flag.rolloutPercentage,
        flag.allowedUsers,
        flag.allowedGroups,
        flag.startDate,
        flag.endDate,
        flag.metadata,
      ]
    );

    // Update local cache
    this.flags.set(flag.name, flag);

    // Invalidate Redis cache
    try {
      const redis = await getRedisClient();
      await redis.del(this.cacheKey);
    } catch {
      // Ignore Redis errors
    }
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(name: string): Promise<void> {
    await query(
      'UPDATE feature_flags SET deleted_at = NOW() WHERE name = $1',
      [name]
    );

    this.flags.delete(name);

    // Invalidate cache
    try {
      const redis = await getRedisClient();
      await redis.del(this.cacheKey);
    } catch {
      // Ignore
    }
  }

  /**
   * Simple hash function for consistent user bucketing
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// Singleton instance
export const featureFlags = new FeatureFlagManager();

// React hook for feature flags
export function useFeatureFlag(flagName: string, context?: UserContext): boolean {
  return featureFlags.isEnabled(flagName, context);
}

// Helper functions
export function isFeatureEnabled(flagName: string, context?: UserContext): boolean {
  return featureFlags.isEnabled(flagName, context);
}

export function getEnabledFeatures(context?: UserContext): Record<string, boolean> {
  return featureFlags.getAllFlags(context);
}

export default featureFlags;

