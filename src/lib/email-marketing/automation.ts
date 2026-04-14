/**
 * Email Marketing Automation Workflows
 * Task 121: Email Marketing Automation
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';
import { sendEmailMessage } from '../email/email-service';

export type AutomationTrigger = 
  | 'user_registered' | 'user_inactive' | 'birthday' | 'place_visited' 
  | 'review_posted' | 'subscription_expiring' | 'abandoned_cart' | 'custom_event';

export type AutomationStatus = 'active' | 'paused' | 'draft' | 'archived';

export interface AutomationWorkflow {
  id: string;
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  triggerConfig: TriggerConfig;
  steps: AutomationStep[];
  status: AutomationStatus;
  entryCount: number;
  completeCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TriggerConfig {
  delayMinutes?: number;
  filter?: Record<string, any>;
  repeat?: boolean;
  customEventName?: string;
}

export interface AutomationStep {
  id: string;
  type: 'email' | 'delay' | 'condition' | 'tag' | 'webhook';
  config: StepConfig;
  nextStepId?: string;
  position: number;
}

export type StepConfig = EmailStepConfig | DelayStepConfig | ConditionStepConfig | TagStepConfig | WebhookStepConfig;

export interface EmailStepConfig {
  subject: string;
  htmlContent: string;
  textContent?: string;
  fromName?: string;
  previewText?: string;
}

export interface DelayStepConfig {
  delayMinutes: number;
  delayType: 'fixed' | 'until_time' | 'until_day';
  untilTime?: string;
  untilDay?: number;
}

export interface ConditionStepConfig {
  condition: 'opened_email' | 'clicked_link' | 'visited_place' | 'custom_field';
  fieldName?: string;
  fieldValue?: any;
  trueStepId?: string;
  falseStepId?: string;
}

export interface TagStepConfig {
  action: 'add' | 'remove';
  tag: string;
}

export interface WebhookStepConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: Record<string, any>;
}

export interface CreateWorkflowData {
  name: string;
  description?: string;
  trigger: AutomationTrigger;
  triggerConfig: TriggerConfig;
  steps: Omit<AutomationStep, 'id'>[];
}

export async function createWorkflow(data: CreateWorkflowData): Promise<AutomationWorkflow> {
  const workflow: AutomationWorkflow = {
    id: generateId(),
    name: data.name,
    description: data.description,
    trigger: data.trigger,
    triggerConfig: data.triggerConfig,
    steps: data.steps.map((step, index) => ({
      ...step,
      id: generateId(),
      position: index,
    })),
    status: 'draft',
    entryCount: 0,
    completeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.execute(sql`
    INSERT INTO email_automation_workflows (id, name, description, trigger, trigger_config, steps, status, entry_count, complete_count, created_at, updated_at)
    VALUES (${workflow.id}, ${workflow.name}, ${workflow.description}, ${workflow.trigger}, ${JSON.stringify(workflow.triggerConfig)}, ${JSON.stringify(workflow.steps)}, ${workflow.status}, ${workflow.entryCount}, ${workflow.completeCount}, ${workflow.createdAt}, ${workflow.updatedAt})
  `);

  return workflow;
}

export async function getWorkflow(workflowId: string): Promise<AutomationWorkflow> {
  const result = await db.execute(sql`SELECT * FROM email_automation_workflows WHERE id = ${workflowId}`);
  if (!result.rows[0]) throw new Error('Workflow not found');
  return mapWorkflowFromRow(result.rows[0]);
}

export async function listWorkflows(options: { status?: AutomationStatus; limit?: number; offset?: number } = {}): Promise<{ workflows: AutomationWorkflow[]; total: number }> {
  let query = sql`SELECT * FROM email_automation_workflows WHERE 1=1`;
  if (options.status) query = sql`${query} AND status = ${options.status}`;
  query = sql`${query} ORDER BY created_at DESC`;
  if (options.limit) query = sql`${query} LIMIT ${options.limit} OFFSET ${options.offset || 0}`;
  const result = await db.execute(query);
  const count = await db.execute(sql`SELECT COUNT(*) as total FROM email_automation_workflows`);
  return { workflows: result.rows.map(mapWorkflowFromRow), total: parseInt(count.rows[0]?.total || '0') };
}

export async function activateWorkflow(workflowId: string): Promise<void> {
  await db.execute(sql`UPDATE email_automation_workflows SET status = 'active', updated_at = ${new Date()} WHERE id = ${workflowId}`);
}

export async function pauseWorkflow(workflowId: string): Promise<void> {
  await db.execute(sql`UPDATE email_automation_workflows SET status = 'paused', updated_at = ${new Date()} WHERE id = ${workflowId}`);
}

export async function deleteWorkflow(workflowId: string): Promise<void> {
  await db.execute(sql`DELETE FROM email_automation_workflows WHERE id = ${workflowId}`);
}

export async function triggerWorkflow(trigger: AutomationTrigger, userId: string, data?: Record<string, any>): Promise<void> {
  const workflows = await db.execute(sql`SELECT * FROM email_automation_workflows WHERE trigger = ${trigger} AND status = 'active'`);
  
  for (const row of workflows.rows) {
    const workflow = mapWorkflowFromRow(row);
    
    if (workflow.triggerConfig.filter && !matchesFilter(data, workflow.triggerConfig.filter)) {
      continue;
    }

    const entryId = generateId();
    await db.execute(sql`
      INSERT INTO email_automation_entries (id, workflow_id, user_id, current_step_id, status, started_at, metadata)
      VALUES (${entryId}, ${workflow.id}, ${userId}, ${workflow.steps[0]?.id || ''}, 'active', ${new Date()}, ${JSON.stringify(data || {})})
    `);

    await db.execute(sql`UPDATE email_automation_workflows SET entry_count = entry_count + 1 WHERE id = ${workflow.id}`);

    if (workflow.triggerConfig.delayMinutes) {
      const runAt = new Date(Date.now() + workflow.triggerConfig.delayMinutes * 60000);
      await db.execute(sql`INSERT INTO email_automation_queue (id, entry_id, workflow_id, user_id, step_id, run_at) VALUES (${generateId()}, ${entryId}, ${workflow.id}, ${userId}, ${workflow.steps[0]?.id}, ${runAt})`);
    } else {
      await processEntry(entryId, workflow);
    }
  }
}

async function processEntry(entryId: string, workflow: AutomationWorkflow): Promise<void> {
  const entryResult = await db.execute(sql`SELECT * FROM email_automation_entries WHERE id = ${entryId}`);
  if (!entryResult.rows[0]) return;
  const entry = entryResult.rows[0];

  const currentStep = workflow.steps.find(s => s.id === entry.current_step_id);
  if (!currentStep) {
    await completeEntry(entryId);
    return;
  }

  const userResult = await db.execute(sql`SELECT * FROM users WHERE id = ${entry.user_id}`);
  if (!userResult.rows[0]) return;
  const user = userResult.rows[0];

  switch (currentStep.type) {
    case 'email':
      await sendStepEmail(currentStep.config as EmailStepConfig, user);
      await advanceEntry(entryId, workflow, currentStep);
      break;
    case 'delay':
      await scheduleDelay(entryId, currentStep.config as DelayStepConfig, workflow, currentStep);
      break;
    case 'condition':
      await processCondition(entryId, currentStep.config as ConditionStepConfig, workflow, user);
      break;
    case 'tag':
      await processTag(entry.user_id, currentStep.config as TagStepConfig);
      await advanceEntry(entryId, workflow, currentStep);
      break;
    case 'webhook':
      await processWebhook(currentStep.config as WebhookStepConfig, user);
      await advanceEntry(entryId, workflow, currentStep);
      break;
  }
}

async function sendStepEmail(config: EmailStepConfig, user: any): Promise<void> {
  const html = personalizeContent(config.htmlContent, { name: user.full_name, email: user.email });
  const text = config.textContent ? personalizeContent(config.textContent, { name: user.full_name, email: user.email }) : undefined;
  await sendEmailMessage({ to: user.email, subject: config.subject, html, text });
}

async function scheduleDelay(entryId: string, config: DelayStepConfig, workflow: AutomationWorkflow, currentStep: AutomationStep): Promise<void> {
  let delayMs = config.delayMinutes * 60000;
  
  if (config.delayType === 'until_time' && config.untilTime) {
    const [hours, minutes] = config.untilTime.split(':').map(Number);
    const now = new Date();
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    delayMs = target.getTime() - now.getTime();
  }

  const runAt = new Date(Date.now() + delayMs);
  const entry = await db.execute(sql`SELECT * FROM email_automation_entries WHERE id = ${entryId}`);
  await db.execute(sql`INSERT INTO email_automation_queue (id, entry_id, workflow_id, user_id, step_id, run_at) VALUES (${generateId()}, ${entryId}, ${entry.rows[0]?.workflow_id}, ${entry.rows[0]?.user_id}, ${currentStep.nextStepId || workflow.steps[currentStep.position + 1]?.id}, ${runAt})`);
}

async function processCondition(entryId: string, config: ConditionStepConfig, workflow: AutomationWorkflow, user: any): Promise<void> {
  let result = false;
  
  switch (config.condition) {
    case 'custom_field':
      result = user[config.fieldName!] === config.fieldValue;
      break;
    default:
      result = true;
  }

  const nextStepId = result ? config.trueStepId : config.falseStepId;
  if (nextStepId) {
    await db.execute(sql`UPDATE email_automation_entries SET current_step_id = ${nextStepId} WHERE id = ${entryId}`);
    const updatedEntry = await db.execute(sql`SELECT * FROM email_automation_entries WHERE id = ${entryId}`);
    await processEntry(entryId, workflow);
  } else {
    await advanceEntry(entryId, workflow, workflow.steps.find(s => s.id === entryId)!);
  }
}

async function processTag(userId: string, config: TagStepConfig): Promise<void> {
  if (config.action === 'add') {
    await db.execute(sql`INSERT INTO user_tags (id, user_id, tag) VALUES (${generateId()}, ${userId}, ${config.tag}) ON CONFLICT DO NOTHING`);
  } else {
    await db.execute(sql`DELETE FROM user_tags WHERE user_id = ${userId} AND tag = ${config.tag}`);
  }
}

async function processWebhook(config: WebhookStepConfig, user: any): Promise<void> {
  try {
    await fetch(config.url, {
      method: config.method,
      headers: { 'Content-Type': 'application/json', ...config.headers },
      body: config.body ? JSON.stringify({ ...config.body, user }) : JSON.stringify({ user }),
    });
  } catch (e) {
    console.error('[Automation] Webhook failed:', e);
  }
}

async function advanceEntry(entryId: string, workflow: AutomationWorkflow, currentStep: AutomationStep): Promise<void> {
  const nextStep = workflow.steps.find(s => s.id === currentStep.nextStepId) || workflow.steps[currentStep.position + 1];
  if (!nextStep) {
    await completeEntry(entryId);
  } else {
    await db.execute(sql`UPDATE email_automation_entries SET current_step_id = ${nextStep.id} WHERE id = ${entryId}`);
    await processEntry(entryId, workflow);
  }
}

async function completeEntry(entryId: string): Promise<void> {
  const entry = await db.execute(sql`SELECT workflow_id FROM email_automation_entries WHERE id = ${entryId}`);
  await db.execute(sql`UPDATE email_automation_entries SET status = 'completed', completed_at = ${new Date()} WHERE id = ${entryId}`);
  if (entry.rows[0]) {
    await db.execute(sql`UPDATE email_automation_workflows SET complete_count = complete_count + 1 WHERE id = ${entry.rows[0].workflow_id}`);
  }
}

function matchesFilter(data: any, filter: Record<string, any>): boolean {
  if (!data) return false;
  for (const [key, value] of Object.entries(filter)) {
    if (data[key] !== value) return false;
  }
  return true;
}

function personalizeContent(template: string, data: { name?: string; email: string }): string {
  return template.replace(/\{\{name\}\}/g, data.name || 'Değerli Kullanıcı').replace(/\{\{email\}\}/g, data.email);
}

function mapWorkflowFromRow(row: any): AutomationWorkflow {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    trigger: row.trigger,
    triggerConfig: JSON.parse(row.trigger_config || '{}'),
    steps: JSON.parse(row.steps || '[]'),
    status: row.status,
    entryCount: parseInt(row.entry_count || '0'),
    completeCount: parseInt(row.complete_count || '0'),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function processAutomationQueue(): Promise<void> {
  const queue = await db.execute(sql`SELECT * FROM email_automation_queue WHERE run_at <= ${new Date()} ORDER BY run_at LIMIT 100`);
  
  for (const item of queue.rows) {
    const workflow = await getWorkflow(item.workflow_id as string);
    await db.execute(sql`DELETE FROM email_automation_queue WHERE id = ${item.id}`);
    await processEntry(item.entry_id as string, workflow);
  }
}

export async function getWorkflowStats(workflowId: string): Promise<{ entries: number; completed: number; conversionRate: number }> {
  const result = await db.execute(sql`
    SELECT 
      COUNT(*) as entries,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
    FROM email_automation_entries
    WHERE workflow_id = ${workflowId}
  `);
  const entries = parseInt(result.rows[0]?.entries || '0');
  const completed = parseInt(result.rows[0]?.completed || '0');
  return { entries, completed, conversionRate: entries > 0 ? (completed / entries) * 100 : 0 };
}

import { sendEmailMessage } from '../email/email-service';
