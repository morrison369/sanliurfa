/**
 * A/B Testing Framework
 * Feature flags, experiments, and conversion tracking
 */

import { query } from '../postgres';
import { logger } from '../logging';

export interface Experiment {
  id: string;
  name: string;
  description?: string;
  key: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: Variant[];
  targeting?: TargetingRules;
  goals: string[];
  startDate?: Date;
  endDate?: Date;
  trafficAllocation: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export interface Variant {
  id: string;
  name: string;
  key: string;
  weight: number; // 0-100
  config: Record<string, any>;
  isControl?: boolean;
}

export interface TargetingRules {
  userSegments?: string[];
  userTier?: ('free' | 'basic' | 'premium' | 'enterprise')[];
  urlPatterns?: string[];
  deviceTypes?: ('desktop' | 'mobile' | 'tablet')[];
}

export interface ExperimentResult {
  experimentId: string;
  variantId: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
  confidenceLevel: number;
  isWinner?: boolean;
}

// In-memory cache for active experiments
let activeExperiments: Map<string, Experiment> = new Map();
let lastRefresh = 0;
const CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Refresh experiments cache
 */
async function refreshExperiments(): Promise<void> {
  const now = Date.now();
  if (now - lastRefresh < CACHE_TTL) return;

  try {
    const result = await query(
      `SELECT * FROM experiments WHERE status = 'running'`,
      []
    );

    activeExperiments = new Map();
    for (const row of result.rows) {
      const experiment: Experiment = {
        id: row.id,
        name: row.name,
        description: row.description,
        key: row.key,
        status: row.status,
        variants: row.variants,
        targeting: row.targeting,
        goals: row.goals,
        startDate: row.start_date ? new Date(row.start_date) : undefined,
        endDate: row.end_date ? new Date(row.end_date) : undefined,
        trafficAllocation: row.traffic_allocation,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      };
      activeExperiments.set(row.key, experiment);
    }

    lastRefresh = now;
  } catch (error) {
    logger.error('Failed to refresh experiments:', error);
  }
}

/**
 * Get experiment by key
 */
export async function getExperiment(key: string): Promise<Experiment | undefined> {
  await refreshExperiments();
  return activeExperiments.get(key);
}

/**
 * Get variant for user
 */
export async function getVariant(
  experimentKey: string,
  userId?: string,
  userAttributes?: Record<string, any>
): Promise<Variant | null> {
  const experiment = await getExperiment(experimentKey);
  
  if (!experiment) return null;
  
  // Check targeting rules
  if (!checkTargeting(experiment.targeting, userAttributes)) {
    return null;
  }
  
  // Check traffic allocation
  if (experiment.trafficAllocation < 100) {
    const userHash = hashUserId(userId || 'anonymous');
    if (userHash > experiment.trafficAllocation) {
      return null; // User not in experiment
    }
  }
  
  // Check if user already assigned
  if (userId) {
    const assigned = await getAssignedVariant(experiment.id, userId);
    if (assigned) {
      return experiment.variants.find(v => v.id === assigned) || null;
    }
  }
  
  // Assign new variant
  const variant = selectVariant(experiment.variants);
  
  if (userId && variant) {
    await assignVariant(experiment.id, userId, variant.id);
  }
  
  return variant;
}

/**
 * Check if user matches targeting rules
 */
function checkTargeting(
  rules?: TargetingRules,
  attributes?: Record<string, any>
): boolean {
  if (!rules) return true;
  if (!attributes) return true;
  
  // Check user tier
  if (rules.userTier && attributes.tier) {
    if (!rules.userTier.includes(attributes.tier)) {
      return false;
    }
  }
  
  // Check device type
  if (rules.deviceTypes && attributes.deviceType) {
    if (!rules.deviceTypes.includes(attributes.deviceType)) {
      return false;
    }
  }
  
  // Check user segments
  if (rules.userSegments && attributes.segments) {
    const hasSegment = rules.userSegments.some(s => attributes.segments.includes(s));
    if (!hasSegment) return false;
  }
  
  return true;
}

/**
 * Select variant based on weights
 */
function selectVariant(variants: Variant[]): Variant | null {
  if (variants.length === 0) return null;
  if (variants.length === 1) return variants[0];
  
  const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
  const random = Math.random() * totalWeight;
  
  let currentWeight = 0;
  for (const variant of variants) {
    currentWeight += variant.weight;
    if (random <= currentWeight) {
      return variant;
    }
  }
  
  return variants[variants.length - 1];
}

/**
 * Hash user ID to number (0-100)
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
 * Get assigned variant for user
 */
async function getAssignedVariant(
  experimentId: string,
  userId: string
): Promise<string | null> {
  try {
    const result = await query(
      `SELECT variant_id FROM experiment_assignments
       WHERE experiment_id = $1 AND user_id = $2`,
      [experimentId, userId]
    );
    
    return result.rows[0]?.variant_id || null;
  } catch {
    return null;
  }
}

/**
 * Assign variant to user
 */
async function assignVariant(
  experimentId: string,
  userId: string,
  variantId: string
): Promise<void> {
  await query(
    `INSERT INTO experiment_assignments (experiment_id, user_id, variant_id, assigned_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (experiment_id, user_id) DO NOTHING`,
    [experimentId, userId, variantId]
  );
}

/**
 * Track impression
 */
export async function trackImpression(
  experimentId: string,
  variantId: string,
  userId?: string
): Promise<void> {
  await query(
    `INSERT INTO experiment_events (experiment_id, variant_id, user_id, event_type, occurred_at)
     VALUES ($1, $2, $3, 'impression', NOW())`,
    [experimentId, variantId, userId || null]
  );
}

/**
 * Track conversion
 */
export async function trackConversion(
  experimentId: string,
  variantId: string,
  goal: string,
  value?: number,
  userId?: string
): Promise<void> {
  await query(
    `INSERT INTO experiment_events (experiment_id, variant_id, user_id, event_type, goal, value, occurred_at)
     VALUES ($1, $2, $3, 'conversion', $4, $5, NOW())`,
    [experimentId, variantId, userId || null, goal, value || null]
  );
}

/**
 * Get experiment results
 */
export async function getExperimentResults(
  experimentId: string
): Promise<ExperimentResult[]> {
  const result = await query(
    `SELECT 
      variant_id,
      COUNT(*) FILTER (WHERE event_type = 'impression') as impressions,
      COUNT(*) FILTER (WHERE event_type = 'conversion') as conversions
    FROM experiment_events
    WHERE experiment_id = $1
    GROUP BY variant_id`,
    [experimentId]
  );

  return result.rows.map(row => {
    const impressions = parseInt(row.impressions);
    const conversions = parseInt(row.conversions);
    const conversionRate = impressions > 0 ? (conversions / impressions) * 100 : 0;
    
    return {
      experimentId,
      variantId: row.variant_id,
      impressions,
      conversions,
      conversionRate,
      confidenceLevel: calculateConfidence(impressions, conversions),
    };
  });
}

/**
 * Calculate statistical confidence (simplified)
 */
function calculateConfidence(impressions: number, conversions: number): number {
  if (impressions < 100) return 0;
  
  const rate = conversions / impressions;
  const stdError = Math.sqrt((rate * (1 - rate)) / impressions);
  const zScore = rate / stdError;
  
  // Simplified: return confidence based on z-score
  if (zScore > 2.58) return 99;
  if (zScore > 1.96) return 95;
  if (zScore > 1.64) return 90;
  return Math.round(zScore * 50); // Rough estimate
}

/**
 * Create experiment
 */
export async function createExperiment(
  experiment: Omit<Experiment, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Experiment> {
  const result = await query(
    `INSERT INTO experiments (name, key, description, status, variants, targeting, goals, 
                             traffic_allocation, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      experiment.name,
      experiment.key,
      experiment.description,
      experiment.status,
      JSON.stringify(experiment.variants),
      JSON.stringify(experiment.targeting),
      experiment.goals,
      experiment.trafficAllocation,
      experiment.startDate,
      experiment.endDate,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.name,
    key: row.key,
    description: row.description,
    status: row.status,
    variants: row.variants,
    targeting: row.targeting,
    goals: row.goals,
    trafficAllocation: row.traffic_allocation,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Update experiment status
 */
export async function updateExperimentStatus(
  experimentId: string,
  status: Experiment['status']
): Promise<void> {
  await query(
    `UPDATE experiments SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, experimentId]
  );
  
  // Refresh cache
  lastRefresh = 0;
}

/**
 * Get all experiments
 */
export async function getAllExperiments(
  status?: Experiment['status']
): Promise<Experiment[]> {
  let sql = `SELECT * FROM experiments`;
  const params: any[] = [];
  
  if (status) {
    sql += ` WHERE status = $1`;
    params.push(status);
  }
  
  sql += ` ORDER BY created_at DESC`;
  
  const result = await query(sql, params);
  
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    key: row.key,
    description: row.description,
    status: row.status,
    variants: row.variants,
    targeting: row.targeting,
    goals: row.goals,
    trafficAllocation: row.traffic_allocation,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

/**
 * Feature flag check (simple boolean experiment)
 */
export async function isFeatureEnabled(
  featureKey: string,
  userId?: string,
  defaultValue = false
): Promise<boolean> {
  const experiment = await getExperiment(featureKey);
  
  if (!experiment) return defaultValue;
  if (experiment.status !== 'running') return defaultValue;
  
  const variant = await getVariant(featureKey, userId);
  
  if (!variant) return defaultValue;
  
  // Track impression
  trackImpression(experiment.id, variant.id, userId).catch(console.error);
  
  // Return true if not control variant
  return !variant.isControl;
}

/**
 * Get feature value
 */
export async function getFeatureValue<T>(
  featureKey: string,
  userId?: string,
  defaultValue?: T
): Promise<T | undefined> {
  const experiment = await getExperiment(featureKey);
  
  if (!experiment) return defaultValue;
  if (experiment.status !== 'running') return defaultValue;
  
  const variant = await getVariant(featureKey, userId);
  
  if (!variant) return defaultValue;
  
  // Track impression
  trackImpression(experiment.id, variant.id, userId).catch(console.error);
  
  return variant.config as T;
}
