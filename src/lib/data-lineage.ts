/**
 * Phase 183: Data Lineage & Provenance
 * Lineage graph, transformation tracking, provenance management, impact analysis
 */

import { logger } from './logger';

interface LineageNode {
  nodeId: string;
  type: 'source' | 'transformation' | 'product' | 'consumer';
  name: string;
  domainId?: string;
  metadata: Record<string, any>;
}

interface LineageEdge {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  transformationType: 'copy' | 'filter' | 'aggregate' | 'join' | 'enrich' | 'derive';
  createdAt: number;
}

interface ProvenanceRecord {
  recordId: string;
  dataProductId: string;
  sourceNodes: string[];
  transformations: string[];
  capturedAt: number;
  dataHash: string;
}

class LineageGraphBuilder {
  private nodes: Map<string, LineageNode> = new Map();
  private edges: Map<string, LineageEdge> = new Map();
  private counter = 0;

  addNode(type: LineageNode['type'], name: string, domainId?: string, metadata: Record<string, any> = {}): LineageNode {
    const nodeId = `node-${Date.now()}-${++this.counter}`;
    const node: LineageNode = { nodeId, type, name, domainId, metadata };
    this.nodes.set(nodeId, node);
    return node;
  }

  addEdge(fromNodeId: string, toNodeId: string, transformationType: LineageEdge['transformationType']): LineageEdge | null {
    if (!this.nodes.has(fromNodeId) || !this.nodes.has(toNodeId)) return null;
    const edgeId = `edge-${Date.now()}-${++this.counter}`;
    const edge: LineageEdge = { edgeId, fromNodeId, toNodeId, transformationType, createdAt: Date.now() };
    this.edges.set(edgeId, edge);
    logger.debug('Lineage edge added', { edgeId, fromNodeId, toNodeId, transformationType });
    return edge;
  }

  getUpstreamLineage(nodeId: string): LineageNode[] {
    const visited = new Set<string>();
    const result: LineageNode[] = [];
    const queue = [nodeId];

    while (queue.length) {
      const current = queue.shift()!;
      for (const edge of this.edges.values()) {
        if (edge.toNodeId === current && !visited.has(edge.fromNodeId)) {
          visited.add(edge.fromNodeId);
          const node = this.nodes.get(edge.fromNodeId);
          if (node) { result.push(node); queue.push(edge.fromNodeId); }
        }
      }
    }

    return result;
  }

  getDownstreamLineage(nodeId: string): LineageNode[] {
    const visited = new Set<string>();
    const result: LineageNode[] = [];
    const queue = [nodeId];

    while (queue.length) {
      const current = queue.shift()!;
      for (const edge of this.edges.values()) {
        if (edge.fromNodeId === current && !visited.has(edge.toNodeId)) {
          visited.add(edge.toNodeId);
          const node = this.nodes.get(edge.toNodeId);
          if (node) { result.push(node); queue.push(edge.toNodeId); }
        }
      }
    }

    return result;
  }

  getNode(nodeId: string): LineageNode | undefined {
    return this.nodes.get(nodeId);
  }

  getAllNodes(): LineageNode[] {
    return Array.from(this.nodes.values());
  }
}

class TransformationTracker {
  private transformations: Map<string, Array<{ step: string; type: string; inputCount: number; outputCount: number; durationMs: number; timestamp: number }>> = new Map();

  record(productId: string, step: string, type: string, inputCount: number, outputCount: number, durationMs: number): void {
    const existing = this.transformations.get(productId) || [];
    existing.push({ step, type, inputCount, outputCount, durationMs, timestamp: Date.now() });
    this.transformations.set(productId, existing);
  }

  getTransformationHistory(productId: string): Array<{ step: string; type: string; inputCount: number; outputCount: number; durationMs: number; timestamp: number }> {
    return this.transformations.get(productId) || [];
  }

  getDataReductionRate(productId: string): number {
    const history = this.transformations.get(productId) || [];
    if (history.length < 2) return 0;
    const first = history[0].inputCount;
    const last = history[history.length - 1].outputCount;
    return first > 0 ? ((first - last) / first) * 100 : 0;
  }

  getSlowTransformations(thresholdMs: number): Array<{ productId: string; step: string; durationMs: number }> {
    const slow: Array<{ productId: string; step: string; durationMs: number }> = [];
    for (const [productId, steps] of this.transformations) {
      for (const step of steps) {
        if (step.durationMs > thresholdMs) slow.push({ productId, step: step.step, durationMs: step.durationMs });
      }
    }
    return slow;
  }
}

class ProvenanceManager {
  private records: Map<string, ProvenanceRecord> = new Map();
  private counter = 0;

  capture(dataProductId: string, sourceNodes: string[], transformations: string[], dataContent: string): ProvenanceRecord {
    const recordId = `prov-${Date.now()}-${++this.counter}`;
    const record: ProvenanceRecord = {
      recordId, dataProductId, sourceNodes, transformations,
      capturedAt: Date.now(),
      dataHash: `hash-${dataContent.substring(0, 8)}-${++this.counter}`
    };
    this.records.set(recordId, record);
    logger.debug('Provenance captured', { recordId, dataProductId, sourceCount: sourceNodes.length });
    return record;
  }

  getProvenance(dataProductId: string): ProvenanceRecord[] {
    return Array.from(this.records.values()).filter(r => r.dataProductId === dataProductId);
  }

  verifyIntegrity(recordId: string, currentDataContent: string): boolean {
    const record = this.records.get(recordId);
    if (!record) return false;
    const expectedHash = `hash-${currentDataContent.substring(0, 8)}`;
    return record.dataHash.startsWith(expectedHash);
  }

  getRecord(recordId: string): ProvenanceRecord | undefined {
    return this.records.get(recordId);
  }
}

class ImpactAnalyzer {
  analyzeUpstreamChange(changedNodeId: string, lineageGraph: LineageGraphBuilder): {
    affectedNodes: LineageNode[];
    affectedProductCount: number;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const downstream = lineageGraph.getDownstreamLineage(changedNodeId);
    const affectedProducts = downstream.filter(n => n.type === 'product');

    const riskLevel = affectedProducts.length > 10 ? 'high'
      : affectedProducts.length > 3 ? 'medium' : 'low';

    logger.debug('Impact analyzed', {
      changedNodeId,
      affectedCount: downstream.length,
      riskLevel
    });

    return {
      affectedNodes: downstream,
      affectedProductCount: affectedProducts.length,
      riskLevel
    };
  }

  estimateRollbackComplexity(nodeId: string, lineageGraph: LineageGraphBuilder): { complexity: 'simple' | 'moderate' | 'complex'; steps: number } {
    const upstream = lineageGraph.getUpstreamLineage(nodeId);
    const complexity = upstream.length > 10 ? 'complex' : upstream.length > 4 ? 'moderate' : 'simple';
    return { complexity, steps: upstream.length + 1 };
  }
}

export const lineageGraphBuilder = new LineageGraphBuilder();
export const transformationTracker = new TransformationTracker();
export const provenanceManager = new ProvenanceManager();
export const impactAnalyzer = new ImpactAnalyzer();

export { LineageNode, LineageEdge, ProvenanceRecord };
