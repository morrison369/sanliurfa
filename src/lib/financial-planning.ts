/**
 * Phase 64: Financial Forecasting & Planning
 * Budget planning, financial forecasting, cost optimization, scenario analysis
 */

import { logger } from './logging';
import { deterministicBoolean, deterministicNumber, pickDeterministic } from './deterministic';

// ==================== TYPES & INTERFACES ====================

export interface Budget {
  id: string;
  period: string;
  category: string;
  budgeted: number;
  actual: number;
  variance: number;
  status: 'draft' | 'approved' | 'active' | 'closed';
}

export interface BudgetItem {
  budgetId: string;
  accountId: string;
  amount: number;
  notes: string;
}

export interface Forecast {
  period: string;
  revenue: number;
  expenses: number;
  netIncome: number;
  confidence: number;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  adjustments: Record<string, number>;
  projectedResult: Record<string, number>;
}

export interface CostOptimizationOpportunity {
  category: string;
  currentCost: number;
  potential: number;
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

// ==================== BUDGET PLANNER ====================

export class BudgetPlanner {
  private budgets = new Map<string, Budget>();
  private budgetItems = new Map<string, BudgetItem[]>();
  private budgetCount = 0;

  /**
   * Create budget
   */
  createBudget(budget: Omit<Budget, 'id' | 'actual' | 'variance'>): Budget {
    const id = 'budget-' + Date.now() + '-' + this.budgetCount++;

    const newBudget: Budget = {
      ...budget,
      id,
      actual: 0,
      variance: 0
    };

    this.budgets.set(id, newBudget);
    this.budgetItems.set(id, []);

    logger.info('Budget created', { budgetId: id, period: budget.period });

    return newBudget;
  }

  /**
   * Get budget
   */
  getBudget(budgetId: string): Budget | null {
    return this.budgets.get(budgetId) || null;
  }

  /**
   * List budgets
   */
  listBudgets(period?: string): Budget[] {
    if (!period) {
      return Array.from(this.budgets.values());
    }

    return Array.from(this.budgets.values()).filter(b => b.period === period);
  }

  /**
   * Add budget item
   */
  addBudgetItem(item: BudgetItem): void {
    const items = this.budgetItems.get(item.budgetId) || [];
    items.push(item);
    this.budgetItems.set(item.budgetId, items);

    logger.debug('Budget item added', { budgetId: item.budgetId, accountId: item.accountId });
  }

  /**
   * Update budget item
   */
  updateBudgetItem(budgetId: string, accountId: string, amount: number): void {
    const items = this.budgetItems.get(budgetId) || [];
    const item = items.find(i => i.accountId === accountId);

    if (item) {
      item.amount = amount;
      logger.debug('Budget item updated', { budgetId, accountId, amount });
    }
  }

  /**
   * Compare budget to actual
   */
  compareBudgetToActual(budgetId: string): { budgeted: number; actual: number; variance: number; variance_pct: number } {
    const budget = this.budgets.get(budgetId);
    if (!budget) {
      return { budgeted: 0, actual: 0, variance: 0, variance_pct: 0 };
    }

    const variance = budget.budgeted - budget.actual;
    const variance_pct = budget.budgeted > 0 ? (variance / budget.budgeted) * 100 : 0;

    logger.debug('Budget vs actual compared', { budgetId, variance, variance_pct });

    return {
      budgeted: budget.budgeted,
      actual: budget.actual,
      variance,
      variance_pct
    };
  }

  /**
   * Approve budget
   */
  approveBudget(budgetId: string): void {
    const budget = this.budgets.get(budgetId);
    if (budget) {
      budget.status = 'approved';
      logger.info('Budget approved', { budgetId });
    }
  }
}

// ==================== FINANCIAL FORECASTER ====================

export class FinancialForecaster {
  /**
   * Forecast
   */
  forecast(months: number): Forecast[] {
    const forecasts: Forecast[] = [];
    let baseRevenue = deterministicNumber(`forecast:${months}:baseRevenue`, 90000, 120000, 2);

    for (let i = 0; i < months; i++) {
      const seed = `forecast:${months}:month:${i}`;
      const revenue = baseRevenue + deterministicNumber(`${seed}:delta`, -10000, 10000, 2);
      const expenses = revenue * deterministicNumber(`${seed}:expenseRatio`, 0.3, 0.7, 4);
      const netIncome = revenue - expenses;
      const confidence = 0.95 - i * 0.03;

      forecasts.push({
        period: `Month ${i + 1}`,
        revenue,
        expenses,
        netIncome,
        confidence: Math.max(0.5, confidence)
      });

      baseRevenue = revenue;
    }

    logger.debug('Financial forecast generated', { months });

    return forecasts;
  }

