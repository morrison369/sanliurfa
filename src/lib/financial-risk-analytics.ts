/**
 * Phase 234: Financial Risk Analytics
 * Credit risk scoring, market risk measurement, concentration risk, risk-adjusted returns
 */

import { logger } from './logger';

interface CreditRiskProfile {
  profileId: string;
  counterpartyId: string;
  name: string;
  creditScore: number;        // 0-100
  probabilityOfDefault: number; // 0-1
  lossGivenDefault: number;   // 0-1
  exposureAtDefault: number;
  expectedLoss: number;       // PD * LGD * EAD
  riskGrade: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'D';
  assessedAt: number;
}

interface MarketRiskMeasure {
  measureId: string;
  portfolioId: string;
  assetClass: string;
  var95Daily: number;      // Value at Risk 95% 1-day
  var99Daily: number;      // Value at Risk 99% 1-day
  cvar95: number;          // Conditional VaR (Expected Shortfall)
  beta: number;            // market sensitivity
  sharpeRatio: number;
  maxDrawdown: number;     // percentage
  period: string;
  calculatedAt: number;
}

interface ConcentrationRisk {
  concentrationId: string;
  dimension: 'counterparty' | 'sector' | 'geography' | 'asset_class' | 'currency';
  topHoldingPct: number;    // largest single holding %
  top5HoldingsPct: number;  // top 5 combined %
  herfindahlIndex: number;  // HHI 0-10000
  diversificationScore: number; // 0-100 (inverse of concentration)
  breachesLimit: boolean;
  period: string;
  calculatedAt: number;
}

interface RiskAdjustedReturn {
  rarId: string;
  portfolioId: string;
  grossReturn: number;
  riskCost: number;
  raroc: number;        // Risk-Adjusted Return on Capital
  rorac: number;        // Return on Risk-Adjusted Capital
  economicCapital: number;
  period: string;
  calculatedAt: number;
}

class CreditRiskScorer {
  private profiles: Map<string, CreditRiskProfile> = new Map();
  private counter = 0;

  assess(counterpartyId: string, name: string, creditScore: number, pd: number, lgd: number, ead: number): CreditRiskProfile {
    const expectedLoss = pd * lgd * ead;
    const riskGrade: CreditRiskProfile['riskGrade'] =
      creditScore >= 95 ? 'AAA' : creditScore >= 88 ? 'AA' : creditScore >= 80 ? 'A' :
      creditScore >= 70 ? 'BBB' : creditScore >= 60 ? 'BB' : creditScore >= 50 ? 'B' :
      creditScore >= 35 ? 'CCC' : 'D';

    const profileId = `crprof-${Date.now()}-${++this.counter}`;
    const profile: CreditRiskProfile = {
      profileId, counterpartyId, name,
      creditScore: Math.max(0, Math.min(100, creditScore)),
      probabilityOfDefault: Math.max(0, Math.min(1, pd)),
      lossGivenDefault: Math.max(0, Math.min(1, lgd)),
      exposureAtDefault: ead, expectedLoss, riskGrade, assessedAt: Date.now()
    };
    this.profiles.set(counterpartyId, profile);
    logger.debug('Credit risk assessed', { counterpartyId, riskGrade, expectedLoss });
    return profile;
  }

  getHighRisk(maxGrade: 'BBB' | 'BB' | 'B' = 'BB'): CreditRiskProfile[] {
    const gradeOrder = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D'];
    const threshold = gradeOrder.indexOf(maxGrade);
    return Array.from(this.profiles.values())
      .filter(p => gradeOrder.indexOf(p.riskGrade) > threshold)
      .sort((a, b) => b.expectedLoss - a.expectedLoss);
  }

  getTotalExpectedLoss(): number {
    return Array.from(this.profiles.values()).reduce((s, p) => s + p.expectedLoss, 0);
  }

  getProfile(counterpartyId: string): CreditRiskProfile | undefined {
    return this.profiles.get(counterpartyId);
  }
}

class MarketRiskMeasurer {
  private measures: Map<string, MarketRiskMeasure[]> = new Map();
  private counter = 0;

  measure(portfolioId: string, assetClass: string, var95: number, var99: number, cvar95: number, beta: number, sharpeRatio: number, maxDrawdown: number, period: string): MarketRiskMeasure {
    const measureId = `mktriskmeas-${Date.now()}-${++this.counter}`;
    const measure: MarketRiskMeasure = {
      measureId, portfolioId, assetClass, var95Daily: var95, var99Daily: var99,
      cvar95, beta, sharpeRatio, maxDrawdown, period, calculatedAt: Date.now()
    };
    const existing = this.measures.get(portfolioId) || [];
    existing.push(measure);
    this.measures.set(portfolioId, existing);
    return measure;
  }

