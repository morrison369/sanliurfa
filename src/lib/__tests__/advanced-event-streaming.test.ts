/**
 * Phase 131-136: Advanced Event Streaming & Processing Tests
 * Comprehensive test suite for all 6 phases
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { eventStore, eventVersionManager, eventSnapshot, eventRecovery } from '../event-store';
import { messageBroker, consumerGroup, streamMetrics } from '../message-broker';
import { commandHandler, queryHandler, eventHandler, sagaOrchestrator } from '../cqrs-engine';
import { statefulStreamProcessor, windowOperator, streamJoiner, backpressureController } from '../stream-processor';
import { eventRouter, contentFilter, eventTransformer, routingRule } from '../event-router';
import { eventMetrics, consumerLagMonitor, eventTracer, debugDashboard } from '../event-observability';

describe('Phase 131: Event Store & Event Sourcing', () => {
  it('should append events to the store', () => {
    const eventId = eventStore.append({
      aggregateId: 'user-123',
      aggregateType: 'User',
      type: 'UserCreated',
      data: { name: 'Alice', email: 'alice@example.com' },
      metadata: { version: 1, correlationId: 'cmd-1' }
    });

    expect(eventId).toBeDefined();
    expect(eventId).toContain('evt-');
  });

  it('should retrieve aggregate events', () => {
    eventStore.append({
      aggregateId: 'user-456',
      aggregateType: 'User',
      type: 'UserCreated',
      data: { name: 'Bob' },
      metadata: { version: 1 }
    });

    const events = eventStore.getAggregateEvents('user-456');
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].aggregateId).toBe('user-456');
  });

  it('should create event snapshots', () => {
    const snapshot = eventSnapshot.createSnapshot('user-123', 'User', 10, { name: 'Alice', points: 100 });

    expect(snapshot).toBeDefined();
    expect(snapshot.version).toBe(10);
    expect(snapshot.state.points).toBe(100);
  });

  it('should get event statistics', () => {
    const stats = eventStore.getEventStats();

    expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
    expect(stats.byType).toBeDefined();
    expect(stats.dateRange).toBeDefined();
  });
});

describe('Phase 132: Message Broker Integration', () => {
  it('should publish messages to topics', async () => {
    const messageId = await messageBroker.publish('user.events', {
      type: 'UserCreated',
      userId: 'user-123',
      timestamp: Date.now()
    });

    expect(messageId).toBeDefined();
    expect(messageId).toContain('msg-');
  });

  it('should retrieve messages from topic', async () => {
    await messageBroker.publish('order.events', { orderId: 'order-1' });
    const messages = messageBroker.getMessages('order.events', 10);

    expect(messages.length).toBeGreaterThan(0);
  });

  it('should manage consumer groups', () => {
    consumerGroup.createGroup({
      name: 'notifications-group',
      topic: 'user.events'
    });

    const consumer = consumerGroup.addConsumer('notifications-group', 'user.events');
    expect(consumer).toBeDefined();

    const info = consumerGroup.getGroupInfo('notifications-group');
    expect(info?.consumerCount).toBe(1);
  });

  it('should track stream metrics', async () => {
    await messageBroker.publish('metrics-test', { data: 'test' });
    streamMetrics.recordMessage('metrics-test');

    const metrics = streamMetrics.getMetrics('metrics-test');
    expect(metrics).toBeDefined();
    expect(metrics.messageCount).toBeGreaterThan(0);
  });
});

describe('Phase 133: CQRS & Event-Driven Architecture', () => {
  it('should register and execute commands', async () => {
    commandHandler.register('CreateUser', (cmd) => {
      return {
        status: 'success',
        commandId: 'cmd-123',
        data: { userId: 'user-123' }
      };
    });

    const result = await commandHandler.execute({
      type: 'CreateUser',
      aggregateId: 'user-123',
      data: { name: 'Alice' }
    });

    expect(result.status).toBe('success');
    expect(result.commandId).toBeDefined();
  });

  it('should register and execute queries', async () => {
    queryHandler.register('GetUser', (query) => {
      return { id: query.parameters.userId, name: 'Alice' };
    });

    const result = await queryHandler.execute({
      type: 'GetUser',
      parameters: { userId: 'user-123' }
    });

    expect(result.data).toBeDefined();
    expect(result.data.name).toBe('Alice');
  });

  it('should handle events', async () => {
    let handled = false;

    eventHandler.on('UserCreated', (event) => {
      handled = true;
    });

    await eventHandler.handle({
      type: 'UserCreated',
      data: { userId: 'user-123' }
    });

    expect(handled).toBe(true);
  });

  it('should manage sagas', async () => {
    sagaOrchestrator.defineSaga({
      id: 'payment-saga',
      name: 'Payment Processing',
      steps: [
        { command: 'ChargePayment', compensation: 'RefundPayment', timeout: 10000 },
        { command: 'FulfillOrder', compensation: 'CancelFulfillment', timeout: 10000 }
      ]
    });

    const execution = await sagaOrchestrator.startSaga('payment-saga', {});
    expect(execution).toBeDefined();
    expect(execution.status).toBe('running');
  });
});

describe('Phase 134: Stream Processing & Operators', () => {
  it('should create stateful stream processors', () => {
    const processor = new statefulStreamProcessor('order-processor');

    processor.setState('totalRevenue', 0);
    const state = processor.getState('totalRevenue');

    expect(state).toBe(0);
  });

  it('should create tumbling windows', () => {
    const windowFn = windowOperator.createTumblingWindow(60000, (events) => {
      return { count: events.length };
    });

    const event = {
      id: 'evt-1',
      timestamp: Date.now(),
      data: {},
      watermark: Date.now()
    };

    const result = windowFn(event);
    expect(result).toBeDefined();
  });

  it('should aggregate stream data', () => {
    const events = [
      { id: '1', timestamp: Date.now(), data: { value: 10 }, watermark: Date.now() },
      { id: '2', timestamp: Date.now(), data: { value: 20 }, watermark: Date.now() },
      { id: '3', timestamp: Date.now(), data: { value: 30 }, watermark: Date.now() }
    ];

    const sum = windowOperator.aggregate(events, 'sum', 'value');
    expect(sum).toBe(60);
  });

  it('should detect backpressure', () => {
    const status = backpressureController.checkBackpressure(500);

    expect(status).toBeDefined();
    expect(status.isBackpressured).toBe(false);
  });
});

describe('Phase 135: Advanced Event Routing & Filtering', () => {
  it('should add and route to rules', () => {
    eventRouter.addRule({
      pattern: 'user.*',
      filter: (e) => e.priority === 'high',
      destination: 'alerts',
      priority: 10
    });

    const result = eventRouter.route({
      type: 'user.created',
      priority: 'high'
    });

    expect(result.matched).toBe(true);
    expect(result.destination).toBe('alerts');
  });

  it('should filter events by content', () => {
    const event = {
      type: 'OrderCreated',
      amount: 500,
      userId: 'user-1'
    };

    const matches = contentFilter.filter(event, {
      amount: (v) => v > 100,
      userId: 'user-1'
    });

    expect(matches).toBe(true);
  });

  it('should transform events', () => {
    eventTransformer.registerTransformer('addMetadata', (event) => ({
      ...event,
      processed: true
    }));

    const result = eventTransformer.transform(
      { type: 'Test' },
      'addMetadata'
    );

    expect(result.processed).toBe(true);
  });

  it('should chain transformers', () => {
    eventTransformer.registerTransformer('flatten', (e) => ({
      type: e.type,
      data: JSON.stringify(e.data)
    }));

    eventTransformer.registerTransformer('enrich', (e) => ({
      ...e,
      timestamp: Date.now()
    }));

    const result = eventTransformer.chainTransformers(
      { type: 'Test', data: {} },
      ['flatten', 'enrich']
    );

    expect(result.timestamp).toBeDefined();
  });
});

describe('Phase 136: Observability & Monitoring', () => {
  it('should record event metrics', () => {
    const metric = eventMetrics.recordMetric({
      topic: 'orders',
      throughput: 100.5,
      eventCount: 1000,
      errorCount: 5
    });

    expect(metric.errorRate).toBeGreaterThan(0);
    expect(metric.throughput).toBe(100.5);
  });

  it('should track consumer lag', () => {
    const lag = consumerLagMonitor.recordLag({
      consumer: 'notifications-service',
      topic: 'user.events',
      lag: 2000,
      offset: 1500
    });

    expect(lag.lag).toBe(2000);

    const retrieved = consumerLagMonitor.getLag('notifications-service', 'user.events');
    expect(retrieved?.lag).toBe(2000);
  });

  it('should trace event execution', () => {
    const trace = eventTracer.startTrace({
      eventId: 'evt-123',
      correlationId: 'cmd-1'
    });

    expect(trace).toBeDefined();
    expect(trace.correlationId).toBe('cmd-1');

    eventTracer.recordHandlerExecution('evt-123', 'notificationHandler', 150, 'success');

    const retrieved = eventTracer.getTrace('evt-123');
    expect(retrieved?.path.length).toBe(1);
  });

  it('should provide latency percentiles', () => {
    const percentiles = eventTracer.getLatencyPercentiles('UserCreated');

    expect(percentiles.p50).toBeGreaterThanOrEqual(0);
    expect(percentiles.p95).toBeGreaterThanOrEqual(0);
    expect(percentiles.p99).toBeGreaterThanOrEqual(0);
  });
});
