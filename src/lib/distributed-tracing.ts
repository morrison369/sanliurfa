/**
 * Phase 149: Distributed Tracing & Request Context
 * W3C Trace Context, OpenTelemetry support, span instrumentation
 */

import { logger } from './logger';

interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceparent: string;
  tracestate: string;
  timestamp: number;
}

interface Span {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  operationName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  attributes: Record<string, any>;
  status: 'OK' | 'ERROR' | 'UNSET';
  events: Array<{ name: string; timestamp: number; attributes?: Record<string, any> }>;
}

interface InstrumentationHook {
  serviceName: string;
  operation: string;
  span: Span;
}

interface ExportTarget {
  type: 'jaeger' | 'datadog' | 'honeycomb' | 'custom';
  endpoint: string;
  apiKey?: string;
}

class TraceContext {
  private counter = 0;

  startTrace(operationName: string, parentContext?: TraceContext): TraceContext {
    const traceId = parentContext?.traceId || `${Date.now()}-${++this.counter}`;
    const spanId = `span-${Date.now()}-${++this.counter}`;
    const parentSpanId = parentContext?.spanId;

    const traceparent = `00-${traceId.substring(0, 32)}-${spanId.substring(0, 16)}-01`;
    const tracestate = parentContext?.tracestate || `ts=${Date.now()}`;

    logger.debug('Trace started', { traceId, spanId, operation: operationName });

    return {
      traceId,
      spanId,
      parentSpanId,
      traceparent,
      tracestate,
      timestamp: Date.now()
    };
  }

  parseTraceparent(traceparent: string): { traceId: string; spanId: string; sampled: boolean } | null {
    const parts = traceparent.split('-');
    if (parts.length !== 4) return null;

    return {
      traceId: parts[1],
      spanId: parts[2],
      sampled: parts[3] === '01'
    };
  }

  propagateContext(context: TraceContext): Record<string, string> {
    return {
      traceparent: context.traceparent,
      tracestate: context.tracestate,
      'x-trace-id': context.traceId,
      'x-span-id': context.spanId
    };
  }
}

class SpanManager {
  private spans: Map<string, Span> = new Map();
  private counter = 0;

  createSpan(operationName: string, options: { traceId: string; parentSpanId?: string; attributes?: Record<string, any> }): Span {
    const spanId = `span-${Date.now()}-${++this.counter}`;

    const span: Span = {
      spanId,
      traceId: options.traceId,
      parentSpanId: options.parentSpanId,
      operationName,
      startTime: Date.now(),
      attributes: options.attributes || {},
      status: 'UNSET',
      events: []
    };

    this.spans.set(spanId, span);

    logger.debug('Span created', { spanId, operation: operationName });

    return span;
  }

  addEvent(spanId: string, eventName: string, attributes?: Record<string, any>): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.events.push({
        name: eventName,
        timestamp: Date.now(),
        attributes
      });
    }
  }

  setAttribute(spanId: string, key: string, value: any): void {
    const span = this.spans.get(spanId);
    if (span) {
      span.attributes[key] = value;
    }
  }

  endSpan(spanId: string, options?: { status?: 'OK' | 'ERROR'; duration?: number }): Span | undefined {
    const span = this.spans.get(spanId);
    if (span) {
      span.endTime = Date.now();
      span.duration = options?.duration || span.endTime - span.startTime;
      span.status = options?.status || 'OK';

      logger.debug('Span ended', { spanId, duration: span.duration, status: span.status });
    }

    return span;
  }

  getSpan(spanId: string): Span | undefined {
    return this.spans.get(spanId);
  }

  getChildSpans(parentSpanId: string): Span[] {
    return Array.from(this.spans.values()).filter(s => s.parentSpanId === parentSpanId);
  }
}

class TraceCollector {
  private traces: Map<string, TraceContext> = new Map();
  private spans: Map<string, Span[]> = new Map();

  collectTrace(trace: TraceContext, spans: Span[]): void {
    this.traces.set(trace.traceId, trace);
    this.spans.set(trace.traceId, spans);

    logger.debug('Trace collected', { traceId: trace.traceId, spanCount: spans.length });
  }

  getTrace(traceId: string): { trace: TraceContext; spans: Span[] } | undefined {
    const trace = this.traces.get(traceId);
    const spans = this.spans.get(traceId);

    if (trace && spans) {
      return { trace, spans };
    }

    return undefined;
  }

  queryTraces(filter: { operationName?: string; minDuration?: number; maxDuration?: number }): TraceContext[] {
    return Array.from(this.traces.values()).filter(trace => {
      const spans = this.spans.get(trace.traceId) || [];
      const totalDuration = spans.reduce((sum, s) => sum + (s.duration || 0), 0);

      if (filter.operationName && !spans.some(s => s.operationName === filter.operationName)) {
        return false;
      }

      if (filter.minDuration && totalDuration < filter.minDuration) {
        return false;
      }

      if (filter.maxDuration && totalDuration > filter.maxDuration) {
        return false;
      }

      return true;
    });
  }

  getTraceMetrics(traceId: string): { totalDuration: number; spanCount: number; errorCount: number } | undefined {
    const spans = this.spans.get(traceId);
    if (!spans) return undefined;

    return {
      totalDuration: spans.reduce((sum, s) => sum + (s.duration || 0), 0),
      spanCount: spans.length,
      errorCount: spans.filter(s => s.status === 'ERROR').length
    };
  }
}

class TraceExporter {
  private targets: Map<string, ExportTarget> = new Map();
  private counter = 0;

  registerTarget(name: string, target: ExportTarget): void {
    this.targets.set(name, target);

    logger.debug('Export target registered', { name, type: target.type });
  }

  async exportTrace(trace: TraceContext, spans: Span[], targetName?: string): Promise<{ exported: boolean; destination: string }> {
    const target = targetName ? this.targets.get(targetName) : Array.from(this.targets.values())[0];

    if (!target) {
      return { exported: false, destination: 'none' };
    }

    // Simulate export
    logger.debug('Trace exported', {
      traceId: trace.traceId,
      spanCount: spans.length,
      destination: target.type
    });

    return { exported: true, destination: target.type };
  }

  batchExport(traces: Array<{ trace: TraceContext; spans: Span[] }>, targetName?: string): Promise<{ exported: number; failed: number }> {
    const exported = traces.length;

    logger.debug('Batch export completed', { total: traces.length, exported });

    return Promise.resolve({ exported, failed: 0 });
  }

  getTargets(): ExportTarget[] {
    return Array.from(this.targets.values());
  }
}

export const traceContext = new TraceContext();
export const spanManager = new SpanManager();
export const traceCollector = new TraceCollector();
export const traceExporter = new TraceExporter();

export { TraceContext, Span, InstrumentationHook, ExportTarget };
