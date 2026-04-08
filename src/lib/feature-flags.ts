/**
 * Phase 42: Feature Flags & Remote Configuration
 * Kill switches, gradual rollouts, remote config, feature gating
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type RolloutStrategy = 'all' | 'percentage' | 'userlist' | 'segment' | 'none';

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  strategy: RolloutStrategy;
  percentage?: number;
  userList?: string[];
  segments?: string[];
}

export interface RemoteConfig {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  environment: string;
}

// ==================== FEATURE FLAG MANAGER ====================

export class FeatureFlagManager {
  private flags = new Map<string, FeatureFlag>();

  /**
   * Register feature flag
   */
  register(flag: FeatureFlag): void {
    this.flags.set(flag.id, flag);
    logger.debug('Feature flag registered', { id: flag.id, strategy: flag.strategy });
  }

  /**
   * Check if feature is enabled
   */
  isEnabled(flagId: string, userId?: string, segment?: string): boolean {
    const flag = this.flags.get(flagId);
    if (!flag || !flag.enabled) {
      return false;
    }

    switch (flag.strategy) {
      case 'all':
        return true;
      case 'none':
        return false;
      case 'percentage':
        if (!flag.percentage) return false;
        if (!userId) return false;
        const hash = userId.charCodeAt(0) + userId.charCodeAt(userId.length - 1);
        return (hash % 100) < flag.percentage;
      case 'userlist':
        return userId ? (flag.userList?.includes(userId) || false) : false;
      case 'segment':
        return segment ? (flag.segments?.includes(segment) || false) : false;
      default:
        return false;
    }
  }

  /**
   * Enable flag
   */
  enable(flagId: string): void {
    const flag = this.flags.get(flagId);
    if (flag) {
      flag.enabled = true;
      logger.info('Feature flag enabled', { id: flagId });
    }
  }

  /**
   * Disable flag (kill switch)
   */
  disable(flagId: string): void {
    const flag = this.flags.get(flagId);
    if (flag) {
      flag.enabled = false;
      logger.warn('Feature flag disabled', { id: flagId });
    }
  }

  /**
   * Set percentage for gradual rollout
   */
  setPercentage(flagId: string, pct: number): void {
    const flag = this.flags.get(flagId);
    if (flag) {
      flag.percentage = Math.min(100, Math.max(0, pct));
      flag.strategy = 'percentage';
      logger.info('Feature flag percentage updated', { id: flagId, percentage: pct });
    }
  }

  /**
   * Get all flags
   */
  getAll(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }
}

// ==================== REMOTE CONFIG MANAGER ====================

export class RemoteConfigManager {
  private configs = new Map<string, RemoteConfig>();
  private watchers = new Map<string, ((value: any) => void)[]>();

  /**
   * Set config value
   */
  set(key: string, value: any, environment: string = 'production'): void {
    const config: RemoteConfig = {
      key,
      value,
      type: typeof value as any,
      environment
    };

    this.configs.set(`${environment}:${key}`, config);

    // Notify watchers
    const callbacks = this.watchers.get(key) || [];
    for (const cb of callbacks) {
      cb(value);
    }

    logger.debug('Remote config set', { key, environment });
  }

  /**
   * Get config value
   */
  get<T>(key: string, defaultValue: T, environment: string = 'production'): T {
    const config = this.configs.get(`${environment}:${key}`);
    return config ? (config.value as T) : defaultValue;
  }

  /**
   * Get all configs
   */
  getAll(environment: string = 'production'): RemoteConfig[] {
    const prefix = `${environment}:`;
    return Array.from(this.configs.values()).filter(c => this.configs.get(`${environment}:${c.key}`));
  }

  /**
   * Watch config key for changes
   */
  watch(key: string, callback: (value: any) => void): () => void {
    if (!this.watchers.has(key)) {
      this.watchers.set(key, []);
    }

    this.watchers.get(key)!.push(callback);

    return () => {
      const callbacks = this.watchers.get(key);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }
}

// ==================== GRADUAL ROLLOUT ====================

export class GradualRollout {
  private rollouts = new Map<string, { flagId: string; current: number; target: number; step: number; interval: NodeJS.Timeout | null; paused: boolean }>();
  private rolloutId = 0;

  /**
   * Create gradual rollout
   */
  createRollout(flagId: string, targetPct: number, stepPct: number, intervalMs: number): string {
    const id = 'rollout-' + this.rolloutId++;

    const rollout = {
      flagId,
      current: 0,
      target: Math.min(100, Math.max(0, targetPct)),
      step: Math.min(targetPct, stepPct),
      interval: null,
      paused: false
    };

    this.rollouts.set(id, rollout);

    // Start rolling out
    rollout.interval = setInterval(() => {
      if (!rollout.paused && rollout.current < rollout.target) {
        rollout.current = Math.min(rollout.target, rollout.current + rollout.step);
        logger.debug('Gradual rollout progressing', { rolloutId: id, current: rollout.current });
      }
    }, intervalMs);

    return id;
  }

  /**
   * Pause rollout
   */
  pauseRollout(rolloutId: string): void {
    const rollout = this.rollouts.get(rolloutId);
    if (rollout) {
      rollout.paused = true;
    }
  }

  /**
   * Cancel rollout
   */
  cancelRollout(rolloutId: string): void {
    const rollout = this.rollouts.get(rolloutId);
    if (rollout && rollout.interval) {
      clearInterval(rollout.interval);
    }

    this.rollouts.delete(rolloutId);
  }

  /**
   * Get rollout status
   */
  getRolloutStatus(rolloutId: string): { current: number; target: number; paused: boolean } | null {
    const rollout = this.rollouts.get(rolloutId);
    return rollout ? { current: rollout.current, target: rollout.target, paused: rollout.paused } : null;
  }
}

// ==================== EXPORTS ====================

export const featureFlagManager = new FeatureFlagManager();
export const remoteConfigManager = new RemoteConfigManager();
export const gradualRollout = new GradualRollout();
