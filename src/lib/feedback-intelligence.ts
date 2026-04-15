/**
 * Phase 219: Feedback Intelligence
 * Topic extraction, issue clustering, priority ranking, closed-loop tracking
 */

import { logger } from './logger';

interface FeedbackTopic {
  topicId: string;
  name: string;
  keywords: string[];
  feedbackCount: number;
  avgSentimentScore: number;
  trend: 'rising' | 'falling' | 'stable';
  lastDetectedAt: number;
}

interface IssueCluster {
  clusterId: string;
  title: string;
  rootCause: string;
  affectedFeedbackIds: string[];
  affectedCustomerCount: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'wont_fix';
  createdAt: number;
  resolvedAt?: number;
}

interface FeedbackPriorityItem {
  priorityId: string;
  feedbackId: string;
  customerId: string;
  urgencyScore: number;   // 0-100
  impactScore: number;    // 0-100
  priorityScore: number;  // composite
  category: string;
  assignedTo?: string;
  status: 'unreviewed' | 'in_review' | 'actioned' | 'closed';
  createdAt: number;
}

interface ClosedLoopRecord {
  loopId: string;
  feedbackId: string;
  customerId: string;
  contactedAt?: number;
  responseChannel: string;
  resolutionSummary: string;
  customerSatisfied: boolean;
  timeToCloseMs: number;
  status: 'pending' | 'contacted' | 'resolved' | 'escalated';
  createdAt: number;
}

class FeedbackTopicExtractor {
  private topics: Map<string, FeedbackTopic> = new Map();
  private counter = 0;

  defineTopic(name: string, keywords: string[]): FeedbackTopic {
    const topicId = `topic-${Date.now()}-${++this.counter}`;
    const topic: FeedbackTopic = {
      topicId, name, keywords, feedbackCount: 0,
      avgSentimentScore: 5, trend: 'stable', lastDetectedAt: Date.now()
    };
    this.topics.set(name, topic);
    return topic;
  }

  extract(text: string, sentimentScore: number): string[] {
    const lower = text.toLowerCase();
    const matched: string[] = [];
    for (const [name, topic] of this.topics.entries()) {
      if (topic.keywords.some(k => lower.includes(k.toLowerCase()))) {
        matched.push(name);
        const prev = topic.feedbackCount;
        topic.feedbackCount++;
        topic.avgSentimentScore = (topic.avgSentimentScore * prev + sentimentScore) / topic.feedbackCount;
        topic.lastDetectedAt = Date.now();
      }
    }
    return matched;
  }

  getTrending(limit = 5): FeedbackTopic[] {
    return Array.from(this.topics.values())
      .sort((a, b) => b.feedbackCount - a.feedbackCount)
      .slice(0, limit);
  }

  getLowSentimentTopics(threshold = 4): FeedbackTopic[] {
    return Array.from(this.topics.values())
      .filter(t => t.feedbackCount > 0 && t.avgSentimentScore < threshold)
      .sort((a, b) => a.avgSentimentScore - b.avgSentimentScore);
  }
}

class IssueClusteringEngine {
  private clusters: Map<string, IssueCluster> = new Map();
  private counter = 0;

  createCluster(title: string, rootCause: string, feedbackIds: string[], customerCount: number, severity: IssueCluster['severity']): IssueCluster {
    const clusterId = `cluster-${Date.now()}-${++this.counter}`;
    const cluster: IssueCluster = {
      clusterId, title, rootCause,
      affectedFeedbackIds: feedbackIds,
      affectedCustomerCount: customerCount,
      severity, status: 'open', createdAt: Date.now()
    };
    this.clusters.set(clusterId, cluster);
    logger.debug('Issue cluster created', { clusterId, title, severity, customerCount });
    return cluster;
  }

  addFeedback(clusterId: string, feedbackId: string): boolean {
    const cluster = this.clusters.get(clusterId);
    if (cluster && !cluster.affectedFeedbackIds.includes(feedbackId)) {
      cluster.affectedFeedbackIds.push(feedbackId);
      return true;
    }
    return false;
  }

  resolve(clusterId: string): boolean {
    const cluster = this.clusters.get(clusterId);
    if (cluster) { cluster.status = 'resolved'; cluster.resolvedAt = Date.now(); return true; }
    return false;
  }

