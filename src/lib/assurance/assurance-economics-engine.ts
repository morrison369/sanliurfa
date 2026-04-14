/**
 * Phase 218: Assurance Economics Engine
 */

import { logger } from '../logger';

export interface AssuranceCostProfile {
  profileId: string;
  fixedCost: number;
  variableCost: number;
  avoidedLoss: number;
}

class EconomicsCalculator {
  totalCost(profile: AssuranceCostProfile): number {
    return profile.fixedCost + profile.variableCost;
  }

  netBenefit(profile: AssuranceCostProfile): number {
    return profile.avoidedLoss - this.totalCost(profile);
  }
}

class CostDriverAnalyzer {
  dominantDriver(profile: AssuranceCostProfile): 'fixed' | 'variable' {
    return profile.fixedCost >= profile.variableCost ? 'fixed' : 'variable';
  }
}

class MarginalBenefitEstimator {
  estimate(currentBenefit: number, additionalSpend: number, efficiency = 0.2): number {
    return Math.round((currentBenefit + additionalSpend * efficiency) * 10) / 10;
  }
}

class EconomicsReportBuilder {
  build(profile: AssuranceCostProfile): { totalCost: number; netBenefit: number; roi: number } {
    const calc = new EconomicsCalculator();
    const totalCost = calc.totalCost(profile);
    const netBenefit = calc.netBenefit(profile);
    const roi = totalCost > 0 ? Math.round((netBenefit / totalCost) * 1000) / 10 : 0;
    logger.debug('Assurance economics report generated', { totalCost, netBenefit, roi });
    return { totalCost, netBenefit, roi };
  }
}

export const economicsCalculator = new EconomicsCalculator();
export const costDriverAnalyzer = new CostDriverAnalyzer();
export const marginalBenefitEstimator = new MarginalBenefitEstimator();
export const economicsReportBuilder = new EconomicsReportBuilder();

export {
  EconomicsCalculator,
  CostDriverAnalyzer,
  MarginalBenefitEstimator,
  EconomicsReportBuilder
};


