/**
 * Phase 199: Regulatory Intelligence Feeds
 */

import { logger } from '../logger';

export interface RegulatoryFeedItem {
  itemId: string;
  jurisdiction: string;
  title: string;
  publishedAt: number;
  impact: 'low' | 'medium' | 'high';
}

class RegulatoryFeedIngestor {
  ingest(items: RegulatoryFeedItem[]): { ingested: number } {
    return { ingested: items.length };
  }
}

class RegulatoryChangeClassifier {
  classify(item: RegulatoryFeedItem): 'monitor' | 'review' | 'urgent' {
    if (item.impact === 'high') return 'urgent';
    if (item.impact === 'medium') return 'review';
    return 'monitor';
  }
}

class RegulatoryRelevanceScorer {
  score(item: RegulatoryFeedItem, domains: string[]): number {
    const relevance = domains.some(d => item.title.toLowerCase().includes(d.toLowerCase())) ? 80 : 40;
    return item.impact === 'high' ? relevance + 15 : relevance;
  }
}

class RegulatoryAlertPublisher {
  publish(item: RegulatoryFeedItem, category: string): { channel: 'email' | 'slack'; message: string } {
    const channel: 'email' | 'slack' = category === 'urgent' ? 'slack' : 'email';
    const message = `[${item.jurisdiction}] ${item.title} (${category})`;
    logger.debug('Regulatory alert published', { itemId: item.itemId, channel });
    return { channel, message };
  }
}

export const regulatoryFeedIngestor = new RegulatoryFeedIngestor();
export const regulatoryChangeClassifier = new RegulatoryChangeClassifier();
export const regulatoryRelevanceScorer = new RegulatoryRelevanceScorer();
export const regulatoryAlertPublisher = new RegulatoryAlertPublisher();

export {
  RegulatoryFeedIngestor,
  RegulatoryChangeClassifier,
  RegulatoryRelevanceScorer,
  RegulatoryAlertPublisher
};


