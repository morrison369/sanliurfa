/**
 * Phase 274: Resilience Capital Stress Forecaster
 */

import { logger } from '../logger';

export interface CapitalStressInput {
  scenarioId: string;
  baseCapital: number;
  stressFactor: number;
}

class StressForecastModel {
  forecast(input: CapitalStressInput): number {
    return Math.round((input.baseCapital * (1 - input.stressFactor)) * 10) / 10;
  }
}

class StressScenarioGenerator {
  generate(baseCapital: number, factors: number[]): CapitalStressInput[] {
    return factors.map((factor, idx) => ({ scenarioId: `stress-${idx + 1}`, baseCapital, stressFactor: factor }));
  }
}

class StressAlertGuard {
  alert(forecastCapital: number, minCapital: number): boolean {
    return forecastCapital < minCapital;
  }
}

class StressForecastReporter {
  report(scenarioId: string, forecastCapital: number): string {
    const text = `Stress forecast ${scenarioId}: capital=${forecastCapital}`;
    logger.debug('Stress forecast report', { scenarioId, forecastCapital });
    return text;
  }
}

export const stressForecastModel = new StressForecastModel();
export const stressScenarioGenerator = new StressScenarioGenerator();
export const stressAlertGuard = new StressAlertGuard();
export const stressForecastReporter = new StressForecastReporter();

export {
  StressForecastModel,
  StressScenarioGenerator,
  StressAlertGuard,
  StressForecastReporter
};

