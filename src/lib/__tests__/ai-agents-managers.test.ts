/**
 * Unit Tests — ai/ai-agents.ts singleton class managers (Phase 101)
 *
 * - AgentManager (createAgent + listAgents role filter + updateAgent + deleteAgent + getAgentMemory)
 * - ConversationManager (startConversation + addMessage + getConversationHistory + continueConversation + end)
 * - TaskAutomation (defineTask + executeTask + automateWorkflow + suggestAutomations keyword match)
 * - AgentOrchestrator (assignTask + coordinateAgents + monitorExecution + aggregateResults)
 *
 * Singleton state shared — testler unique name kullanır.
 */

import { describe, it, expect } from 'vitest';
import {
  agentManager,
  conversationManager,
  taskAutomation,
  agentOrchestrator,
} from '../ai/ai-agents';

describe('AgentManager', () => {
  it('createAgent — agent döner, id `agent-` prefix', () => {
    const a = agentManager.createAgent({
      name: 'Test Agent 1',
      role: 'executor',
      capabilities: ['search', 'write'],
      status: 'idle',
      memory: {},
    });
    expect(a.id).toMatch(/^agent-\d+-\d+$/);
    expect(a.name).toBe('Test Agent 1');
    expect(a.createdAt).toBeGreaterThan(0);
  });

  it('getAgent — mevcut id', () => {
    const a = agentManager.createAgent({
      name: 'Get Test', role: 'planner', capabilities: [], status: 'idle', memory: {},
    });
    expect(agentManager.getAgent(a.id)?.name).toBe('Get Test');
  });

  it('getAgent — bilinmeyen → null', () => {
    expect(agentManager.getAgent('non-existent')).toBeNull();
  });

  it('listAgents — boş role → tümü', () => {
    agentManager.createAgent({
      name: 'List Test', role: 'executor', capabilities: [], status: 'idle', memory: {},
    });
    const all = agentManager.listAgents();
    expect(Array.isArray(all)).toBe(true);
    expect(all.length).toBeGreaterThan(0);
  });

  it('listAgents — role filter', () => {
    agentManager.createAgent({
      name: 'Coord-Filter', role: 'coordinator', capabilities: [], status: 'idle', memory: {},
    });
    const coords = agentManager.listAgents('coordinator');
    expect(coords.every((a) => a.role === 'coordinator')).toBe(true);
  });

  it('updateAgent — Object.assign ile field güncelleme', () => {
    const a = agentManager.createAgent({
      name: 'Update Test', role: 'analyzer', capabilities: ['x'], status: 'idle', memory: {},
    });
    agentManager.updateAgent(a.id, { status: 'thinking', capabilities: ['x', 'y'] });
    const updated = agentManager.getAgent(a.id);
    expect(updated?.status).toBe('thinking');
    expect(updated?.capabilities).toEqual(['x', 'y']);
  });

  it('updateAgent — bilinmeyen → no-op (silent)', () => {
    expect(() => agentManager.updateAgent('non-existent', { status: 'error' })).not.toThrow();
  });

  it('deleteAgent — siler', () => {
    const a = agentManager.createAgent({
      name: 'Delete Test', role: 'executor', capabilities: [], status: 'idle', memory: {},
    });
    agentManager.deleteAgent(a.id);
    expect(agentManager.getAgent(a.id)).toBeNull();
  });

  it('getAgentMemory — agent memory döner', () => {
    const a = agentManager.createAgent({
      name: 'Memory Test',
      role: 'executor',
      capabilities: [],
      status: 'idle',
      memory: { lastTask: 'analyze', score: 0.9 },
    });
    const mem = agentManager.getAgentMemory(a.id);
    expect(mem.lastTask).toBe('analyze');
    expect(mem.score).toBe(0.9);
  });

  it('getAgentMemory — bilinmeyen → boş object', () => {
    expect(agentManager.getAgentMemory('non-existent')).toEqual({});
  });
});

describe('ConversationManager', () => {
  it('startConversation — id `conv-` prefix', () => {
    const id = conversationManager.startConversation('agent-1');
    expect(id).toMatch(/^conv-\d+-\d+$/);
  });

  it('addMessage — msg id `msg-` prefix', () => {
    const conv = conversationManager.startConversation('agent-add');
    const msgId = conversationManager.addMessage(conv, 'Hello', 'user');
    expect(msgId).toMatch(/^msg-\d+$/);
  });

  it('addMessage — sender default "user"', () => {
    const conv = conversationManager.startConversation('agent-default');
    conversationManager.addMessage(conv, 'Hi');
    const history = conversationManager.getConversationHistory(conv);
    expect(history[0].sender).toBe('user');
  });

  it('addMessage — bilinmeyen conversation → boş messages array (lazy init)', () => {
    // Implementation: `this.conversations.get(conversationId) || []` — yoksa boş array
    const msgId = conversationManager.addMessage('non-existent-conv', 'X');
    expect(msgId).toMatch(/^msg-\d+$/);
  });

  it('getConversationHistory — message array', () => {
    const conv = conversationManager.startConversation('agent-history');
    conversationManager.addMessage(conv, 'M1', 'user');
    conversationManager.addMessage(conv, 'M2', 'agent');
    const history = conversationManager.getConversationHistory(conv);
    expect(history).toHaveLength(2);
    expect(history[0].content).toBe('M1');
    expect(history[1].sender).toBe('agent');
  });

  it('getConversationHistory — bilinmeyen → boş array', () => {
    expect(conversationManager.getConversationHistory('non-existent')).toEqual([]);
  });

  it('continueConversation — user input + agent response 2 message ekler', () => {
    const conv = conversationManager.startConversation('agent-continue');
    const response = conversationManager.continueConversation(conv, 'How are you?');
    expect(response).toContain('How are you?');
    const history = conversationManager.getConversationHistory(conv);
    expect(history).toHaveLength(2);
    expect(history[0].sender).toBe('user');
    expect(history[1].sender).toBe('agent');
  });

  it('endConversation — conversation silinir', () => {
    const conv = conversationManager.startConversation('agent-end');
    conversationManager.addMessage(conv, 'X');
    conversationManager.endConversation(conv);
    expect(conversationManager.getConversationHistory(conv)).toEqual([]);
  });
});

