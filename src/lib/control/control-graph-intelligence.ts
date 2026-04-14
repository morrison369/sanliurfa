/**
 * Phase 203: Control Graph Intelligence
 */

import { logger } from '../logger';

export interface ControlGraphNode {
  controlId: string;
  domain: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
}

class ControlGraphBuilder {
  private nodes = new Map<string, ControlGraphNode>();
  private edges: Array<{ from: string; to: string }> = [];

  addNode(node: ControlGraphNode): ControlGraphNode {
    this.nodes.set(node.controlId, node);
    return node;
  }

  addEdge(from: string, to: string): void {
    this.edges.push({ from, to });
  }

  snapshot(): { nodeCount: number; edgeCount: number } {
    return { nodeCount: this.nodes.size, edgeCount: this.edges.length };
  }
}

class GraphDependencyAnalyzer {
  upstream(controlId: string, edges: Array<{ from: string; to: string }>): string[] {
    return edges.filter(e => e.to === controlId).map(e => e.from);
  }

  downstream(controlId: string, edges: Array<{ from: string; to: string }>): string[] {
    return edges.filter(e => e.from === controlId).map(e => e.to);
  }
}

class ControlBlastRadiusEstimator {
  estimate(seed: string, edges: Array<{ from: string; to: string }>): number {
    const impacted = new Set<string>([seed]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const e of edges) {
        if (impacted.has(e.from) && !impacted.has(e.to)) {
          impacted.add(e.to);
          changed = true;
        }
      }
    }
    return impacted.size;
  }
}

class GraphInsightReporter {
  summarize(nodeCount: number, edgeCount: number, blastRadius: number): string {
    const summary = `graph=${nodeCount} nodes, ${edgeCount} edges, blastRadius=${blastRadius}`;
    logger.debug('Control graph summary generated', { nodeCount, edgeCount, blastRadius });
    return summary;
  }
}

export const controlGraphBuilder = new ControlGraphBuilder();
export const graphDependencyAnalyzer = new GraphDependencyAnalyzer();
export const controlBlastRadiusEstimator = new ControlBlastRadiusEstimator();
export const graphInsightReporter = new GraphInsightReporter();

export {
  ControlGraphBuilder,
  GraphDependencyAnalyzer,
  ControlBlastRadiusEstimator,
  GraphInsightReporter
};


