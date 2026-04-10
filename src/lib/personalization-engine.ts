/**
 * Phase 24: Smart Content Personalization
 * User context building, content variant selection, A/B testing
 */

import { deterministicNumber } from './deterministic';
import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface UserSignals {
  timeOfDay: number; // 0-23
  deviceType: string; // 'mobile', 'tablet', 'desktop'
  visitCount: number;
  lastVisit: number; // timestamp
  preferredCategories: string[];
  location?: string;
}

export interface UserContext {
  userId: string;
  signals: UserSignals;
  segment: string;
  engagementLevel: 'low' | 'medium' | 'high';
}

export interface ContentVariant {
  id: string;
  content: string;
  targetSegments?: string[];
  weight: number; // 0-1
}

export interface ExperimentConfig {
  id: string;
  name: string;
  variants: string[];
  trafficSplit: number; // 0-1
  createdAt?: number;
}

export interface ExperimentResults {
  experimentId: string;
  variants: Record<string, { conversions: number; impressions: number; rate: number }>;
}

interface ContentSelection {
  contentId: string;
  variantId: string;
  userId: string;
  timestamp: number;
  engaged: boolean;
}

interface ExperimentAssignment {
  experimentId: string;
  userId: string;
  variant: string;
  assignedAt: number;
}

// ==================== USER CONTEXT BUILDER ====================

export class UserContextBuilder {
  private contexts = new Map<string, UserContext>();

  /**
   * Build user context from signals
   */
  buildContext(userId: string, signals: UserSignals): UserContext {
    const segment = this.determineSegment(signals);
    const engagementLevel = this.calculateEngagementLevel(signals);

    const context: UserContext = {
      userId,
      signals,
      segment,
      engagementLevel
    };

    this.contexts.set(userId, context);
    return context;
  }

  /**
   * Update user signals
   */
  updateSignals(userId: string, signals: Partial<UserSignals>): void {
    const context = this.contexts.get(userId);
    if (context) {
      context.signals = { ...context.signals, ...signals };
      context.segment = this.determineSegment(context.signals);
      context.engagementLevel = this.calculateEngagementLevel(context.signals);
      logger.debug('User signals updated', { userId, segment: context.segment });
    }
  }

  /**
   * Get user context
   */
  getContext(userId: string): UserContext | null {
    return this.contexts.get(userId) || null;
  }

  /**
   * Determine segment based on signals
   */
  private determineSegment(signals: UserSignals): string {
    if (signals.visitCount > 100) return 'power-user';
    if (signals.visitCount > 20) return 'regular';
    if (signals.visitCount > 5) return 'casual';
    return 'new';
  }

  /**
   * Calculate engagement level
   */
  private calculateEngagementLevel(signals: UserSignals): 'low' | 'medium' | 'high' {
    const daysSinceLastVisit = (Date.now() - signals.lastVisit) / (1000 * 60 * 60 * 24);

    if (daysSinceLastVisit > 30) return 'low';
    if (daysSinceLastVisit > 7) return 'medium';
    return 'high';
  }
}

// ==================== CONTENT PERSONALIZER ====================

export class ContentPersonalizer {
  private content = new Map<string, ContentVariant[]>();
  private selections: ContentSelection[] = [];
  private readonly maxHistory = 10000;

  /**
   * Register content variants
   */
  registerContent(contentId: string, variants: ContentVariant[]): void {
    this.content.set(contentId, variants);
    logger.debug('Content registered', { contentId, variants: variants.length });
  }

  /**
   * Select best variant for user
   */
  selectVariant(contentId: string, context: UserContext): ContentVariant {
    const variants = this.content.get(contentId) || [];

    // Filter variants by segment if specified
    const applicable = variants.filter(v => {
      if (!v.targetSegments || v.targetSegments.length === 0) return true;
      return v.targetSegments.includes(context.segment);
    });

    if (applicable.length === 0) {
      return variants[0] || { id: 'default', content: '', weight: 1 };
    }

    // Weighted deterministic selection
    const totalWeight = applicable.reduce((sum, v) => sum + v.weight, 0);
    let selectionWeight = deterministicNumber(
      `content-selection:${contentId}:${context.userId}:${context.segment}:${context.signals.visitCount}`,
      0,
      totalWeight,
      6
    );

    for (const variant of applicable) {
      selectionWeight -= variant.weight;
      if (selectionWeight <= 0) return variant;
    }

    return applicable[applicable.length - 1];
  }

