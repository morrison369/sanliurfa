/**
 * Unit Tests - message/message-broker.ts (Phase 132 Redis Streams)
 *
 * - MessageBroker (publish + getMessages + updateStatus + incrementRetry → DLQ at 3 retries)
 * - StreamConsumer (readMessages + acknowledge + nack + offset)
 * - ConsumerGroup (createGroup + addConsumer + getGroupInfo + removeConsumer)
 * - StreamMetrics (recordMessage + getThroughput + getLag + getMetrics)
 *
 * vi.mock cache - redis lpush/expire no-op.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../cache', () => ({
  redis: {
    lpush: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  },
}));

import { messageBroker, consumerGroup, streamMetrics } from '../message/message-broker';
import { streamConsumer as StreamConsumer } from '../message/message-broker';

const uniq = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

describe('MessageBroker.publish', () => {
  it('publish - id prefix "msg-" + return id', async () => {
    const id = await messageBroker.publish(uniq('topic'), { foo: 'bar' });
    expect(id.startsWith('msg-')).toBe(true);
  });

  it('publish - getMessage returns full message struct', async () => {
    const topic = uniq('topic');
    const id = await messageBroker.publish(topic, { x: 1 });
    const m = messageBroker.getMessage(id);
    expect(m?.topic).toBe(topic);
    expect(m?.status).toBe('pending');
    expect(m?.retryCount).toBe(0);
  });
});

describe('MessageBroker.getMessages', () => {
  it('getMessages - topic filter + limit', async () => {
    const topic = uniq('topic');
    for (let i = 0; i < 5; i++) {
      await messageBroker.publish(topic, { i });
    }
    const r = messageBroker.getMessages(topic, 3);
    expect(r.length).toBeLessThanOrEqual(3);
    expect(r.every((m) => m.topic === topic)).toBe(true);
  });

  it('getMessage - bilinmeyen id → undefined', () => {
    expect(messageBroker.getMessage('non-existent')).toBeUndefined();
  });
});

describe('MessageBroker.updateMessageStatus / incrementRetry', () => {
  it('updateMessageStatus - status değişir', async () => {
    const id = await messageBroker.publish(uniq('topic'), {});
    messageBroker.updateMessageStatus(id, 'delivered');
    expect(messageBroker.getMessage(id)?.status).toBe('delivered');
  });

  it('incrementRetry - retry counter artar', async () => {
    const id = await messageBroker.publish(uniq('topic'), {});
    messageBroker.incrementRetry(id);
    expect(messageBroker.getMessage(id)?.retryCount).toBe(1);
  });

  it('incrementRetry - 3 retry sonrası status DLQ', async () => {
    const id = await messageBroker.publish(uniq('topic'), {});
    messageBroker.incrementRetry(id);
    messageBroker.incrementRetry(id);
    messageBroker.incrementRetry(id);
    expect(messageBroker.getMessage(id)?.status).toBe('dlq');
  });

  it('updateMessageStatus / incrementRetry - bilinmeyen id no-throw', () => {
    expect(() => messageBroker.updateMessageStatus('non-existent', 'failed')).not.toThrow();
    expect(() => messageBroker.incrementRetry('non-existent')).not.toThrow();
  });
});

describe('MessageBroker.getMetrics', () => {
  it('getMetrics - topic aggregation', async () => {
    const topic = uniq('topic');
    await messageBroker.publish(topic, {});
    const m = messageBroker.getMetrics();
    expect(m[topic]).toBeDefined();
    expect(m[topic].messageCount).toBeGreaterThanOrEqual(1);
  });
});

describe('StreamConsumer', () => {
  it('constructor + getConsumerId', () => {
    const c = new StreamConsumer('consumer-x');
    expect(c.getConsumerId()).toBe('consumer-x');
  });

  it('readMessages - delegate to messageBroker.getMessages', async () => {
    const c = new StreamConsumer('consumer-r');
    const topic = uniq('topic');
    await messageBroker.publish(topic, {});
    const r = await c.readMessages(topic, { count: 5 });
    expect(Array.isArray(r)).toBe(true);
  });

  it('acknowledge - status delivered', async () => {
    const c = new StreamConsumer('consumer-a');
    const id = await messageBroker.publish(uniq('topic'), {});
    c.acknowledge(id);
    expect(messageBroker.getMessage(id)?.status).toBe('delivered');
  });

  it('nack - retry counter artar', async () => {
    const c = new StreamConsumer('consumer-n');
    const id = await messageBroker.publish(uniq('topic'), {});
    c.nack(id);
    expect(messageBroker.getMessage(id)?.retryCount).toBe(1);
  });

  it('setOffset / getOffset', () => {
    const c = new StreamConsumer('consumer-o');
    expect(c.getOffset()).toBe('0');
    c.setOffset('100');
    expect(c.getOffset()).toBe('100');
  });
});

describe('ConsumerGroup', () => {
  it('createGroup + addConsumer - return StreamConsumer', () => {
    const group = uniq('group');
    consumerGroup.createGroup({ name: group, topic: 'orders' });
    const c = consumerGroup.addConsumer(group, 'orders');
    expect(c.getConsumerId().startsWith('consumer-')).toBe(true);
  });

  it('addConsumer - bilinmeyen group → auto createGroup', () => {
    const group = uniq('auto-group');
    const c = consumerGroup.addConsumer(group, 'topic-x');
    expect(c).toBeDefined();
  });

  it('getGroupInfo - config + consumerCount', () => {
    const group = uniq('info-group');
    consumerGroup.createGroup({ name: group, topic: 't' });
    consumerGroup.addConsumer(group, 't');
    const info = consumerGroup.getGroupInfo(group);
    expect(info?.consumerCount).toBe(1);
  });

  it('getGroupInfo - bilinmeyen → null', () => {
    expect(consumerGroup.getGroupInfo('non-existent')).toBeNull();
  });

  it('removeConsumer + listGroups + deleteGroup', () => {
    const group = uniq('del-group');
    consumerGroup.createGroup({ name: group, topic: 't' });
    expect(consumerGroup.listGroups()).toContain(group);
    consumerGroup.deleteGroup(group);
    expect(consumerGroup.listGroups()).not.toContain(group);
  });
});

describe('StreamMetrics', () => {
  it('recordMessage + getThroughput - messages per second', () => {
    const topic = uniq('metric');
    streamMetrics.recordMessage(topic);
    streamMetrics.recordMessage(topic);
    const tp = streamMetrics.getThroughput(topic, 60);
    expect(typeof tp).toBe('number');
    expect(tp).toBeGreaterThanOrEqual(0);
  });

  it('getLag - boş topic → 0', () => {
    expect(streamMetrics.getLag(`non-existent-${Date.now()}`)).toBe(0);
  });

  it('getMetrics - throughput + lag + messageCount', () => {
    const topic = uniq('full');
    streamMetrics.recordMessage(topic);
    const m = streamMetrics.getMetrics(topic);
    expect(typeof m.throughput).toBe('number');
    expect(typeof m.lag).toBe('number');
  });

  it('getTopics - kayıtlı topic listesi', () => {
    streamMetrics.recordMessage(uniq('topic'));
    expect(Array.isArray(streamMetrics.getTopics())).toBe(true);
  });
});
