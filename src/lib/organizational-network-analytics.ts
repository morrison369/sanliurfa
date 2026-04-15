/**
 * Phase 256: Organizational Network Analytics
 * Collaboration network mapping, influence analysis, silos detection, knowledge flow
 */

import { logger } from './logger';

interface CollaborationEdge {
  edgeId: string;
  fromEmployeeId: string;
  toEmployeeId: string;
  interactionType: 'email' | 'meeting' | 'document' | 'chat' | 'code_review';
  interactionCount: number;
  period: string;
  strength: 'weak' | 'moderate' | 'strong';  // based on frequency
  isReciprocal: boolean;
  recordedAt: number;
}

interface EmployeeNetworkProfile {
  profileId: string;
  employeeId: string;
  department: string;
  role: string;
  connectionsCount: number;
  crossDeptConnectionsPct: number;  // % of connections outside own dept
  influenceScore: number;           // 0-100, betweenness/degree centrality proxy
  brokerScore: number;              // 0-100, connects otherwise disconnected groups
  isolationRisk: boolean;
  updatedAt: number;
}

interface SiloDetectionResult {
  siloId: string;
  departments: string[];
  intraGroupInteractionPct: number;  // % of interactions within group
  crossGroupInteractionPct: number;
  isolationScore: number;            // 0-100 (higher = more isolated)
  bridgePeople: string[];            // employees connecting silo to rest
  detectedAt: number;
}

interface KnowledgeFlowMetric {
  metricId: string;
  period: string;
  knowledgeSources: string[];         // high-knowledge-share employees
  knowledgeSinks: string[];           // teams that mostly receive
  knowledgeVelocity: number;          // how fast insights spread (avg hops)
  redundancyScore: number;            // how many people hold unique knowledge (lower = more risk)
  crossDeptKnowledgePct: number;
  calculatedAt: number;
}

class CollaborationNetworkMapper {
  private edges: Map<string, CollaborationEdge[]> = new Map();  // keyed by fromEmployeeId
  private counter = 0;

  record(fromEmployeeId: string, toEmployeeId: string, interactionType: CollaborationEdge['interactionType'], interactionCount: number, period: string): CollaborationEdge {
    const strength: CollaborationEdge['strength'] =
      interactionCount >= 20 ? 'strong' : interactionCount >= 5 ? 'moderate' : 'weak';

    // Check if reciprocal edge exists
    const reverseEdges = this.edges.get(toEmployeeId) || [];
    const isReciprocal = reverseEdges.some(e => e.toEmployeeId === fromEmployeeId && e.period === period);

    const edgeId = `collab-${Date.now()}-${++this.counter}`;
    const edge: CollaborationEdge = {
      edgeId, fromEmployeeId, toEmployeeId, interactionType, interactionCount, period, strength, isReciprocal, recordedAt: Date.now()
    };
    const existing = this.edges.get(fromEmployeeId) || [];
    existing.push(edge);
    this.edges.set(fromEmployeeId, existing);
    return edge;
  }

  getConnections(employeeId: string): CollaborationEdge[] {
    return this.edges.get(employeeId) || [];
  }

  getStrongConnections(employeeId: string): CollaborationEdge[] {
    return (this.edges.get(employeeId) || []).filter(e => e.strength === 'strong');
  }

  getTotalEdges(): number {
    return Array.from(this.edges.values()).flat().length;
  }

  getMostConnected(limit = 5): { employeeId: string; connectionCount: number }[] {
    const counts: Record<string, number> = {};
    for (const [emp, edgeList] of this.edges.entries()) counts[emp] = (counts[emp] || 0) + edgeList.length;
    return Object.entries(counts)
      .map(([employeeId, connectionCount]) => ({ employeeId, connectionCount }))
      .sort((a, b) => b.connectionCount - a.connectionCount)
      .slice(0, limit);
  }
}

class EmployeeNetworkProfiler {
  private profiles: Map<string, EmployeeNetworkProfile> = new Map();
  private counter = 0;

