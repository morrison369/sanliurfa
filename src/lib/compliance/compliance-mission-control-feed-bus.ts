/**
 * Phase 246: Compliance Mission Control Feed Bus
 */

import { logger } from '../logger';

export interface MissionFeedEvent {
  eventId: string;
  source: string;
  severity: number;
  payload: Record<string, unknown>;
}

class FeedBusIngestor {
  private events: MissionFeedEvent[] = [];

  ingest(event: MissionFeedEvent): MissionFeedEvent {
    this.events.push(event);
    return event;
  }

  list(): MissionFeedEvent[] {
    return this.events;
  }
}

class FeedBusPriorityRouter {
  route(event: MissionFeedEvent): 'critical' | 'standard' {
    return event.severity >= 80 ? 'critical' : 'standard';
  }
}

class FeedBusReplayService {
  replay(events: MissionFeedEvent[], limit: number): MissionFeedEvent[] {
    return [...events].slice(-limit);
  }
}

class FeedBusHealthMonitor {
  health(events: MissionFeedEvent[]): { count: number; avgSeverity: number } {
    const avgSeverity = events.length ? events.reduce((a, b) => a + b.severity, 0) / events.length : 0;
    logger.debug('Feed bus health computed', { count: events.length, avgSeverity });
    return { count: events.length, avgSeverity: Math.round(avgSeverity * 10) / 10 };
  }
}

export const feedBusIngestor = new FeedBusIngestor();
export const feedBusPriorityRouter = new FeedBusPriorityRouter();
export const feedBusReplayService = new FeedBusReplayService();
export const feedBusHealthMonitor = new FeedBusHealthMonitor();

export {
  FeedBusIngestor,
  FeedBusPriorityRouter,
  FeedBusReplayService,
  FeedBusHealthMonitor
};

