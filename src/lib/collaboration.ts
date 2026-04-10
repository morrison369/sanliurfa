/**
 * Phase 18: Real-time Collaboration
 * Multiplayer editing, operational transformation, presence detection, conflict resolution
 */

import { deterministicId, pickDeterministic } from './deterministic';
import { logger } from './logging';

// ==================== OPERATIONAL TRANSFORMATION ====================

export interface DocumentChange {
  id: string;
  userId: string;
  type: 'insert' | 'delete' | 'update';
  path: string;
  value: any;
  timestamp: number;
  version: number;
}

/**
 * Operational Transformation for conflict-free concurrent editing
 */
export class OperationalTransformation {
  private history: DocumentChange[] = [];
  private clientVersions = new Map<string, number>();

  /**
   * Apply local change
   */
  applyLocalChange(userId: string, change: Omit<DocumentChange, 'id' | 'timestamp' | 'version'>): DocumentChange {
    const version = this.history.length;
    const documented: DocumentChange = {
      ...change,
      id: deterministicId('change', `${userId}:${change.path}:${version}`, version + 1),
      timestamp: Date.now(),
      version
    };

    this.history.push(documented);

    return documented;
  }

  /**
   * Transform remote change against local changes
   */
  transformRemoteChange(remoteChange: DocumentChange): DocumentChange {
    const clientVersion = this.clientVersions.get(remoteChange.userId) || 0;

    // Apply operational transformation
    let transformed = remoteChange;

    for (let i = clientVersion; i < this.history.length; i++) {
      const localChange = this.history[i];

      // Simple OT: if both changes affect same path, resolve based on timestamp
      if (localChange.path === transformed.path) {
        if (localChange.timestamp < transformed.timestamp) {
          // Local change happened first, adjust remote change
          transformed = this.adjustChange(transformed, localChange);
        }
      }
    }

    this.clientVersions.set(remoteChange.userId, remoteChange.version);

    return transformed;
  }

  /**
   * Adjust change based on conflict
   */
  private adjustChange(remoteChange: DocumentChange, localChange: DocumentChange): DocumentChange {
    // Simplified conflict resolution
    if (remoteChange.type === 'insert' && localChange.type === 'insert') {
      if (remoteChange.value && localChange.value) {
        return {
          ...remoteChange,
          value: { ...localChange.value, ...remoteChange.value }
        };
      }
    }

    return remoteChange;
  }

  /**
   * Get change history
   */
  getHistory(since: number = 0): DocumentChange[] {
    return this.history.slice(since);
  }

  /**
   * Get current version number
   */
  getCurrentVersion(): number {
    return this.history.length;
  }
}

// ==================== PRESENCE DETECTION ====================

export interface UserPresence {
  userId: string;
  username: string;
  cursorPosition: { x: number; y: number };
  selection?: { start: number; end: number };
  lastActive: number;
  color: string;
}

/**
 * Track active users and their presence
 */
export class PresenceManager {
  private activeUsers = new Map<string, UserPresence>();
  private updateCallbacks: ((presence: UserPresence[]) => void)[] = [];

  /**
   * Update user presence
   */
  updatePresence(userId: string, update: Partial<UserPresence>): void {
    let presence = this.activeUsers.get(userId);

    if (!presence) {
      presence = {
        userId,
        username: userId,
        cursorPosition: { x: 0, y: 0 },
        lastActive: Date.now(),
        color: this.generateUserColor(userId)
      };
    }

    presence = { ...presence, ...update, lastActive: Date.now() };
    this.activeUsers.set(userId, presence);

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Remove user presence (user left)
   */
  removePresence(userId: string): void {
    this.activeUsers.delete(userId);
    this.notifyListeners();
  }

  /**
   * Get all active users
   */
  getActiveUsers(): UserPresence[] {
    const now = Date.now();
    const timeout = 30000; // 30 seconds

    // Remove stale users
    for (const [userId, presence] of this.activeUsers) {
      if (now - presence.lastActive > timeout) {
        this.activeUsers.delete(userId);
      }
    }

    return Array.from(this.activeUsers.values());
  }

  /**
   * Subscribe to presence updates
   */
  onPresenceChange(callback: (presence: UserPresence[]) => void): () => void {
    this.updateCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(): void {
    const presence = this.getActiveUsers();
    for (const callback of this.updateCallbacks) {
      callback(presence);
    }
  }

  /**
   * Generate consistent color for user
   */
  private generateUserColor(userId: string): string {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
    return pickDeterministic(colors, `presence:${userId}`);
  }
}

// ==================== CONFLICT RESOLUTION ====================

export interface ConflictResolutionStrategy {
  name: 'last-write-wins' | 'first-write-wins' | 'merge' | 'manual';
  resolve: (local: any, remote: any) => any;
}

/**
 * Resolve conflicts from concurrent edits
 */
export class ConflictResolver {
  private strategies = new Map<string, ConflictResolutionStrategy>();

  constructor() {
    // Register default strategies
    this.registerStrategy({
      name: 'last-write-wins',
      resolve: (local, remote) => remote // Remote (later) wins
    });

    this.registerStrategy({
      name: 'first-write-wins',
      resolve: (local, remote) => local // Local (first) wins
    });

    this.registerStrategy({
      name: 'merge',
      resolve: (local, remote) => {
        // Deep merge objects
        if (typeof local === 'object' && typeof remote === 'object') {
          return { ...local, ...remote };
        }
        return remote;
      }
    });
  }

  /**
   * Register conflict resolution strategy
   */
  registerStrategy(strategy: ConflictResolutionStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Resolve conflict
   */
  resolve(strategyName: string, local: any, remote: any): any {
    const strategy = this.strategies.get(strategyName);

    if (!strategy) {
      throw new Error(`Unknown conflict resolution strategy: ${strategyName}`);
    }

    return strategy.resolve(local, remote);
  }
}

// ==================== DOCUMENT LOCKING ====================

export interface DocumentLock {
  documentId: string;
  userId: string;
  lockedAt: number;
  expiresAt: number;
}

/**
 * Prevent simultaneous editing of critical sections
 */
export class DocumentLockManager {
  private locks = new Map<string, DocumentLock>();
  private lockTimeout = 60000; // 1 minute

  /**
   * Acquire lock
   */
  acquireLock(documentId: string, userId: string): boolean {
    const existingLock = this.locks.get(documentId);

    if (existingLock && existingLock.expiresAt > Date.now()) {
      return false; // Already locked
    }

    this.locks.set(documentId, {
      documentId,
      userId,
      lockedAt: Date.now(),
      expiresAt: Date.now() + this.lockTimeout
    });

    return true;
  }

  /**
   * Release lock
   */
  releaseLock(documentId: string, userId: string): boolean {
    const lock = this.locks.get(documentId);

    if (lock && lock.userId === userId) {
      this.locks.delete(documentId);
      return true;
    }

    return false;
  }

  /**
   * Check if document is locked
   */
  isLocked(documentId: string): boolean {
    const lock = this.locks.get(documentId);
    return lock ? lock.expiresAt > Date.now() : false;
  }

  /**
   * Get lock holder
   */
  getLock(documentId: string): DocumentLock | null {
    const lock = this.locks.get(documentId);
    return lock && lock.expiresAt > Date.now() ? lock : null;
  }
}

// ==================== EXPORTS ====================

export const operationalTransformation = new OperationalTransformation();
export const presenceManager = new PresenceManager();
export const conflictResolver = new ConflictResolver();
export const documentLockManager = new DocumentLockManager();