  /**
   * Record content selection
   */
  recordSelection(contentId: string, variantId: string, userId: string): void {
    this.selections.push({
      contentId,
      variantId,
      userId,
      timestamp: Date.now(),
      engaged: false
    });

    if (this.selections.length > this.maxHistory) {
      this.selections.shift();
    }
  }

  /**
   * Record engagement
   */
  recordEngagement(contentId: string, variantId: string, userId: string): void {
    const selection = this.selections.findLast(
      s => s.contentId === contentId && s.variantId === variantId && s.userId === userId
    );
    if (selection) {
      selection.engaged = true;
    }
  }

  /**
   * Get performance stats
   */
  getPerformanceStats(contentId: string): Record<string, { shown: number; engaged: number; rate: number }> {
    const stats: Record<string, { shown: number; engaged: number; rate: number }> = {};

    const selections = this.selections.filter(s => s.contentId === contentId);

    for (const selection of selections) {
      if (!stats[selection.variantId]) {
        stats[selection.variantId] = { shown: 0, engaged: 0, rate: 0 };
      }
      stats[selection.variantId].shown++;
      if (selection.engaged) {
        stats[selection.variantId].engaged++;
      }
    }

    // Calculate engagement rates
    for (const variant in stats) {
      const data = stats[variant];
      data.rate = data.shown > 0 ? (data.engaged / data.shown) * 100 : 0;
    }

    return stats;
  }
}

// ==================== EXPERIMENT MANAGER ====================

export class ExperimentManager {
  private experiments = new Map<string, ExperimentConfig>();
  private assignments: ExperimentAssignment[] = [];

  /**
   * Create experiment
   */
  createExperiment(config: ExperimentConfig): ExperimentConfig & { createdAt: number } {
    const experiment = { ...config, createdAt: Date.now() };
    this.experiments.set(config.id, experiment);
    logger.info('Experiment created', { id: config.id, name: config.name, variants: config.variants.length });
    return experiment;
  }

  /**
   * Assign variant to user (deterministic)
   */
  assignVariant(experimentId: string, userId: string): string {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    // Check if already assigned
    const existing = this.assignments.find(a => a.experimentId === experimentId && a.userId === userId);
    if (existing) {
      return existing.variant;
    }

    // Deterministic hash-based assignment
    const hash = this.hashCode(`${experimentId}-${userId}`) % 100;
    const threshold = Math.floor(experiment.trafficSplit * 100);

    let variant: string;
    if (hash < threshold) {
      // Assign to variant based on hash
      const variantIndex = hash % experiment.variants.length;
      variant = experiment.variants[variantIndex];
    } else {
      // Control group (first variant)
      variant = experiment.variants[0];
    }

    this.assignments.push({
      experimentId,
      userId,
      variant,
      assignedAt: Date.now()
    });

    return variant;
  }

  /**
   * Record conversion
   */
  recordConversion(experimentId: string, userId: string, variant: string): void {
    // Could emit event or log to analytics
    logger.debug('Conversion recorded', { experimentId, userId, variant });
  }

  /**
   * Get experiment results
   */
  getResults(experimentId: string): ExperimentResults {
    const assignments = this.assignments.filter(a => a.experimentId === experimentId);
    const variants: Record<string, { conversions: number; impressions: number; rate: number }> = {};

    for (const assignment of assignments) {
      if (!variants[assignment.variant]) {
        variants[assignment.variant] = { conversions: 0, impressions: 0, rate: 0 };
      }
      variants[assignment.variant].impressions++;
    }

    // Calculate rates
    for (const variant in variants) {
      const data = variants[variant];
      data.rate = data.impressions > 0 ? (data.conversions / data.impressions) * 100 : 0;
    }

    return { experimentId, variants };
  }

  /**
   * Simple hash function
   */
  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

// ==================== EXPORTS ====================

export const userContextBuilder = new UserContextBuilder();
export const contentPersonalizer = new ContentPersonalizer();
export const experimentManager = new ExperimentManager();
