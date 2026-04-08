/**
 * Phase 25: Event Bus & Async Messaging
 * Pub/sub event system, message queue with DLQ, event replay
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface QueuedMessage<T> {
  id: string;
  payload: T;
  enqueuedAt: number;
  attempts: number;
  maxRetries: number;
}

export interface EventRecord {
  event: string;
  payload: any;
  timestamp: number;
}

type EventHandler<T> = (payload: T) => void | Promise<void>;

// ==================== EVENT BUS ====================

export class EventBus {
  private subscribers = new Map<string, Set<EventHandler<any>>>();
  private onceSubscribers = new Map<string, Set<EventHandler<any>>>();

  /**
   * Publish event
   */
  publish<T>(event: string, payload: T): void {
    // Fire synchronous subscribers
    const handlers = this.subscribers.get(event) || new Set();
    for (const handler of handlers) {
      try {
        const result = handler(payload);
        if (result instanceof Promise) {
          result.catch(err => {
            logger.error('Event handler failed', err instanceof Error ? err : new Error(String(err)), { event });
          });
        }
      } catch (err) {
        logger.error('Event handler error', err instanceof Error ? err : new Error(String(err)), { event });
      }
    }

    // Fire one-time subscribers
    const onceHandlers = this.onceSubscribers.get(event) || new Set();
    for (const handler of onceHandlers) {
      try {
        const result = handler(payload);
        if (result instanceof Promise) {
          result.catch(err => {
            logger.error('Once handler failed', err instanceof Error ? err : new Error(String(err)), { event });
          });
        }
      } catch (err) {
        logger.error('Once handler error', err instanceof Error ? err : new Error(String(err)), { event });
      }
    }

    // Remove one-time handlers
    this.onceSubscribers.delete(event);
  }

  /**
   * Subscribe to event
   */
  subscribe<T>(event: string, handler: EventHandler<T>): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(event)?.delete(handler);
    };
  }

  /**
   * Subscribe once
   */
  subscribeOnce<T>(event: string, handler: EventHandler<T>): void {
    if (!this.onceSubscribers.has(event)) {
      this.onceSubscribers.set(event, new Set());
    }
    this.onceSubscribers.get(event)!.add(handler);
  }

  /**
   * Get subscriber count
   */
  getSubscriberCount(event: string): number {
    const count = (this.subscribers.get(event)?.size || 0) + (this.onceSubscribers.get(event)?.size || 0);
    return count;
  }

  /**
   * List all events
   */
  listEvents(): string[] {
    const events = new Set([...this.subscribers.keys(), ...this.onceSubscribers.keys()]);
    return Array.from(events);
  }
}

// ==================== MESSAGE QUEUE ====================

export class MessageQueue {
  private queues = new Map<string, QueuedMessage<any>[]>();
  private dlq = new Map<string, QueuedMessage<any>[]>(); // Dead Letter Queue
  private stats = new Map<string, { processed: number; failed: number }>();

  /**
   * Enqueue message
   */
  enqueue<T>(queueName: string, message: T, priority: number = 0): string {
    const id = `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const queued: QueuedMessage<T> = {
      id,
      payload: message,
      enqueuedAt: Date.now(),
      attempts: 0,
      maxRetries: 3
    };

    if (!this.queues.has(queueName)) {
      this.queues.set(queueName, []);
      this.stats.set(queueName, { processed: 0, failed: 0 });
    }

    this.queues.get(queueName)!.push(queued);
    return id;
  }

  /**
   * Dequeue message (FIFO)
   */
  dequeue<T>(queueName: string): QueuedMessage<T> | null {
    const queue = this.queues.get(queueName);
    if (!queue || queue.length === 0) {
      return null;
    }

    const message = queue.shift() as QueuedMessage<T>;
    message.attempts++;
    return message;
  }

  /**
   * Acknowledge message
   */
  acknowledge(queueName: string, messageId: string): void {
    const stats = this.stats.get(queueName);
    if (stats) {
      stats.processed++;
    }
  }

  /**
   * Negative acknowledge (retry or DLQ)
   */
  nack(queueName: string, messageId: string): void {
    const queue = this.queues.get(queueName) || [];
    const message = queue.find(m => m.id === messageId);

    if (message) {
      if (message.attempts >= message.maxRetries) {
        // Move to DLQ
        if (!this.dlq.has(queueName)) {
          this.dlq.set(queueName, []);
        }
        this.dlq.get(queueName)!.push(message);

        // Remove from main queue
        const index = queue.indexOf(message);
        if (index >= 0) {
          queue.splice(index, 1);
        }

        const stats = this.stats.get(queueName);
        if (stats) {
          stats.failed++;
        }

        logger.warn('Message moved to DLQ', { queueName, messageId, attempts: message.attempts });
      } else {
        // Re-enqueue for retry
        queue.push(message);
      }
    }
  }

  /**
   * Get queue stats
   */
  getQueueStats(queueName: string): { depth: number; dlqDepth: number; processed: number; failed: number } {
    return {
      depth: this.queues.get(queueName)?.length || 0,
      dlqDepth: this.dlq.get(queueName)?.length || 0,
      processed: this.stats.get(queueName)?.processed || 0,
      failed: this.stats.get(queueName)?.failed || 0
    };
  }

  /**
   * Get dead letter queue
   */
  getDLQ(queueName: string): QueuedMessage<any>[] {
    return this.dlq.get(queueName) || [];
  }

  /**
   * Purge queue
   */
  purgeQueue(queueName: string): number {
    const queue = this.queues.get(queueName);
    if (!queue) return 0;
    const count = queue.length;
    queue.length = 0;
    return count;
  }
}

// ==================== EVENT REPLAY ====================

export class EventReplay {
  private history: EventRecord[] = [];
  private readonly maxHistory = 10000;
  private readonly maxAgeMs = 60 * 60 * 1000; // 1 hour

  /**
   * Record event
   */
  record(event: string, payload: any): void {
    this.history.push({
      event,
      payload,
      timestamp: Date.now()
    });

    // Prune old entries
    const cutoff = Date.now() - this.maxAgeMs;
    this.history = this.history.filter(r => r.timestamp > cutoff);

    // Keep under max size
    if (this.history.length > this.maxHistory) {
      this.history.splice(0, this.history.length - this.maxHistory);
    }
  }

  /**
   * Replay events
   */
  replay(event: string, since: number, handler: (payload: any) => void): number {
    const records = this.history.filter(r => r.event === event && r.timestamp >= since);

    for (const record of records) {
      try {
        handler(record.payload);
      } catch (err) {
        logger.error('Replay handler failed', err instanceof Error ? err : new Error(String(err)), {
          event,
          timestamp: record.timestamp
        });
      }
    }

    return records.length;
  }

  /**
   * Get event history
   */
  getHistory(event: string, limit: number = 100): EventRecord[] {
    return this.history
      .filter(r => r.event === event)
      .slice(-limit)
      .reverse();
  }

  /**
   * Prune old history
   */
  pruneHistory(olderThanMs: number): number {
    const cutoff = Date.now() - olderThanMs;
    const originalLength = this.history.length;
    this.history = this.history.filter(r => r.timestamp > cutoff);
    return originalLength - this.history.length;
  }

  /**
   * Get total history size
   */
  getHistorySize(): number {
    return this.history.length;
  }
}

// ==================== EXPORTS ====================

export const eventBus = new EventBus();
export const messageQueue = new MessageQueue();
export const eventReplay = new EventReplay();
