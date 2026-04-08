/**
 * Phase 154: Runbook Automation & Response
 * Runbook management, incident response, post-incident analysis
 */

import { logger } from './logger';

interface RunbookStep {
  id: string;
  action: string;
  description: string;
  requiresApproval: boolean;
  timeout: number;
  parallel: boolean;
  rollbackAction?: string;
}

interface Runbook {
  id: string;
  name: string;
  incidentType: string;
  steps: RunbookStep[];
  version: number;
  status: 'draft' | 'active' | 'deprecated';
  createdAt: number;
  effectiveness: number;
}

interface ExecutionResult {
  executionId: string;
  runbookId: string;
  incidentId: string;
  status: 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  completedSteps: number;
  currentStep: number;
  startTime: number;
  endTime?: number;
  actualMTTR?: number;
}

interface PostIncidentAnalysis {
  incidentId: string;
  executionId: string;
  effectiveSteps: string[];
  ineffectiveSteps: string[];
  mttrAchieved: number;
  mttrExpected: number;
  suggestions: string[];
  lessons: string[];
}

class RunbookManager {
  private runbooks: Map<string, Runbook> = new Map();
  private counter = 0;

  create(config: Omit<Runbook, 'id' | 'version' | 'createdAt' | 'effectiveness'>): Runbook {
    const runbook: Runbook = {
      id: `runbook-${Date.now()}-${++this.counter}`,
      version: 1,
      createdAt: Date.now(),
      effectiveness: 0,
      ...config
    };

    this.runbooks.set(runbook.id, runbook);

    logger.debug('Runbook created', { runbookId: runbook.id, name: config.name });

    return runbook;
  }

  getByIncidentType(incidentType: string): Runbook | undefined {
    return Array.from(this.runbooks.values()).find(r => r.incidentType === incidentType && r.status === 'active');
  }

  updateVersion(runbookId: string, steps: RunbookStep[]): Runbook | undefined {
    const existing = this.runbooks.get(runbookId);
    if (!existing) return undefined;

    const updated: Runbook = {
      ...existing,
      steps,
      version: existing.version + 1
    };

    this.runbooks.set(runbookId, updated);

    logger.debug('Runbook updated', { runbookId, newVersion: updated.version });

    return updated;
  }

  setStatus(runbookId: string, status: 'draft' | 'active' | 'deprecated'): Runbook | undefined {
    const runbook = this.runbooks.get(runbookId);
    if (runbook) {
      runbook.status = status;
    }

    return runbook;
  }

  getRunbook(runbookId: string): Runbook | undefined {
    return this.runbooks.get(runbookId);
  }
}

class IncidentResponder {
  private executions: Map<string, ExecutionResult> = new Map();
  private counter = 0;

  execute(runbook: Runbook, incidentId: string): ExecutionResult {
    const execution: ExecutionResult = {
      executionId: `exec-${Date.now()}-${++this.counter}`,
      runbookId: runbook.id,
      incidentId,
      status: 'in_progress',
      completedSteps: 0,
      currentStep: 0,
      startTime: Date.now()
    };

    this.executions.set(execution.executionId, execution);

    logger.debug('Incident response started', {
      executionId: execution.executionId,
      runbookId: runbook.id,
      incidentId
    });

    return execution;
  }

  executeStep(executionId: string, stepIndex: number): { success: boolean; stepId: string; result: any } {
    const execution = this.executions.get(executionId);
    if (!execution) return { success: false, stepId: '', result: null };

    execution.currentStep = stepIndex;
    execution.completedSteps = stepIndex;

    logger.debug('Step executed', { executionId, stepIndex });

    return { success: true, stepId: `step-${stepIndex}`, result: { status: 'success' } };
  }

  completeExecution(executionId: string): ExecutionResult | undefined {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.status = 'completed';
      execution.endTime = Date.now();
      execution.actualMTTR = execution.endTime - execution.startTime;

      logger.debug('Execution completed', { executionId, mttr: execution.actualMTTR });
    }

