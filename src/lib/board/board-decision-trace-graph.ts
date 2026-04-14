/**
 * Phase 226: Board Decision Trace Graph
 */

import { logger } from '../logger';

export interface BoardDecisionNode {
  id: string;
  type: 'agenda' | 'decision' | 'action' | 'outcome';
  label: string;
}

class BoardTraceGraphBuilder {
  private nodes: BoardDecisionNode[] = [];
  private edges: Array<{ from: string; to: string; relation: string }> = [];

  addNode(node: BoardDecisionNode): BoardDecisionNode {
    this.nodes.push(node);
    return node;
  }

  addEdge(from: string, to: string, relation: string): void {
    this.edges.push({ from, to, relation });
  }

  stats(): { nodeCount: number; edgeCount: number } {
    return { nodeCount: this.nodes.length, edgeCount: this.edges.length };
  }
}

class DecisionTraceResolver {
  traceFrom(startId: string, edges: Array<{ from: string; to: string; relation: string }>): string[] {
    return edges.filter(e => e.from === startId).map(e => e.to);
  }
}

class TraceIntegrityChecker {
  check(nodes: BoardDecisionNode[], edges: Array<{ from: string; to: string; relation: string }>): { valid: boolean; danglingEdges: number } {
    const ids = new Set(nodes.map(n => n.id));
    const dangling = edges.filter(e => !ids.has(e.from) || !ids.has(e.to)).length;
    return { valid: dangling === 0, danglingEdges: dangling };
  }
}

class TraceNarrativeEmitter {
  emit(path: string[]): string {
    const text = `Board decision trace: ${path.join(' -> ')}`;
    logger.debug('Board trace narrative emitted', { hops: path.length });
    return text;
  }
}

export const boardTraceGraphBuilder = new BoardTraceGraphBuilder();
export const decisionTraceResolver = new DecisionTraceResolver();
export const traceIntegrityChecker = new TraceIntegrityChecker();
export const traceNarrativeEmitter = new TraceNarrativeEmitter();

export {
  BoardTraceGraphBuilder,
  DecisionTraceResolver,
  TraceIntegrityChecker,
  TraceNarrativeEmitter
};


