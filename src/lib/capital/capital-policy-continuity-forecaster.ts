/**
 * Phase 286: Capital Policy Continuity Forecaster
 */

import { logger } from '../logger';

export interface ContinuityCapitalInput {
  policyId: string;
  baseCapital: number;
  continuityFactor: number;
}

class ContinuityForecastModel {
  forecast(input: ContinuityCapitalInput): number {
    return Math.round((input.baseCapital * input.continuityFactor) * 10) / 10;
  }
}

class ForecastScenarioBuilder {
  build(policyId: string, baseCapital: number, factors: number[]): ContinuityCapitalInput[] {
    return factors.map((factor, index) => ({ policyId: `${policyId}-${index + 1}`, baseCapital, continuityFactor: factor }));
  }
}

class ForecastAlertPolicy {
  alert(forecastedCapital: number, floor: number): boolean {
    return forecastedCapital < floor;
  }
}

class ContinuityForecastReporter {
  report(policyId: string, forecastedCapital: number): string {
    const text = `Continuity forecast ${policyId}: ${forecastedCapital}`;
    logger.debug('Continuity forecast report', { policyId, forecastedCapital });
    return text;
  }
}

export const continuityForecastModel = new ContinuityForecastModel();
export const forecastScenarioBuilder = new ForecastScenarioBuilder();
export const forecastAlertPolicy = new ForecastAlertPolicy();
export const continuityForecastReporter = new ContinuityForecastReporter();

export {
  ContinuityForecastModel,
  ForecastScenarioBuilder,
  ForecastAlertPolicy,
  ContinuityForecastReporter
};

