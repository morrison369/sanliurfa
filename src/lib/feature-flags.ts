/**
 * Feature flags and A/B testing system
 * Supports gradual rollouts, user-specific features, and A/B experiments
 */

import { getCache, setCache } from './cache';
import { logger } from './logging';

export interface Feature {
  name: string;
  enabled: boolean;
  rolloutPercentage?: number; // 0-100
  whitelist?: string[]; // User IDs
  blacklist?: string[]; // User IDs
  regions?: string[]; // Geographic regions
}

export interface ABTest {
  id: string;
  name: string;
  enabled: boolean;
  variants: {
    name: string;
    percentage: number;
    config?: Record<string, any>;
  }[];
  targetUsers?: string[];
  excludeUsers?: string[];
  createdAt: Date;
  endsAt?: Date;
}

/**
 * Feature flags manager
 */
export class FeatureFlags {
  private features: Map<string, Feature> = new Map();
  private cacheKey = 'sanliurfa:feature_flags';
  private cacheTtl = 3600; // 1 hour

  /**
   * Initialize features
   */
  async initialize(): Promise<void> {
    try {
      const cached = await getCache(this.cacheKey);

      if (cached) {
        const features = JSON.parse(cached) as Record<string, Feature>;
        Object.entries(features).forEach(([name, feature]) => {
          this.features.set(name, feature);
        });

        logger.info('Feature flags loaded from cache', { count: this.features.size });
        return;
      }

      // Load default features
      this.registerDefaults();
      await this.save();
    } catch (error) {
      logger.error('Failed to initialize feature flags', error instanceof Error ? error : new Error(String(error)));
      this.registerDefaults();
    }
  }

  /**
   * Register default features
   */
  private registerDefaults(): void {
    this.register('notifications', {
      name: 'notifications',
      enabled: true
    });

    this.register('advanced_search', {
      name: 'advanced_search',
      enabled: true,
      rolloutPercentage: 80
    });

    this.register('dark_mode', {
      name: 'dark_mode',
      enabled: true
    });

    this.register('ai_recommendations', {
      name: 'ai_recommendations',
      enabled: false,
      rolloutPercentage: 10
    });

    this.register('payment_v2', {
      name: 'payment_v2',
      enabled: false
    });
  }

  /**
   * Register feature
   */
  register(name: string, feature: Omit<Feature, 'name'>): void {
    this.features.set(name, { name, ...feature });
  }

  /**
   * Check if feature is enabled for user
   */
  isEnabled(
    featureName: string,
    userId?: string,
    context?: { region?: string; [key: string]: any }
  ): boolean {
    const feature = this.features.get(featureName);

    if (!feature || !feature.enabled) {
      return false;
    }

    // Check whitelist
    if (feature.whitelist && feature.whitelist.length > 0) {
      if (!userId || !feature.whitelist.includes(userId)) {
        return false;
      }
    }

    // Check blacklist
    if (feature.blacklist && feature.blacklist.length > 0) {
      if (userId && feature.blacklist.includes(userId)) {
        return false;
      }
    }

    // Check regions
    if (feature.regions && feature.regions.length > 0) {
      if (!context?.region || !feature.regions.includes(context.region)) {
        return false;
      }
    }

    // Check rollout percentage
    if (feature.rolloutPercentage !== undefined && feature.rolloutPercentage < 100) {
      if (!userId) {
        return false;
      }

      const hash = this.hashUserId(userId);
      const percentage = Math.abs(hash) % 100;

      return percentage < feature.rolloutPercentage;
    }

    return true;
  }

  /**
   * Get feature by name
   */
  getFeature(name: string): Feature | undefined {
    return this.features.get(name);
  }

  /**
   * Get all features
   */
  getAllFeatures(): Record<string, Feature> {
    const result: Record<string, Feature> = {};

    this.features.forEach((feature, name) => {
      result[name] = feature;
    });

    return result;
  }

  /**
   * Update feature
   */
  async updateFeature(name: string, updates: Partial<Feature>): Promise<void> {
    const feature = this.features.get(name);

    if (!feature) {
      throw new Error(`Feature not found: ${name}`);
    }

    const updated = { ...feature, ...updates };
    this.features.set(name, updated);

    await this.save();

    logger.info('Feature updated', { feature: name, ...updates });
  }

  /**
   * Delete feature
   */
  async deleteFeature(name: string): Promise<void> {
    this.features.delete(name);
    await this.save();

    logger.info('Feature deleted', { feature: name });
  }

