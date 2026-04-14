/**
 * Phase 240: Governance Counterfactual Simulation Hub
 */

import { logger } from '../logger';

export interface CounterfactualScenario {
  scenarioId: string;
  baseline: number;
  intervention: number;
}

class ScenarioCatalog {
  private scenarios: CounterfactualScenario[] = [];

  add(scenario: CounterfactualScenario): CounterfactualScenario {
    this.scenarios.push(scenario);
    return scenario;
  }

  list(): CounterfactualScenario[] {
    return this.scenarios;
  }
}

class CounterfactualRunner {
  run(scenario: CounterfactualScenario): number {
    return Math.round((scenario.baseline + scenario.intervention) * 10) / 10;
  }
}

class ScenarioSensitivityAnalyzer {
  sensitivity(outcomes: number[]): number {
    if (outcomes.length === 0) return 0;
    const min = Math.min(...outcomes);
    const max = Math.max(...outcomes);
    return Math.round((max - min) * 10) / 10;
  }
}

class CounterfactualInsightEmitter {
  insight(scenarioId: string, outcome: number): string {
    const text = `Counterfactual ${scenarioId} outcome: ${outcome}.`;
    logger.debug('Counterfactual insight emitted', { scenarioId, outcome });
    return text;
  }
}

export const scenarioCatalog = new ScenarioCatalog();
export const counterfactualRunner = new CounterfactualRunner();
export const scenarioSensitivityAnalyzer = new ScenarioSensitivityAnalyzer();
export const counterfactualInsightEmitter = new CounterfactualInsightEmitter();

export {
  ScenarioCatalog,
  CounterfactualRunner,
  ScenarioSensitivityAnalyzer,
  CounterfactualInsightEmitter
};

