/**
 * Event Sourcing Architecture
 * Task 142: Event Store & CQRS Event Sourcing
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export interface DomainEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  type: string;
  version: number;
  payload: any;
  metadata: {
    userId?: string;
    ip?: string;
    userAgent?: string;
    correlationId?: string;
    causationId?: string;
  };
  timestamp: Date;
}

export interface Aggregate {
  id: string;
  type: string;
  version: number;
  state: any;
  pendingEvents: DomainEvent[];
}

// Event store
const eventStore: Map<string, DomainEvent[]> = new Map();

/**
 * Append event to store
 */
export async function appendEvent(event: DomainEvent): Promise<void> {
  const key = `${event.aggregateType}:${event.aggregateId}`;
  
  if (!eventStore.has(key)) {
    eventStore.set(key, []);
  }

  const events = eventStore.get(key)!;
  
  // Optimistic concurrency check
  const expectedVersion = events.length;
  if (event.version !== expectedVersion + 1) {
    throw new Error(`Concurrency conflict. Expected version ${expectedVersion}, got ${event.version}`);
  }

  events.push(event);

  // Persist to database
  await db.execute(sql`
    INSERT INTO events (id, aggregate_id, aggregate_type, type, version, payload, metadata, timestamp)
    VALUES (${event.id}, ${event.aggregateId}, ${event.aggregateType}, ${event.type}, ${event.version}, ${JSON.stringify(event.payload)}, ${JSON.stringify(event.metadata)}, ${event.timestamp})
  `);

  // Publish to event bus
  await publishEvent(event);
}

/**
 * Get events for aggregate
 */
export async function getEvents(
  aggregateType: string,
  aggregateId: string,
  fromVersion?: number
): Promise<DomainEvent[]> {
  const result = await db.execute(sql`
    SELECT * FROM events 
    WHERE aggregate_type = ${aggregateType} AND aggregate_id = ${aggregateId}
    ${fromVersion ? sql`AND version >= ${fromVersion}` : sql``}
    ORDER BY version ASC
  `);

  return result.rows.map(mapEventFromRow);
}

/**
 * Rehydrate aggregate from events
 */
export async function rehydrateAggregate<T>(
  aggregateType: string,
  aggregateId: string,
  applyEvent: (state: T, event: DomainEvent) => T,
  initialState: T
): Promise<Aggregate> {
  const events = await getEvents(aggregateType, aggregateId);
  
  let state = initialState;
  let version = 0;

  for (const event of events) {
    state = applyEvent(state, event);
    version = event.version;
  }

  return {
    id: aggregateId,
    type: aggregateType,
    version,
    state,
    pendingEvents: [],
  };
}

/**
 * Snapshot for performance
 */
export async function saveSnapshot(aggregate: Aggregate): Promise<void> {
  await db.execute(sql`
    INSERT INTO snapshots (aggregate_id, aggregate_type, version, state, created_at)
    VALUES (${aggregate.id}, ${aggregate.type}, ${aggregate.version}, ${JSON.stringify(aggregate.state)}, ${new Date()})
    ON CONFLICT (aggregate_id) DO UPDATE SET
      version = EXCLUDED.version,
      state = EXCLUDED.state,
      created_at = EXCLUDED.created_at
  `);
}

/**
 * Get aggregate from snapshot
 */
export async function getFromSnapshot<T>(
  aggregateType: string,
  aggregateId: string,
  applyEvent: (state: T, event: DomainEvent) => T
): Promise<Aggregate | null> {
  const snapshot = await db.execute(sql`
    SELECT * FROM snapshots 
    WHERE aggregate_id = ${aggregateId} AND aggregate_type = ${aggregateType}
  `);

  if (!snapshot.rows[0]) return null;

  const version = parseInt(snapshot.rows[0].version);
  let state = JSON.parse(snapshot.rows[0].state);

  // Get events after snapshot
  const events = await getEvents(aggregateType, aggregateId, version + 1);
  
  for (const event of events) {
    state = applyEvent(state, event);
  }

  return {
    id: aggregateId,
    type: aggregateType,
    version: version + events.length,
    state,
    pendingEvents: [],
  };
}

/**
 * Event projections (read models)
 */
export async function createProjection(
  name: string,
  eventTypes: string[],
  handler: (event: DomainEvent) => Promise<void>
): Promise<void> {
  await db.execute(sql`
    INSERT INTO projections (name, event_types, position, created_at)
    VALUES (${name}, ${JSON.stringify(eventTypes)}, 0, ${new Date()})
    ON CONFLICT (name) DO NOTHING
  `);
}

/**
 * Replay events for projection
 */
export async function replayProjection(
  projectionName: string,
  handler: (event: DomainEvent) => Promise<void>
): Promise<void> {
  const projection = await db.execute(sql`
    SELECT * FROM projections WHERE name = ${projectionName}
  `);

  if (!projection.rows[0]) return;

  const eventTypes = JSON.parse(projection.rows[0].event_types);
  const fromPosition = parseInt(projection.rows[0].position);

  const events = await db.execute(sql`
    SELECT * FROM events 
    WHERE type = ANY(${eventTypes})
    AND id > ${fromPosition}
    ORDER BY timestamp ASC
  `);

  for (const row of events.rows) {
    await handler(mapEventFromRow(row));
  }

  // Update position
  if (events.rows.length > 0) {
    const lastPosition = events.rows[events.rows.length - 1].id;
    await db.execute(sql`
      UPDATE projections SET position = ${lastPosition} WHERE name = ${projectionName}
    `);
  }
}

async function publishEvent(event: DomainEvent): Promise<void> {
  // Publish to message bus
  console.log(`[EventStore] Published: ${event.type}`);
}

function mapEventFromRow(row: any): DomainEvent {
  return {
    id: row.id,
    aggregateId: row.aggregate_id,
    aggregateType: row.aggregate_type,
    type: row.type,
    version: parseInt(row.version),
    payload: JSON.parse(row.payload),
    metadata: JSON.parse(row.metadata),
    timestamp: new Date(row.timestamp),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
