/**
 * Phase 180: Policy Simulation Sandbox
 */

import { logger } from '../logger';

export interface SimulationCase {
  caseId: string;
  policyId: string;
  context: Record<string, unknown>;
  expected: 'allow' | 'deny';
}

class PolicySimulationEngine {
  private counter = 0;

  createCase(policyId: string, context: Record<string, unknown>, expected: 'allow' | 'deny'): SimulationCase {
    return {
      caseId: `sim-${Date.now()}-${++this.counter}`,
      policyId,
      context,
      expected
    };
  }

  run(policyRules: Array<{ condition: Record<string, unknown>; effect: 'allow' | 'deny' }>, testCase: SimulationCase): {
    actual: 'allow' | 'deny';
    matched: boolean;
  } {
    let actual: 'allow' | 'deny' = 'deny';
    for (const rule of policyRules) {
      const ok = Object.entries(rule.condition).every(([k, v]) => testCase.context[k] === v);
      if (ok) {
        actual = rule.effect;
        break;
      }
    }
    return { actual, matched: actual === testCase.expected };
  }
}

class SimulationScenarioBuilder {
  buildFromMatrix(policyId: string, matrix: Array<{ context: Record<string, unknown>; expected: 'allow' | 'deny' }>): SimulationCase[] {
    return matrix.map((m, i) => ({
      caseId: `${policyId}-mx-${i + 1}`,
      policyId,
      context: m.context,
      expected: m.expected
    }));
  }
}

class SimulationDeltaAnalyzer {
  compare(before: Array<{ matched: boolean }>, after: Array<{ matched: boolean }>): { improved: number; regressed: number } {
    let improved = 0;
    let regressed = 0;
    for (let i = 0; i < Math.min(before.length, after.length); i++) {
      if (!before[i].matched && after[i].matched) improved++;
      if (before[i].matched && !after[i].matched) regressed++;
    }
    return { improved, regressed };
  }
}

class SimulationSafetyGate {
  decide(result: { improved: number; regressed: number }, maxRegression = 0): { approved: boolean; reason: string } {
    const approved = result.regressed <= maxRegression;
    const reason = approved ? 'simulation gate passed' : 'simulation regression detected';
    logger.debug('Simulation safety gate decision', { approved, improved: result.improved, regressed: result.regressed });
    return { approved, reason };
  }
}

export const policySimulationEngine = new PolicySimulationEngine();
export const simulationScenarioBuilder = new SimulationScenarioBuilder();
export const simulationDeltaAnalyzer = new SimulationDeltaAnalyzer();
export const simulationSafetyGate = new SimulationSafetyGate();

export {
  PolicySimulationEngine,
  SimulationScenarioBuilder,
  SimulationDeltaAnalyzer,
  SimulationSafetyGate
};


