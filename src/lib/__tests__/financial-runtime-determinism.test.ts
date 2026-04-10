import { describe, expect, it } from 'vitest';
import {
  CashFlowAnalyzer,
  FinancialHealthAnalyzer,
  FinancialMetrics,
  ProfitabilityAnalyzer
} from '../financial-analytics';
import {
  CostOptimizationAnalyzer,
  FinancialForecaster
} from '../financial-planning';
import {
  FinancialReporter
} from '../financial-reporting';
import {
  IncidentPredictor,
  MTTREstimator,
  RecommendationEngine,
  RiskScorer
} from '../predictive-incidents';

describe('Financial runtime determinism', () => {
  it('keeps financial analytics deterministic for the same input range', () => {
    const metrics = new FinancialMetrics();
    const profitability = new ProfitabilityAnalyzer();
    const cashFlow = new CashFlowAnalyzer();
    const health = new FinancialHealthAnalyzer();
    const startDate = 1704067200000;
    const endDate = 1706745600000;

    expect(metrics.getTrendAnalysis('grossMargin', 6)).toEqual(metrics.getTrendAnalysis('grossMargin', 6));
    expect(profitability.analyze(startDate, endDate)).toEqual(profitability.analyze(startDate, endDate));
    expect(profitability.getProductProfitability('prod-1', '2026-Q1')).toEqual(
      profitability.getProductProfitability('prod-1', '2026-Q1')
    );
    expect(cashFlow.forecast(4)).toEqual(cashFlow.forecast(4));
    expect(health.calculateHealth(endDate)).toEqual(health.calculateHealth(endDate));
  });

  it('keeps financial planning deterministic', () => {
    const forecaster = new FinancialForecaster();
    const optimization = new CostOptimizationAnalyzer();

    expect(forecaster.forecast(6)).toEqual(forecaster.forecast(6));
    expect(forecaster.getRevenueForecast(6)).toEqual(forecaster.getRevenueForecast(6));
    expect(forecaster.getExpenseForecast(6)).toEqual(forecaster.getExpenseForecast(6));
    expect(forecaster.getConfidenceInterval('forecast-q1')).toEqual(forecaster.getConfidenceInterval('forecast-q1'));
    expect(optimization.analyzeCosts('2026-Q1')).toEqual(optimization.analyzeCosts('2026-Q1'));
    expect(optimization.identifyReductionOpportunities()).toEqual(optimization.identifyReductionOpportunities());
  });

  it('keeps financial reporting deterministic for the same period inputs', () => {
    const reporter = new FinancialReporter();
    const startDate = 1704067200000;
    const endDate = 1706745600000;

    expect(reporter.generateIncomeStatement(startDate, endDate)).toEqual(
      reporter.generateIncomeStatement(startDate, endDate)
    );
    expect(reporter.generateBalanceSheet(endDate)).toEqual(reporter.generateBalanceSheet(endDate));
    expect(reporter.generateCashFlow(startDate, endDate)).toEqual(reporter.generateCashFlow(startDate, endDate));
  });

  it('keeps predictive incident scoring deterministic', () => {
    const predictor = new IncidentPredictor();
    const estimator = new MTTREstimator();
    const scorer = new RiskScorer();
    const recommendations = new RecommendationEngine();

    estimator.recordResolution('api-timeout', 1, 180000);
    estimator.recordResolution('api-timeout', 1, 210000);

    const forecastA = predictor.forecast(120);
    const forecastB = predictor.forecast(120);
    const estimateA = estimator.estimate('api-timeout');
    const estimateB = estimator.estimate('api-timeout');
    const riskA = scorer.score('api-timeout', { errorRate: 0.08 }, ['api', 'redis']);
    const riskB = scorer.score('api-timeout', { errorRate: 0.08 }, ['api', 'redis']);

    expect(forecastA).toEqual(forecastB);
    expect(estimateA).toEqual(estimateB);
    expect(riskA).toEqual(riskB);
    expect(recommendations.generateRecommendations(riskA, forecastA[0] ?? { incidentType: 'api-timeout', likelihood: 0.5 })).toEqual(
      recommendations.generateRecommendations(riskA, forecastA[0] ?? { incidentType: 'api-timeout', likelihood: 0.5 })
    );
  });
});
