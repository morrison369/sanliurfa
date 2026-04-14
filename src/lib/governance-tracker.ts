/**
 * Governance tracking and audit utilities
 * Tracks schema changes, data lineage, and compliance
 */

import { generateId } from './utils';

// Audit log entry
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  entity: string;
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'archive';
  actor: string;
  actorType: 'user' | 'system' | 'api' | 'batch';
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
  ip?: string;
  userAgent?: string;
}

// Data lineage node
export interface LineageNode {
  id: string;
  type: 'source' | 'transform' | 'destination' | 'api';
  name: string;
  description?: string;
  config?: Record<string, any>;
  dependencies: string[];
}

// Schema version
export interface SchemaVersion {
  version: string;
  timestamp: string;
  changes: Array<{
    table: string;
    type: 'add' | 'modify' | 'remove' | 'index';
    details: string;
  }>;
  migrationPath: string;
  rollbackPath?: string;
}

// Governance config
export interface GovernanceConfig {
  retentionDays: number;
  auditEnabled: boolean;
  lineageEnabled: boolean;
  piiFields: string[];
  sensitiveTables: string[];
}

// In-memory store (replace with DB in production)
const auditLog: AuditLogEntry[] = [];
const lineageGraph: Map<string, LineageNode> = new Map();
const schemaVersions: SchemaVersion[] = [];

// Default config
let config: GovernanceConfig = {
  retentionDays: 365,
  auditEnabled: true,
  lineageEnabled: true,
  piiFields: ['email', 'phone', 'tc_kimlik', 'password', 'credit_card'],
  sensitiveTables: ['users', 'payments', 'logs'],
};

/**
 * Initialize governance tracking
 */
export function initGovernance(userConfig?: Partial<GovernanceConfig>): void {
  config = { ...config, ...userConfig };
}

/**
 * Log an audit event
 */
export function logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): AuditLogEntry {
  if (!config.auditEnabled) return null as any;

  const fullEntry: AuditLogEntry = {
    ...entry,
    id: generateId(),
    timestamp: new Date().toISOString(),
  };

  auditLog.push(fullEntry);

  // Trim log if too large
  if (auditLog.length > 10000) {
    auditLog.splice(0, 1000);
  }

  // Async: Send to server
  sendAuditToServer(fullEntry).catch(() => {
    // Silently fail
  });

  return fullEntry;
}

/**
 * Create audit log for entity creation
 */
export function auditCreate(
  entity: string,
  entityId: string,
  data: Record<string, any>,
  actor: string,
  actorType: AuditLogEntry['actorType'] = 'user'
): AuditLogEntry {
  return logAudit({
    entity,
    entityId,
    action: 'create',
    actor,
    actorType,
    changes: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, { old: null, new: value }])
    ),
  });
}

/**
 * Create audit log for entity update
 */
export function auditUpdate(
  entity: string,
  entityId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  actor: string,
  actorType: AuditLogEntry['actorType'] = 'user'
): AuditLogEntry {
  const changes: Record<string, { old: any; new: any }> = {};

  for (const key of new Set([...Object.keys(oldData), ...Object.keys(newData)])) {
    if (oldData[key] !== newData[key]) {
      changes[key] = { old: oldData[key], new: newData[key] };
    }
  }

  return logAudit({
    entity,
    entityId,
    action: 'update',
    actor,
    actorType,
    changes,
  });
}

/**
 * Create audit log for entity deletion
 */
export function auditDelete(
  entity: string,
  entityId: string,
  data: Record<string, any>,
  actor: string,
  actorType: AuditLogEntry['actorType'] = 'user'
): AuditLogEntry {
  return logAudit({
    entity,
    entityId,
    action: 'delete',
    actor,
    actorType,
    changes: Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, { old: value, new: null }])
    ),
  });
}

/**
 * Create audit log for entity archival
 */
export function auditArchive(
  entity: string,
  entityId: string,
  actor: string,
  reason?: string
): AuditLogEntry {
  return logAudit({
    entity,
    entityId,
    action: 'archive',
    actor,
    actorType: 'user',
    metadata: { reason },
  });
}

/**
 * Get audit log with filters
 */
export function getAuditLog(filters?: {
  entity?: string;
  entityId?: string;
  action?: AuditLogEntry['action'];
  actor?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): AuditLogEntry[] {
  let results = [...auditLog];

  if (filters?.entity) {
    results = results.filter((e) => e.entity === filters.entity);
  }
  if (filters?.entityId) {
    results = results.filter((e) => e.entityId === filters.entityId);
  }
  if (filters?.action) {
    results = results.filter((e) => e.action === filters.action);
  }
  if (filters?.actor) {
    results = results.filter((e) => e.actor === filters.actor);
  }
  if (filters?.startDate) {
    results = results.filter((e) => e.timestamp >= filters.startDate!);
  }
  if (filters?.endDate) {
    results = results.filter((e) => e.timestamp <= filters.endDate!);
  }

  // Sort by timestamp desc
  results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filters?.limit) {
    results = results.slice(0, filters.limit);
  }

  return results;
}

