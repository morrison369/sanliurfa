/**
 * Phase 111: Advanced Stream Analytics & Time-Window Processing
 * Real-time analytics with sliding windows, tumbling windows, session windows
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type WindowType = 'tumbling' | 'sliding' | 'session' | 'batch';
export type AggregationFunction = 'sum' | 'count' | 'avg' | 'min' | 'max' | 'percentile' | 'distinct-count';
export type JoinType = 'inner' | 'left' | 'right' | 'outer' | 'cross';

export interface WindowDefinition {
  type: WindowType;
  duration?: number;
  slideInterval?: number;
  sessionTimeout?: number;
}

export interface StreamAggregation {
  name: string;
  function: AggregationFunction;
  field?: string;
  alias?: string;
}

export interface StreamWindow {
  id: string;
  definition: WindowDefinition;
  aggregations: StreamAggregation[];
  createdAt: number;
}

export interface AggregationResult {
  windowStart: number;
  windowEnd: number;
  aggregations: Record<string, any>;
  recordCount: number;
}

interface StreamState {
  name: string;
  createdAt: number;
  firstRecordAt?: number;
  lastRecordAt?: number;
  totalRecords: number;
  totalIngressLatency: number;
}

interface JoinMetadata {
  config: {
    leftKey: string;
    rightKey: string;
    type: JoinType;
    windowSize?: number;
  };
  resultCount: number;
  leftCount: number;
  rightCount: number;
  matchedLeftCount: number;
}

// ==================== STREAM PROCESSOR ====================

export class StreamProcessor {
  private streams = new Map<string, Record<string, any>[]>();
  private streamStates = new Map<string, StreamState>();
  private streamCount = 0;

  /**
   * Create stream
   */
  createStream(name: string): string {
    const id = 'stream-' + Date.now() + '-' + this.streamCount++;
    const createdAt = Date.now();

    this.streams.set(id, []);
    this.streamStates.set(id, {
      name,
      createdAt,
      totalRecords: 0,
      totalIngressLatency: 0
    });
    logger.info('Stream created', { streamId: id, name });

    return id;
  }

  /**
   * Add record to stream
   */
  addRecord(streamId: string, record: Record<string, any>): void {
    const stream = this.streams.get(streamId);
    const state = this.streamStates.get(streamId);
    if (stream) {
      const now = Date.now();
      const sourceTimestamp = typeof record.eventTime === 'number'
        ? record.eventTime
        : typeof record.timestamp === 'number'
          ? record.timestamp
          : now;

      stream.push({
        ...record,
        _timestamp: now
      });

      if (state) {
        state.firstRecordAt = state.firstRecordAt ?? now;
        state.lastRecordAt = now;
        state.totalRecords += 1;
        state.totalIngressLatency += Math.max(0, now - sourceTimestamp);
      }

      logger.debug('Record added to stream', { streamId, recordCount: stream.length });
    }
  }

  /**
   * Get stream records
   */
  getRecords(streamId: string, limit?: number): Record<string, any>[] {
    const stream = this.streams.get(streamId) || [];
    return limit ? stream.slice(-limit) : stream;
  }

  /**
   * Get stream metrics
   */
  getStreamMetrics(streamId: string): Record<string, any> {
    const stream = this.streams.get(streamId) || [];
    const state = this.streamStates.get(streamId);
    const firstRecordAt = state?.firstRecordAt ?? state?.createdAt ?? Date.now();
    const lastRecordAt = state?.lastRecordAt ?? Date.now();
    const elapsedSeconds = Math.max(1, (lastRecordAt - firstRecordAt) / 1000);
    const throughput = roundNumber(stream.length / elapsedSeconds);
    const latency = state && state.totalRecords > 0
      ? roundNumber(state.totalIngressLatency / state.totalRecords, 2)
      : 0;
    const watermarkLag = Math.max(0, Date.now() - (state?.lastRecordAt ?? Date.now()));

    return {
      streamId,
      recordCount: stream.length,
      throughput,
      latency,
      watermarkLag
    };
  }

  /**
   * Clear stream
   */
  clearStream(streamId: string): void {
    this.streams.delete(streamId);
    this.streamStates.delete(streamId);
    logger.debug('Stream cleared', { streamId });
  }
}