  getOpenClusters(severity?: IssueCluster['severity']): IssueCluster[] {
    return Array.from(this.clusters.values())
      .filter(c => c.status === 'open' && (!severity || c.severity === severity))
      .sort((a, b) => b.affectedCustomerCount - a.affectedCustomerCount);
  }

  getCluster(clusterId: string): IssueCluster | undefined {
    return this.clusters.get(clusterId);
  }
}

class FeedbackPriorityRanker {
  private items: Map<string, FeedbackPriorityItem> = new Map();
  private counter = 0;

  rank(feedbackId: string, customerId: string, urgencyScore: number, impactScore: number, category: string): FeedbackPriorityItem {
    const priorityId = `priority-${Date.now()}-${++this.counter}`;
    const priorityScore = urgencyScore * 0.4 + impactScore * 0.6;
    const item: FeedbackPriorityItem = {
      priorityId, feedbackId, customerId, urgencyScore, impactScore,
      priorityScore, category, status: 'unreviewed', createdAt: Date.now()
    };
    this.items.set(priorityId, item);
    return item;
  }

  assign(priorityId: string, assignedTo: string): boolean {
    const item = this.items.get(priorityId);
    if (item) { item.assignedTo = assignedTo; item.status = 'in_review'; return true; }
    return false;
  }

  close(priorityId: string): boolean {
    const item = this.items.get(priorityId);
    if (item) { item.status = 'closed'; return true; }
    return false;
  }

  getTopPriority(limit = 10): FeedbackPriorityItem[] {
    return Array.from(this.items.values())
      .filter(i => i.status === 'unreviewed' || i.status === 'in_review')
      .sort((a, b) => b.priorityScore - a.priorityScore)
      .slice(0, limit);
  }

  getUnassigned(): FeedbackPriorityItem[] {
    return Array.from(this.items.values()).filter(i => !i.assignedTo && i.status === 'unreviewed');
  }
}

class ClosedLoopTracker {
  private records: Map<string, ClosedLoopRecord> = new Map();
  private counter = 0;

  initiate(feedbackId: string, customerId: string, responseChannel: string): ClosedLoopRecord {
    const loopId = `loop-${Date.now()}-${++this.counter}`;
    const record: ClosedLoopRecord = {
      loopId, feedbackId, customerId, responseChannel,
      resolutionSummary: '', customerSatisfied: false,
      timeToCloseMs: 0, status: 'pending', createdAt: Date.now()
    };
    this.records.set(loopId, record);
    return record;
  }

  contact(loopId: string): boolean {
    const record = this.records.get(loopId);
    if (record && record.status === 'pending') { record.status = 'contacted'; record.contactedAt = Date.now(); return true; }
    return false;
  }

  resolve(loopId: string, summary: string, customerSatisfied: boolean): boolean {
    const record = this.records.get(loopId);
    if (record) {
      record.status = 'resolved';
      record.resolutionSummary = summary;
      record.customerSatisfied = customerSatisfied;
      record.timeToCloseMs = Date.now() - record.createdAt;
      return true;
    }
    return false;
  }

  getClosureRate(): number {
    const all = Array.from(this.records.values());
    if (!all.length) return 0;
    return (all.filter(r => r.status === 'resolved').length / all.length) * 100;
  }

  getAvgTimeToClose(): number {
    const resolved = Array.from(this.records.values()).filter(r => r.timeToCloseMs > 0);
    if (!resolved.length) return 0;
    return resolved.reduce((s, r) => s + r.timeToCloseMs, 0) / resolved.length;
  }

  getSatisfactionRate(): number {
    const resolved = Array.from(this.records.values()).filter(r => r.status === 'resolved');
    if (!resolved.length) return 0;
    return (resolved.filter(r => r.customerSatisfied).length / resolved.length) * 100;
  }
}

export const feedbackTopicExtractor = new FeedbackTopicExtractor();
export const issueClusteringEngine = new IssueClusteringEngine();
export const feedbackPriorityRanker = new FeedbackPriorityRanker();
export const closedLoopTracker = new ClosedLoopTracker();

export { FeedbackTopic, IssueCluster, FeedbackPriorityItem, ClosedLoopRecord };