  /**
   * Get revenue forecast
   */
  getRevenueForecast(months: number): number[] {
    const revenues: number[] = [];
    let baseRevenue = deterministicNumber(`revenue-forecast:${months}:base`, 90000, 120000, 2);

    for (let i = 0; i < months; i++) {
      const revenue = baseRevenue + deterministicNumber(`revenue-forecast:${months}:${i}`, -10000, 10000, 2);
      revenues.push(revenue);
      baseRevenue = revenue;
    }

    return revenues;
  }

  /**
   * Get expense forecast
   */
  getExpenseForecast(months: number): number[] {
    const expenses: number[] = [];

    for (let i = 0; i < months; i++) {
      expenses.push(deterministicNumber(`expense-forecast:${months}:${i}`, 20000, 60000, 2));
    }

    return expenses;
  }

  /**
   * Get seasonal adjustment
   */
  getSeasonalAdjustment(month: number): number {
    // Q4 is highest, Q2 is lowest
    const adjustments = [0.95, 0.9, 0.85, 0.95, 1.0, 0.9, 0.95, 1.0, 0.95, 1.05, 1.1, 1.15];
    return adjustments[month % 12];
  }

  /**
   * Update forecast assumptions
   */
  updateForecastAssumptions(assumptions: Record<string, number>): void {
    logger.info('Forecast assumptions updated', { assumptions });
  }

  /**
   * Get confidence interval
   */
  getConfidenceInterval(forecastId: string): { low: number; high: number } {
    const low = deterministicNumber(`${forecastId}:ci:low`, 70000, 150000, 2);
    return {
      low,
      high: low + deterministicNumber(`${forecastId}:ci:spread`, 15000, 70000, 2)
    };
  }
}

// ==================== SCENARIO PLANNER ====================

export class ScenarioPlanner {
  private scenarios = new Map<string, Scenario>();
  private scenarioCount = 0;

  /**
   * Create scenario
   */
  createScenario(scenario: Omit<Scenario, 'id' | 'projectedResult'>): Scenario {
    const id = 'scenario-' + Date.now() + '-' + this.scenarioCount++;

    const newScenario: Scenario = {
      ...scenario,
      id,
      projectedResult: {}
    };

    this.scenarios.set(id, newScenario);
    logger.info('Scenario created', { scenarioId: id, name: scenario.name });

    return newScenario;
  }

  /**
   * Get scenario
   */
  getScenario(scenarioId: string): Scenario | null {
    return this.scenarios.get(scenarioId) || null;
  }

  /**
   * List scenarios
   */
  listScenarios(): Scenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Project scenario
   */
  projectScenario(scenarioId: string): Record<string, number> {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) return {};

    const projected: Record<string, number> = {
      baselineRevenue: 100000,
      baselineExpenses: 40000
    };

    // Apply adjustments
    Object.keys(scenario.adjustments).forEach(key => {
      if (key === 'revenue') {
        projected.projectedRevenue = projected.baselineRevenue * (1 + scenario.adjustments[key] / 100);
      } else if (key === 'expenses') {
        projected.projectedExpenses = projected.baselineExpenses * (1 + scenario.adjustments[key] / 100);
      }
    });

    projected.projectedNetIncome = (projected.projectedRevenue || projected.baselineRevenue) - (projected.projectedExpenses || projected.baselineExpenses);

    logger.debug('Scenario projected', { scenarioId });

    return projected;
  }

  /**
   * Compare scenarios
   */
  compareScenarios(scenarioIds: string[]): Record<string, Record<string, number>> {
    const comparisons: Record<string, Record<string, number>> = {};

    scenarioIds.forEach(id => {
      comparisons[id] = this.projectScenario(id);
    });

    logger.debug('Scenarios compared', { count: scenarioIds.length });

    return comparisons;
  }