    return execution;
  }

  rollback(executionId: string): ExecutionResult | undefined {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.status = 'rolled_back';
      execution.endTime = Date.now();

      logger.debug('Execution rolled back', { executionId });
    }

    return execution;
  }

  getExecution(executionId: string): ExecutionResult | undefined {
    return this.executions.get(executionId);
  }
}

class AutomationExecutor {
  private counter = 0;

  async executeAction(action: string, context: Record<string, any>): Promise<{ success: boolean; result: any; error?: string }> {
    try {
      // Simulate action execution
      if (action === 'restart-service') {
        logger.debug('Restarting service', context);
        return { success: true, result: { service: context.service, status: 'restarted' } };
      }

      if (action === 'scale-up') {
        logger.debug('Scaling up', context);
        return { success: true, result: { service: context.service, replicas: context.replicas + 1 } };
      }

      if (action === 'circuit-break') {
        logger.debug('Circuit breaker activated', context);
        return { success: true, result: { service: context.service, status: 'open' } };
      }

      return { success: false, error: `Unknown action: ${action}` };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async executeApprovalRequired(action: string, context: Record<string, any>): Promise<{ requiresApproval: boolean; pendingApproval: boolean }> {
    return {
      requiresApproval: true,
      pendingApproval: true
    };
  }
}

class PostIncidentAnalyzer {
  private analyses: Map<string, PostIncidentAnalysis> = new Map();
  private counter = 0;

  analyze(execution: ExecutionResult, runbook: Runbook, actualMTTR: number, expectedMTTR: number): PostIncidentAnalysis {
    const analysis: PostIncidentAnalysis = {
      incidentId: execution.incidentId,
      executionId: execution.executionId,
      effectiveSteps: runbook.steps.slice(0, Math.ceil(execution.completedSteps)).map(s => s.id),
      ineffectiveSteps: runbook.steps.slice(execution.completedSteps).map(s => s.id),
      mttrAchieved: actualMTTR,
      mttrExpected: expectedMTTR,
      suggestions: this.generateSuggestions(execution, runbook, actualMTTR, expectedMTTR),
      lessons: this.extractLessons(execution, runbook)
    };

    this.analyses.set(analysis.incidentId, analysis);

    logger.debug('Post-incident analysis completed', {
      incidentId: analysis.incidentId,
      mttrDelta: (actualMTTR - expectedMTTR) / 1000
    });

    return analysis;
  }

  private generateSuggestions(execution: ExecutionResult, runbook: Runbook, actualMTTR: number, expectedMTTR: number): string[] {
    const suggestions: string[] = [];

    if (actualMTTR > expectedMTTR * 1.2) {
      suggestions.push('Review step timeouts and add parallel execution where possible');
    }

    if (execution.completedSteps < runbook.steps.length) {
      suggestions.push(`Runbook was incomplete (${execution.completedSteps}/${runbook.steps.length} steps)`);
    }

    suggestions.push('Document any manual interventions performed during response');

    return suggestions;
  }

  private extractLessons(execution: ExecutionResult, runbook: Runbook): string[] {
    return [
      'Ensure monitoring alerts trigger earlier in incident lifecycle',
      'Test runbook steps regularly in non-production environment',
      'Review and update runbook effectiveness metrics'
    ];
  }

  getAnalysis(incidentId: string): PostIncidentAnalysis | undefined {
    return this.analyses.get(incidentId);
  }

  calculateRunbookEffectiveness(runbookId: string, analyses: PostIncidentAnalysis[]): number {
    if (analyses.length === 0) return 0;

    const successfulAnalyses = analyses.filter(a => a.ineffectiveSteps.length === 0);
    return successfulAnalyses.length / analyses.length;
  }
}

export const runbookManager = new RunbookManager();
export const incidentResponder = new IncidentResponder();
export const automationExecutor = new AutomationExecutor();
export const postIncidentAnalyzer = new PostIncidentAnalyzer();

export { RunbookStep, Runbook, ExecutionResult, PostIncidentAnalysis };
