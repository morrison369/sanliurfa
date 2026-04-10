/**
 * Phase 106: AI Governance, Ethics & Explainability
 * Model explainability, bias detection, AI governance, compliance
 */

import { logger } from './logging';

interface ExplanationRecord {
  id: string;
  modelId: string;
  inputId: string;
  method: string;
  generatedAt: number;
  featureImportance: Record<string, number>;
  input: Record<string, unknown>;
}

interface BiasFinding {
  id: string;
  modelId: string;
  field: string;
  severity: 'low' | 'medium' | 'high';
  imbalanceRatio: number;
  distribution: Record<string, number>;
  detectedAt: number;
}

interface ModelChangeRecord {
  changeType: string;
  details: Record<string, unknown>;
  timestamp: number;
}

interface ComplianceState {
  framework: string;
  status: 'compliant' | 'needs-review';
  checkedAt: number;
  requirements: {
    hasAuditTrail: boolean;
    hasExplainability: boolean;
    hasBiasAssessment: boolean;
  };
}

function normalizeNumber(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? Math.abs(numeric) : 0;
}

function round(value: number, digits: number = 4): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function stableExplanationId(modelId: string, input: Record<string, unknown>, method: string): string {
  const inputId = Object.keys(input).sort().join('|') || 'empty';
  return `${modelId}:${method}:${inputId}`;
}

function toFeatureImportance(input: Record<string, unknown>): Record<string, number> {
  const entries = Object.entries(input);
  if (entries.length === 0) {
    return {};
  }

  const weighted = entries.map(([key, value], index) => {
    const numericWeight = normalizeNumber(value);
    const fallbackWeight = key.length + index + 1;
    return [key, numericWeight || fallbackWeight] as const;
  });

  const total = weighted.reduce((sum, [, value]) => sum + value, 0) || 1;

  return Object.fromEntries(
    weighted.map(([key, value]) => [key, round(value / total)])
  );
}

function detectCategoricalFields(records: Record<string, unknown>[]): string[] {
  if (records.length === 0) {
    return [];
  }

  const fields = new Set<string>();
  for (const record of records) {
    for (const [field, value] of Object.entries(record)) {
      if (typeof value === 'string' || typeof value === 'boolean') {
        fields.add(field);
      }
    }
  }

  return Array.from(fields);
}

export class ModelExplainability {
  private explanations = new Map<string, ExplanationRecord>();

  explainPrediction(modelId: string, input: Record<string, any>, method: string): ExplanationRecord {
    const featureImportance = toFeatureImportance(input);
    const inputId = Object.keys(input).sort().join('|') || 'empty';
    const id = stableExplanationId(modelId, input, method);

    const explanation: ExplanationRecord = {
      id,
      modelId,
      inputId,
      method,
      generatedAt: Date.now(),
      featureImportance,
      input
    };

    this.explanations.set(id, explanation);
    logger.info('AI explanation generated', { modelId, method, featureCount: Object.keys(featureImportance).length });

    return explanation;
  }

  getFeatureImportance(modelId: string): Record<string, number> {
    const explanations = Array.from(this.explanations.values()).filter((entry) => entry.modelId === modelId);
    if (explanations.length === 0) {
      return {};
    }

    const totals = new Map<string, number>();
    for (const explanation of explanations) {
      for (const [feature, weight] of Object.entries(explanation.featureImportance)) {
        totals.set(feature, (totals.get(feature) || 0) + weight);
      }
    }

    return Object.fromEntries(
      Array.from(totals.entries()).map(([feature, total]) => [feature, round(total / explanations.length)])
    );
  }

  visualizeDecisionPath(modelId: string, inputId: string): Record<string, any> {
    const explanation = Array.from(this.explanations.values()).find(
      (entry) => entry.modelId === modelId && entry.inputId === inputId
    );

    if (!explanation) {
      return { modelId, inputId, steps: [] };
    }

    const steps = Object.entries(explanation.featureImportance)
      .sort((a, b) => b[1] - a[1])
      .map(([feature, weight], index) => ({
        step: index + 1,
        feature,
        weight,
        observedValue: explanation.input[feature] ?? null
      }));

    return { modelId, inputId, method: explanation.method, steps };
  }

  generateHumanReadableExplanation(explanationId: string): string {
    const explanation = this.explanations.get(explanationId);
    if (!explanation) {
      return '';
    }

    const topFactors = Object.entries(explanation.featureImportance)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([feature, weight]) => `${feature} (${Math.round(weight * 100)}%)`);

