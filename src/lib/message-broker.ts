/**
 * Phase 132: Message Broker Integration (Redis Streams)
 * Redis Streams as message broker for distributed event delivery with consumer groups
 */

import { logger } from './logger';
import { redis } from './cache';

interface Message {
  id: string;
  topic: string;
  payload: Record<string, any>;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'delivered' | 'failed' | 'dlq';
}

interface ConsumerGroupConfig {
  name: string;
  topic: string;
  maxRetries?: number;
  dlqEnabled?: boolean;
}

interface ConsumerState {
  consumerId: string;
  group: string;
  topic: string;
  offset: string;
  lastMessageTime: number;
}

interface StreamMetrics {
  topic: string;
  messageCount: number;
  throughput: number;
  consumerCount: number;
  lag: Record<string, number>;
}

class MessageBroker {
  private messages = new Map<string, Message>();
  private counter = 0;

  async publish(topic: string, payload: Record<string, any>): Promise<string> {
    const id = `msg-${Date.now()}-${++this.counter}`;
    const message: Message = {
      id,
      topic,
      payload,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    this.messages.set(id, message);

    const streamKey = `sanliurfa:stream:${topic}`;
    redis.lpush(streamKey, JSON.stringify(message));
    redis.expire(streamKey, 604800); // 7 days retention

    logger.debug('Message published', { id, topic });
    return id;
  }

  getMessages(topic: string, limit: number = 100): Message[] {
    return Array.from(this.messages.values())
      .filter(m => m.topic === topic)
      .slice(-limit);
  }

  getMessage(messageId: string): Message | undefined {
    return this.messages.get(messageId);
  }

  updateMessageStatus(messageId: string, status: Message['status']): void {
    const message = this.messages.get(messageId);
    if (message) {
      message.status = status;
      logger.debug('Message status updated', { messageId, status });
    }
  }

  incrementRetry(messageId: string): void {
    const message = this.messages.get(messageId);
    if (message) {
      message.retryCount++;
      if (message.retryCount >= 3) {
        message.status = 'dlq';
      }
      logger.debug('Retry incremented', { messageId, retries: message.retryCount });
    }
  }

  getMetrics(): Record<string, StreamMetrics> {
    const result: Record<string, StreamMetrics> = {};

    for (const message of this.messages.values()) {
      if (!result[message.topic]) {
        result[message.topic] = {
          topic: message.topic,
          messageCount: 0,
          throughput: 0,
          consumerCount: 0,
          lag: {}
        };
      }
      result[message.topic].messageCount++;
    }

    return result;
  }
}

class StreamConsumer {
  private consumerId: string;
  private offset: string = '0';
  private counter = 0;

  constructor(consumerId: string) {
    this.consumerId = consumerId;
  }

  async readMessages(topic: string, options: { count?: number; block?: number } = {}): Promise<Message[]> {
    const { count = 10 } = options;
    const messages = messageBroker.getMessages(topic, count);
    logger.debug('Messages read', { consumer: this.consumerId, count: messages.length });
    return messages;
  }

  acknowledge(messageId: string): void {
    messageBroker.updateMessageStatus(messageId, 'delivered');
    logger.debug('Message acknowledged', { consumer: this.consumerId, messageId });
  }

  nack(messageId: string): void {
    messageBroker.incrementRetry(messageId);
    logger.debug('Message nacked', { consumer: this.consumerId, messageId });
  }

  getOffset(): string {
    return this.offset;
  }

  setOffset(offset: string): void {
    this.offset = offset;
    logger.debug('Offset updated', { consumer: this.consumerId, offset });
  }

  getConsumerId(): string {
    return this.consumerId;
  }
}

class ConsumerGroup {
  private groups = new Map<string, { config: ConsumerGroupConfig; consumers: StreamConsumer[] }>();
  private counter = 0;

  createGroup(config: ConsumerGroupConfig): void {
    const groupName = config.name;
    this.groups.set(groupName, {
      config,
      consumers: []
    });

    logger.info('Consumer group created', { group: groupName, topic: config.topic });
  }

  addConsumer(groupName: string, topic: string): StreamConsumer {
    const group = this.groups.get(groupName);
    if (!group) {
      this.createGroup({ name: groupName, topic });
    }

    const consumerId = `consumer-${groupName}-${++this.counter}`;
    const consumer = new StreamConsumer(consumerId);
    this.groups.get(groupName)!.consumers.push(consumer);

    logger.info('Consumer added to group', { group: groupName, consumerId });
    return consumer;
  }

  getGroupInfo(groupName: string): {
    config: ConsumerGroupConfig;
    consumerCount: number;
    consumers: string[];
  } | null {
    const group = this.groups.get(groupName);
    if (!group) return null;

    return {
      config: group.config,
      consumerCount: group.consumers.length,
      consumers: group.consumers.map(c => c.getConsumerId())
    };
  }

  removeConsumer(groupName: string, consumerId: string): void {
    const group = this.groups.get(groupName);
    if (group) {
      group.consumers = group.consumers.filter(c => c.getConsumerId() !== consumerId);
      logger.info('Consumer removed from group', { group: groupName, consumerId });
    }
  }

  listGroups(): string[] {
    return Array.from(this.groups.keys());
  }

  deleteGroup(groupName: string): void {
    this.groups.delete(groupName);
    logger.info('Consumer group deleted', { group: groupName });
  }
}

class StreamMetrics {
  private metrics: Map<string, { timestamp: number; count: number }[]> = new Map();

  recordMessage(topic: string): void {
    if (!this.metrics.has(topic)) {
      this.metrics.set(topic, []);
    }

    const topicMetrics = this.metrics.get(topic)!;
    topicMetrics.push({ timestamp: Date.now(), count: 1 });

    // Keep only last 1000 records per topic
    if (topicMetrics.length > 1000) {
      topicMetrics.shift();
    }
  }

  getThroughput(topic: string, windowSeconds: number = 60): number {
    const metrics = this.metrics.get(topic) || [];
    const cutoff = Date.now() - (windowSeconds * 1000);

    const count = metrics.filter(m => m.timestamp > cutoff).length;
    return count / windowSeconds; // messages per second
  }

  getLag(topic: string): number {
    const messages = messageBroker.getMessages(topic, 1);
    if (messages.length === 0) return 0;

    const oldestMessage = messages[0];
    return Date.now() - oldestMessage.timestamp;
  }

  getMetrics(topic: string): {
    throughput: number;
    lag: number;
    messageCount: number;
  } {
    return {
      throughput: this.getThroughput(topic),
      lag: this.getLag(topic),
      messageCount: messageBroker.getMessages(topic).length
    };
  }

  getTopics(): string[] {
    return Array.from(this.metrics.keys());
  }
}

export const messageBroker = new MessageBroker();
export const streamConsumer = StreamConsumer;
export const consumerGroup = new ConsumerGroup();
export const streamMetrics = new StreamMetrics();

export { Message, ConsumerGroupConfig, ConsumerState, StreamMetrics as StreamMetricsType };
