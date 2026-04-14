/**
 * Phase 197: Autonomous Governance Agents
 */

import { logger } from '../logger';

export interface GovernanceAgent {
  agentId: string;
  name: string;
  scope: string;
  autonomyLevel: 'assist' | 'semi-auto' | 'auto';
  enabled: boolean;
}

class GovernanceAgentRegistry {
  private agents = new Map<string, GovernanceAgent>();
  private counter = 0;

  register(name: string, scope: string, autonomyLevel: GovernanceAgent['autonomyLevel']): GovernanceAgent {
    const agent: GovernanceAgent = {
      agentId: `gov-agent-${Date.now()}-${++this.counter}`,
      name,
      scope,
      autonomyLevel,
      enabled: true
    };
    this.agents.set(agent.agentId, agent);
    return agent;
  }

  list(): GovernanceAgent[] {
    return Array.from(this.agents.values());
  }
}

class AgentTaskRouter {
  route(scope: string, agents: GovernanceAgent[]): GovernanceAgent | undefined {
    return agents.find(a => a.enabled && a.scope === scope);
  }
}

class AgentSafetyController {
  allowAction(agent: GovernanceAgent, actionRisk: 'low' | 'medium' | 'high'): boolean {
    if (agent.autonomyLevel === 'assist') return actionRisk === 'low';
    if (agent.autonomyLevel === 'semi-auto') return actionRisk !== 'high';
    return true;
  }
}

class AgentDecisionLogger {
  private entries: Array<{ agentId: string; decision: string; timestamp: number }> = [];

  log(agentId: string, decision: string): void {
    this.entries.push({ agentId, decision, timestamp: Date.now() });
    logger.debug('Autonomous agent decision', { agentId, decision });
  }

  list(): Array<{ agentId: string; decision: string; timestamp: number }> {
    return this.entries;
  }
}

export const governanceAgentRegistry = new GovernanceAgentRegistry();
export const agentTaskRouter = new AgentTaskRouter();
export const agentSafetyController = new AgentSafetyController();
export const agentDecisionLogger = new AgentDecisionLogger();

export {
  GovernanceAgentRegistry,
  AgentTaskRouter,
  AgentSafetyController,
  AgentDecisionLogger
};


