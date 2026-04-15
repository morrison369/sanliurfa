/**
 * Phase 171: Model Explainability & Governance
 * Explainability analysis, bias detection, model auditing, reporting
 */

import { logger } from './logger';

interface FeatureImportance {
  featureName: string;
  importance: number;
  direction: 'positive' | 'negative';
  rank: number;
}

interface ExplanationResult {
  explanationId: string;
  modelId: string;
  entityId: string;
  prediction: any;
  features: FeatureImportance[];
  topFactors: string[];
  confidence: number;
  generatedAt: number;
}

interface BiasReport {
  reportId: string;
  modelId: string;
  attribute: string;
  groups: Array<{ groupName: string; truePositiveRate: number; falsePositiveRate: number; accuracy: number }>;
  disparateImpact: number;
  biasDetected: boolean;
  severity: 'none' | 'low' | 'medium' | 'high';
}

interface ModelAuditRecord {
  auditId: string;
  modelId: string;
  versionId: string;
  auditType: 'compliance' | 'fairness' | 'performance' | 'security';
  findings: string[];
  passed: boolean;
  auditorId: string;
  auditedAt: number;
}

class ExplainabilityAnalyzer {
  private explanations: Map<string, ExplanationResult> = new Map();
  private counter = 0;

  generateExplanation(modelId: string, entityId: string, prediction: any, featureValues: Record<string, number>): ExplanationResult {
    const explanationId = `explain-${Date.now()}-${++this.counter}`;

    // Simulate SHAP-like importance scores
    const features: FeatureImportance[] = Object.entries(featureValues)
      .map(([name, value], idx) => ({
        featureName: name,
        importance: Math.abs(value * (Math.random() * 0.5 + 0.25)),
        direction: value > 0 ? 'positive' as const : 'negative' as const,
        rank: idx + 1
      }))
      .sort((a, b) => b.importance - a.importance)
      .map((f, idx) => ({ ...f, rank: idx + 1 }));

    const topFactors = features.slice(0, 3).map(f => f.featureName);

    const explanation: ExplanationResult = {
      explanationId,
      modelId,
      entityId,
      prediction,
      features,
      topFactors,
      confidence: 0.7 + Math.random() * 0.3,
      generatedAt: Date.now()
    };

    this.explanations.set(explanationId, explanation);

    logger.debug('Explanation generated', {
      explanationId,
      modelId,
      topFactors: topFactors.join(', ')
    });

    return explanation;
  }

  getGlobalImportance(modelId: string): Record<string, number> {
    const modelExplanations = Array.from(this.explanations.values()).filter(e => e.modelId === modelId);

    const importanceMap: Record<string, number[]> = {};

    for (const explanation of modelExplanations) {
      for (const feature of explanation.features) {
        importanceMap[feature.featureName] = importanceMap[feature.featureName] || [];
        importanceMap[feature.featureName].push(feature.importance);
      }
    }

    const globalImportance: Record<string, number> = {};
    for (const [name, scores] of Object.entries(importanceMap)) {
      globalImportance[name] = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    return globalImportance;
  }

  getExplanation(explanationId: string): ExplanationResult | undefined {
    return this.explanations.get(explanationId);
  }
}

class BiasDetector {
  private reports: Map<string, BiasReport> = new Map();
  private counter = 0;

  detectBias(modelId: string, attribute: string, groupMetrics: Array<{ groupName: string; truePositiveRate: number; falsePositiveRate: number; accuracy: number }>): BiasReport {
    const reportId = `bias-${Date.now()}-${++this.counter}`;

    // Calculate disparate impact (80% rule)
    const maxAccuracy = Math.max(...groupMetrics.map(g => g.accuracy));
    const minAccuracy = Math.min(...groupMetrics.map(g => g.accuracy));
    const disparateImpact = maxAccuracy > 0 ? minAccuracy / maxAccuracy : 1;

    const biasDetected = disparateImpact < 0.8;
    const severity = disparateImpact < 0.6 ? 'high' : disparateImpact < 0.7 ? 'medium' : disparateImpact < 0.8 ? 'low' : 'none';

    const report: BiasReport = {
      reportId,
      modelId,
      attribute,
      groups: groupMetrics,
      disparateImpact,
      biasDetected,
      severity
    };

    this.reports.set(reportId, report);

    if (biasDetected) {
      logger.debug('Model bias detected', {
        reportId,
        modelId,
        attribute,
        disparateImpact: disparateImpact.toFixed(3),
        severity
      });
    }

    return report;
  }