  /**
   * Save features to cache
   */
  private async save(): Promise<void> {
    try {
      const features: Record<string, Feature> = {};

      this.features.forEach((feature, name) => {
        features[name] = feature;
      });

      await setCache(this.cacheKey, JSON.stringify(features), this.cacheTtl);
    } catch (error) {
      logger.error('Failed to save feature flags', error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Hash user ID for percentage-based rollouts (consistent hashing)
   */
  private hashUserId(userId: string): number {
    let hash = 0;

    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return hash;
  }
}

/**
 * A/B testing manager
 */
export class ABTestManager {
  private tests: Map<string, ABTest> = new Map();
  private userVariants: Map<string, Map<string, string>> = new Map(); // userId -> testId -> variant
  private cacheKey = 'sanliurfa:ab_tests';
  private cacheTtl = 3600;

  /**
   * Create A/B test
   */
  createTest(test: Omit<ABTest, 'createdAt'>): ABTest {
    const abTest: ABTest = {
      ...test,
      createdAt: new Date()
    };

    this.tests.set(test.id, abTest);

    logger.info('A/B test created', {
      testId: test.id,
      variants: test.variants.length
    });

    return abTest;
  }

  /**
   * Get variant for user in test
   */
  getVariant(testId: string, userId: string): string | undefined {
    const test = this.tests.get(testId);

    if (!test || !test.enabled) {
      return undefined;
    }

    // Check if test has expired
    if (test.endsAt && test.endsAt < new Date()) {
      return undefined;
    }

    // Check target users
    if (test.targetUsers && !test.targetUsers.includes(userId)) {
      return undefined;
    }

    // Check exclude users
    if (test.excludeUsers && test.excludeUsers.includes(userId)) {
      return undefined;
    }

    // Get consistent variant for user
    let userTestVariants = this.userVariants.get(userId);

    if (!userTestVariants) {
      userTestVariants = new Map();
      this.userVariants.set(userId, userTestVariants);
    }

    if (!userTestVariants.has(testId)) {
      // Assign variant consistently
      const variant = this.assignVariant(userId, test.id, test.variants);
      userTestVariants.set(testId, variant);
    }

    return userTestVariants.get(testId);
  }

  /**
   * Assign variant to user (consistent hashing)
   */
  private assignVariant(
    userId: string,
    testId: string,
    variants: ABTest['variants']
  ): string {
    const seed = `${userId}:${testId}`;
    const hash = Math.abs(this.hash(seed)) % 100;

    let cumulative = 0;

    for (const variant of variants) {
      cumulative += variant.percentage;

      if (hash < cumulative) {
        return variant.name;
      }
    }

    // Fallback to first variant
    return variants[0]?.name || 'control';
  }

  /**
   * Get variant config
   */
  getVariantConfig(testId: string, userId: string): Record<string, any> | undefined {
    const variant = this.getVariant(testId, userId);

    if (!variant) {
      return undefined;
    }

    const test = this.tests.get(testId);
    const variantConfig = test?.variants.find(v => v.name === variant);

    return variantConfig?.config;
  }

  /**
   * Track conversion for A/B test
   */
  trackConversion(testId: string, userId: string, value?: number): void {
    const variant = this.getVariant(testId, userId);

    if (!variant) {
      return;
    }

    logger.info('A/B test conversion tracked', {
      testId,
      userId,
      variant,
      value
    });

    // In production, this would update conversion metrics
  }

  /**
   * Get test results
   */
  getResults(testId: string): {
    testId: string;
    variants: Record<string, { conversions: number; rate: number }>;
  } | null {
    const test = this.tests.get(testId);

    if (!test) {
      return null;
    }

    // In production, fetch from database
    return {
      testId,
      variants: test.variants.reduce(
        (acc, variant) => ({
          ...acc,
          [variant.name]: { conversions: 0, rate: 0 }
        }),
        {}
      )
    };
  }

  /**
   * End A/B test
   */
  endTest(testId: string): void {
    const test = this.tests.get(testId);

    if (!test) {
      return;
    }

    test.endsAt = new Date();

    logger.info('A/B test ended', { testId });
  }

  /**
   * Hash function for consistent variant assignment
   */
  private hash(str: string): number {
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }

    return hash;
  }
}

/**
 * Global instances
 */
const featureFlags = new FeatureFlags();
const abTestManager = new ABTestManager();

export function getFeatureFlags(): FeatureFlags {
  return featureFlags;
}

export function getABTestManager(): ABTestManager {
  return abTestManager;
}

/**
 * Initialize feature system
 */
export async function initializeFeatures(): Promise<void> {
  await featureFlags.initialize();
  logger.info('Feature system initialized');
}
