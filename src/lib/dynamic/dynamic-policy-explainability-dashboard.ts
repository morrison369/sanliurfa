/**
 * Phase 245: Dynamic Policy Explainability Dashboard
 */

import { logger } from '../logger';

export interface ExplainabilityMetric {
  policyId: string;
  coverage: number;
  confidence: number;
}

class ExplainabilityWidgetBuilder {
  build(metric: ExplainabilityMetric): { policyId: string; score: number } {
    const score = Math.round((metric.coverage * 0.6 + metric.confidence * 0.4) * 10) / 10;
    return { policyId: metric.policyId, score };
  }
}

class ExplainabilityGapDetector {
  detect(metrics: ExplainabilityMetric[], threshold: number): ExplainabilityMetric[] {
    return metrics.filter(m => m.confidence < threshold || m.coverage < threshold);
  }
}

class ExplainabilityDrilldownEngine {
  drilldown(policyId: string, controls: string[]): { policyId: string; controls: string[]; depth: number } {
    return { policyId, controls, depth: controls.length };
  }
}

class ExplainabilityDashboardPublisher {
  publish(summary: string): string {
    logger.debug('Explainability dashboard published', { summary });
    return `Dashboard published: ${summary}`;
  }
}

export const explainabilityWidgetBuilder = new ExplainabilityWidgetBuilder();
export const explainabilityGapDetector = new ExplainabilityGapDetector();
export const explainabilityDrilldownEngine = new ExplainabilityDrilldownEngine();
export const explainabilityDashboardPublisher = new ExplainabilityDashboardPublisher();

export {
  ExplainabilityWidgetBuilder,
  ExplainabilityGapDetector,
  ExplainabilityDrilldownEngine,
  ExplainabilityDashboardPublisher
};