describe('TaskAutomation', () => {
  it('defineTask — task id `task-` prefix', () => {
    const id = taskAutomation.defineTask({ name: 'Send Email', triggers: ['cron'] });
    expect(id).toMatch(/^task-\d+-\d+$/);
  });

  it('executeTask — execution `exec-` prefix + status="executing"', () => {
    const taskId = taskAutomation.defineTask({ name: 'X' });
    const exec = taskAutomation.executeTask(taskId, { agentId: 'a1' });
    expect(exec.id).toMatch(/^exec-\d+-\d+$/);
    expect(exec.status).toBe('executing');
    expect(exec.agentId).toBe('a1');
  });

  it('executeTask — context yoksa agentId="unknown"', () => {
    const taskId = taskAutomation.defineTask({ name: 'No Ctx' });
    const exec = taskAutomation.executeTask(taskId, {});
    expect(exec.agentId).toBe('unknown');
  });

  it('automateWorkflow — workflowId `workflow-` prefix', () => {
    const id = taskAutomation.automateWorkflow(['step1', 'step2'], ['cron']);
    expect(id).toMatch(/^workflow-\d+$/);
  });

  it('getExecutionHistory — taskId filter', () => {
    const taskId = taskAutomation.defineTask({ name: 'Hist' });
    taskAutomation.executeTask(taskId, {});
    taskAutomation.executeTask(taskId, {});
    const history = taskAutomation.getExecutionHistory(taskId);
    expect(history.length).toBeGreaterThanOrEqual(2);
    expect(history.every((e) => e.task === taskId)).toBe(true);
  });

  it('getExecutionHistory — bilinmeyen taskId → boş', () => {
    expect(taskAutomation.getExecutionHistory('non-existent-task')).toEqual([]);
  });

  it('suggestAutomations — "email" keyword → email-automation', () => {
    expect(taskAutomation.suggestAutomations(['send email daily'])).toContain('email-automation');
  });

  it('suggestAutomations — "report" → report-scheduling', () => {
    expect(taskAutomation.suggestAutomations(['generate report monthly'])).toContain('report-scheduling');
  });

  it('suggestAutomations — "sync" → data-sync', () => {
    expect(taskAutomation.suggestAutomations(['sync database'])).toContain('data-sync');
  });

  it('suggestAutomations — multiple keyword birden fazla suggestion', () => {
    const suggestions = taskAutomation.suggestAutomations(['send email and sync data']);
    expect(suggestions).toContain('email-automation');
    expect(suggestions).toContain('data-sync');
  });

  it('suggestAutomations — eşleşme yok → boş array', () => {
    expect(taskAutomation.suggestAutomations(['random unrelated text'])).toEqual([]);
  });
});

describe('AgentOrchestrator', () => {
  it('registerAgent — exception fırlatmaz', () => {
    const agent: any = { id: 'orch-1', name: 'X', role: 'executor', capabilities: [], status: 'idle', memory: {}, createdAt: Date.now() };
    expect(() => agentOrchestrator.registerAgent(agent)).not.toThrow();
  });

  it('assignTask — exception fırlatmaz', () => {
    expect(() => agentOrchestrator.assignTask('task-1', ['a1', 'a2'])).not.toThrow();
  });

  it('coordinateAgents — coordination object döner', () => {
    const result = agentOrchestrator.coordinateAgents('task-coord');
    expect(result.taskId).toBe('task-coord');
    expect(result.status).toBe('coordinating');
    expect(result.agentSynergy).toBe(0.85);
    expect(result.coordinatedAt).toBeGreaterThan(0);
    expect(result.expectedCompletion).toBeGreaterThan(result.coordinatedAt);
  });

  it('monitorExecution — progress + activeAgents object', () => {
    const result = agentOrchestrator.monitorExecution('task-monitor');
    expect(result.taskId).toBe('task-monitor');
    expect(result.status).toBe('in_progress');
    expect(result.progress).toBe(65);
    expect(result.activeAgents).toBe(3);
    expect(result.completedSteps + result.remainingSteps).toBe(3);
  });

  it('aggregateResults — totalExecutions = executionIds.length', () => {
    const ids = ['e1', 'e2', 'e3'];
    const result = agentOrchestrator.aggregateResults(ids);
    expect(result.executionIds).toEqual(ids);
    expect(result.totalExecutions).toBe(3);
    expect(result.successRate).toBe(0.95);
    expect(result.averageDuration).toBe(45000);
  });

  it('aggregateResults — boş executions → 0 total', () => {
    expect(agentOrchestrator.aggregateResults([]).totalExecutions).toBe(0);
  });
});
