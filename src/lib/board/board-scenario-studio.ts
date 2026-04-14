/**
 * Phase 213: Board Scenario Studio
 */

import { logger } from '../logger';

export interface BoardScenario {
  scenarioId: string;
  name: string;
  assumptions: string[];
  probability: number;
}

class BoardScenarioManager {
  private scenarios: BoardScenario[] = [];
  private counter = 0;

  create(name: string, assumptions: string[], probability: number): BoardScenario {
    const s: BoardScenario = {
      scenarioId: `board-scn-${Date.now()}-${++this.counter}`,
      name,
      assumptions,
      probability
    };
    this.scenarios.push(s);
    return s;
  }

  list(): BoardScenario[] {
    return this.scenarios;
  }
}

class ScenarioProbabilityCalibrator {
  calibrate(raw: number, confidence: number): number {
    const v = raw * (confidence / 100);
    return Math.round(Math.max(0, Math.min(100, v)) * 10) / 10;
  }
}

class ScenarioOptionComparator {
  compare(a: BoardScenario, b: BoardScenario): BoardScenario {
    return a.probability >= b.probability ? a : b;
  }
}

class ScenarioNarrativeBuilder {
  build(s: BoardScenario): string {
    const text = `${s.name}: probability ${s.probability}%, assumptions=${s.assumptions.length}`;
    logger.debug('Board scenario narrative created', { scenarioId: s.scenarioId });
    return text;
  }
}

export const boardScenarioManager = new BoardScenarioManager();
export const scenarioProbabilityCalibrator = new ScenarioProbabilityCalibrator();
export const scenarioOptionComparator = new ScenarioOptionComparator();
export const scenarioNarrativeBuilder = new ScenarioNarrativeBuilder();

export {
  BoardScenarioManager,
  ScenarioProbabilityCalibrator,
  ScenarioOptionComparator,
  ScenarioNarrativeBuilder
};


