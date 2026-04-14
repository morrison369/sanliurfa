/**
 * Phase 296: Trust Escalation Signal Mesh
 */

import { logger } from '../logger';

export interface EscalationSignalNode {
  nodeId: string;
  trustRisk: number;
  escalationCost: number;
  reach: number;
}

class EscalationSignalMesh {
  private nodes: EscalationSignalNode[] = [];

  add(node: EscalationSignalNode): EscalationSignalNode {
    this.nodes.push(node);
    return node;
  }

  list(): EscalationSignalNode[] {
    return this.nodes;
  }
}

class EscalationSignalScorer {
  score(node: EscalationSignalNode): number {
    return Math.round((node.trustRisk * 0.7 + node.reach * 0.3 - node.escalationCost * 0.1) * 10) / 10;
  }
}

class EscalationMeshRouter {
  route(node: EscalationSignalNode): 'critical' | 'priority' | 'normal' {
    const score = this.score(node);
    if (score >= 70) return 'critical';
    if (score >= 40) return 'priority';
    return 'normal';
  }

  private score(node: EscalationSignalNode): number {
    return node.trustRisk * 0.7 + node.reach * 0.3 - node.escalationCost * 0.1;
  }
}

class EscalationMeshReporter {
  report(nodeId: string, route: string): string {
    const text = `Escalation mesh node=${nodeId}, route=${route}`;
    logger.debug('Escalation mesh report', { nodeId, route });
    return text;
  }
}

export const escalationSignalMesh = new EscalationSignalMesh();
export const escalationSignalScorer = new EscalationSignalScorer();
export const escalationMeshRouter = new EscalationMeshRouter();
export const escalationMeshReporter = new EscalationMeshReporter();

export {
  EscalationSignalMesh,
  EscalationSignalScorer,
  EscalationMeshRouter,
  EscalationMeshReporter
};

