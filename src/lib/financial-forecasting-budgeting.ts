/**
 * Phase 238: Financial Forecasting & Budgeting
 * Budget management, variance analysis, rolling forecasts, financial scenario modeling
 */

import { logger } from './logger';

interface Budget {
  budgetId: string;
  name: string;
  period: string;
  costCenter: string;
  lineItems: Array<{ category: string; budgetedAmount: number; actualAmount: number; variance: number; variancePct: number }>;
  totalBudgeted: number;
  totalActual: number;
  totalVariance: number;
  variancePct: number;
  status: 'draft' | 'approved' | 'active' | 'closed';
  createdAt: number;
}

interface RollingForecast {
  forecastId: string;
  period: string;
  horizon: number;  // months ahead
  revenue: number;
  expenses: number;
  ebitda: number;
  ebitdaMarginPct: number;
  cashFlow: number;
  confidence: number;  // 0-1
  updatedAt: number;
}

interface VarianceAnalysis {
  analysisId: string;
  budgetId: string;
  period: string;
  category: string;
  budgetedAmount: number;
  actualAmount: number;
  variance: number;
  variancePct: number;
  type: 'favorable' | 'unfavorable';
  explanation: string;
  actionRequired: boolean;
  analyzedAt: number;
}

interface FinancialScenario {
  scenarioId: string;
  name: string;
  type: 'base' | 'upside' | 'downside' | 'stress';
  revenueGrowthPct: number;
  costGrowthPct: number;
  projectedRevenue: number;
  projectedEBITDA: number;
  projectedCashFlow: number;
  keyAssumptions: string[];
  probability: number;
  createdAt: number;
}

class BudgetManager {
  private budgets: Map<string, Budget> = new Map();
  private counter = 0;

  create(name: string, period: string, costCenter: string, lineItems: Array<{ category: string; budgetedAmount: number }>): Budget {
    const items = lineItems.map(item => ({
      ...item, actualAmount: 0, variance: item.budgetedAmount, variancePct: 100
    }));
    const totalBudgeted = items.reduce((s, i) => s + i.budgetedAmount, 0);
    const budgetId = `budget-${Date.now()}-${++this.counter}`;
    const budget: Budget = {
      budgetId, name, period, costCenter, lineItems: items,
      totalBudgeted, totalActual: 0, totalVariance: totalBudgeted, variancePct: 100,
      status: 'draft', createdAt: Date.now()
    };
    this.budgets.set(budgetId, budget);
    logger.debug('Budget created', { budgetId, name, totalBudgeted });
    return budget;
  }

  recordActual(budgetId: string, category: string, actualAmount: number): boolean {
    const budget = this.budgets.get(budgetId);
    if (!budget) return false;
    const item = budget.lineItems.find(i => i.category === category);
    if (!item) return false;
    item.actualAmount = actualAmount;
    item.variance = item.budgetedAmount - actualAmount;
    item.variancePct = item.budgetedAmount > 0 ? (item.variance / item.budgetedAmount) * 100 : 0;
    budget.totalActual = budget.lineItems.reduce((s, i) => s + i.actualAmount, 0);
    budget.totalVariance = budget.totalBudgeted - budget.totalActual;
    budget.variancePct = budget.totalBudgeted > 0 ? (budget.totalVariance / budget.totalBudgeted) * 100 : 0;
    return true;
  }

  getBudget(budgetId: string): Budget | undefined {
    return this.budgets.get(budgetId);
  }

  getOverBudget(threshold = 0): Budget[] {
    return Array.from(this.budgets.values()).filter(b => b.totalVariance < threshold);
  }
}

class RollingForecastManager {
  private forecasts: RollingForecast[] = [];
  private counter = 0;

  update(period: string, horizon: number, revenue: number, expenses: number, cashFlow: number, confidence: number): RollingForecast {
    const ebitda = revenue - expenses;
    const forecastId = `rfcast-${Date.now()}-${++this.counter}`;
    const forecast: RollingForecast = {
      forecastId, period, horizon, revenue, expenses, ebitda,
      ebitdaMarginPct: revenue > 0 ? (ebitda / revenue) * 100 : 0,
      cashFlow, confidence: Math.max(0, Math.min(1, confidence)), updatedAt: Date.now()
    };
    this.forecasts.push(forecast);
    return forecast;
  }

