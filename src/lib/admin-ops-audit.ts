import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface AdminOpsAuditEntry {
  timestamp: string;
  endpoint: string;
  method: string;
  mode: 'read' | 'write';
  requestId?: string | null;
  actorKey: string;
  userId: string | null;
  ipAddress: string;
  statusCode: number;
  duration: number;
  outcome: 'allowed' | 'denied' | 'error';
  details?: Record<string, unknown>;
}

export interface AdminOpsAuditSummary {
  generatedAt: string;
  windowHours: number;
  total: number;
  deniedCount: number;
  rateLimitedCount: number;
  writeCount: number;
  readCount: number;
  lastDeniedAt: string | null;
}

const ADMIN_OPS_AUDIT_DIR = resolve(process.cwd(), 'logs');
const ADMIN_OPS_AUDIT_PATH = resolve(ADMIN_OPS_AUDIT_DIR, 'admin-ops-audit.jsonl');

export function getAdminOpsAuditPath(): string {
  return ADMIN_OPS_AUDIT_PATH;
}

export function appendAdminOpsAuditEntry(entry: AdminOpsAuditEntry): void {
  mkdirSync(ADMIN_OPS_AUDIT_DIR, { recursive: true });
  appendFileSync(ADMIN_OPS_AUDIT_PATH, `${JSON.stringify(entry)}\n`, 'utf8');
}

export function readAdminOpsAuditEntries(): AdminOpsAuditEntry[] {
  if (!existsSync(ADMIN_OPS_AUDIT_PATH)) {
    return [];
  }

  return readFileSync(ADMIN_OPS_AUDIT_PATH, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as AdminOpsAuditEntry);
}

export function cleanupAdminOpsAuditEntries(daysToKeep: number): number {
  const cutoff = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
  const retained = readAdminOpsAuditEntries().filter((entry) => {
    const timestamp = new Date(entry.timestamp).getTime();
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });

  mkdirSync(ADMIN_OPS_AUDIT_DIR, { recursive: true });
  writeFileSync(
    ADMIN_OPS_AUDIT_PATH,
    retained.map((entry) => JSON.stringify(entry)).join('\n') + (retained.length > 0 ? '\n' : ''),
    'utf8'
  );
  return retained.length;
}

export function summarizeAdminOpsAudit(windowHours: number = 24): AdminOpsAuditSummary {
  const cutoff = Date.now() - windowHours * 60 * 60 * 1000;
  const entries = readAdminOpsAuditEntries().filter((entry) => {
    const timestamp = new Date(entry.timestamp).getTime();
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });
  const deniedEntries = entries.filter((entry) => entry.outcome === 'denied');
  const rateLimitedCount = entries.filter((entry) => entry.statusCode === 429).length;

  return {
    generatedAt: new Date().toISOString(),
    windowHours,
    total: entries.length,
    deniedCount: deniedEntries.length,
    rateLimitedCount,
    writeCount: entries.filter((entry) => entry.mode === 'write').length,
    readCount: entries.filter((entry) => entry.mode === 'read').length,
    lastDeniedAt: deniedEntries.sort((left, right) => right.timestamp.localeCompare(left.timestamp))[0]?.timestamp ?? null,
  };
}