  getLatest(portfolioId: string): MarketRiskMeasure | undefined {
    const history = this.measures.get(portfolioId) || [];
    return history[history.length - 1];
  }

  getHighVaRPortfolios(threshold: number): MarketRiskMeasure[] {
    return Array.from(this.measures.values())
      .map(h => h[h.length - 1])
      .filter((m): m is MarketRiskMeasure => !!m && m.var95Daily > threshold);
  }

  getAvgSharpe(): number {
    const all = Array.from(this.measures.values()).map(h => h[h.length - 1]).filter((m): m is MarketRiskMeasure => !!m);
    if (!all.length) return 0;
    return all.reduce((s, m) => s + m.sharpeRatio, 0) / all.length;
  }
}

class ConcentrationRiskAnalyzer {
  private concentrations: Map<string, ConcentrationRisk> = new Map();
  private counter = 0;

  analyze(dimension: ConcentrationRisk['dimension'], holdings: number[], limitPct: number, period: string): ConcentrationRisk {
    const total = holdings.reduce((s, v) => s + v, 0);
    const sorted = [...holdings].sort((a, b) => b - a);
    const topHoldingPct = total > 0 ? (sorted[0] / total) * 100 : 0;
    const top5 = sorted.slice(0, 5).reduce((s, v) => s + v, 0);
    const top5HoldingsPct = total > 0 ? (top5 / total) * 100 : 0;
    const hhi = total > 0 ? holdings.reduce((s, h) => s + Math.pow((h / total) * 100, 2), 0) : 0;
    const diversificationScore = Math.max(0, 100 - hhi / 100);

    const concentrationId = `concent-${Date.now()}-${++this.counter}`;
    const concentration: ConcentrationRisk = {
      concentrationId, dimension, topHoldingPct, top5HoldingsPct,
      herfindahlIndex: hhi, diversificationScore, breachesLimit: topHoldingPct > limitPct,
      period, calculatedAt: Date.now()
    };
    this.concentrations.set(dimension, concentration);
    return concentration;
  }

  getBreachingLimits(): ConcentrationRisk[] {
    return Array.from(this.concentrations.values()).filter(c => c.breachesLimit);
  }

  getConcentration(dimension: ConcentrationRisk['dimension']): ConcentrationRisk | undefined {
    return this.concentrations.get(dimension);
  }
}

class RiskAdjustedReturnCalculator {
  private records: Map<string, RiskAdjustedReturn[]> = new Map();
  private counter = 0;

  calculate(portfolioId: string, grossReturn: number, economicCapital: number, riskCost: number, period: string): RiskAdjustedReturn {
    const raroc = economicCapital > 0 ? ((grossReturn - riskCost) / economicCapital) * 100 : 0;
    const rorac = riskCost > 0 ? (grossReturn / riskCost) * 100 : 0;
    const rarId = `rar-${Date.now()}-${++this.counter}`;
    const record: RiskAdjustedReturn = {
      rarId, portfolioId, grossReturn, riskCost, raroc, rorac, economicCapital, period, calculatedAt: Date.now()
    };
    const existing = this.records.get(portfolioId) || [];
    existing.push(record);
    this.records.set(portfolioId, existing);
    logger.debug('RAROC calculated', { portfolioId, raroc: raroc.toFixed(2), period });
    return record;
  }

  getTopPerformers(limit = 5): RiskAdjustedReturn[] {
    return Array.from(this.records.values())
      .map(h => h[h.length - 1])
      .filter((r): r is RiskAdjustedReturn => !!r)
      .sort((a, b) => b.raroc - a.raroc)
      .slice(0, limit);
  }

  getLatest(portfolioId: string): RiskAdjustedReturn | undefined {
    const history = this.records.get(portfolioId) || [];
    return history[history.length - 1];
  }
}

export const creditRiskScorer = new CreditRiskScorer();
export const marketRiskMeasurer = new MarketRiskMeasurer();
export const concentrationRiskAnalyzer = new ConcentrationRiskAnalyzer();
export const riskAdjustedReturnCalculator = new RiskAdjustedReturnCalculator();

export { CreditRiskProfile, MarketRiskMeasure, ConcentrationRisk, RiskAdjustedReturn };
