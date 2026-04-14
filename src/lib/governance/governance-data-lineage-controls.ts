/**
 * Phase 179: Governance Data Lineage Controls
 */

import { logger } from '../logger';

export interface LineageNode {
  nodeId: string;
  dataset: string;
  owner: string;
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
}

class GovernanceLineageRegistry {
  private nodes = new Map<string, LineageNode>();
  private counter = 0;

  register(dataset: string, owner: string, classification: LineageNode['classification']): LineageNode {
    const node: LineageNode = {
      nodeId: `lineage-${Date.now()}-${++this.counter}`,
      dataset,
      owner,
      classification
    };
    this.nodes.set(node.nodeId, node);
    return node;
  }

  list(): LineageNode[] {
    return Array.from(this.nodes.values());
  }
}

class LineagePolicyGuard {
  enforce(source: LineageNode, target: LineageNode): { allowed: boolean; reason: string } {
    const rank = { public: 1, internal: 2, confidential: 3, restricted: 4 };
    const allowed = rank[target.classification] >= rank[source.classification];
    return { allowed, reason: allowed ? 'classification preserved' : 'downgrade blocked' };
  }
}

class DataFlowRiskAnalyzer {
  score(path: LineageNode[]): number {
    const maxClass = Math.max(...path.map(n => (n.classification === 'restricted' ? 4 : n.classification === 'confidential' ? 3 : n.classification === 'internal' ? 2 : 1)));
    const crossOwnerHops = path.slice(1).filter((n, i) => n.owner !== path[i].owner).length;
    return Math.min(100, maxClass * 20 + crossOwnerHops * 10);
  }
}

class LineageAuditReporter {
  report(path: LineageNode[]): { nodes: number; owners: number; classificationPeak: string } {
    const owners = new Set(path.map(p => p.owner)).size;
    const order: LineageNode['classification'][] = ['public', 'internal', 'confidential', 'restricted'];
    const peak = path.reduce((acc, n) => (order.indexOf(n.classification) > order.indexOf(acc) ? n.classification : acc), 'public' as LineageNode['classification']);
    logger.debug('Lineage report generated', { nodes: path.length, owners, peak });
    return { nodes: path.length, owners, classificationPeak: peak };
  }
}

export const governanceLineageRegistry = new GovernanceLineageRegistry();
export const lineagePolicyGuard = new LineagePolicyGuard();
export const dataFlowRiskAnalyzer = new DataFlowRiskAnalyzer();
export const lineageAuditReporter = new LineageAuditReporter();

export {
  GovernanceLineageRegistry,
  LineagePolicyGuard,
  DataFlowRiskAnalyzer,
  LineageAuditReporter
};


