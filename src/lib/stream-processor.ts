/**
 * Phase 134: Stream Processing & Operators
 * Stateful stream processing with windowing, joins, and backpressure
 */

import { logger } from './logger';

interface StreamEvent {
  id: string;
  timestamp: number;
  data: Record<string, any>;
  watermark: number;
}

interface WindowedData {
  windowId: string;
  windowStart: number;
  windowEnd: number;
  events: StreamEvent[];
  result: Record<string, any>;
}

interface JoinResult {
  left: StreamEvent;
  right: StreamEvent | null;
  joinedData: Record<string, any>;
  timestamp: number;
}

interface BackpressureStatus {
  queueDepth: number;
  isBackpressured: boolean;
  timestamp: number;
}

class StatefulStreamProcessor {
  private processorId: string;
  private state: Map<string, any> = new Map();
  private queue: StreamEvent[] = [];
  private maxQueueSize = 10000;
  private counter = 0;

  constructor(processorId: string) {
    this.processorId = processorId;
  }

  setState(key: string, value: any): void {
    this.state.set(key, value);
    logger.debug('State updated', { processor: this.processorId, key });
  }

  getState(key: string): any {
    return this.state.get(key);
  }

  addEvent(event: StreamEvent): boolean {
    if (this.queue.length >= this.maxQueueSize) {
      logger.warn('Queue full - backpressure', { processor: this.processorId });
      return false;
    }

    this.queue.push(event);
    return true;
  }

  processQueue(handler: (event: StreamEvent) => void): number {
    let processed = 0;
    while (this.queue.length > 0) {
      const event = this.queue.shift()!;
      try {
        handler(event);
        processed++;
      } catch (error) {
        logger.error('Event processing failed', { processor: this.processorId, error });
      }
    }

    logger.debug('Queue processed', { processor: this.processorId, count: processed });
    return processed;
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  getProcessorId(): string {
    return this.processorId;
  }
}

class WindowOperator {
  private windows: Map<string, WindowedData> = new Map();
  private counter = 0;

  createTumblingWindow(
    windowSize: number,
    aggregationFn: (events: StreamEvent[]) => any
  ): (event: StreamEvent) => WindowedData | null {
    return (event: StreamEvent) => {
      const windowStart = Math.floor(event.timestamp / windowSize) * windowSize;
      const windowEnd = windowStart + windowSize;
      const windowId = `tumble-${windowStart}-${windowEnd}`;

      if (!this.windows.has(windowId)) {
        this.windows.set(windowId, {
          windowId,
          windowStart,
          windowEnd,
          events: [],
          result: {}
        });
      }

      const window = this.windows.get(windowId)!;
      window.events.push(event);

      if (event.timestamp >= windowEnd) {
        window.result = aggregationFn(window.events);
        logger.debug('Tumbling window closed', { windowId, eventCount: window.events.length });
        return window;
      }

      return null;
    };
  }

  createSlidingWindow(
    windowSize: number,
    slideSize: number,
    aggregationFn: (events: StreamEvent[]) => any
  ): (event: StreamEvent) => WindowedData[] {
    return (event: StreamEvent) => {
      const results: WindowedData[] = [];
      const windowCount = Math.ceil(windowSize / slideSize);

      for (let i = 0; i < windowCount; i++) {
        const windowStart = Math.floor(event.timestamp / slideSize) * slideSize - (i * slideSize);
        const windowEnd = windowStart + windowSize;
        const windowId = `slide-${windowStart}-${windowEnd}`;

        if (!this.windows.has(windowId)) {
          this.windows.set(windowId, {
            windowId,
            windowStart,
            windowEnd,
            events: [],
            result: {}
          });
        }

        const window = this.windows.get(windowId)!;
        if (event.timestamp >= windowStart && event.timestamp < windowEnd) {
          window.events.push(event);
          window.result = aggregationFn(window.events);
          results.push(window);
        }
      }

      return results;
    };
  }

  aggregate(
    events: StreamEvent[],
    fn: 'sum' | 'count' | 'avg' | 'min' | 'max',
    field?: string
  ): number {
    if (fn === 'count') {
      return events.length;
    }

    if (!field) return 0;

    const values = events.map(e => e.data[field]).filter(v => typeof v === 'number');

    switch (fn) {
      case 'sum':
        return values.reduce((a, b) => a + b, 0);
      case 'avg':
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      case 'min':
        return Math.min(...values);
      case 'max':
        return Math.max(...values);
      default:
        return 0;
    }
  }

  getWindowStats(): { windowCount: number; totalEvents: number } {
    let totalEvents = 0;
    for (const window of this.windows.values()) {
      totalEvents += window.events.length;
    }

    return { windowCount: this.windows.size, totalEvents };
  }
}

class StreamJoiner {
  private leftStream: StreamEvent[] = [];
  private rightStream: StreamEvent[] = [];
  private counter = 0;

  join(
    leftEvent: StreamEvent,
    rightStream: StreamEvent[],
    joinKey: (left: StreamEvent, right: StreamEvent) => boolean,
    windowMs: number = 5000
  ): JoinResult[] {
    const results: JoinResult[] = [];
    const cutoff = leftEvent.timestamp - windowMs;

    const validRight = rightStream.filter(r => r.timestamp > cutoff && r.timestamp <= leftEvent.timestamp);

    for (const rightEvent of validRight) {
      if (joinKey(leftEvent, rightEvent)) {
        results.push({
          left: leftEvent,
          right: rightEvent,
          joinedData: { ...leftEvent.data, ...rightEvent.data },
          timestamp: Math.max(leftEvent.timestamp, rightEvent.timestamp)
        });
      }
    }

    // Left outer join - include left even if no match
    if (results.length === 0) {
      results.push({
        left: leftEvent,
        right: null,
        joinedData: leftEvent.data,
        timestamp: leftEvent.timestamp
      });
    }

    logger.debug('Stream join completed', { results: results.length, windowMs });
    return results;
  }

  enrichStream(event: StreamEvent, lookupTable: Map<string, any>, lookupKey: string): StreamEvent {
    const enrichmentData = lookupTable.get(event.data[lookupKey]);
    if (enrichmentData) {
      event.data = { ...event.data, ...enrichmentData };
    }
    return event;
  }
}

class BackpressureController {
  private queueSizeThreshold = 1000;
  private status: BackpressureStatus = {
    queueDepth: 0,
    isBackpressured: false,
    timestamp: Date.now()
  };

  checkBackpressure(queueSize: number): BackpressureStatus {
    this.status.queueDepth = queueSize;
    this.status.isBackpressured = queueSize > this.queueSizeThreshold;
    this.status.timestamp = Date.now();

    if (this.status.isBackpressured) {
      logger.warn('Backpressure detected', { queueSize, threshold: this.queueSizeThreshold });
    }

    return this.status;
  }

  setThreshold(threshold: number): void {
    this.queueSizeThreshold = threshold;
    logger.debug('Backpressure threshold updated', { threshold });
  }

  getStatus(): BackpressureStatus {
    return { ...this.status };
  }

  async waitForCapacity(queueSize: number, maxWaitMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    while (queueSize > this.queueSizeThreshold) {
      if (Date.now() - startTime > maxWaitMs) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return true;
  }
}

export const statefulStreamProcessor = StatefulStreamProcessor;
export const windowOperator = new WindowOperator();
export const streamJoiner = new StreamJoiner();
export const backpressureController = new BackpressureController();

export { StreamEvent, WindowedData, JoinResult, BackpressureStatus };
