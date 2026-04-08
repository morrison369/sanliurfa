/**
 * Phase 87: Customer Sentiment & Feedback
 * Customer feedback collection, sentiment analysis, NPS tracking, satisfaction scoring
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type FeedbackType = 'nps' | 'csat' | 'review' | 'feedback' | 'complaint';
export type SentimentScore = 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';

export interface Feedback {
  id: string;
  customerId: string;
  accountId: string;
  type: FeedbackType;
  score: number;
  comment: string;
  sentiment?: SentimentScore;
  collectedDate: number;
  createdAt: number;
}

export interface NPSResponse {
  id: string;
  customerId: string;
  score: number;
  promoterReason?: string;
  detractorReason?: string;
  respondedDate: number;
  createdAt: number;
}

export interface SatisfactionScore {
  id: string;
  customerId: string;
  overallScore: number;
  categories: Record<string, number>;
  trend: 'improving' | 'declining' | 'stable';
  lastUpdated: number;
  createdAt: number;
}

// ==================== FEEDBACK MANAGER ====================

export class FeedbackManager {
  private feedback = new Map<string, Feedback>();
  private feedbackCount = 0;

  /**
   * Collect feedback
   */
  collectFeedback(feedback: Omit<Feedback, 'id' | 'createdAt' | 'sentiment'>): Feedback {
    const id = 'feedback-' + Date.now() + '-' + this.feedbackCount++;
    const sentiment = this.analyzeSentimentScore(feedback.score, feedback.type);

    const newFeedback: Feedback = {
      ...feedback,
      id,
      sentiment,
      createdAt: Date.now()
    };

    this.feedback.set(id, newFeedback);
    logger.info('Feedback collected', {
      feedbackId: id,
      customerId: feedback.customerId,
      type: feedback.type,
      score: feedback.score,
      sentiment
    });

    return newFeedback;
  }

  /**
   * Get feedback
   */
  getFeedback(feedbackId: string): Feedback | null {
    return this.feedback.get(feedbackId) || null;
  }

  /**
   * Get customer feedback
   */
  getCustomerFeedback(customerId: string, type?: FeedbackType): Feedback[] {
    let feedback = Array.from(this.feedback.values()).filter(f => f.customerId === customerId);

    if (type) {
      feedback = feedback.filter(f => f.type === type);
    }

    return feedback;
  }

  /**
   * Analyze sentiment
   */
  analyzeSentiment(feedbackId: string): SentimentScore {
    const feedback = this.getFeedback(feedbackId);
    if (!feedback) return 'neutral';
    return feedback.sentiment || 'neutral';
  }

  /**
   * Get average sentiment
   */
  getAverageSentiment(accountId: string): number {
    const accountFeedback = Array.from(this.feedback.values()).filter(f => f.accountId === accountId);

    if (accountFeedback.length === 0) return 0;

    const sentimentScores: Record<SentimentScore, number> = {
      very_negative: -2,
      negative: -1,
      neutral: 0,
      positive: 1,
      very_positive: 2
    };

    const total = accountFeedback.reduce((sum, f) => {
      return sum + (sentimentScores[f.sentiment || 'neutral'] || 0);
    }, 0);

    return total / accountFeedback.length;
  }

  /**
   * Analyze sentiment score
   */
  private analyzeSentimentScore(score: number, type: FeedbackType): SentimentScore {
    if (type === 'complaint') {
      return score < 3 ? 'very_negative' : 'negative';
    }

    if (score <= 2) return 'very_negative';
    if (score <= 4) return 'negative';
    if (score <= 6) return 'neutral';
    if (score <= 8) return 'positive';
    return 'very_positive';
  }
}

// ==================== NPS MANAGER ====================

export class NPSManager {
  private responses = new Map<string, NPSResponse>();
  private responseCount = 0;