  /**
   * Identify optimal scenario
   */
  identifyOptimalScenario(criteria: string): Scenario {
    const scenarios = this.listScenarios();

    if (scenarios.length === 0) {
      return {} as Scenario;
    }

    // Return scenario with highest projected net income
    let optimal = scenarios[0];
    let maxIncome = 0;

    scenarios.forEach(scenario => {
      const projected = this.projectScenario(scenario.id);
      if ((projected.projectedNetIncome || 0) > maxIncome) {
        maxIncome = projected.projectedNetIncome || 0;
        optimal = scenario;
      }
    });

    logger.info('Optimal scenario identified', { scenarioId: optimal.id, criteria });

    return optimal;
  }
}

// ==================== COST OPTIMIZATION ====================

export class CostOptimizationAnalyzer {
  /**
   * Analyze costs
   */
  analyzeCosts(period: string): CostOptimizationOpportunity[] {
    const optimizations: CostOptimizationOpportunity[] = [];

    const categories = ['Personnel', 'Operations', 'Marketing', 'Technology'];

    categories.forEach(category => {
      const currentCost = deterministicNumber(`${period}:${category}:currentCost`, 50000, 150000, 2);
      const potential = deterministicNumber(`${period}:${category}:potential`, 5000, 25000, 2);
      const priorityScore = deterministicNumber(`${period}:${category}:priority`, 0, 1, 4);

      optimizations.push({
        category,
        currentCost,
        potential,
        recommendation: `Review ${category} spend and identify efficiencies`,
        priority: priorityScore > 0.66 ? 'high' : priorityScore > 0.33 ? 'medium' : 'low'
      });
    });

    logger.debug('Cost analysis completed', { period, count: optimizations.length });

    return optimizations;
  }

  /**
   * Identify reduction opportunities
   */
  identifyReductionOpportunities(): CostOptimizationOpportunity[] {
    const opportunities: CostOptimizationOpportunity[] = [];

    if (deterministicBoolean('reduction:vendor-contracts', 0.4)) {
      opportunities.push({
        category: 'Vendor Contracts',
        currentCost: 500000,
        potential: 50000,
        recommendation: 'Renegotiate vendor contracts for volume discounts',
        priority: 'high'
      });
    }

    if (deterministicBoolean('reduction:energy-costs', 0.5)) {
      opportunities.push({
        category: 'Energy Costs',
        currentCost: 100000,
        potential: 20000,
        recommendation: 'Implement energy efficiency measures',
        priority: 'medium'
      });
    }

    if (deterministicBoolean('reduction:subscriptions', 0.6)) {
      opportunities.push({
        category: 'Subscriptions',
        currentCost: 50000,
        potential: 15000,
        recommendation: 'Consolidate software subscriptions',
        priority: 'low'
      });
    }

    logger.info('Reduction opportunities identified', { count: opportunities.length });

    return opportunities.length > 0
      ? opportunities
      : [{
          category: pickDeterministic(['Vendor Contracts', 'Energy Costs', 'Subscriptions'], 'reduction:fallback'),
          currentCost: 50000,
          potential: 5000,
          recommendation: 'Review recurring operational spend for deterministic savings',
          priority: 'medium'
        }];
  }

  /**
   * Estimate savings
   */
  estimateSavings(optimizations: CostOptimizationOpportunity[]): number {
    return optimizations.reduce((sum, opt) => sum + opt.potential, 0);
  }

  /**
   * Prioritize reductions
   */
  prioritizeReductions(): CostOptimizationOpportunity[] {
    const optimizations = this.identifyReductionOpportunities();

    return optimizations.sort((a, b) => {
      const priorityMap = { high: 3, medium: 2, low: 1 };
      return priorityMap[b.priority] - priorityMap[a.priority];
    });
  }
}

// ==================== EXPORTS ====================

const budgetPlanner = new BudgetPlanner();
const financialForecaster = new FinancialForecaster();
const scenarioPlanner = new ScenarioPlanner();
const costOptimization = new CostOptimizationAnalyzer();

export { budgetPlanner, financialForecaster, scenarioPlanner, costOptimization };
