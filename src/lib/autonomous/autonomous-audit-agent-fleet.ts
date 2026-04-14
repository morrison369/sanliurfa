/**
 * Phase 223: Autonomous Audit Agent Fleet
 */

import { logger } from '../logger';

export interface AuditAgent {
  id: string;
  specialty: string;
  utilization: number;
  status: 'idle' | 'running' | 'offline';
}

class AuditAgentFleetManager {
  private agents: AuditAgent[] = [];

  register(agent: AuditAgent): AuditAgent {
    this.agents.push(agent);
    return agent;
  }

  list(): AuditAgent[] {
    return this.agents;
  }
}

class FleetTaskAssigner {
  assign(agents: AuditAgent[], specialty: string): AuditAgent | undefined {
    return agents
      .filter(a => a.status !== 'offline' && a.specialty === specialty)
      .sort((a, b) => a.utilization - b.utilization)[0];
  }
}

class FleetHealthMonitor {
  health(agents: AuditAgent[]): { online: number; avgUtilization: number } {
    const onlineAgents = agents.filter(a => a.status !== 'offline');
    const avgUtilization = agents.length ? agents.reduce((a, b) => a + b.utilization, 0) / agents.length : 0;
    return { online: onlineAgents.length, avgUtilization: Math.round(avgUtilization * 10) / 10 };
  }
}

class FleetAuditLogger {
  private logs: Array<{ agentId: string; event: string; timestamp: number }> = [];

  log(agentId: string, event: string): void {
    this.logs.push({ agentId, event, timestamp: Date.now() });
    logger.debug('Audit fleet event logged', { agentId, event });
  }

  list() {
    return this.logs;
  }
}

export const auditAgentFleetManager = new AuditAgentFleetManager();
export const fleetTaskAssigner = new FleetTaskAssigner();
export const fleetHealthMonitor = new FleetHealthMonitor();
export const fleetAuditLogger = new FleetAuditLogger();

export {
  AuditAgentFleetManager,
  FleetTaskAssigner,
  FleetHealthMonitor,
  FleetAuditLogger
};


