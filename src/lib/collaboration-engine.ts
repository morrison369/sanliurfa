/**
 * Phase 113: Enhanced Collaboration Engine
 * WebSocket-based real-time collaboration with operational transformation
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type OperationType = 'insert' | 'delete' | 'format' | 'block-insert' | 'block-delete';

export interface Operation {
  id: string;
  type: OperationType;
  position: number;
  content?: string;
  length?: number;
  clientId: string;
  timestamp: number;
  version: number;
}

export interface CollaborationSession {
  id: string;
  documentId: string;
  participants: string[];
  version: number;
  content: string;
  createdAt: number;
}

export interface TransformResult {
  operation: Operation;
  conflict: boolean;
  resolvedAt: number;
}

export interface SyncUpdate {
  sessionId: string;
  operations: Operation[];
  version: number;
  timestamp: number;
}

// ==================== COLLABORATION SERVER ====================

export class CollaborationServer {
  private sessions = new Map<string, CollaborationSession>();
  private sessionCount = 0;
  private clientConnections = new Map<string, Set<string>>();

  /**
   * Create collaboration session
   */
  createSession(documentId: string, config: {
    content: string;
    participants: string[];
  }): CollaborationSession {
    const id = 'session-' + Date.now() + '-' + this.sessionCount++;

    const session: CollaborationSession = {
      id,
      documentId,
      participants: config.participants,
      version: 1,
      content: config.content,
      createdAt: Date.now()
    };

    this.sessions.set(id, session);
    logger.info('Collaboration session created', {
      sessionId: id,
      documentId,
      participantCount: config.participants.length
    });

    return session;
  }

  /**
   * Get session
   */
  getSession(sessionId: string): CollaborationSession | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Join session
   */
  joinSession(sessionId: string, clientId: string): void {
    const session = this.sessions.get(sessionId);
    if (session && !session.participants.includes(clientId)) {
      session.participants.push(clientId);

      const connections = this.clientConnections.get(sessionId) || new Set();
      connections.add(clientId);
      this.clientConnections.set(sessionId, connections);

      logger.debug('Client joined session', { sessionId, clientId, participantCount: session.participants.length });
    }
  }

  /**
   * Leave session
   */
  leaveSession(sessionId: string, clientId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.participants = session.participants.filter(p => p !== clientId);

      const connections = this.clientConnections.get(sessionId);
      if (connections) {
        connections.delete(clientId);
      }

      logger.debug('Client left session', { sessionId, clientId });
    }
  }

  /**
   * Get session participants
   */
  getSessionParticipants(sessionId: string): string[] {
    const session = this.sessions.get(sessionId);
    return session?.participants || [];
  }

  /**
   * Update session content
   */
  updateSessionContent(sessionId: string, content: string, version: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.content = content;
      session.version = version;
      logger.debug('Session content updated', { sessionId, version, contentLength: content.length });
    }
  }
}

// ==================== OPERATIONAL TRANSFORM ====================

export class OperationalTransform {
  private operations = new Map<string, Operation[]>();
  private opCount = 0;

  /**
   * Transform operation
   */
  transform(operation: Omit<Operation, 'id' | 'timestamp'>): Operation {
    const id = 'op-' + Date.now() + '-' + this.opCount++;

    const op: Operation = {
      ...operation,
      id,
      timestamp: Date.now()
    };

    const ops = this.operations.get(operation.clientId) || [];
    ops.push(op);
    this.operations.set(operation.clientId, ops);

    logger.debug('Operation transformed', {
      operationId: id,
      type: operation.type,
      clientId: operation.clientId,
      position: operation.position
    });

    return op;
  }

  /**
   * Compose operations
   */
  compose(op1: Operation, op2: Operation): Operation {
    const composed: Operation = {
      ...op1,
      id: 'composed-' + Date.now(),
      position: op1.position + (op2.type === 'insert' ? op2.content?.length || 0 : 0),
      timestamp: Date.now()
    };

    return composed;
  }

  /**
   * Adjust position for operation
   */
  adjustPosition(position: number, operation: Operation): number {
    if (operation.type === 'insert') {
      const insertLength = operation.content?.length || 0;
      return position + insertLength;
    } else if (operation.type === 'delete') {
      const deleteLength = operation.length || 0;
      return position - deleteLength;
    }

    return position;
  }

  /**
   * Get operation history
   */
  getOperationHistory(clientId: string): Operation[] {
    return this.operations.get(clientId) || [];
  }