// ==================== WINDOW AGGREGATOR ====================

export class WindowAggregator {
  private windows = new Map<string, StreamWindow>();
  private windowCount = 0;
  private results = new Map<string, AggregationResult[]>();

  /**
   * Create window
   */
  createWindow(definition: WindowDefinition, aggregations: StreamAggregation[]): string {
    const id = 'window-' + Date.now() + '-' + this.windowCount++;

    const window: StreamWindow = {
      id,
      definition,
      aggregations,
      createdAt: Date.now()
    };

    this.windows.set(id, window);
    logger.info('Window created', {
      windowId: id,
      type: definition.type,
      aggregationCount: aggregations.length
    });

    return id;
  }

  /**
   * Apply windowing to stream
   */
  applyWindow(streamId: string, windowId: string, data: Record<string, any>[]): AggregationResult[] {
    const window = this.windows.get(windowId);
    if (!window) return [];

    const results: AggregationResult[] = [];

    if (window.definition.type === 'tumbling') {
      const duration = window.definition.duration || 60000; // 1 minute default
      const windowStart = Math.floor(Date.now() / duration) * duration;
      const windowEnd = windowStart + duration;

      const result = this.aggregateWindow(data, window, windowStart, windowEnd);
      results.push(result);
    } else if (window.definition.type === 'sliding') {
      const duration = window.definition.duration || 60000;
      const slide = window.definition.slideInterval || 30000;

      for (let i = 0; i < data.length; i += slide) {
        const windowStart = i;
        const windowEnd = i + duration;

        const windowData = data.slice(
          Math.max(0, Math.floor(i / 1000)),
          Math.ceil(windowEnd / 1000)
        );

        const result = this.aggregateWindow(windowData, window, windowStart, windowEnd);
        results.push(result);
      }
    }

    this.results.set(windowId, results);
    logger.debug('Window applied', { windowId, resultCount: results.length });

    return results;
  }

  /**
   * Aggregate window
   */
  private aggregateWindow(data: Record<string, any>[], window: StreamWindow, start: number, end: number): AggregationResult {
    const aggregations: Record<string, any> = {};

    for (const agg of window.aggregations) {
      const values = agg.field ? data.map(r => r[agg.field || '']).filter(v => v !== null) : data;

      switch (agg.function) {
        case 'count':
          aggregations[agg.alias || agg.name] = values.length;
          break;
        case 'sum':
          aggregations[agg.alias || agg.name] = (values as number[]).reduce((a, b) => a + b, 0);
          break;
        case 'avg':
          aggregations[agg.alias || agg.name] = (values as number[]).reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'min':
          aggregations[agg.alias || agg.name] = Math.min(...(values as number[]));
          break;
        case 'max':
          aggregations[agg.alias || agg.name] = Math.max(...(values as number[]));
          break;
        case 'distinct-count':
          aggregations[agg.alias || agg.name] = new Set(values).size;
          break;
      }
    }

    return {
      windowStart: start,
      windowEnd: end,
      aggregations,
      recordCount: data.length
    };
  }

  /**
   * Get window results
   */
  getWindowResults(windowId: string): AggregationResult[] {
    return this.results.get(windowId) || [];
  }

  /**
   * Get window
   */
  getWindow(windowId: string): StreamWindow | null {
    return this.windows.get(windowId) || null;
  }
}

// ==================== STREAM JOINER ====================

export class StreamJoiner {
  private joins = new Map<string, JoinMetadata>();
  private joinCount = 0;
  private lastJoinId: string | null = null;

