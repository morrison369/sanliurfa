/**
 * Phase 207: Governance ROI Optimizer
 */

import { logger } from '../logger';

export interface GovernanceInvestment {
  initiativeId: string;
  cost: number;
  riskReductionValue: number;
  complianceLift: number;
}

class ROICalculator {
  roi(inv: GovernanceInvestment): number {
    if (inv.cost <= 0) return 0;
    return Math.round(((inv.riskReductionValue + inv.complianceLift) / inv.cost) * 1000) / 10;
  }
}

class InvestmentOptimizer {
  rank(investments: GovernanceInvestment[]): GovernanceInvestment[] {
    const calc = new ROICalculator();
    return [...investments].sort((a, b) => calc.roi(b) - calc.roi(a));
  }
}

class BudgetAllocator {
  allocate(investments: GovernanceInvestment[], budget: number): GovernanceInvestment[] {
    const ranked = new InvestmentOptimizer().rank(investments);
    const selected: GovernanceInvestment[] = [];
    let used = 0;
    for (const item of ranked) {
      if (used + item.cost <= budget) {
        selected.push(item);
        used += item.cost;
      }
    }
    return selected;
  }
}

class ROIReportGenerator {
  summarize(selected: GovernanceInvestment[]): { totalCost: number; totalValue: number; portfolioROI: number } {
    const totalCost = selected.reduce((a, b) => a + b.cost, 0);
    const totalValue = selected.reduce((a, b) => a + b.riskReductionValue + b.complianceLift, 0);
    const portfolioROI = totalCost > 0 ? Math.round((totalValue / totalCost) * 1000) / 10 : 0;
    logger.debug('Governance ROI report generated', { totalCost, totalValue, portfolioROI });
    return { totalCost, totalValue, portfolioROI };
  }
}

export const roiCalculator = new ROICalculator();
export const investmentOptimizer = new InvestmentOptimizer();
export const budgetAllocator = new BudgetAllocator();
export const roiReportGenerator = new ROIReportGenerator();

export {
  ROICalculator,
  InvestmentOptimizer,
  BudgetAllocator,
  ROIReportGenerator
};


