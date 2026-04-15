/**
 * Phase 174: Real-time Personalization
 * Personalization engine, user context, content variant selection, caching
 */

import { logger } from './logger';

interface UserContext {
  userId: string;
  sessionId: string;
  segments: string[];
  preferences: Record<string, any>;
  recentEvents: Array<{ event: string; timestamp: number; data: Record<string, any> }>;
  updatedAt: number;
}

interface ContentVariant {
  variantId: string;
  contentId: string;
  name: string;
  targetSegments: string[];
  content: Record<string, any>;
  priority: number;
}

interface PersonalizationDecision {
  decisionId: string;
  userId: string;
  contentId: string;
  variantId: string;
  score: number;
  reasoning: string;
  decidedAt: number;
}

class PersonalizationEngine {
  private counter = 0;

  personalize(userId: string, contentId: string, context: UserContext, variants: ContentVariant[]): PersonalizationDecision {
    const decisionId = `decision-${Date.now()}-${++this.counter}`;

    // Score variants against user context
    const scored = variants.map(v => ({
      variant: v,
      score: this.scoreVariant(v, context)
    })).sort((a, b) => b.score - a.score);

    const best = scored[0] || { variant: variants[0], score: 0 };

    const decision: PersonalizationDecision = {
      decisionId,
      userId,
      contentId,
      variantId: best.variant?.variantId || 'default',
      score: best.score,
      reasoning: `Matched ${best.variant?.targetSegments?.filter(s => context.segments.includes(s)).length || 0} segments`,
      decidedAt: Date.now()
    };

    logger.debug('Personalization decision made', {
      decisionId,
      userId,
      contentId,
      variantId: decision.variantId,
      score: decision.score.toFixed(2)
    });

    return decision;
  }

  private scoreVariant(variant: ContentVariant, context: UserContext): number {
    const segmentMatches = variant.targetSegments.filter(s => context.segments.includes(s)).length;
    const segmentScore = variant.targetSegments.length > 0
      ? (segmentMatches / variant.targetSegments.length) * 70
      : 50;
    const priorityScore = (variant.priority / 10) * 30;
    return segmentScore + priorityScore;
  }

  batchPersonalize(userId: string, contentIds: string[], context: UserContext, variantMap: Record<string, ContentVariant[]>): PersonalizationDecision[] {
    return contentIds.map(contentId =>
      this.personalize(userId, contentId, context, variantMap[contentId] || [])
    );
  }
}

class UserContextManager {
  private contexts: Map<string, UserContext> = new Map();

  createContext(userId: string, sessionId: string, segments: string[] = [], preferences: Record<string, any> = {}): UserContext {
    const context: UserContext = {
      userId,
      sessionId,
      segments,
      preferences,
      recentEvents: [],
      updatedAt: Date.now()
    };
    this.contexts.set(userId, context);
    logger.debug('User context created', { userId, segments: segments.length });
    return context;
  }

  updateContext(userId: string, update: Partial<Pick<UserContext, 'segments' | 'preferences'>>): UserContext | undefined {
    const ctx = this.contexts.get(userId);
    if (ctx) {
      if (update.segments) ctx.segments = [...new Set([...ctx.segments, ...update.segments])];
      if (update.preferences) ctx.preferences = { ...ctx.preferences, ...update.preferences };
      ctx.updatedAt = Date.now();
      return ctx;
    }
    return undefined;
  }

  recordEvent(userId: string, event: string, data: Record<string, any> = {}): void {
    const ctx = this.contexts.get(userId);
    if (ctx) {
      ctx.recentEvents.push({ event, timestamp: Date.now(), data });
      if (ctx.recentEvents.length > 50) ctx.recentEvents.shift(); // Keep last 50
      ctx.updatedAt = Date.now();
    }
  }

  getContext(userId: string): UserContext | undefined {
    return this.contexts.get(userId);
  }

  getContextsBySegment(segment: string): UserContext[] {
    return Array.from(this.contexts.values()).filter(c => c.segments.includes(segment));
  }
}

class ContentVariantSelector {
  private variants: Map<string, ContentVariant[]> = new Map();
  private counter = 0;

  registerVariant(contentId: string, name: string, targetSegments: string[], content: Record<string, any>, priority: number = 5): ContentVariant {
    const variantId = `variant-${Date.now()}-${++this.counter}`;
    const variant: ContentVariant = { variantId, contentId, name, targetSegments, content, priority };

    const existing = this.variants.get(contentId) || [];
    existing.push(variant);
    this.variants.set(contentId, existing);

    logger.debug('Content variant registered', { variantId, contentId, name });
    return variant;
  }

  selectBestVariant(contentId: string, userSegments: string[]): ContentVariant | undefined {
    const variants = this.variants.get(contentId) || [];
    if (variants.length === 0) return undefined;

    return variants
      .map(v => ({
        variant: v,
        score: v.targetSegments.filter(s => userSegments.includes(s)).length * 10 + v.priority
      }))
      .sort((a, b) => b.score - a.score)[0]?.variant;
  }

  getVariantsForContent(contentId: string): ContentVariant[] {
    return this.variants.get(contentId) || [];
  }

  listAllVariants(): ContentVariant[] {
    return Array.from(this.variants.values()).flat();
  }
}

class PersonalizationCache {
  private cache: Map<string, { decision: PersonalizationDecision; cachedAt: number }> = new Map();
  private ttlMs = 5 * 60 * 1000; // 5 minutes

  set(userId: string, contentId: string, decision: PersonalizationDecision): void {
    this.cache.set(`${userId}:${contentId}`, { decision, cachedAt: Date.now() });
  }

  get(userId: string, contentId: string): PersonalizationDecision | null {
    const entry = this.cache.get(`${userId}:${contentId}`);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > this.ttlMs) {
      this.cache.delete(`${userId}:${contentId}`);
      return null;
    }
    return entry.decision;
  }

  invalidateUser(userId: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) { this.cache.delete(key); count++; }
    }
    return count;
  }

  getStats(): { size: number; ttlMs: number } {
    return { size: this.cache.size, ttlMs: this.ttlMs };
  }
}

export const personalizationEngine = new PersonalizationEngine();
export const userContextManager = new UserContextManager();
export const contentVariantSelector = new ContentVariantSelector();
export const personalizationCache = new PersonalizationCache();

export { UserContext, ContentVariant, PersonalizationDecision };
