/**
 * Phase 162: Access Governance & Entitlement Management
 * Entitlements, access reviews, privilege escalation monitoring, role hierarchy
 */

import { logger } from './logger';

interface Entitlement {
  entitlementId: string;
  userId: string;
  resourceId: string;
  permission: string;
  grantedAt: number;
  expiresAt?: number;
  grantedBy: string;
  reason: string;
}

interface AccessReview {
  reviewId: string;
  resourceId: string;
  startDate: number;
  endDate: number;
  status: 'pending' | 'in_progress' | 'completed';
  findings: Array<{ userId: string; entitlementId: string; action: 'keep' | 'revoke' }>;
  completedAt?: number;
}

interface RoleHierarchy {
  roleId: string;
  name: string;
  parentRoles: string[];
  permissions: string[];
  separationOfDuties: string[];
}

class EntitlementManager {
  private entitlements: Map<string, Entitlement> = new Map();
  private counter = 0;

  grantEntitlement(userId: string, resourceId: string, permission: string, grantedBy: string, reason: string, expiresAt?: number): Entitlement {
    const entitlementId = `entitlement-${Date.now()}-${++this.counter}`;
    const entitlement: Entitlement = {
      entitlementId,
      userId,
      resourceId,
      permission,
      grantedAt: Date.now(),
      expiresAt,
      grantedBy,
      reason
    };

    this.entitlements.set(entitlementId, entitlement);

    logger.debug('Entitlement granted', {
      entitlementId,
      userId,
      permission,
      expiresAt
    });

    return entitlement;
  }

  revokeEntitlement(entitlementId: string): boolean {
    const removed = this.entitlements.delete(entitlementId);
    if (removed) {
      logger.debug('Entitlement revoked', { entitlementId });
    }
    return removed;
  }

  getUserEntitlements(userId: string): Entitlement[] {
    return Array.from(this.entitlements.values()).filter(e => e.userId === userId && (!e.expiresAt || e.expiresAt > Date.now()));
  }

  getExpiredEntitlements(): Entitlement[] {
    return Array.from(this.entitlements.values()).filter(e => e.expiresAt && e.expiresAt <= Date.now());
  }

  hasPermission(userId: string, resourceId: string, permission: string): boolean {
    return this.getUserEntitlements(userId).some(e => e.resourceId === resourceId && e.permission === permission);
  }
}

class AccessReviewOrchestrator {
  private reviews: Map<string, AccessReview> = new Map();
  private counter = 0;

  initiateReview(resourceId: string, duration: number): AccessReview {
    const reviewId = `review-${Date.now()}-${++this.counter}`;
    const review: AccessReview = {
      reviewId,
      resourceId,
      startDate: Date.now(),
      endDate: Date.now() + duration,
      status: 'pending',
      findings: []
    };

    this.reviews.set(reviewId, review);

    logger.debug('Access review initiated', { reviewId, resourceId, durationMs: duration });

    return review;
  }

  startReview(reviewId: string): AccessReview | undefined {
    const review = this.reviews.get(reviewId);
    if (review) {
      review.status = 'in_progress';
      return review;
    }
    return undefined;
  }

  recordFinding(reviewId: string, userId: string, entitlementId: string, action: 'keep' | 'revoke'): AccessReview | undefined {
    const review = this.reviews.get(reviewId);
    if (review) {
      review.findings.push({ userId, entitlementId, action });
      return review;
    }
    return undefined;
  }

  completeReview(reviewId: string): AccessReview | undefined {
    const review = this.reviews.get(reviewId);
    if (review) {
      review.status = 'completed';
      review.completedAt = Date.now();
      logger.debug('Access review completed', { reviewId, findings: review.findings.length });
      return review;
    }
    return undefined;
  }

  getReview(reviewId: string): AccessReview | undefined {
    return this.reviews.get(reviewId);
  }
}

class PrivilegeEscalationMonitor {
  private escalations: Map<string, { userId: string; from: string; to: string; timestamp: number; severity: string }> = new Map();
  private counter = 0;

  detectEscalation(userId: string, fromRole: string, toRole: string): { detected: boolean; severity: string; escalationId?: string } {
    const severity = this.calculateSeverity(fromRole, toRole);

    if (severity === 'high' || severity === 'critical') {
      const escalationId = `escalation-${Date.now()}-${++this.counter}`;
      this.escalations.set(escalationId, {
        userId,
        from: fromRole,
        to: toRole,
        timestamp: Date.now(),
        severity
      });

      logger.debug('Privilege escalation detected', {
        escalationId,
        userId,
        fromRole,
        toRole,
        severity
      });

      return { detected: true, severity, escalationId };
    }

    return { detected: false, severity };
  }

  private calculateSeverity(fromRole: string, toRole: string): string {
    if (toRole === 'admin' || toRole === 'root') return 'critical';
    if (toRole === 'moderator' || toRole === 'operator') return 'high';
    return 'medium';
  }

  getEscalationHistory(userId: string): Array<{ userId: string; from: string; to: string; timestamp: number; severity: string }> {
    return Array.from(this.escalations.values()).filter(e => e.userId === userId);
  }

  generateEscalationReport(): { totalEscalations: number; bySeverity: Record<string, number> } {
    const escalations = Array.from(this.escalations.values());
    const bySeverity: Record<string, number> = {};

    for (const escalation of escalations) {
      bySeverity[escalation.severity] = (bySeverity[escalation.severity] || 0) + 1;
    }

    return { totalEscalations: escalations.length, bySeverity };
  }
}

class RoleHierarchyManager {
  private roles: Map<string, RoleHierarchy> = new Map();
  private counter = 0;

  defineRole(name: string, parentRoles: string[], permissions: string[], separationOfDuties: string[]): RoleHierarchy {
    const roleId = `role-${Date.now()}-${++this.counter}`;
    const role: RoleHierarchy = {
      roleId,
      name,
      parentRoles,
      permissions,
      separationOfDuties
    };

    this.roles.set(roleId, role);

    logger.debug('Role defined', { roleId, name, permissions: permissions.length });

    return role;
  }

  getInheritedPermissions(roleId: string): string[] {
    const role = this.roles.get(roleId);
    if (!role) return [];

    let allPermissions = [...role.permissions];
    for (const parentRoleId of role.parentRoles) {
      allPermissions = [...new Set([...allPermissions, ...this.getInheritedPermissions(parentRoleId)])];
    }

    return allPermissions;
  }

  checkSeparationOfDuties(userId: string, newRoleId: string, userRoles: string[]): { allowed: boolean; conflictingRoles: string[] } {
    const newRole = this.roles.get(newRoleId);
    if (!newRole) return { allowed: true, conflictingRoles: [] };

    const conflicts: string[] = [];
    for (const userRoleId of userRoles) {
      if (newRole.separationOfDuties.includes(userRoleId)) {
        conflicts.push(userRoleId);
      }
    }

    return { allowed: conflicts.length === 0, conflictingRoles: conflicts };
  }

  getRole(roleId: string): RoleHierarchy | undefined {
    return this.roles.get(roleId);
  }
}

export const entitlementManager = new EntitlementManager();
export const accessReviewOrchestrator = new AccessReviewOrchestrator();
export const privilegeEscalationMonitor = new PrivilegeEscalationMonitor();
export const roleHierarchyManager = new RoleHierarchyManager();

export { Entitlement, AccessReview, RoleHierarchy };