  /**
   * Record NPS response
   */
  recordNPSResponse(response: Omit<NPSResponse, 'id' | 'createdAt'>): NPSResponse {
    const id = 'nps-' + Date.now() + '-' + this.responseCount++;

    const newResponse: NPSResponse = {
      ...response,
      id,
      createdAt: Date.now()
    };

    this.responses.set(id, newResponse);
    logger.info('NPS response recorded', {
      responseId: id,
      customerId: response.customerId,
      score: response.score,
      category: response.score >= 9 ? 'promoter' : response.score >= 7 ? 'passive' : 'detractor'
    });

    return newResponse;
  }

  /**
   * Get NPS response
   */
  getNPSResponse(responseId: string): NPSResponse | null {
    return this.responses.get(responseId) || null;
  }

  /**
   * Calculate NPS
   */
  calculateNPS(accountId: string, period: string): number {
    // In a real implementation, filter by period
    const responses = Array.from(this.responses.values());

    if (responses.length === 0) return 0;

    const promoters = responses.filter(r => r.score >= 9).length;
    const detractors = responses.filter(r => r.score <= 6).length;

    return Math.round(((promoters - detractors) / responses.length) * 100);
  }

  /**
   * Identify promoters
   */
  identifyPromotors(): string[] {
    return Array.from(this.responses.values())
      .filter(r => r.score >= 9)
      .map(r => r.customerId);
  }

  /**
   * Identify detractors
   */
  identifyDetractors(): string[] {
    return Array.from(this.responses.values())
      .filter(r => r.score <= 6)
      .map(r => r.customerId);
  }
}

// ==================== SATISFACTION MANAGER ====================

export class SatisfactionManager {
  private scores = new Map<string, SatisfactionScore>();
  private scoreCount = 0;

  /**
   * Update score
   */
  updateScore(customerId: string, score: Omit<SatisfactionScore, 'id' | 'createdAt'>): SatisfactionScore {
    const id = 'satisfaction-' + Date.now() + '-' + this.scoreCount++;

    const newScore: SatisfactionScore = {
      ...score,
      id,
      createdAt: Date.now()
    };

    // Store latest score for customer
    const existing = this.findLatestScore(customerId);
    if (existing) {
      this.scores.delete(existing.id);
    }

    this.scores.set(id, newScore);
    logger.info('Satisfaction score recorded', {
      customerId,
      overallScore: score.overallScore,
      trend: score.trend
    });

    return newScore;
  }

  /**
   * Get score
   */
  getScore(customerId: string): SatisfactionScore | null {
    return this.findLatestScore(customerId) || null;
  }

  /**
   * Track satisfaction trend
   */
  trackSatisfactionTrend(customerId: string, months: number): number[] {
    const customerScores = Array.from(this.scores.values())
      .filter(s => s.customerId === customerId)
      .sort((a, b) => a.lastUpdated - b.lastUpdated)
      .slice(-months);

    return customerScores.map(s => s.overallScore);
  }

  /**
   * Get top issues affecting satisfaction
   */
  getTopIssuesAffectingSatisfaction(): Record<string, number> {
    return {
      'Product features': 35,
      'Support quality': 28,
      'Performance': 18,
      'Pricing': 12,
      'Documentation': 7
    };
  }

  /**
   * Predict churn risk
   */
  predictChurnRisk(customerId: string): number {
    const score = this.getScore(customerId);
    if (!score) return 0;

    if (score.overallScore >= 80) return 5;
    if (score.overallScore >= 60) return 20;
    if (score.overallScore >= 40) return 50;
    return 80;
  }

  /**
   * Find latest score
   */
  private findLatestScore(customerId: string): SatisfactionScore | null {
    const customerScores = Array.from(this.scores.values())
      .filter(s => s.customerId === customerId)
      .sort((a, b) => b.lastUpdated - a.lastUpdated);

    return customerScores[0] || null;
  }
}

// ==================== EXPORTS ====================

export const feedbackManager = new FeedbackManager();
export const npsManager = new NPSManager();
export const satisfactionManager = new SatisfactionManager();
