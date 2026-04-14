/**
 * Feature Flags System
 * A/B testing and feature toggling
 */

import { query } from '../postgres';
import { getCache, setCache } from '../cache';

export interface FeatureFlag {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rollout_percentage: number;
  targeting_rules?: TargetingRule[];
  created_at: Date;
  updated_at: Date;
}

export interface TargetingRule {
  type: 'user_id' | 'user_group' | 'region' | 'device';
  operator: 'in' | 'not_in' | 'equals' | 'not_equals';
  value: string | string[];
}

const CACHE_PREFIX = 'feature:';
const CACHE_TTL = 300; // 5 minutes

/**
 * Get feature flag
 */
export async function getFeatureFlag(key: string): Promise<FeatureFlag | null> {
  // Check cache first
  const cached = await getCache<FeatureFlag>(`${CACHE_PREFIX}${key}`);
  if (cached) return cached;

  const result = await query(
    'SELECT * FROM feature_flags WHERE key = $1',
    [key]
  );

  if (result.rows.length === 0) return null;

  const flag = result.rows[0];
  const feature: FeatureFlag = {
    key: flag.key,
    name: flag.name,
    description: flag.description,
    enabled: flag.enabled,
    rollout_percentage: flag.rollout_percentage,
    targeting_rules: flag.targeting_rules,
    created_at: new Date(flag.created_at),
    updated_at: new Date(flag.updated_at),
  };

  // Cache it
  await setCache(`${CACHE_PREFIX}${key}`, feature, CACHE_TTL);

  return feature;
}

/**
 * Check if feature is enabled for user
 */
export async function isFeatureEnabled(
  key: string,
  userId?: string,
  context?: Record<string, any>
): Promise<boolean> {
  const flag = await getFeatureFlag(key);

  // If flag doesn't exist, return false
  if (!flag) return false;

  // If completely disabled
  if (!flag.enabled) return false;

  // If fully rolled out
  if (flag.rollout_percentage >= 100) return true;

  // If no user ID, use percentage only
  if (!userId) {
    return Math.random() * 100 < flag.rollout_percentage;
  }

  // Check targeting rules first
  if (flag.targeting_rules && flag.targeting_rules.length > 0) {
    const matchesTargeting = await checkTargetingRules(flag.targeting_rules, userId, context);
    if (matchesTargeting) return true;
  }

  // Consistent hashing for percentage rollout
  const userHash = hashUserId(userId);
  return userHash < flag.rollout_percentage;
}

/**
 * Check targeting rules
 */
async function checkTargetingRules(
  rules: TargetingRule[],
  userId: string,
  context?: Record<string, any>
): Promise<boolean> {
  for (const rule of rules) {
    let matches = false;

    switch (rule.type) {
      case 'user_id':
        matches = checkValue(userId, rule);
        break;
      case 'user_group':
        matches = checkValue(context?.userGroup, rule);
        break;
      case 'region':
        matches = checkValue(context?.region, rule);
        break;
      case 'device':
        matches = checkValue(context?.device, rule);
        break;
    }

    if (!matches) return false;
  }

  return true;
}

/**
 * Check single value against rule
 */
function checkValue(value: any, rule: TargetingRule): boolean {
  if (value === undefined) return false;

  const ruleValue = Array.isArray(rule.value) ? rule.value : [rule.value];

  switch (rule.operator) {
    case 'in':
      return ruleValue.includes(value);
    case 'not_in':
      return !ruleValue.includes(value);
    case 'equals':
      return value === rule.value;
    case 'not_equals':
      return value !== rule.value;
    default:
      return false;
  }
}

/**
 * Hash user ID to percentage (0-100)
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 100;
}

/**
 * Create or update feature flag
 */
export async function setFeatureFlag(
  key: string,
  data: {
    name: string;
    description?: string;
    enabled: boolean;
    rollout_percentage: number;
    targeting_rules?: TargetingRule[];
  }
): Promise<void> {
  await query(
    `INSERT INTO feature_flags (key, name, description, enabled, rollout_percentage, targeting_rules, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (key) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       enabled = EXCLUDED.enabled,
       rollout_percentage = EXCLUDED.rollout_percentage,
       targeting_rules = EXCLUDED.targeting_rules,
       updated_at = NOW()`,
    [key, data.name, data.description, data.enabled, data.rollout_percentage, JSON.stringify(data.targeting_rules || [])]
  );

  // Invalidate cache
  const { deleteCache } = await import('../cache');
  await deleteCache(`${CACHE_PREFIX}${key}`);
}

/**
 * Delete feature flag
 */
export async function deleteFeatureFlag(key: string): Promise<boolean> {
  const result = await query(
    'DELETE FROM feature_flags WHERE key = $1',
    [key]
  );

  // Invalidate cache
  if (result.rowCount > 0) {
    const { deleteCache } = await import('../cache');
    await deleteCache(`${CACHE_PREFIX}${key}`);
  }

  return result.rowCount > 0;
}

/**
 * Get all feature flags
 */
export async function getAllFeatureFlags(): Promise<FeatureFlag[]> {
  const result = await query(
    'SELECT * FROM feature_flags ORDER BY key'
  );

  return result.rows.map(row => ({
    key: row.key,
    name: row.name,
    description: row.description,
    enabled: row.enabled,
    rollout_percentage: row.rollout_percentage,
    targeting_rules: row.targeting_rules,
    created_at: new Date(row.created_at),
    updated_at: new Date(row.updated_at),
  }));
}

/**
 * Toggle feature flag
 */
export async function toggleFeatureFlag(key: string, enabled: boolean): Promise<void> {
  await query(
    'UPDATE feature_flags SET enabled = $2, updated_at = NOW() WHERE key = $1',
    [key, enabled]
  );

  // Invalidate cache
  const { deleteCache } = await import('../cache');
  await deleteCache(`${CACHE_PREFIX}${key}`);
}

/**
 * Get feature flags for client
 * Returns only enabled flags for the specific user
 */
export async function getClientFeatureFlags(
  userId?: string,
  context?: Record<string, any>
): Promise<string[]> {
  const flags = await getAllFeatureFlags();
  const enabledFlags: string[] = [];

  for (const flag of flags) {
    if (await isFeatureEnabled(flag.key, userId, context)) {
      enabledFlags.push(flag.key);
    }
  }

  return enabledFlags;
}

// Predefined feature flags
export const FEATURES = {
  NEW_DESIGN: 'new_design',
  ADVANCED_SEARCH: 'advanced_search',
  SOCIAL_FEATURES: 'social_features',
  PREMIUM_PLACES: 'premium_places',
  DARK_MODE: 'dark_mode',
  PWA_OFFLINE: 'pwa_offline',
  ANALYTICS: 'analytics',
  NEWSLETTER: 'newsletter',
} as const;