  getBiasReport(reportId: string): BiasReport | undefined {
    return this.reports.get(reportId);
  }

  getModelBiasReports(modelId: string): BiasReport[] {
    return Array.from(this.reports.values()).filter(r => r.modelId === modelId);
  }

  getHighBiasModels(): string[] {
    return [...new Set(
      Array.from(this.reports.values())
        .filter(r => r.severity === 'high')
        .map(r => r.modelId)
    )];
  }
}

class ModelAuditor {
  private audits: Map<string, ModelAuditRecord> = new Map();
  private counter = 0;

  conductAudit(modelId: string, versionId: string, auditType: 'compliance' | 'fairness' | 'performance' | 'security', auditorId: string, findings: string[], passed: boolean): ModelAuditRecord {
    const auditId = `audit-${Date.now()}-${++this.counter}`;

    const audit: ModelAuditRecord = {
      auditId,
      modelId,
      versionId,
      auditType,
      findings,
      passed,
      auditorId,
      auditedAt: Date.now()
    };

    this.audits.set(auditId, audit);

    logger.debug('Model audit conducted', {
      auditId,
      modelId,
      versionId,
      auditType,
      passed
    });

    return audit;
  }

  getAudit(auditId: string): ModelAuditRecord | undefined {
    return this.audits.get(auditId);
  }

  getModelAudits(modelId: string): ModelAuditRecord[] {
    return Array.from(this.audits.values()).filter(a => a.modelId === modelId);
  }

  isModelClearForProduction(modelId: string): { cleared: boolean; blockers: string[] } {
    const audits = this.getModelAudits(modelId);
    const failedAudits = audits.filter(a => !a.passed);
    const blockers = failedAudits.map(a => `${a.auditType}: ${a.findings.join(', ')}`);

    return { cleared: blockers.length === 0, blockers };
  }
}

class ExplainabilityReporter {
  private counter = 0;

  generateReport(modelId: string, explanations: ExplanationResult[], biasReports: BiasReport[]): {
    reportId: string;
    modelId: string;
    generatedAt: number;
    topGlobalFeatures: string[];
    biasRisk: string;
    complianceStatus: string;
    summary: string;
  } {
    const reportId = `explainability-report-${Date.now()}-${++this.counter}`;

    // Aggregate top features
    const featureFrequency: Record<string, number> = {};
    for (const explanation of explanations) {
      for (const factor of explanation.topFactors) {
        featureFrequency[factor] = (featureFrequency[factor] || 0) + 1;
      }
    }
    const topGlobalFeatures = Object.entries(featureFrequency)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);

    // Aggregate bias risk
    const maxBiasSeverity = biasReports.reduce((max, report) => {
      const severityOrder = { none: 0, low: 1, medium: 2, high: 3 };
      return severityOrder[report.severity] > severityOrder[max] ? report.severity : max;
    }, 'none' as 'none' | 'low' | 'medium' | 'high');

    const complianceStatus = maxBiasSeverity === 'none' ? 'COMPLIANT' : maxBiasSeverity === 'high' ? 'NON_COMPLIANT' : 'REVIEW_REQUIRED';

    logger.debug('Explainability report generated', {
      reportId,
      modelId,
      topFeatures: topGlobalFeatures.length,
      biasRisk: maxBiasSeverity
    });

    return {
      reportId,
      modelId,
      generatedAt: Date.now(),
      topGlobalFeatures,
      biasRisk: maxBiasSeverity,
      complianceStatus,
      summary: `Analyzed ${explanations.length} predictions. Top feature: ${topGlobalFeatures[0] || 'N/A'}. Compliance: ${complianceStatus}`
    };
  }

  exportForRegulator(reportId: string, format: 'json' | 'pdf'): { format: string; content: string } {
    return {
      format,
      content: `Explainability report ${reportId} in ${format} format`
    };
  }
}

export const explainabilityAnalyzer = new ExplainabilityAnalyzer();
export const biasDetector = new BiasDetector();
export const modelAuditor = new ModelAuditor();
export const explainabilityReporter = new ExplainabilityReporter();

export { FeatureImportance, ExplanationResult, BiasReport, ModelAuditRecord };
