/**
 * Phase 287: Governance Assurance Feedback Loop
 */

import { logger } from '../logger';

export interface AssuranceFeedback {
  feedbackId: string;
  source: string;
  score: number;
  actionability: number;
}

class FeedbackIntakeBuffer {
  private items: AssuranceFeedback[] = [];

  push(item: AssuranceFeedback): AssuranceFeedback {
    this.items.push(item);
    return item;
  }

  list(): AssuranceFeedback[] {
    return this.items;
  }
}

class FeedbackSignalAnalyzer {
  analyze(item: AssuranceFeedback): number {
    return Math.round((item.score * 0.6 + item.actionability * 0.4) * 10) / 10;
  }
}

class FeedbackActionPlanner {
  plan(item: AssuranceFeedback): 'immediate' | 'scheduled' {
    return item.actionability >= 70 ? 'immediate' : 'scheduled';
  }
}

class FeedbackLoopReporter {
  report(feedbackId: string, route: string): string {
    const text = `Feedback ${feedbackId} routed=${route}`;
    logger.debug('Feedback loop report', { feedbackId, route });
    return text;
  }
}

export const feedbackIntakeBuffer = new FeedbackIntakeBuffer();
export const feedbackSignalAnalyzer = new FeedbackSignalAnalyzer();
export const feedbackActionPlanner = new FeedbackActionPlanner();
export const feedbackLoopReporter = new FeedbackLoopReporter();

export {
  FeedbackIntakeBuffer,
  FeedbackSignalAnalyzer,
  FeedbackActionPlanner,
  FeedbackLoopReporter
};


