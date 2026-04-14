/**
 * Phase 214: Governance Agent Swarm Ops
 */

import { logger } from '../logger';

export interface SwarmAgent {
  id: string;
  role: string;
  load: number;
  status: 'idle' | 'busy' | 'offline';
}

class SwarmCoordinator {
  assign(agents: SwarmAgent[], taskWeight: number): SwarmAgent | undefined {
    return [...agents]
      .filter(a => a.status !== 'offline')
      .sort((a, b) => a.load - b.load)
      .find(a => a.load + taskWeight <= 100);
  }
}

class SwarmLoadBalancer {
  rebalance(agents: SwarmAgent[]): SwarmAgent[] {
    const avg = agents.length ? agents.reduce((a, b) => a + b.load, 0) / agents.length : 0;
    return agents.map(a => ({ ...a, load: Math.round((a.load * 0.7 + avg * 0.3) * 10) / 10 }));
  }
}

class SwarmConsensusEngine {
  consensus(votes: Array<'approve' | 'reject'>): { decision: 'approve' | 'reject'; confidence: number } {
    const approve = votes.filter(v => v === 'approve').length;
    const reject = votes.length - approve;
    const decision: 'approve' | 'reject' = approve >= reject ? 'approve' : 'reject';
    const confidence = votes.length ? Math.round((Math.max(approve, reject) / votes.length) * 1000) / 10 : 0;
    return { decision, confidence };
  }
}

class SwarmOpsReporter {
  report(agents: SwarmAgent[]): { online: number; avgLoad: number } {
    const online = agents.filter(a => a.status !== 'offline').length;
    const avgLoad = agents.length ? agents.reduce((a, b) => a + b.load, 0) / agents.length : 0;
    logger.debug('Swarm ops report generated', { online, avgLoad });
    return { online, avgLoad: Math.round(avgLoad * 10) / 10 };
  }
}

export const swarmCoordinator = new SwarmCoordinator();
export const swarmLoadBalancer = new SwarmLoadBalancer();
export const swarmConsensusEngine = new SwarmConsensusEngine();
export const swarmOpsReporter = new SwarmOpsReporter();

export {
  SwarmCoordinator,
  SwarmLoadBalancer,
  SwarmConsensusEngine,
  SwarmOpsReporter
};


