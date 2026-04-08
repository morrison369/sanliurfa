/**
 * Phase 131: Event Store & Event Sourcing
 * Immutable event log with append-only storage, versioning, and point-in-time recovery
 */

import { logger } from './logger';
import { redis } from './cache';

interface Event {
  id: string;
  aggregateId: string;
  aggregateType: string;
  type: string;
  data: Record<string, any>;
  metadata: {
    timestamp: number;
    version: number;
    correlationId?: string;
    causationId?: string;
    userId?: string;
  };
  createdAt: number;
}

interface EventVersion {
  schemaVersion: number;
  type: string;
  timestamp: number;
  transformations: Array<{ from: number; to: number; transform: (data: any) => any }>;
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

  append(config: {
    aggregateId: string;
    aggregateType: string;
    type: string;
    data: Record<string, any>;
    metadata: {
      version: number;
      correlationId?: string;
      causationId?: string;
      userId?: string;
    };
  }): string {
    const id = `evt-${Date.now()}-${++this.counter}`;
    const event: Event = {
      id,
      aggregateId: config.aggregateId,
      aggregateType: config.aggregateType,
      type: config.type,
      data: config.data,
      metadata: {
        timestamp: Date.now(),
        version: config.metadata.version,
        correlationId: config.metadata.correlationId,
        causationId: config.metadata.causationId,
        userId: config.metadata.userId
      },
      createdAt: Date.now()
    };

    this.events.push(event);

    const cacheKey = `sanliurfa:event:${id}`;
    redis.setex(cacheKey, 604800, JSON.stringify(event)); // 7 days

    logger.info('Event appended', {
      id,
      aggregate: config.aggregateId,
      type: config.type,
      version: config.metadata.version
    });

    return id;
  }

  getAggregateEvents(aggregateId: string, fromVersion: number = 0): Event[] {
    return this.events.filter(e =>
      e.aggregateId === aggregateId && e.metadata.version > fromVersion
    );
  }

  getEventsByType(type: string, limit: number = 100): Event[] {
    return this.events
      .filter(e => e.type === type)
      .slice(-limit);
  }

  getEventsBetween(startTime: number, endTime: number): Event[] {
    return this.events.filter(e =>
      e.metadata.timestamp >= startTime && e.metadata.timestamp <= endTime
    );
  }

  getEvent(eventId: string): Event | undefined {
    return this.events.find(e => e.id === eventId);
  }

  getEventsByCorrelation(correlationId: string): Event[] {
    return this.events.filter(e => e.metadata.correlationId === correlationId);
  }

  getEventCount(): number {
    return this.events.length;
  }

  getEventStats(): {
    totalEvents: number;
    byType: Record<string, number>;
    byAggregate: Record<string, number>;
    dateRange: { oldest: number; newest: number };
  } {
    const byType: Record<string, number> = {};
    const byAggregate: Record<string, number> = {};

    for (const event of this.events) {
      byType[event.type] = (byType[event.type] || 0) + 1;
      byAggregate[event.aggregateId] = (byAggregate[event.aggregateId] || 0) + 1;
    }

    const timestamps = this.events.map(e => e.metadata.timestamp);
    const oldest = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newest = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    return {
      totalEvents: this.events.length,
      byType,
      byAggregate,
      dateRange: { oldest, newest }
    };
  }
}

class EventVersionManager {
  private versions: EventVersion[] = [];

  registerVersion(schemaVersion: number, type: string): void {
    const version: EventVersion = {
      schemaVersion,
      type,
      timestamp: Date.now(),
      transformations: []
    };

    this.versions.push(version);
    logger.debug('Event version registered', { schemaVersion, type });
  }

  addTransformation(
    type: string,
    fromVersion: number,
    toVersion: number,
    transform: (data: any) => any
  ): void {
    const version = this.versions.find(v => v.type === type && v.schemaVersion === toVersion);
    if (version) {
      version.transformations.push({ from: fromVersion, to: toVersion, transform });
      logger.debug('Transformation added', { type, fromVersion, toVersion });
    }
  }

  transformEvent(event: Event, targetVersion: number): Record<string, any> {
    let data = event.data;

    const relevant = this.versions.filter(v => v.type === event.type && v.schemaVersion >= event.metadata.version);
    for (const version of relevant) {
      for (const transformation of version.transformations) {
        if (transformation.from === event.metadata.version && transformation.to <= targetVersion) {
          data = transformation.transform(data);
        }
      }
    }

    return data;
  }

  getVersionInfo(type: string): EventVersion[] {
    return this.versions.filter(v => v.type === type);
  }
}

class EventSnapshot {
  private snapshots: Map<string, EventSnapshot> = new Map();
  private counter = 0;

  createSnapshot(
    aggregateId: string,
    aggregateType: string,
    version: number,
    state: Record<string, any>
  ): EventSnapshot {
    const snapshot: EventSnapshot = {
      aggregateId,
      aggregateType,
      version,
      state,
      timestamp: Date.now()
    };

    const snapshotId = `${aggregateId}-v${version}`;
    this.snapshots.set(snapshotId, snapshot);

    const cacheKey = `sanliurfa:snapshot:${snapshotId}`;
    redis.setex(cacheKey, 2592000, JSON.stringify(snapshot)); // 30 days

    logger.debug('Snapshot created', { aggregateId, version });
    return snapshot;
  }

  getLatestSnapshot(aggregateId: string): EventSnapshot | undefined {
    const snapshots = Array.from(this.snapshots.values())
      .filter(s => s.aggregateId === aggregateId)
      .sort((a, b) => b.version - a.version);

    return snapshots[0];
  }

  deleteOldSnapshots(aggregateId: string, keepVersions: number = 5): void {
    const snapshots = Array.from(this.snapshots.entries())
      .filter(([, s]) => s.aggregateId === aggregateId)
      .sort((a, b) => b[1].version - a[1].version)
      .slice(keepVersions);

    for (const [key] of snapshots) {
      this.snapshots.delete(key);
      redis.del(`sanliurfa:snapshot:${key}`);
    }

    logger.debug('Old snapshots deleted', { aggregateId, deleted: snapshots.length });
  }

  getSnapshotCount(): number {
    return this.snapshots.size;
  }
}

class EventRecovery {
  private recoveryPoints: RecoveryPoint[] = [];
  private counter = 0;

  createRecoveryPoint(eventStore: EventStore, description: string): RecoveryPoint {
    const point: RecoveryPoint = {
      timestamp: Date.now(),
      eventCount: eventStore.getEventCount(),
      description
    };

    this.recoveryPoints.push(point);
    logger.info('Recovery point created', { description, eventCount: point.eventCount });

    return point;
  }

  getRecoveryPoints(): RecoveryPoint[] {
    return [...this.recoveryPoints];
  }

  recoverToPoint(timestamp: number, eventStore: EventStore): Event[] {
    const events = eventStore.getEventsBetween(0, timestamp);
    logger.info('Recovery initiated', { timestamp, eventCount: events.length });
    return events;
  }

  getLatestRecoveryPoint(): RecoveryPoint | undefined {
    return this.recoveryPoints.length > 0
      ? this.recoveryPoints[this.recoveryPoints.length - 1]
      : undefined;
  }

  listRecoveryPoints(limit: number = 20): RecoveryPoint[] {
    return this.recoveryPoints.slice(-limit);
  }
}

export const eventStore = new EventStore();
export const eventVersionManager = new EventVersionManager();
export const eventSnapshot = new EventSnapshot();
export const eventRecovery = new EventRecovery();

export { Event, EventVersion, EventSnapshot as EventSnapshotType, RecoveryPoint };
