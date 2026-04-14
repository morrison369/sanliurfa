/**
 * Phase 235: Compliance Dependency Impact Mapper
 */

import { logger } from '../logger';

export interface ComplianceDependency {
  source: string;
  target: string;
  weight: number;
}

class DependencyGraphBuilder {
  build(nodes: string[], dependencies: ComplianceDependency[]): { nodes: string[]; dependencies: ComplianceDependency[] } {
    return { nodes, dependencies };
  }
}

class DependencyImpactPropagator {
  propagate(seedRisk: number, pathWeights: number[]): number {
    const factor = pathWeights.reduce((a, b) => a * b, 1);
    return Math.round(seedRisk * factor * 10) / 10;
  }
}

class CriticalDependencyDetector {
  critical(dependencies: ComplianceDependency[], threshold: number): ComplianceDependency[] {
    return dependencies.filter(d => d.weight >= threshold);
  }
}

class DependencyImpactReporter {
  summarize(criticalCount: number, impact: number): string {
    const text = `Critical dependencies: ${criticalCount}, projected impact: ${impact}.`;
    logger.debug('Dependency impact summary', { criticalCount, impact });
    return text;
  }
}

export const dependencyGraphBuilder = new DependencyGraphBuilder();
export const dependencyImpactPropagator = new DependencyImpactPropagator();
export const criticalDependencyDetector = new CriticalDependencyDetector();
export const dependencyImpactReporter = new DependencyImpactReporter();

export {
  DependencyGraphBuilder,
  DependencyImpactPropagator,
  CriticalDependencyDetector,
  DependencyImpactReporter
};