  profile(employeeId: string, department: string, role: string, totalConnections: number, crossDeptConnectionsPct: number, influenceScore: number, brokerScore: number): EmployeeNetworkProfile {
    const isolationRisk = totalConnections < 3 || crossDeptConnectionsPct < 10;

    const profileId = `netprofile-${Date.now()}-${++this.counter}`;
    const profile: EmployeeNetworkProfile = {
      profileId, employeeId, department, role, connectionsCount: totalConnections,
      crossDeptConnectionsPct, influenceScore: Math.max(0, Math.min(100, influenceScore)),
      brokerScore: Math.max(0, Math.min(100, brokerScore)), isolationRisk, updatedAt: Date.now()
    };
    this.profiles.set(employeeId, profile);
    return profile;
  }

  getIsolated(): EmployeeNetworkProfile[] {
    return Array.from(this.profiles.values()).filter(p => p.isolationRisk);
  }

  getTopInfluencers(limit = 10): EmployeeNetworkProfile[] {
    return Array.from(this.profiles.values())
      .sort((a, b) => b.influenceScore - a.influenceScore)
      .slice(0, limit);
  }

  getTopBrokers(limit = 5): EmployeeNetworkProfile[] {
    return Array.from(this.profiles.values())
      .sort((a, b) => b.brokerScore - a.brokerScore)
      .slice(0, limit);
  }

  getProfile(employeeId: string): EmployeeNetworkProfile | undefined {
    return this.profiles.get(employeeId);
  }
}

class SiloDetector {
  private results: SiloDetection[] = [];
  private counter = 0;

  detect(departments: string[], intraGroupInteractionPct: number, bridgePeople: string[]): SiloDetectionResult {
    const crossGroupInteractionPct = 100 - intraGroupInteractionPct;
    // High intra-group = isolated silo
    const isolationScore = Math.max(0, intraGroupInteractionPct - 50) * 2;  // 0-100

    const siloId = `silo-${Date.now()}-${++this.counter}`;
    const result: SiloDetectionResult = {
      siloId, departments, intraGroupInteractionPct, crossGroupInteractionPct,
      isolationScore, bridgePeople, detectedAt: Date.now()
    };
    this.results.push(result);
    logger.debug('Silo detected', { departments, isolationScore });
    return result;
  }

  getCriticalSilos(threshold = 60): SiloDetectionResult[] {
    return this.results
      .filter(s => s.isolationScore >= threshold)
      .sort((a, b) => b.isolationScore - a.isolationScore);
  }

  getSilosWithNoBridge(): SiloDetectionResult[] {
    return this.results.filter(s => s.bridgePeople.length === 0);
  }

  getAll(): SiloDetectionResult[] {
    return [...this.results];
  }
}

// Local type alias to avoid redeclaration issue
type SiloDetection = SiloDetectionResult;

class KnowledgeFlowAnalyzer {
  private metrics: KnowledgeFlowMetric[] = [];
  private counter = 0;

  analyze(period: string, knowledgeSources: string[], knowledgeSinks: string[], knowledgeVelocity: number, redundancyScore: number, crossDeptKnowledgePct: number): KnowledgeFlowMetric {
    const metricId = `knowledgeflow-${Date.now()}-${++this.counter}`;
    const metric: KnowledgeFlowMetric = {
      metricId, period, knowledgeSources, knowledgeSinks, knowledgeVelocity,
      redundancyScore: Math.max(0, Math.min(100, redundancyScore)),
      crossDeptKnowledgePct, calculatedAt: Date.now()
    };
    this.metrics.push(metric);
    return metric;
  }

  getLatest(): KnowledgeFlowMetric | undefined {
    return this.metrics[this.metrics.length - 1];
  }

  getKnowledgeConcentrationRisk(): number {
    // Low redundancy + few sources = concentration risk
    const latest = this.getLatest();
    if (!latest) return 0;
    const sourceConcentration = Math.max(0, 100 - latest.knowledgeSources.length * 10);
    return (sourceConcentration + (100 - latest.redundancyScore)) / 2;
  }
}

export const collaborationNetworkMapper = new CollaborationNetworkMapper();
export const employeeNetworkProfiler = new EmployeeNetworkProfiler();
export const siloDetector = new SiloDetector();
export const knowledgeFlowAnalyzer = new KnowledgeFlowAnalyzer();

export { CollaborationEdge, EmployeeNetworkProfile, SiloDetectionResult, KnowledgeFlowMetric };