    return `${explanation.modelId} modeli ${explanation.method} yöntemi ile analiz edildi. En etkili sinyaller: ${topFactors.join(', ')}.`;
  }

  compareExplanations(explanationIds: string[]): Record<string, any> {
    const explanations = explanationIds
      .map((id) => this.explanations.get(id))
      .filter((entry): entry is ExplanationRecord => Boolean(entry));

    if (explanations.length === 0) {
      return { explanations: [], overlap: {}, consistencyScore: 0 };
    }

    const featureSets = explanations.map((entry) => new Set(Object.keys(entry.featureImportance)));
    const sharedFeatures = Array.from(featureSets[0]).filter((feature) => featureSets.every((set) => set.has(feature)));
    const union = new Set(featureSets.flatMap((set) => Array.from(set)));
    const consistencyScore = union.size === 0 ? 0 : round(sharedFeatures.length / union.size);

    return {
      explanations: explanations.map((entry) => ({
        id: entry.id,
        modelId: entry.modelId,
        method: entry.method,
        generatedAt: entry.generatedAt
      })),
      overlap: sharedFeatures.reduce<Record<string, number>>((acc, feature) => {
        acc[feature] = round(
          explanations.reduce((sum, entry) => sum + (entry.featureImportance[feature] || 0), 0) / explanations.length
        );
        return acc;
      }, {}),
      consistencyScore
    };
  }
}

export class BiasDetection {
  private findings = new Map<string, BiasFinding[]>();
  private mitigationStrategies = new Map<string, string[]>();

  detectBias(modelId: string, testDataset: Record<string, any>[]): BiasFinding[] {
    const findings: BiasFinding[] = [];

    for (const field of detectCategoricalFields(testDataset)) {
      const counts = new Map<string, number>();

      for (const record of testDataset) {
        const key = String(record[field]);
        counts.set(key, (counts.get(key) || 0) + 1);
      }

      if (counts.size < 2) {
        continue;
      }

      const distribution = Object.fromEntries(
        Array.from(counts.entries()).map(([key, value]) => [key, round(value / testDataset.length)])
      );

      const values = Object.values(distribution);
      const maxShare = Math.max(...values);
      const minShare = Math.min(...values);
      const imbalanceRatio = maxShare - minShare;

      if (imbalanceRatio < 0.2) {
        continue;
      }

      findings.push({
        id: `${modelId}:${field}`,
        modelId,
        field,
        severity: imbalanceRatio > 0.5 ? 'high' : imbalanceRatio > 0.3 ? 'medium' : 'low',
        imbalanceRatio: round(imbalanceRatio),
        distribution,
        detectedAt: Date.now()
      });
    }

    this.findings.set(modelId, findings);
    logger.info('AI bias detection completed', { modelId, findings: findings.length });
    return findings;
  }

  analyzeGroupFairness(modelId: string, groups: string[]): Record<string, number> {
    const findings = this.findings.get(modelId) || [];
    const fairness: Record<string, number> = {};

    for (const group of groups) {
      const finding = findings.find((entry) => entry.field === group);
      fairness[group] = finding ? round(1 - finding.imbalanceRatio) : 1;
    }

    return fairness;
  }

  assessEqualOpportunity(modelId: string): Record<string, any> {
    const findings = this.findings.get(modelId) || [];
    const worstFinding = findings.reduce<BiasFinding | null>((current, entry) => {
      if (!current || entry.imbalanceRatio > current.imbalanceRatio) {
        return entry;
      }
      return current;
    }, null);

    return {
      modelId,
      status: worstFinding ? 'review-required' : 'balanced',
      disparity: worstFinding?.imbalanceRatio || 0,
      focusField: worstFinding?.field || null
    };
  }

  mitigateBias(modelId: string, strategy: string): void {
    const existing = this.mitigationStrategies.get(modelId) || [];
    this.mitigationStrategies.set(modelId, [...existing, strategy]);
    logger.info('AI bias mitigation strategy recorded', { modelId, strategy });
  }

  generateFairnessReport(modelId: string): Record<string, any> {
    const findings = this.findings.get(modelId) || [];
    const strategies = this.mitigationStrategies.get(modelId) || [];

    return {
      modelId,
      assessed: this.findings.has(modelId),
      findingCount: findings.length,
      findings,
      mitigationStrategies: strategies,
      generatedAt: Date.now()
    };
  }
}

