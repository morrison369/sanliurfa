/**
 * Phase 136: Observability & Monitoring
 * Comprehensive event streaming observability with lag tracking and tracing
 */

import { logger } from './logger';

interface EventMetric {
  topic: string;
  timestamp: number;
  throughput: number;
  eventCount: number;
  errorRate: number;
}

interface ConsumerLag {
  consumer: string;
  topic: string;
  lag: number;
  offset: number;
  timestamp: number;
}

interface EventTrace {
  eventId: string;
  correlationId: string;
  causationId: string;
  startTime: number;
  endTime: number;
  latency: number;
  path: Array<{ handler: string; duration: number; status: 'success' | 'failure' }>;
}

interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
}

class EventMetrics {
  private metrics: EventMetric[] = [];
  private counter = 0;

  recordMetric(config: {
    topic: string;
    throughput: number;
    eventCount: number;
    errorCount?: number;
  }): EventMetric {
    const errorRate = config.errorCount ? config.errorCount / config.eventCount : 0;

    const metric: EventMetric = {
      topic: config.topic,
      timestamp: Date.now(),
      throughput: config.throughput,
      eventCount: config.eventCount,
      errorRate
    };

    this.metrics.push(metric);

    // Keep last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }

    logger.debug('Event metric recorded', {
      topic: config.topic,
      throughput: config.throughput.toFixed(2)
    });

    return metric;
  }

  getThroughput(topic: string, windowMinutes: number = 5): number {
    const cutoff = Date.now() - (windowMinutes * 60 * 1000);
    const relevant = this.metrics.filter(m => m.topic === topic && m.timestamp > cutoff);

    if (relevant.length === 0) return 0;
    const total = relevant.reduce((sum, m) => sum + m.throughput, 0);
    return total / relevant.length;
  }

  getErrorRate(topic: string, windowMinutes: number = 5): number {
    const cutoff = Date.now() - (windowMinutes * 60 * 1000);
    const relevant = this.metrics.filter(m => m.topic === topic && m.timestamp > cutoff);

    if (relevant.length === 0) return 0;
    const avgError = relevant.reduce((sum, m) => sum + m.errorRate, 0) / relevant.length;
    return avgError;
  }

  getMetrics(topic: string, limit: number = 100): EventMetric[] {
    return this.metrics
      .filter(m => m.topic === topic)
      .slice(-limit);
  }

  getTopics(): string[] {
    return Array.from(new Set(this.metrics.map(m => m.topic)));
  }
}

class ConsumerLagMonitor {
  private lags: Map<string, ConsumerLag> = new Map();

  recordLag(config: {
    consumer: string;
    topic: string;
    lag: number;
    offset: number;
  }): ConsumerLag {
    const lagEntry: ConsumerLag = {
      consumer: config.consumer,
      topic: config.topic,
      lag: config.lag,
      offset: config.offset,
      timestamp: Date.now()
    };

    const key = `${config.consumer}:${config.topic}`;
    this.lags.set(key, lagEntry);

    logger.debug('Consumer lag recorded', {
      consumer: config.consumer,
      topic: config.topic,
      lag: config.lag
    });

    return lagEntry;
  }

  getLag(consumer: string, topic: string): ConsumerLag | undefined {
    return this.lags.get(`${consumer}:${topic}`);
  }

  getAllLags(): ConsumerLag[] {
    return Array.from(this.lags.values());
  }

  getLagsByTopic(topic: string): ConsumerLag[] {
    return Array.from(this.lags.values()).filter(l => l.topic === topic);
  }

  detectHighLag(threshold: number = 5000): ConsumerLag[] {
    return Array.from(this.lags.values()).filter(l => l.lag > threshold);
  }
}

class EventTracer {
  private traces: Map<string, EventTrace> = new Map();
  private counter = 0;

  startTrace(config: {
    eventId: string;
    correlationId: string;
    causationId?: string;
  }): EventTrace {
    const trace: EventTrace = {
      eventId: config.eventId,
      correlationId: config.correlationId,
      causationId: config.causationId || config.correlationId,
      startTime: Date.now(),
      endTime: 0,
      latency: 0,
      path: []
    };

    this.traces.set(config.eventId, trace);
    return trace;
  }

  recordHandlerExecution(
    eventId: string,
    handler: string,
    duration: number,
    status: 'success' | 'failure'
  ): void {
    const trace = this.traces.get(eventId);
    if (trace) {
      trace.path.push({ handler, duration, status });
      trace.endTime = Date.now();
      trace.latency = trace.endTime - trace.startTime;

      logger.debug('Handler execution recorded', {
        eventId,
        handler,
        duration,
        status
      });
    }
  }

  getTrace(eventId: string): EventTrace | undefined {
    return this.traces.get(eventId);
  }

  getTraceByCorrelation(correlationId: string): EventTrace[] {
    return Array.from(this.traces.values()).filter(t => t.correlationId === correlationId);
  }

  getLatencyPercentiles(eventType: string): LatencyPercentiles {
    const traces = Array.from(this.traces.values());
    const latencies = traces
      .map(t => t.latency)
      .sort((a, b) => a - b);

    if (latencies.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    return {
      p50: latencies[Math.floor(latencies.length * 0.5)],
      p95: latencies[Math.floor(latencies.length * 0.95)],
      p99: latencies[Math.floor(latencies.length * 0.99)]
    };
  }

  getAllTraces(limit: number = 100): EventTrace[] {
    return Array.from(this.traces.values()).slice(-limit);
  }
}

class DebugDashboard {
  private events: Array<{
    timestamp: number;
    level: 'info' | 'warning' | 'error';
    message: string;
    metadata: Record<string, any>;
  }> = [];

  recordEvent(config: {
    level: 'info' | 'warning' | 'error';
    message: string;
    metadata?: Record<string, any>;
  }): void {
    this.events.push({
      timestamp: Date.now(),
      level: config.level,
      message: config.message,
      metadata: config.metadata || {}
    });

    // Keep last 1000 events
    if (this.events.length > 1000) {
      this.events.shift();
    }

    logger.debug('Dashboard event recorded', { level: config.level });
  }

  getEvents(filter?: { level?: string; since?: number }, limit: number = 100) {
    let result = [...this.events];

    if (filter?.level) {
      result = result.filter(e => e.level === filter.level);
    }

    if (filter?.since) {
      result = result.filter(e => e.timestamp > filter.since!);
    }

    return result.slice(-limit);
  }

  getSummary(): {
    totalEvents: number;
    byLevel: Record<string, number>;
    timeRange: { oldest: number; newest: number };
  } {
    const byLevel = { info: 0, warning: 0, error: 0 };

    for (const event of this.events) {
      byLevel[event.level]++;
    }

    const timestamps = this.events.map(e => e.timestamp);
    const oldest = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newest = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    return {
      totalEvents: this.events.length,
      byLevel,
      timeRange: { oldest, newest }
    };
  }

  clearEvents(): void {
    this.events = [];
    logger.debug('Dashboard events cleared');
  }
}

export const eventMetrics = new EventMetrics();
export const consumerLagMonitor = new ConsumerLagMonitor();
export const eventTracer = new EventTracer();
export const debugDashboard = new DebugDashboard();

export { EventMetric, ConsumerLag, EventTrace, LatencyPercentiles };
