/**
 * Data Quality Module
 * Stub for data validation and quality checks
 */

export interface QualityRule {
  id: string;
  field: string;
  rule: string;
  threshold: number;
}

export interface QualityReport {
  score: number;
  passed: number;
  failed: number;
  issues: string[];
}

export class DataQualityEngine {
  private rules: QualityRule[] = [];

  addRule(rule: Omit<QualityRule, 'id'>): QualityRule {
    const newRule: QualityRule = {
      ...rule,
      id: Math.random().toString(36).substring(7)
    };
    this.rules.push(newRule);
    return newRule;
  }

  validate(data: Record<string, unknown>): QualityReport {
    const issues: string[] = [];
    let passed = 0;
    let failed = 0;

    this.rules.forEach(rule => {
      if (data[rule.field] !== undefined) {
        passed++;
      } else {
        failed++;
        issues.push(`Missing field: ${rule.field}`);
      }
    });

    const total = passed + failed;
    return {
      score: total > 0 ? (passed / total) * 100 : 100,
      passed,
      failed,
      issues
    };
  }
}

export const dataQualityEngine = new DataQualityEngine();
export default dataQualityEngine;
