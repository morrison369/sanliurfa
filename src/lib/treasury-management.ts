/**
 * Phase 233: Treasury Management
 * Cash position tracking, liquidity management, funding operations, treasury risk
 */

import { logger } from './logger';

interface CashPosition {
  positionId: string;
  accountId: string;
  currency: string;
  balance: number;
  availableBalance: number;
  pendingDebits: number;
  pendingCredits: number;
  asOfDate: number;
  capturedAt: number;
}

interface LiquidityForecast {
  forecastId: string;
  period: string;
  openingBalance: number;
  projectedInflows: number;
  projectedOutflows: number;
  closingBalance: number;
  minBalance: number;
  liquidityRatio: number;   // current assets / current liabilities
  status: 'surplus' | 'adequate' | 'tight' | 'deficit';
  createdAt: number;
}

interface FundingOperation {
  operationId: string;
  type: 'short_term_borrowing' | 'long_term_debt' | 'equity' | 'commercial_paper' | 'revolver_draw';
  amount: number;
  currency: string;
  interestRatePct: number;
  maturityDate: number;
  lender: string;
  status: 'proposed' | 'approved' | 'executed' | 'matured';
  executedAt?: number;
  createdAt: number;
}

interface TreasuryRiskMetric {
  metricId: string;
  riskType: 'interest_rate' | 'fx' | 'liquidity' | 'counterparty' | 'refinancing';
  exposureAmount: number;
  hedgedAmount: number;
  netExposure: number;
  hedgeRatioPct: number;
  var95: number;    // Value at Risk 95%
  period: string;
  capturedAt: number;
}

class CashPositionManager {
  private positions: Map<string, CashPosition[]> = new Map();
  private counter = 0;

  record(accountId: string, currency: string, balance: number, pendingDebits: number, pendingCredits: number): CashPosition {
    const positionId = `cashpos-${Date.now()}-${++this.counter}`;
    const position: CashPosition = {
      positionId, accountId, currency, balance,
      availableBalance: balance - pendingDebits,
      pendingDebits, pendingCredits, asOfDate: Date.now(), capturedAt: Date.now()
    };
    const existing = this.positions.get(accountId) || [];
    existing.push(position);
    this.positions.set(accountId, existing);
    logger.debug('Cash position recorded', { accountId, currency, balance });
    return position;
  }

  getTotalBalance(currency: string): number {
    return Array.from(this.positions.values())
      .map(h => h[h.length - 1])
      .filter((p): p is CashPosition => !!p && p.currency === currency)
      .reduce((s, p) => s + p.balance, 0);
  }

  getLatest(accountId: string): CashPosition | undefined {
    const history = this.positions.get(accountId) || [];
    return history[history.length - 1];
  }

  getLowBalanceAccounts(threshold: number): CashPosition[] {
    return Array.from(this.positions.values())
      .map(h => h[h.length - 1])
      .filter((p): p is CashPosition => !!p && p.availableBalance < threshold);
  }
}

class LiquidityManager {
  private forecasts: LiquidityForecast[] = [];
  private counter = 0;

  forecast(period: string, openingBalance: number, projectedInflows: number, projectedOutflows: number, currentAssets: number, currentLiabilities: number): LiquidityForecast {
    const closingBalance = openingBalance + projectedInflows - projectedOutflows;
    const minBalance = Math.min(openingBalance, closingBalance);
    const liquidityRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
    const status: LiquidityForecast['status'] =
      closingBalance > openingBalance * 1.2 ? 'surplus' :
      closingBalance > 0 ? 'adequate' :
      closingBalance > openingBalance * -0.1 ? 'tight' : 'deficit';

    const forecastId = `liqfcast-${Date.now()}-${++this.counter}`;
    const forecast: LiquidityForecast = {
      forecastId, period, openingBalance, projectedInflows, projectedOutflows,
      closingBalance, minBalance, liquidityRatio, status, createdAt: Date.now()
    };
    this.forecasts.push(forecast);
    logger.debug('Liquidity forecasted', { period, closingBalance, status });
    return forecast;
  }

  getLatest(): LiquidityForecast | undefined {
    return this.forecasts[this.forecasts.length - 1];
  }

  getDeficitPeriods(): LiquidityForecast[] {
    return this.forecasts.filter(f => f.status === 'deficit' || f.status === 'tight');
  }
}

class FundingOperationsManager {
  private operations: Map<string, FundingOperation> = new Map();
  private counter = 0;

  create(type: FundingOperation['type'], amount: number, currency: string, interestRatePct: number, maturityDate: number, lender: string): FundingOperation {
    const operationId = `fundop-${Date.now()}-${++this.counter}`;
    const op: FundingOperation = {
      operationId, type, amount, currency, interestRatePct, maturityDate,
      lender, status: 'proposed', createdAt: Date.now()
    };
    this.operations.set(operationId, op);
    return op;
  }

  execute(operationId: string): boolean {
    const op = this.operations.get(operationId);
    if (!op || op.status !== 'approved') return false;
    op.status = 'executed';
    op.executedAt = Date.now();
    return true;
  }

  approve(operationId: string): boolean {
    const op = this.operations.get(operationId);
    if (!op || op.status !== 'proposed') return false;
    op.status = 'approved';
    return true;
  }

  getTotalDebt(): number {
    return Array.from(this.operations.values())
      .filter(op => op.status === 'executed')
      .reduce((s, op) => s + op.amount, 0);
  }

  getUpcomingMaturities(days = 30): FundingOperation[] {
    const horizon = Date.now() + days * 86400 * 1000;
    return Array.from(this.operations.values())
      .filter(op => op.status === 'executed' && op.maturityDate <= horizon);
  }
}

class TreasuryRiskAnalyzer {
  private metrics: Map<string, TreasuryRiskMetric> = new Map();
  private counter = 0;

  record(riskType: TreasuryRiskMetric['riskType'], exposure: number, hedged: number, var95: number, period: string): TreasuryRiskMetric {
    const metricId = `triskmet-${Date.now()}-${++this.counter}`;
    const metric: TreasuryRiskMetric = {
      metricId, riskType, exposureAmount: exposure, hedgedAmount: hedged,
      netExposure: exposure - hedged,
      hedgeRatioPct: exposure > 0 ? (hedged / exposure) * 100 : 0,
      var95, period, capturedAt: Date.now()
    };
    this.metrics.set(riskType, metric);
    return metric;
  }

  getUnhedgedRisks(minExposure = 1000000): TreasuryRiskMetric[] {
    return Array.from(this.metrics.values())
      .filter(m => m.netExposure >= minExposure)
      .sort((a, b) => b.netExposure - a.netExposure);
  }

  getTotalVaR95(): number {
    return Array.from(this.metrics.values()).reduce((s, m) => s + m.var95, 0);
  }

  getMetric(riskType: TreasuryRiskMetric['riskType']): TreasuryRiskMetric | undefined {
    return this.metrics.get(riskType);
  }
}

export const cashPositionManager = new CashPositionManager();
export const liquidityManager = new LiquidityManager();
export const fundingOperationsManager = new FundingOperationsManager();
export const treasuryRiskAnalyzer = new TreasuryRiskAnalyzer();

export { CashPosition, LiquidityForecast, FundingOperation, TreasuryRiskMetric };
