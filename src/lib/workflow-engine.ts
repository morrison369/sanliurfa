/**
 * Phase 23: Workflow Automation Engine
 * Trigger-based workflow execution, step management, execution monitoring
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export interface WorkflowStep {
  id: string;
  type: 'action' | 'condition' | 'delay';
  config: Record<string, any>;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  steps: WorkflowStep[];
  trigger?: string;
  description?: string;
  active: boolean;
}

export interface WorkflowContext {
  payload: Record<string, any>;
  userId?: string;
  variables: Map<string, any>;
}

export interface WorkflowResult {
  success: boolean;
  executedSteps: string[];
  output: any;
  error?: string;
  duration: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  startedAt: number;
  completedAt?: number;
  success: boolean;
  error?: string;
  executedSteps: string[];
}

// ==================== WORKFLOW ENGINE ====================

export class WorkflowEngine {
  private workflows = new Map<string, WorkflowDefinition>();
  private stepExecutors = new Map<string, (config: any, context: WorkflowContext) => Promise<any>>();

  /**
   * Register a workflow
   */
  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    logger.debug('Workflow registered', { id: workflow.id, name: workflow.name });
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(workflowId: string, context: WorkflowContext): Promise<WorkflowResult> {
    const startTime = Date.now();
    const workflow = this.workflows.get(workflowId);

    if (!workflow) {
      return {
        success: false,
        executedSteps: [],
        output: null,
        error: `Workflow not found: ${workflowId}`,
        duration: Date.now() - startTime
      };
    }

    const executedSteps: string[] = [];
    let output: any = null;

    try {
      for (const step of workflow.steps) {
        // Check condition steps
        if (step.type === 'condition') {
          const condition = step.config.condition as (context: WorkflowContext) => boolean;
          if (!condition(context)) {
            if (step.config.skipToStep) {
              // Jump to specified step
              const skipIndex = workflow.steps.findIndex(s => s.id === step.config.skipToStep);
              if (skipIndex >= 0) {
                // Skip steps between current and target
                continue;
              }
            }
            continue;
          }
        }

        // Handle delay steps
        if (step.type === 'delay') {
          const delayMs = step.config.delayMs || 1000;
          await new Promise(resolve => setTimeout(resolve, delayMs));
          executedSteps.push(step.id);
          continue;
        }

        // Execute action steps
        if (step.type === 'action') {
          const executor = this.stepExecutors.get(step.config.actionType);
          if (!executor) {
            throw new Error(`No executor for action type: ${step.config.actionType}`);
          }

          output = await executor(step.config, context);
          executedSteps.push(step.id);
        }
      }

      const duration = Date.now() - startTime;
      logger.info('Workflow executed successfully', { workflowId, executedSteps: executedSteps.length, duration });

      return {
        success: true,
        executedSteps,
        output,
        duration
      };
    } catch (err) {
      const duration = Date.now() - startTime;
      logger.error('Workflow execution failed', err instanceof Error ? err : new Error(String(err)), {
        workflowId,
        executedSteps: executedSteps.length,
        duration
      });

      return {
        success: false,
        executedSteps,
        output: null,
        error: err instanceof Error ? err.message : String(err),
        duration
      };
    }
  }

  /**
   * Register a step executor
   */
  registerStepExecutor(actionType: string, executor: (config: any, context: WorkflowContext) => Promise<any>): void {
    this.stepExecutors.set(actionType, executor);
  }

  /**
   * Get workflow by ID
   */
  getWorkflow(id: string): WorkflowDefinition | null {
    return this.workflows.get(id) || null;
  }

  /**
   * List all workflows
   */
  listWorkflows(): WorkflowDefinition[] {
    return Array.from(this.workflows.values());
  }

  /**
   * Deactivate workflow
   */
  deactivateWorkflow(id: string): boolean {
    const workflow = this.workflows.get(id);
    if (workflow) {
      workflow.active = false;
      return true;
    }
    return false;
  }
}

// ==================== TRIGGER MANAGER ====================

export class TriggerManager {
  private triggers = new Map<string, string[]>(); // event -> workflowIds
  private workflowEngine: WorkflowEngine;

  constructor(engine: WorkflowEngine) {
    this.workflowEngine = engine;
  }

  /**
   * Register workflow trigger
   */
  registerTrigger(event: string, workflowId: string): void {
    if (!this.triggers.has(event)) {
      this.triggers.set(event, []);
    }
    const workflows = this.triggers.get(event)!;
    if (!workflows.includes(workflowId)) {
      workflows.push(workflowId);
      logger.debug('Trigger registered', { event, workflowId });
    }
  }

  /**
   * Fire event and execute linked workflows
   */
  async fire(event: string, payload: Record<string, any>): Promise<void> {
    const workflowIds = this.triggers.get(event) || [];

    for (const workflowId of workflowIds) {
      const workflow = this.workflowEngine.getWorkflow(workflowId);
      if (workflow && workflow.active) {
        const context: WorkflowContext = {
          payload,
          variables: new Map()
        };

        // Fire without await (background execution)
        this.workflowEngine.executeWorkflow(workflowId, context).catch(err => {
          logger.error('Background workflow failed', err instanceof Error ? err : new Error(String(err)), { workflowId, event });
        });
      }
    }
  }

  /**
   * Get triggers for event
   */
  getTriggersForEvent(event: string): string[] {
    return this.triggers.get(event) || [];
  }

  /**
   * List all event triggers
   */
  listEvents(): string[] {
    return Array.from(this.triggers.keys());
  }
}

// ==================== WORKFLOW MONITOR ====================

export class WorkflowMonitor {
  private executions: WorkflowExecution[] = [];
  private readonly maxHistory = 1000;

  /**
   * Record execution
   */
  recordExecution(execution: WorkflowExecution): void {
    this.executions.push(execution);

    // Keep only recent executions
    if (this.executions.length > this.maxHistory) {
      this.executions.shift();
    }
  }

  /**
   * Get executions for workflow
   */
  getExecutions(workflowId: string, limit: number = 50): WorkflowExecution[] {
    return this.executions
      .filter(e => e.workflowId === workflowId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Get failed executions
   */
  getFailedExecutions(): WorkflowExecution[] {
    return this.executions.filter(e => !e.success).slice(-100);
  }

  /**
   * Get statistics
   */
  getStats(): { total: number; succeeded: number; failed: number; successRate: number } {
    const total = this.executions.length;
    const succeeded = this.executions.filter(e => e.success).length;
    const failed = total - succeeded;
    const successRate = total > 0 ? (succeeded / total) * 100 : 0;

    return { total, succeeded, failed, successRate };
  }

  /**
   * Get execution by ID
   */
  getExecution(id: string): WorkflowExecution | null {
    return this.executions.find(e => e.id === id) || null;
  }
}

// ==================== EXPORTS ====================

export const workflowEngine = new WorkflowEngine();
export const triggerManager = new TriggerManager(workflowEngine);
export const workflowMonitor = new WorkflowMonitor();
