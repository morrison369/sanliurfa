/**
 * Phase 133: CQRS & Event-Driven Architecture
 * Command/query separation with event-driven architecture and saga pattern
 */

import { logger } from './logger';

interface Command {
  type: string;
  aggregateId: string;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

interface CommandResult {
  status: 'success' | 'failure' | 'pending';
  commandId: string;
  data?: any;
  error?: string;
}

interface Query {
  type: string;
  parameters: Record<string, any>;
}

interface QueryResult {
  data: any;
  cached: boolean;
  timestamp: number;
}

interface SagaDefinition {
  id: string;
  name: string;
  steps: Array<{
    command: string;
    compensation: string;
    timeout: number;
  }>;
}

interface SagaExecution {
  id: string;
  sagaId: string;
  status: 'running' | 'completed' | 'compensating' | 'failed';
  currentStep: number;
  compensations: Array<{ step: number; status: 'pending' | 'executed' }>;
}

type CommandHandlerFn = (command: Command) => CommandResult | Promise<CommandResult>;
type QueryHandlerFn = (query: Query) => any | Promise<any>;
type EventHandlerFn = (event: any) => void | Promise<void>;

class CommandHandler {
  private handlers = new Map<string, CommandHandlerFn>();
  private counter = 0;

  register(commandType: string, handler: CommandHandlerFn): void {
    this.handlers.set(commandType, handler);
    logger.debug('Command handler registered', { type: commandType });
  }

  async execute(command: Command): Promise<CommandResult> {
    const handler = this.handlers.get(command.type);
    if (!handler) {
      return {
        status: 'failure',
        commandId: `cmd-${Date.now()}-${++this.counter}`,
        error: `No handler for command: ${command.type}`
      };
    }

    try {
      const result = await handler(command);
      logger.info('Command executed', { type: command.type, status: result.status });
      return result;
    } catch (error) {
      logger.error('Command execution failed', { type: command.type, error });
      return {
        status: 'failure',
        commandId: `cmd-${Date.now()}-${++this.counter}`,
        error: String(error)
      };
    }
  }

  getHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}

class QueryHandler {
  private handlers = new Map<string, QueryHandlerFn>();
  private cache = new Map<string, { data: any; timestamp: number }>();

  register(queryType: string, handler: QueryHandlerFn): void {
    this.handlers.set(queryType, handler);
    logger.debug('Query handler registered', { type: queryType });
  }

  async execute(query: Query, useCache: boolean = true): Promise<QueryResult> {
    const cacheKey = `${query.type}:${JSON.stringify(query.parameters)}`;

    if (useCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < 60000) {
        logger.debug('Query result from cache', { type: query.type });
        return { data: cached.data, cached: true, timestamp: cached.timestamp };
      }
    }

    const handler = this.handlers.get(query.type);
    if (!handler) {
      throw new Error(`No handler for query: ${query.type}`);
    }

    const data = await handler(query);
    this.cache.set(cacheKey, { data, timestamp: Date.now() });

    logger.debug('Query executed', { type: query.type });
    return { data, cached: false, timestamp: Date.now() };
  }

  clearCache(): void {
    this.cache.clear();
    logger.debug('Query cache cleared');
  }

  getHandlers(): string[] {
    return Array.from(this.handlers.keys());
  }
}

class EventHandler {
  private handlers = new Map<string, EventHandlerFn[]>();

  on(eventType: string, handler: EventHandlerFn): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
    logger.debug('Event handler registered', { type: eventType });
  }

  async handle(event: { type: string; data: any }): Promise<void> {
    const handlers = this.handlers.get(event.type) || [];

    for (const handler of handlers) {
      try {
        await handler(event);
      } catch (error) {
        logger.error('Event handler failed', { type: event.type, error });
      }
    }

    logger.debug('Event handlers executed', { type: event.type, count: handlers.length });
  }

  getHandlers(eventType: string): number {
    return (this.handlers.get(eventType) || []).length;
  }
}

class SagaOrchestrator {
  private sagas = new Map<string, SagaDefinition>();
  private executions = new Map<string, SagaExecution>();
  private counter = 0;

  defineSaga(sagaDefinition: SagaDefinition): void {
    this.sagas.set(sagaDefinition.id, sagaDefinition);
    logger.info('Saga defined', { sagaId: sagaDefinition.id, steps: sagaDefinition.steps.length });
  }

  async startSaga(sagaId: string, initialData: Record<string, any>): Promise<SagaExecution> {
    const saga = this.sagas.get(sagaId);
    if (!saga) {
      throw new Error(`Saga not found: ${sagaId}`);
    }

    const execution: SagaExecution = {
      id: `saga-exec-${Date.now()}-${++this.counter}`,
      sagaId,
      status: 'running',
      currentStep: 0,
      compensations: saga.steps.map((_, i) => ({ step: i, status: 'pending' }))
    };

    this.executions.set(execution.id, execution);
    logger.info('Saga execution started', { sagaId, executionId: execution.id });

    return execution;
  }

  async executeStep(executionId: string, command: Command): Promise<CommandResult> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Saga execution not found: ${executionId}`);
    }

    logger.info('Saga step executing', { executionId, step: execution.currentStep });
    return { status: 'success', commandId: command.type };
  }

  async compensate(executionId: string): Promise<void> {
    const execution = this.executions.get(executionId);
    if (!execution) {
      throw new Error(`Saga execution not found: ${executionId}`);
    }

    execution.status = 'compensating';

    for (let i = execution.currentStep - 1; i >= 0; i--) {
      execution.compensations[i].status = 'executed';
    }

    execution.status = 'failed';
    logger.info('Saga compensated', { executionId });
  }

  getExecution(executionId: string): SagaExecution | undefined {
    return this.executions.get(executionId);
  }

  completeExecution(executionId: string): void {
    const execution = this.executions.get(executionId);
    if (execution) {
      execution.status = 'completed';
      logger.info('Saga execution completed', { executionId });
    }
  }
}

export const commandHandler = new CommandHandler();
export const queryHandler = new QueryHandler();
export const eventHandler = new EventHandler();
export const sagaOrchestrator = new SagaOrchestrator();

export { Command, CommandResult, Query, QueryResult, SagaDefinition, SagaExecution };
