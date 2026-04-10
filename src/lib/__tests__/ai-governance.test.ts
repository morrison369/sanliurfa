import { describe, expect, it } from 'vitest';
import { aiGovernance, biasDetection, modelExplainability } from '../ai-governance';

describe('ai-governance', () => {
  it('records explainability and compliance state deterministically', () => {
    const explanation = modelExplainability.explainPrediction(
      'model-risk',
      { income: 50000, age: 32, city: 'sanliurfa' },
      'shap'
    );

    const importance = modelExplainability.getFeatureImportance('model-risk');
    expect(explanation.id).toContain('model-risk');
    expect(Object.keys(importance).length).toBeGreaterThan(0);

    aiGovernance.createAuditTrail('model-risk');
    aiGovernance.recordModelChange('model-risk', 'retrained', { version: '2026-04-10' });
    biasDetection.detectBias('model-risk', [
      { group: 'A', score: 10 },
      { group: 'A', score: 11 },
      { group: 'B', score: 9 }
    ]);

    expect(aiGovernance.enforceCompliance('model-risk', 'eu-ai-act')).toBe(true);
    expect(aiGovernance.getComplianceStatus('model-risk').latest.status).toBe('compliant');
    expect(modelExplainability.generateHumanReadableExplanation(explanation.id)).toContain('model-risk');
  });
});