export class AIGovernance {
  private auditTrails = new Map<string, ModelChangeRecord[]>();
  private complianceStates = new Map<string, ComplianceState[]>();

  createAuditTrail(modelId: string): void {
    if (!this.auditTrails.has(modelId)) {
      this.auditTrails.set(modelId, []);
      logger.info('AI audit trail created', { modelId });
    }
  }

  recordModelChange(modelId: string, changeType: string, details: Record<string, any>): void {
    const trail = this.auditTrails.get(modelId) || [];
    trail.push({
      changeType,
      details,
      timestamp: Date.now()
    });
    this.auditTrails.set(modelId, trail);
    logger.info('AI model change recorded', { modelId, changeType });
  }

  auditModel(modelId: string): any {
    return {
      modelId,
      changes: this.auditTrails.get(modelId) || [],
      changeCount: (this.auditTrails.get(modelId) || []).length
    };
  }

  enforceCompliance(modelId: string, framework: string): boolean {
    const hasAuditTrail = (this.auditTrails.get(modelId) || []).length > 0;
    const hasExplainability = Object.keys(modelExplainability.getFeatureImportance(modelId)).length > 0;
    const fairnessReport = biasDetection.generateFairnessReport(modelId);
    const hasBiasAssessment = fairnessReport.assessed === true;
    const compliant = hasAuditTrail && hasExplainability && hasBiasAssessment;

    const state: ComplianceState = {
      framework,
      status: compliant ? 'compliant' : 'needs-review',
      checkedAt: Date.now(),
      requirements: {
        hasAuditTrail,
        hasExplainability,
        hasBiasAssessment
      }
    };

    const history = this.complianceStates.get(modelId) || [];
    this.complianceStates.set(modelId, [...history, state]);
    logger.info('AI compliance evaluated', { modelId, framework, status: state.status });

    return compliant;
  }

  getComplianceStatus(modelId: string): Record<string, any> {
    const history = this.complianceStates.get(modelId) || [];
    const latest = history[history.length - 1];

    return {
      modelId,
      latest: latest || null,
      checks: history.length
    };
  }

  generateGovernanceReport(modelId: string, period: string): Record<string, any> {
    const audit = this.auditModel(modelId);
    const compliance = this.getComplianceStatus(modelId);
    const fairness = biasDetection.generateFairnessReport(modelId);

    return {
      modelId,
      period,
      changeCount: audit.changeCount,
      compliance,
      fairness,
      generatedAt: Date.now()
    };
  }
}

export class ExplainableAI {
  private interpretableModels = new Map<string, { datasetId: string; targetVariable: string; createdAt: number }>();

  buildInterpretableModel(datasetId: string, targetVariable: string): string {
    const id = `interpretable-${datasetId}-${targetVariable}`;
    this.interpretableModels.set(id, {
      datasetId,
      targetVariable,
      createdAt: Date.now()
    });
    logger.info('Interpretable model registered', { modelId: id, datasetId, targetVariable });
    return id;
  }

  explainModelBehavior(modelId: string): Record<string, any> {
    return {
      modelId,
      featureImportance: modelExplainability.getFeatureImportance(modelId),
      auditTrail: aiGovernance.auditModel(modelId)
    };
  }

  generateTransparencyDashboard(modelId: string): Record<string, any> {
    return {
      modelId,
      compliance: aiGovernance.getComplianceStatus(modelId),
      fairness: biasDetection.generateFairnessReport(modelId),
      topFeatures: modelExplainability.getFeatureImportance(modelId)
    };
  }

  validateModelAssumptions(modelId: string): Record<string, any> {
    const featureImportance = modelExplainability.getFeatureImportance(modelId);
    const missingSignals = Object.keys(featureImportance).length === 0 ? ['feature-importance'] : [];

    return {
      modelId,
      valid: missingSignals.length === 0,
      missingSignals
    };
  }

  auditForTransparency(modelId: string): Record<string, any> {
    const assumptions = this.validateModelAssumptions(modelId);

    return {
      modelId,
      assumptions,
      governance: aiGovernance.generateGovernanceReport(modelId, 'current')
    };
  }

  createComplianceReport(modelId: string, audience: string): Record<string, any> {
    return {
      audience,
      modelId,
      summary: this.generateTransparencyDashboard(modelId),
      generatedAt: Date.now()
    };
  }
}

export const modelExplainability = new ModelExplainability();
export const biasDetection = new BiasDetection();
export const aiGovernance = new AIGovernance();
export const explainableAI = new ExplainableAI();
