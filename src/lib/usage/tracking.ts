/**
 * Usage Tracking Module
 * Stub for tracking feature usage
 */

export interface UsageEvent {
  userId: string;
  feature: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class UsageTracker {
  private events: UsageEvent[] = [];

  track(userId: string, feature: string, metadata?: Record<string, any>): void {
    this.events.push({
      userId,
      feature,
      timestamp: new Date(),
      ...(metadata ? { metadata } : {}),
    });
  }

  getUsage(userId: string, feature?: string): number {
    return this.events.filter(e => 
      e.userId === userId && 
      (!feature || e.feature === feature)
    ).length;
  }

  getStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.events.forEach(e => {
      stats[e.feature] = (stats[e.feature] || 0) + 1;
    });
    return stats;
  }
}

export const usageTracker = new UsageTracker();
export default usageTracker;
