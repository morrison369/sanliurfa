/**
 * Phase 177: UX Analytics
 * Session analysis, interaction heatmap, funnel analysis, UX quality scoring
 */

import { logger } from './logger';

interface UserSession {
  sessionId: string;
  userId: string;
  startedAt: number;
  endedAt?: number;
  pageViews: number;
  interactions: number;
  device: 'mobile' | 'tablet' | 'desktop';
  entryPage: string;
  exitPage?: string;
  bounced: boolean;
}

interface InteractionEvent {
  sessionId: string;
  pageId: string;
  elementId: string;
  x: number;
  y: number;
  type: 'click' | 'hover' | 'scroll' | 'focus';
  timestamp: number;
}

interface FunnelStep {
  stepId: string;
  name: string;
  pageId: string;
  completedCount: number;
  dropoffCount: number;
  conversionRate: number;
}

class UserSessionAnalyzer {
  private sessions: Map<string, UserSession> = new Map();
  private counter = 0;

  startSession(userId: string, device: 'mobile' | 'tablet' | 'desktop', entryPage: string): UserSession {
    const sessionId = `session-${Date.now()}-${++this.counter}`;
    const session: UserSession = {
      sessionId, userId, startedAt: Date.now(),
      pageViews: 1, interactions: 0, device, entryPage, bounced: true
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  recordPageView(sessionId: string, pageId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.pageViews++;
      session.bounced = false;
      session.exitPage = pageId;
    }
  }

  recordInteraction(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) session.interactions++;
  }

  endSession(sessionId: string): UserSession | undefined {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.endedAt = Date.now();
      return session;
    }
    return undefined;
  }

  getSessionMetrics(): { avgDurationMs: number; avgPageViews: number; bounceRate: number } {
    const sessions = Array.from(this.sessions.values());
    const ended = sessions.filter(s => s.endedAt);

    const avgDurationMs = ended.length > 0
      ? ended.reduce((sum, s) => sum + (s.endedAt! - s.startedAt), 0) / ended.length
      : 0;

    const avgPageViews = sessions.length > 0
      ? sessions.reduce((sum, s) => sum + s.pageViews, 0) / sessions.length
      : 0;

    const bounceRate = sessions.length > 0
      ? (sessions.filter(s => s.bounced).length / sessions.length) * 100
      : 0;

    return { avgDurationMs, avgPageViews, bounceRate };
  }

  getSession(sessionId: string): UserSession | undefined {
    return this.sessions.get(sessionId);
  }
}

class HeatmapTracker {
  private events: InteractionEvent[] = [];

  record(sessionId: string, pageId: string, elementId: string, x: number, y: number, type: 'click' | 'hover' | 'scroll' | 'focus'): void {
    this.events.push({ sessionId, pageId, elementId, x, y, type, timestamp: Date.now() });
  }

  getHeatmapData(pageId: string, type?: string): Array<{ x: number; y: number; count: number }> {
    const filtered = this.events.filter(e => e.pageId === pageId && (!type || e.type === type));
    const grid: Record<string, { x: number; y: number; count: number }> = {};

    for (const event of filtered) {
      const key = `${Math.floor(event.x / 10) * 10},${Math.floor(event.y / 10) * 10}`;
      grid[key] = grid[key] || { x: Math.floor(event.x / 10) * 10, y: Math.floor(event.y / 10) * 10, count: 0 };
      grid[key].count++;
    }

    return Object.values(grid).sort((a, b) => b.count - a.count);
  }

  getTopElements(pageId: string, limit: number): Array<{ elementId: string; interactionCount: number }> {
    const counts: Record<string, number> = {};
    for (const event of this.events.filter(e => e.pageId === pageId)) {
      counts[event.elementId] = (counts[event.elementId] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([elementId, interactionCount]) => ({ elementId, interactionCount }))
      .sort((a, b) => b.interactionCount - a.interactionCount)
      .slice(0, limit);
  }

  getPageInteractionCount(pageId: string): number {
    return this.events.filter(e => e.pageId === pageId).length;
  }
}

class FunnelAnalyzer {
  private funnels: Map<string, FunnelStep[]> = new Map();
  private userProgress: Map<string, Map<string, Set<string>>> = new Map(); // funnelId -> stepId -> Set<userId>
  private counter = 0;

  defineFunnel(funnelId: string, steps: Array<{ name: string; pageId: string }>): FunnelStep[] {
    const funnelSteps: FunnelStep[] = steps.map(s => ({
      stepId: `step-${Date.now()}-${++this.counter}`,
      name: s.name,
      pageId: s.pageId,
      completedCount: 0,
      dropoffCount: 0,
      conversionRate: 0
    }));
    this.funnels.set(funnelId, funnelSteps);
    return funnelSteps;
  }

  recordStepCompletion(funnelId: string, stepId: string, userId: string): void {
    const step = this.funnels.get(funnelId)?.find(s => s.stepId === stepId);
    if (!step) return;

    const funnelProgress = this.userProgress.get(funnelId) || new Map();
    const stepUsers = funnelProgress.get(stepId) || new Set();
    stepUsers.add(userId);
    funnelProgress.set(stepId, stepUsers);
    this.userProgress.set(funnelId, funnelProgress);

    step.completedCount = stepUsers.size;
  }

  getFunnelMetrics(funnelId: string): FunnelStep[] {
    const steps = this.funnels.get(funnelId) || [];
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1];
      steps[i].dropoffCount = Math.max(0, prev.completedCount - steps[i].completedCount);
      steps[i].conversionRate = prev.completedCount > 0 ? (steps[i].completedCount / prev.completedCount) * 100 : 0;
    }
    if (steps.length > 0) steps[0].conversionRate = 100;
    return steps;
  }

  getOverallConversionRate(funnelId: string): number {
    const steps = this.funnels.get(funnelId) || [];
    if (steps.length < 2) return 0;
    const first = steps[0].completedCount;
    const last = steps[steps.length - 1].completedCount;
    return first > 0 ? (last / first) * 100 : 0;
  }
}

class UXQualityScorer {
  scoreUX(sessionMetrics: { avgDurationMs: number; avgPageViews: number; bounceRate: number }, contentEngagement: number, funnelConversionRate: number): { score: number; grade: 'A' | 'B' | 'C' | 'D' | 'F'; breakdown: Record<string, number> } {
    const durationScore = Math.min(100, (sessionMetrics.avgDurationMs / 1000 / 60) * 20); // 5min = 100
    const pageViewScore = Math.min(100, sessionMetrics.avgPageViews * 20);                // 5 pages = 100
    const bounceScore = Math.max(0, 100 - sessionMetrics.bounceRate);
    const engagementScore = contentEngagement;
    const conversionScore = funnelConversionRate;

    const overall = durationScore * 0.2 + pageViewScore * 0.2 + bounceScore * 0.2 + engagementScore * 0.2 + conversionScore * 0.2;
    const grade = overall >= 80 ? 'A' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : overall >= 50 ? 'D' : 'F';

    logger.debug('UX quality scored', { score: overall.toFixed(1), grade });

    return {
      score: overall,
      grade,
      breakdown: { durationScore, pageViewScore, bounceScore, engagementScore, conversionScore }
    };
  }
}

export const userSessionAnalyzer = new UserSessionAnalyzer();
export const heatmapTracker = new HeatmapTracker();
export const funnelAnalyzer = new FunnelAnalyzer();
export const uxQualityScorer = new UXQualityScorer();

export { UserSession, InteractionEvent, FunnelStep };
