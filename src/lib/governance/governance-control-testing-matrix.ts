/**
 * Phase 185: Governance Control Testing Matrix
 */

import { logger } from '../logger';

export interface ControlTestCase {
  testId: string;
  controlId: string;
  type: 'design' | 'operating' | 'evidence';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  ownerId: string;
}

class ControlTestingMatrixBuilder {
  private cases: ControlTestCase[] = [];
  private counter = 0;

  add(controlId: string, type: ControlTestCase['type'], frequency: ControlTestCase['frequency'], ownerId: string): ControlTestCase {
    const testCase: ControlTestCase = {
      testId: `ctm-${Date.now()}-${++this.counter}`,
      controlId,
      type,
      frequency,
      ownerId
    };
    this.cases.push(testCase);
    return testCase;
  }

  list(): ControlTestCase[] {
    return this.cases;
  }
}

class TestingCoverageAnalyzer {
  coverage(controlIds: string[], testCases: ControlTestCase[]): number {
    if (controlIds.length === 0) return 0;
    const tested = new Set(testCases.map(t => t.controlId));
    return Math.round((controlIds.filter(c => tested.has(c)).length / controlIds.length) * 1000) / 10;
  }
}

class TestSchedulingEngine {
  nextRunAt(frequency: ControlTestCase['frequency'], from = Date.now()): number {
    const deltaMs =
      frequency === 'daily' ? 24 * 60 * 60 * 1000 :
      frequency === 'weekly' ? 7 * 24 * 60 * 60 * 1000 :
      frequency === 'monthly' ? 30 * 24 * 60 * 60 * 1000 :
      90 * 24 * 60 * 60 * 1000;
    return from + deltaMs;
  }
}

class TestingEvidenceMapper {
  private map = new Map<string, string[]>();

  bind(testId: string, evidenceId: string): string[] {
    const current = this.map.get(testId) || [];
    current.push(evidenceId);
    this.map.set(testId, current);
    logger.debug('Test evidence bound', { testId, evidenceCount: current.length });
    return current;
  }
}

export const controlTestingMatrixBuilder = new ControlTestingMatrixBuilder();
export const testingCoverageAnalyzer = new TestingCoverageAnalyzer();
export const testSchedulingEngine = new TestSchedulingEngine();
export const testingEvidenceMapper = new TestingEvidenceMapper();

export {
  ControlTestingMatrixBuilder,
  TestingCoverageAnalyzer,
  TestSchedulingEngine,
  TestingEvidenceMapper
};


