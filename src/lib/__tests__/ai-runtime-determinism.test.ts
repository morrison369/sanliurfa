import { describe, expect, it } from 'vitest';
import {
  AnalyticsEngine,
  DatasetManager,
  MLModelManager
} from '../advanced-analytics';
import {
  AIInventoryForecaster,
  PredictiveAlerts
} from '../ai-inventory-planning';
import {
  ConversationManager,
  ResponseGenerator
} from '../ai-chatbot';

describe('AI runtime determinism', () => {
  it('produces stable analytics metrics and predictions for the same dataset', () => {
    const datasets = new DatasetManager();
    const analytics = new AnalyticsEngine();
    const dataset = datasets.createDataset({
      name: 'Revenue',
      description: 'Revenue by region',
      sourceType: 'warehouse',
      recordCount: 42000,
      columns: ['month', 'region', 'revenue', 'margin']
    });

    const first = datasets.analyzeDataset(dataset.id, 'predictive');
    const second = datasets.analyzeDataset(dataset.id, 'predictive');
    const forecastA = analytics.runPredictiveAnalysis(dataset.id, 'revenue');
    const forecastB = analytics.runPredictiveAnalysis(dataset.id, 'revenue');

    expect(first.metrics).toEqual(second.metrics);
    expect(first.insights).toEqual(second.insights);
    expect(forecastA).toEqual(forecastB);
  });

  it('keeps model evaluation and predictions deterministic', () => {
    const manager = new MLModelManager();
    const model = manager.createModel({
      name: 'Margin Forecaster',
      type: 'regression',
      accuracy: 0.75,
      trainingDate: 0,
      status: 'draft'
    });

    manager.trainModel(model.id, 'training-set-alpha');
    manager.deployModel(model.id);

    const evaluationA = manager.evaluateModel(model.id, 'holdout-set');
    const evaluationB = manager.evaluateModel(model.id, 'holdout-set');
    const predictionA = manager.predictWithModel(model.id, { revenue: 120, margin: 24 });
    const predictionB = manager.predictWithModel(model.id, { margin: 24, revenue: 120 });

    expect(evaluationA).toBe(evaluationB);
    expect(predictionA).toBe(predictionB);
  });

  it('generates stable inventory forecasts and alerts', () => {
    const forecaster = new AIInventoryForecaster();
    const alerts = new PredictiveAlerts();

    forecaster.trainModel([
      { sku: 'SKU-100', demand: 120 },
      { sku: 'SKU-200', demand: 180 }
    ]);
    forecaster.updateModelPerformance('SKU-100', 0.05);

    const forecastA = forecaster.forecast('SKU-100', 7);
    const forecastB = forecaster.forecast('SKU-100', 7);
    const anomaliesA = forecaster.detectAnomalies('SKU-100', 0.4);
    const anomaliesB = forecaster.detectAnomalies('SKU-100', 0.4);
    const alertsA = new PredictiveAlerts().generateAlerts('weekly');
    const alertsB = new PredictiveAlerts().generateAlerts('weekly');

    expect(forecastA).toEqual(forecastB);
    expect(anomaliesA).toEqual(anomaliesB);
    expect(alertsA).toEqual(alertsB);
    expect(alerts.generateAlerts('weekly').length).toBeGreaterThan(0);
  });

  it('uses deterministic chatbot sessions and responses', () => {
    const conversations = new ConversationManager();
    const responses = new ResponseGenerator();
    responses.registerResponses('greeting', [
      'Hello {user}',
      'Welcome back {user}'
    ]);

    const context = conversations.createConversation('user-42');
    conversations.addMessage(context.sessionId, 'user', 'hello there');
    conversations.addMessage(context.sessionId, 'assistant', 'hello');

    const replyA = responses.generate('greeting', context);
    const replyB = responses.generate('greeting', context);
    const fallbackA = responses.generateFallback();
    const fallbackB = responses.generateFallback();

    expect(context.sessionId).toMatch(/^session-\d+-0000$/);
    expect(replyA).toBe(replyB);
    expect(replyA.includes('user-42')).toBe(true);
    expect(fallbackA).toBe(fallbackB);
  });
});