  /**
   * Apply operation to content
   */
  applyOperation(content: string, operation: Operation): string {
    if (operation.type === 'insert') {
      return content.slice(0, operation.position) +
             operation.content +
             content.slice(operation.position);
    } else if (operation.type === 'delete') {
      return content.slice(0, operation.position) +
             content.slice(operation.position + (operation.length || 0));
    }

    return content;
  }
}

// ==================== CONFLICT RESOLVER ====================

export class ConflictResolver {
  /**
   * Resolve conflict
   */
  resolve(op1: Operation, op2: Operation, precedence: 'op1' | 'op2'): TransformResult {
    const conflict = this.detectConflict(op1, op2);

    if (!conflict) {
      return {
        operation: op1,
        conflict: false,
        resolvedAt: Date.now()
      };
    }

    const resolved = this.resolveTransform(op1, op2, precedence);

    logger.debug('Conflict resolved', {
      op1Id: op1.id,
      op2Id: op2.id,
      precedence,
      conflict: true
    });

    return {
      operation: resolved,
      conflict: true,
      resolvedAt: Date.now()
    };
  }

  /**
   * Detect conflict
   */
  private detectConflict(op1: Operation, op2: Operation): boolean {
    // Conflicts when operations affect overlapping ranges
    const op1End = op1.position + (op1.type === 'insert' ? op1.content?.length || 0 : op1.length || 0);
    const op2End = op2.position + (op2.type === 'insert' ? op2.content?.length || 0 : op2.length || 0);

    return !(op1End <= op2.position || op2End <= op1.position);
  }

  /**
   * Resolve transform
   */
  private resolveTransform(op1: Operation, op2: Operation, precedence: 'op1' | 'op2'): Operation {
    if (precedence === 'op1') {
      return op1;
    } else {
      return op2;
    }
  }

  /**
   * Get conflict metadata
   */
  getConflictMetadata(op1: Operation, op2: Operation): Record<string, any> {
    return {
      op1ClientId: op1.clientId,
      op2ClientId: op2.clientId,
      op1Timestamp: op1.timestamp,
      op2Timestamp: op2.timestamp,
      op1Type: op1.type,
      op2Type: op2.type,
      distanceBetweenOperations: Math.abs(op1.position - op2.position)
    };
  }
}

// ==================== SYNC MANAGER ====================

export class SyncManager {
  private syncStates = new Map<string, Record<string, any>>();
  private syncCount = 0;

  /**
   * Create sync point
   */
  createSyncPoint(sessionId: string, clientId: string, version: number): string {
    const id = 'sync-' + Date.now() + '-' + this.syncCount++;

    this.syncStates.set(id, {
      sessionId,
      clientId,
      version,
      createdAt: Date.now(),
      status: 'pending'
    });

    logger.debug('Sync point created', { syncPointId: id, sessionId, clientId, version });

    return id;
  }

  /**
   * Acknowledge sync
   */
  acknowledgeSyncPoint(syncPointId: string): void {
    const syncState = this.syncStates.get(syncPointId);
    if (syncState) {
      syncState.status = 'acknowledged';
      syncState.acknowledgedAt = Date.now();
      logger.debug('Sync point acknowledged', { syncPointId });
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(syncPointId: string): Record<string, any> | null {
    return this.syncStates.get(syncPointId) || null;
  }

  /**
   * Detect offline changes
   */
  detectOfflineChanges(serverVersion: number, clientVersion: number): boolean {
    return clientVersion < serverVersion;
  }

  /**
   * Merge offline changes
   */
  mergeOfflineChanges(localOps: Operation[], remoteOps: Operation[]): Operation[] {
    const merged: Operation[] = [];

    for (const localOp of localOps) {
      let transformed = localOp;

      for (const remoteOp of remoteOps) {
        if (localOp.timestamp > remoteOp.timestamp) {
          // Local op is newer, adjust for remote op
          transformed = {
            ...transformed,
            position: Math.max(0, transformed.position)
          };
        }
      }

      merged.push(transformed);
    }

    return merged;
  }

  /**
   * Get pending syncs
   */
  getPendingSyncs(sessionId: string): Record<string, any>[] {
    const pending: Record<string, any>[] = [];

    for (const syncState of this.syncStates.values()) {
      if (syncState.sessionId === sessionId && syncState.status === 'pending') {
        pending.push(syncState);
      }
    }

    return pending;
  }
}

// ==================== EXPORTS ====================

export const collaborationServer = new CollaborationServer();
export const operationalTransform = new OperationalTransform();
export const conflictResolver = new ConflictResolver();
export const syncManager = new SyncManager();
