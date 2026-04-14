/**
 * Phase 297: Resilience Governance Feedback Router
 */

import { logger } from '../logger';

export interface ResilienceFeedback {
  feedbackId: string;
  resilienceDelta: number;
  governanceUrgency: number;
  owner: string;
}

class ResilienceFeedbackBook {
  private feedbacks: ResilienceFeedback[] = [];

  add(feedback: ResilienceFeedback): ResilienceFeedback {
    this.feedbacks.push(feedback);
    return feedback;
  }

  list(): ResilienceFeedback[] {
    return this.feedbacks;
  }
}

class FeedbackRouteScorer {
  score(feedback: ResilienceFeedback): number {
    return Math.round((feedback.resilienceDelta * 0.5 + feedback.governanceUrgency * 0.5) * 10) / 10;
  }
}

class FeedbackRouteDirector {
  direct(feedback: ResilienceFeedback): string {
    if (feedback.governanceUrgency >= 75) return `${feedback.owner}-urgent`;
    return `${feedback.owner}-queue`;
  }
}

class FeedbackRoutingReporter {
  report(feedbackId: string, route: string): string {
    const text = `Feedback ${feedbackId} routed=${route}`;
    logger.debug('Feedback routing report', { feedbackId, route });
    return text;
  }
}

export const resilienceFeedbackBook = new ResilienceFeedbackBook();
export const feedbackRouteScorer = new FeedbackRouteScorer();
export const feedbackRouteDirector = new FeedbackRouteDirector();
export const feedbackRoutingReporter = new FeedbackRoutingReporter();

export {
  ResilienceFeedbackBook,
  FeedbackRouteScorer,
  FeedbackRouteDirector,
  FeedbackRoutingReporter
};