/**
 * Register a lineage node
 */
export function registerLineageNode(node: Omit<LineageNode, 'id'>): LineageNode {
  if (!config.lineageEnabled) return null as any;

  const fullNode: LineageNode = {
    ...node,
    id: generateId(),
  };

  lineageGraph.set(fullNode.id, fullNode);
  return fullNode;
}

/**
 * Get lineage for a node
 */
export function getLineage(nodeId: string): {
  upstream: LineageNode[];
  downstream: LineageNode[];
} {
  const upstream: LineageNode[] = [];
  const downstream: LineageNode[] = [];

  const node = lineageGraph.get(nodeId);
  if (!node) return { upstream, downstream };

  // Find upstream (dependencies)
  for (const depId of node.dependencies) {
    const dep = lineageGraph.get(depId);
    if (dep) upstream.push(dep);
  }

  // Find downstream (dependents)
  for (const [id, n] of lineageGraph) {
    if (n.dependencies.includes(nodeId)) {
      downstream.push(n);
    }
  }

  return { upstream, downstream };
}

/**
 * Register schema version
 */
export function registerSchemaVersion(version: SchemaVersion): void {
  schemaVersions.push(version);
  schemaVersions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

/**
 * Get current schema version
 */
export function getCurrentSchemaVersion(): SchemaVersion | null {
  return schemaVersions[0] || null;
}

/**
 * Get schema version history
 */
export function getSchemaHistory(): SchemaVersion[] {
  return [...schemaVersions];
}

/**
 * Check if field contains PII
 */
export function isPIIField(fieldName: string): boolean {
  const normalized = fieldName.toLowerCase();
  return config.piiFields.some((pii) => normalized.includes(pii));
}

/**
 * Mask PII data
 */
export function maskPII(data: Record<string, any>): Record<string, any> {
  const masked: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (isPIIField(key)) {
      masked[key] = maskValue(value);
    } else {
      masked[key] = value;
    }
  }

  return masked;
}

/**
 * Mask a single value
 */
function maskValue(value: any): string {
  if (typeof value !== 'string') return '***';
  if (value.length <= 4) return '***';
  return value.slice(0, 2) + '***' + value.slice(-2);
}

/**
 * Sanitize audit data for storage
 */
export function sanitizeAuditData(data: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(data)) {
    if (isPIIField(key)) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeAuditData(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Check if table is sensitive
 */
export function isSensitiveTable(tableName: string): boolean {
  return config.sensitiveTables.includes(tableName.toLowerCase());
}

/**
 * Generate compliance report
 */
export function generateComplianceReport(): {
  summary: {
    totalAuditEntries: number;
    entriesLast30Days: number;
    sensitiveOperations: number;
    piiAccessEvents: number;
  };
  issues: string[];
  recommendations: string[];
} {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const entriesLast30Days = auditLog.filter((e) => e.timestamp >= thirtyDaysAgo);

  const sensitiveOperations = entriesLast30Days.filter(
    (e) => isSensitiveTable(e.entity) || e.action === 'delete'
  );

  const piiAccessEvents = entriesLast30Days.filter((e) => {
    if (!e.changes) return false;
    return Object.keys(e.changes).some((key) => isPIIField(key));
  });

  const issues: string[] = [];
  const recommendations: string[] = [];

  if (entriesLast30Days.length === 0) {
    issues.push('Son 30 günde hiç audit kaydı bulunmuyor');
  }

  if (sensitiveOperations.length > 100) {
    recommendations.push('Hassas operasyon sayısı yüksek, ek güvenlik kontrolleri önerilir');
  }

  return {
    summary: {
      totalAuditEntries: auditLog.length,
      entriesLast30Days: entriesLast30Days.length,
      sensitiveOperations: sensitiveOperations.length,
      piiAccessEvents: piiAccessEvents.length,
    },
    issues,
    recommendations,
  };
}

/**
 * Send audit log to server
 */
async function sendAuditToServer(entry: AuditLogEntry): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    await fetch('/api/audit/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      keepalive: true,
    });
  } catch {
    // Silently fail - audit log is preserved in memory
  }
}

/**
 * Export audit log for analysis
 */
export function exportAuditLog(format: 'json' | 'csv' = 'json'): string {
  if (format === 'csv') {
    const headers = ['id', 'timestamp', 'entity', 'entityId', 'action', 'actor', 'actorType'];
    const rows = auditLog.map((e) =>
      [e.id, e.timestamp, e.entity, e.entityId, e.action, e.actor, e.actorType].join(',')
    );
    return [headers.join(','), ...rows].join('\n');
  }

  return JSON.stringify(auditLog, null, 2);
}

/**
 * Clear audit log (use with caution)
 */
export function clearAuditLog(): void {
  auditLog.length = 0;
}