  getLatest(): RollingForecast | undefined {
    return this.forecasts[this.forecasts.length - 1];
  }

  getForecastTrend(): 'improving' | 'stable' | 'declining' {
    if (this.forecasts.length < 2) return 'stable';
    const prev = this.forecasts[this.forecasts.length - 2];
    const curr = this.forecasts[this.forecasts.length - 1];
    const diff = curr.ebitdaMarginPct - prev.ebitdaMarginPct;
    return diff > 1 ? 'improving' : diff < -1 ? 'declining' : 'stable';
  }

  getForecasts(): RollingForecast[] {
    return [...this.forecasts];
  }
}

class VarianceAnalyzer {
  private analyses: VarianceAnalysis[] = [];
  private counter = 0;

  analyze(budgetId: string, period: string, category: string, budgeted: number, actual: number, explanation: string): VarianceAnalysis {
    const variance = budgeted - actual;
    const variancePct = budgeted > 0 ? (variance / budgeted) * 100 : 0;
    const analysisId = `varianal-${Date.now()}-${++this.counter}`;
    const analysis: VarianceAnalysis = {
      analysisId, budgetId, period, category, budgetedAmount: budgeted,
      actualAmount: actual, variance, variancePct,
      type: variance >= 0 ? 'favorable' : 'unfavorable',
      explanation, actionRequired: Math.abs(variancePct) > 10, analyzedAt: Date.now()
    };
    this.analyses.push(analysis);
    return analysis;
  }

  getUnfavorable(threshold = 10): VarianceAnalysis[] {
    return this.analyses.filter(a => a.type === 'unfavorable' && Math.abs(a.variancePct) > threshold)
      .sort((a, b) => a.variancePct - b.variancePct);
  }

  getActionRequired(): VarianceAnalysis[] {
    return this.analyses.filter(a => a.actionRequired);
  }

  getTotalVariance(): number {
    return this.analyses.reduce((s, a) => s + a.variance, 0);
  }
}

class FinancialScenarioModeler {
  private scenarios: Map<string, FinancialScenario> = new Map();
  private counter = 0;

  model(name: string, type: FinancialScenario['type'], baseRevenue: number, revenueGrowthPct: number, baseCosts: number, costGrowthPct: number, assumptions: string[], probability: number): FinancialScenario {
    const projectedRevenue = baseRevenue * (1 + revenueGrowthPct / 100);
    const projectedCosts = baseCosts * (1 + costGrowthPct / 100);
    const projectedEBITDA = projectedRevenue - projectedCosts;
    const projectedCashFlow = projectedEBITDA * 0.8;  // simplified cash conversion
    const scenarioId = `finscen-${Date.now()}-${++this.counter}`;
    const scenario: FinancialScenario = {
      scenarioId, name, type, revenueGrowthPct, costGrowthPct,
      projectedRevenue, projectedEBITDA, projectedCashFlow,
      keyAssumptions: assumptions, probability: Math.max(0, Math.min(1, probability)),
      createdAt: Date.now()
    };
    this.scenarios.set(scenarioId, scenario);
    logger.debug('Financial scenario modelled', { name, type, projectedRevenue, projectedEBITDA });
    return scenario;
  }

  getWeightedRevenue(): number {
    const all = Array.from(this.scenarios.values());
    const totalProb = all.reduce((s, sc) => s + sc.probability, 0);
    if (!totalProb) return 0;
    return all.reduce((s, sc) => s + sc.projectedRevenue * sc.probability, 0) / totalProb;
  }

  getDownsideScenarios(): FinancialScenario[] {
    return Array.from(this.scenarios.values())
      .filter(sc => sc.type === 'downside' || sc.type === 'stress');
  }

  getAllScenarios(): FinancialScenario[] {
    return Array.from(this.scenarios.values());
  }
}

export const budgetManager = new BudgetManager();
export const rollingForecastManager = new RollingForecastManager();
export const varianceAnalyzer = new VarianceAnalyzer();
export const financialScenarioModeler = new FinancialScenarioModeler();

export { Budget, RollingForecast, VarianceAnalysis, FinancialScenario };
