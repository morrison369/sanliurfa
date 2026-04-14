/**
 * Event Store with Versioning and Recovery
 * Event sourcing storage, versioning, and point-in-time recovery
 */

import { query, queryOne, insert } from '../postgres';
import { logger } from '../logger';

interface Event {
  id: string;
  aggregateId: string;
  aggregateType: string;
  type: string;
  payload: Record<string, any>;
  version: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface EventVersion {
  version: number;
  events: Event[];
  createdAt: number;
  description?: string;
}

interface EventSnapshot {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: Record<string, any>;
  timestamp: number;
}

interface RecoveryPoint {
  timestamp: number;
  eventCount: number;
  description: string;
}

class EventStore {
  private events: Event[] = [];
  private counter = 0;

  async append(event: Omit<Event, 'id' | 'timestamp'>): Promise<Event> {
    const newEvent: Event = {
      ...event,
      id: `evt-${++this.counter}`,
      timestamp: Date.now()
    };
    this.events.push(newEvent);

    try {
      await insert('events', {
        id: newEvent.id,
        aggregate_id: event.aggregateId,
        aggregate_type: event.aggregateType,
        type: event.type,
        payload: JSON.stringify(event.payload),
        version: event.version,
        timestamp: new Date(newEvent.timestamp)
      });
    } catch (error) {
      logger.error('Failed to persist event', error instanceof Error ? error : new Error(String(error)));
    }

    return newEvent;
  }

  async getEvents(aggregateId: string, fromVersion?: number): Promise<Event[]> {
    return this.events
      .filter(e => e.aggregateId === aggregateId && (!fromVersion || e.version >= fromVersion))
      .sort((a, b) => a.version - b.version);
  }

  async getAllEvents(afterTimestamp?: number): Promise<Event[]> {
    return this.events
      .filter(e => !afterTimestamp || e.timestamp > afterTimestamp)
      .sort((a, b) => a.timestamp - b.timestamp);
  }
}

class EventVersionManager {
  private versions: Map<string, EventVersion> = new Map();

  createVersion(events: Event[], description?: string): EventVersion {
    return {
      version: Date.now(),
      events: [...events],
      createdAt: Date.now(),
      description
    };
  }

  saveVersion(key: string, version: EventVersion): void {
    this.versions.set(key, version);
  }

  getVersion(key: string): EventVersion | undefined {
    return this.versions.get(key);
  }

  listVersions(): string[] {
    return Array.from(this.versions.keys());
  }
}

class EventSnapshotManager {
  private snapshots: Map<string, EventSnapshot> = new Map();

  createSnapshot(aggregateId: string, aggregateType: string, events: Event[]): EventSnapshot {
    const state = events.reduce((acc, event) => {
      return { ...acc, ...event.payload };
    }, {});

    return {
      aggregateId,
      aggregateType,
      version: events.length,
      state,
      timestamp: Date.now()
    };
  }

  saveSnapshot(snapshot: EventSnapshot): void {
    this.snapshots.set(`${snapshot.aggregateType}:${snapshot.aggregateId}`, snapshot);
  }

  getSnapshot(aggregateId: string, aggregateType: string): EventSnapshot | undefined {
    return this.snapshots.get(`${aggregateType}:${aggregateId}`);
  }
}

class EventRecovery {
  async recoverToPoint(
    aggregateId: string,
    targetTimestamp: number,
    events: Event[]
  ): Promise<{ success: boolean; recoveredState?: Record<string, any>; eventsApplied: number }> {
    const applicableEvents = events
      .filter(e => e.aggregateId === aggregateId && e.timestamp <= targetTimestamp)
      .sort((a, b) => a.version - b.version);

    const state = applicableEvents.reduce((acc, event) => {
      return { ...acc, ...event.payload };
    }, {});

    return {
      success: true,
      recoveredState: state,
      eventsApplied: applicableEvents.length
    };
  }

  async createRecoveryPoint(description: string): Promise<RecoveryPoint> {
    return {
      timestamp: Date.now(),
      eventCount: 0,
      description
    };
  }
}

export const eventStore = new EventStore();
export const eventVersionManager = new EventVersionManager();
export const eventSnapshot = new EventSnapshotManager();
export const eventRecovery = new EventRecovery();

export type { Event, EventVersion, EventSnapshot as EventSnapshotType, RecoveryPoint };
