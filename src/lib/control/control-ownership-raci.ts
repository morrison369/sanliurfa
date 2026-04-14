/**
 * Phase 168: Control Ownership & RACI Governance
 * Ownership, RACI matrices, escalation routing and workload insights.
 */

import { logger } from '../logger';

export type RaciRole = 'responsible' | 'accountable' | 'consulted' | 'informed';

export interface ControlOwnership {
  controlId: string;
  ownerId: string;
  backupOwnerId?: string;
  team: string;
  criticality: 'low' | 'medium' | 'high' | 'critical';
  assignedAt: number;
}

export interface RaciEntry {
  controlId: string;
  userId: string;
  role: RaciRole;
}

class ControlOwnershipManager {
  private ownership = new Map<string, ControlOwnership>();

  assignOwnership(record: Omit<ControlOwnership, 'assignedAt'>): ControlOwnership {
    const entry: ControlOwnership = {
      ...record,
      assignedAt: Date.now()
    };
    this.ownership.set(record.controlId, entry);
    logger.debug('Control ownership assigned', { controlId: record.controlId, ownerId: record.ownerId });
    return entry;
  }

  reassignOwner(controlId: string, newOwnerId: string): ControlOwnership | undefined {
    const current = this.ownership.get(controlId);
    if (!current) return undefined;
    const updated = { ...current, ownerId: newOwnerId, assignedAt: Date.now() };
    this.ownership.set(controlId, updated);
    return updated;
  }

  getOwnership(controlId: string): ControlOwnership | undefined {
    return this.ownership.get(controlId);
  }

  listByTeam(team: string): ControlOwnership[] {
    return Array.from(this.ownership.values()).filter(o => o.team === team);
  }
}

class RACIMatrixEngine {
  private entries: RaciEntry[] = [];

  setRoles(controlId: string, roles: Array<{ userId: string; role: RaciRole }>): RaciEntry[] {
    this.entries = this.entries.filter(e => e.controlId !== controlId);
    const newEntries = roles.map(r => ({ controlId, userId: r.userId, role: r.role }));
    this.entries.push(...newEntries);
    return newEntries;
  }

  getMatrix(controlId: string): RaciEntry[] {
    return this.entries.filter(e => e.controlId === controlId);
  }

  validate(controlId: string): { valid: boolean; issues: string[] } {
    const matrix = this.getMatrix(controlId);
    const issues: string[] = [];
    const accountableCount = matrix.filter(m => m.role === 'accountable').length;
    const responsibleCount = matrix.filter(m => m.role === 'responsible').length;

    if (accountableCount !== 1) issues.push('Exactly one accountable owner is required');
    if (responsibleCount < 1) issues.push('At least one responsible owner is required');
    return { valid: issues.length === 0, issues };
  }
}

class OwnershipEscalationEngine {
  routeEscalation(input: {
    controlId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    ownerId: string;
    backupOwnerId?: string;
  }): { routeTo: string; priority: number; reason: string } {
    if (input.severity === 'critical' && input.backupOwnerId) {
      return { routeTo: input.backupOwnerId, priority: 1, reason: 'critical backup escalation' };
    }
    const priority = input.severity === 'high' || input.severity === 'critical' ? 1 : 2;
    return { routeTo: input.ownerId, priority, reason: 'primary owner escalation' };
  }
}

class OwnershipWorkloadAnalyzer {
  computeLoad(records: ControlOwnership[]): Record<string, number> {
    return records.reduce<Record<string, number>>((acc, item) => {
      acc[item.ownerId] = (acc[item.ownerId] || 0) + 1;
      return acc;
    }, {});
  }

  overloadedOwners(records: ControlOwnership[], threshold = 10): string[] {
    const load = this.computeLoad(records);
    return Object.entries(load).filter(([, count]) => count > threshold).map(([owner]) => owner);
  }
}

export const controlOwnershipManager = new ControlOwnershipManager();
export const raciMatrixEngine = new RACIMatrixEngine();
export const ownershipEscalationEngine = new OwnershipEscalationEngine();
export const ownershipWorkloadAnalyzer = new OwnershipWorkloadAnalyzer();

export {
  ControlOwnershipManager,
  RACIMatrixEngine,
  OwnershipEscalationEngine,
  OwnershipWorkloadAnalyzer
};