  /**
   * Join streams
   */
  join(stream1: Record<string, any>[], stream2: Record<string, any>[], config: {
    leftKey: string;
    rightKey: string;
    type: JoinType;
    windowSize?: number;
  }): Record<string, any>[] {
    const id = 'join-' + Date.now() + '-' + this.joinCount++;

    const result: Record<string, any>[] = [];
    const matchedLeft = new Set<number>();

    if (config.type === 'inner') {
      for (const [leftIndex, left] of stream1.entries()) {
        for (const right of stream2) {
          if (left[config.leftKey] === right[config.rightKey]) {
            result.push({ ...left, ...right });
            matchedLeft.add(leftIndex);
          }
        }
      }
    } else if (config.type === 'left') {
      for (const [leftIndex, left] of stream1.entries()) {
        const matching = stream2.filter(r => r[config.rightKey] === left[config.leftKey]);

        if (matching.length > 0) {
          matchedLeft.add(leftIndex);
          for (const right of matching) {
            result.push({ ...left, ...right });
          }
        } else {
          result.push(left);
        }
      }
    }

    this.joins.set(id, {
      config,
      resultCount: result.length,
      leftCount: stream1.length,
      rightCount: stream2.length,
      matchedLeftCount: matchedLeft.size
    });
    this.lastJoinId = id;
    logger.info('Stream join completed', {
      joinId: id,
      type: config.type,
      resultCount: result.length
    });

    return result;
  }

  /**
   * Get join metadata
   */
  getJoinMetadata(joinId: string): Record<string, any> | null {
    return this.joins.get(joinId) || null;
  }

  getLatestJoinId(): string | null {
    return this.lastJoinId;
  }

  /**
   * Stream-to-table join
   */
  joinStreamToTable(stream: Record<string, any>[], table: Record<string, any>[], joinKey: string, type: JoinType = 'inner'): Record<string, any>[] {
    return this.join(stream, table, {
      leftKey: joinKey,
      rightKey: joinKey,
      type
    });
  }

  /**
   * Get join statistics
   */
  getJoinStatistics(joinId: string): Record<string, any> {
    const join = this.joins.get(joinId);
    if (!join) return {};

    return {
      joinId,
      joinType: join.config.type,
      resultCount: join.resultCount,
      leftCount: join.leftCount,
      rightCount: join.rightCount,
      matchRate: join.leftCount === 0 ? 0 : roundNumber(join.matchedLeftCount / join.leftCount, 4)
    };
  }
}

// ==================== STREAM METRICS ====================

export class StreamMetrics {
  private metrics = new Map<string, Record<string, any>>();
  private metricsCount = 0;

  /**
   * Record stream metric
   */
  recordMetric(streamId: string, metric: {
    throughput: number;
    latency: number;
    recordCount: number;
    errorCount?: number;
  }): void {
    const id = 'metric-' + Date.now() + '-' + this.metricsCount++;

    this.metrics.set(id, {
      streamId,
      ...metric,
      timestamp: Date.now()
    });

    logger.debug('Stream metric recorded', {
      streamId,
      throughput: metric.throughput,
      latency: metric.latency
    });
  }

  /**
   * Get stream metrics
   */
  getStreamMetrics(streamId: string): Record<string, any>[] {
    const metrics: Record<string, any>[] = [];

    for (const metric of this.metrics.values()) {
      if (metric.streamId === streamId) {
        metrics.push(metric);
      }
    }

    return metrics;
  }

  /**
   * Calculate average latency
   */
  getAverageLatency(streamId: string): number {
    const metrics = this.getStreamMetrics(streamId);
    if (metrics.length === 0) return 0;

    return metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length;
  }

  /**
   * Calculate average throughput
   */
  getAverageThroughput(streamId: string): number {
    const metrics = this.getStreamMetrics(streamId);
    if (metrics.length === 0) return 0;

    return metrics.reduce((sum, m) => sum + m.throughput, 0) / metrics.length;
  }

  /**
   * Detect backpressure
   */
  detectBackpressure(streamId: string, threshold: number = 100): boolean {
    const latency = this.getAverageLatency(streamId);
    return latency > threshold;
  }

  /**
   * Get health status
   */
  getHealthStatus(streamId: string): 'healthy' | 'degraded' | 'unhealthy' {
    const latency = this.getAverageLatency(streamId);

    if (latency < 50) {
      return 'healthy';
    } else if (latency < 200) {
      return 'degraded';
    } else {
      return 'unhealthy';
    }
  }
}

function roundNumber(value: number, digits: number = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

// ==================== EXPORTS ====================

export const streamProcessor = new StreamProcessor();
export const windowAggregator = new WindowAggregator();
export const streamJoiner = new StreamJoiner();
export const streamMetrics = new StreamMetrics();
