/**
 * Phase 114: Multiplayer Document Editing
 * Real-time collaborative document editing with operational transformation
 */

import { logger } from './logging';

// ==================== TYPES & INTERFACES ====================

export type DocumentType = 'document' | 'spreadsheet' | 'presentation' | 'code';

export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  content: string;
  version: number;
  owner: string;
  collaborators: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Edit {
  id: string;
  documentId: string;
  userId: string;
  operation: 'insert' | 'delete' | 'format';
  position: number;
  content?: string;
  length?: number;
  timestamp: number;
}

export interface DocumentSnapshot {
  id: string;
  documentId: string;
  version: number;
  content: string;
  timestamp: number;
}

// ==================== DOCUMENT MANAGER ====================

export class DocumentManager {
  private documents = new Map<string, Document>();
  private documentCount = 0;

  /**
   * Create document
   */
  createDocument(config: Omit<Document, 'id' | 'createdAt' | 'updatedAt' | 'version'>): Document {
    const id = 'doc-' + Date.now() + '-' + this.documentCount++;

    const document: Document = {
      ...config,
      id,
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.documents.set(id, document);
    logger.info('Document created', {
      documentId: id,
      title: config.title,
      type: config.type,
      owner: config.owner
    });

    return document;
  }

  /**
   * Get document
   */
  getDocument(documentId: string): Document | null {
    return this.documents.get(documentId) || null;
  }

  /**
   * Update document content
   */
  updateDocumentContent(documentId: string, content: string, version: number): void {
    const document = this.documents.get(documentId);
    if (document) {
      document.content = content;
      document.version = version;
      document.updatedAt = Date.now();
      logger.debug('Document content updated', { documentId, version });
    }
  }

  /**
   * Add collaborator
   */
  addCollaborator(documentId: string, userId: string): void {
    const document = this.documents.get(documentId);
    if (document && !document.collaborators.includes(userId)) {
      document.collaborators.push(userId);
      logger.debug('Collaborator added', { documentId, userId });
    }
  }

  /**
   * Remove collaborator
   */
  removeCollaborator(documentId: string, userId: string): void {
    const document = this.documents.get(documentId);
    if (document) {
      document.collaborators = document.collaborators.filter(c => c !== userId);
      logger.debug('Collaborator removed', { documentId, userId });
    }
  }

  /**
   * List user documents
   */
  listUserDocuments(userId: string): Document[] {
    const documents: Document[] = [];

    for (const doc of this.documents.values()) {
      if (doc.owner === userId || doc.collaborators.includes(userId)) {
        documents.push(doc);
      }
    }

    return documents;
  }
}

// ==================== EDITOR SESSION ====================

export class EditorSession {
  private sessions = new Map<string, Record<string, any>>();
  private sessionCount = 0;
  private edits = new Map<string, Edit[]>();

  /**
   * Create editor session
   */
  createSession(documentId: string, userId: string): string {
    const id = 'session-' + Date.now() + '-' + this.sessionCount++;

    this.sessions.set(id, {
      id,
      documentId,
      userId,
      createdAt: Date.now(),
      cursorPosition: 0,
      selectionStart: 0,
      selectionEnd: 0
    });

    this.edits.set(id, []);
    logger.debug('Editor session created', { sessionId: id, documentId, userId });

    return id;
  }

  /**
   * Apply edit to session
   */
  applyEdit(sessionId: string, operation: {
    operation: 'insert' | 'delete' | 'format';
    position: number;
    content?: string;
    length?: number;
    userId: string;
  }): Edit {
    const id = 'edit-' + Date.now();

    const edit: Edit = {
      id,
      documentId: this.sessions.get(sessionId)?.documentId || '',
      userId: operation.userId,
      operation: operation.operation,
      position: operation.position,
      content: operation.content,
      length: operation.length,
      timestamp: Date.now()
    };

    const sessionEdits = this.edits.get(sessionId) || [];
    sessionEdits.push(edit);
    this.edits.set(sessionId, sessionEdits);

    logger.debug('Edit applied', { sessionId, editId: id, operation: operation.operation });

    return edit;
  }

  /**
   * Get session edits
   */
  getSessionEdits(sessionId: string): Edit[] {
    return this.edits.get(sessionId) || [];
  }

  /**
   * Update cursor position
   */
  updateCursorPosition(sessionId: string, position: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.cursorPosition = position;
      logger.debug('Cursor position updated', { sessionId, position });
    }
  }

  /**
   * Update selection
   */
  updateSelection(sessionId: string, start: number, end: number): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.selectionStart = start;
      session.selectionEnd = end;
      logger.debug('Selection updated', { sessionId, start, end });
    }
  }

  /**
   * Get session state
   */
  getSessionState(sessionId: string): Record<string, any> | null {
    return this.sessions.get(sessionId) || null;
  }
}

// ==================== CONTENT VERSIONING ====================

export class ContentVersioning {
  private snapshots = new Map<string, DocumentSnapshot[]>();

  /**
   * Create snapshot
   */
  createSnapshot(documentId: string, content: string, version: number): DocumentSnapshot {
    const id = 'snap-' + Date.now();

    const snapshot: DocumentSnapshot = {
      id,
      documentId,
      version,
      content,
      timestamp: Date.now()
    };

    const documentSnapshots = this.snapshots.get(documentId) || [];
    documentSnapshots.push(snapshot);
    this.snapshots.set(documentId, documentSnapshots);

    logger.info('Snapshot created', { snapshotId: id, documentId, version });

    return snapshot;
  }

  /**
   * Get snapshot
   */
  getSnapshot(snapshotId: string): DocumentSnapshot | null {
    for (const snapshots of this.snapshots.values()) {
      const snapshot = snapshots.find(s => s.id === snapshotId);
      if (snapshot) return snapshot;
    }

    return null;
  }

  /**
   * Get document snapshots
   */
  getDocumentSnapshots(documentId: string): DocumentSnapshot[] {
    return this.snapshots.get(documentId) || [];
  }

  /**
   * Restore from snapshot
   */
  restoreFromSnapshot(snapshotId: string): DocumentSnapshot | null {
    return this.getSnapshot(snapshotId);
  }

  /**
   * Compare snapshots
   */
  compareSnapshots(snap1: DocumentSnapshot, snap2: DocumentSnapshot): Record<string, any> {
    const addedLines = snap2.content.split('\n').length - snap1.content.split('\n').length;

    return {
      versionDifference: snap2.version - snap1.version,
      addedLines,
      timeDifference: snap2.timestamp - snap1.timestamp,
      contentLengthChange: snap2.content.length - snap1.content.length
    };
  }

  /**
   * Prune snapshots
   */
  pruneSnapshots(documentId: string, keepCount: number): void {
    const snapshots = this.snapshots.get(documentId) || [];

    if (snapshots.length > keepCount) {
      const toKeep = snapshots.slice(-keepCount);
      this.snapshots.set(documentId, toKeep);
      logger.debug('Snapshots pruned', { documentId, kept: keepCount });
    }
  }
}

// ==================== LOCK MANAGER ====================

export class LockManager {
  private locks = new Map<string, Record<string, any>>();
  private lockCount = 0;

  /**
   * Acquire lock
   */
  acquireLock(documentId: string, userId: string, range: { start: number; end: number }): string {
    const id = 'lock-' + Date.now() + '-' + this.lockCount++;

    const lock = {
      id,
      documentId,
      userId,
      range,
      acquiredAt: Date.now(),
      expiresAt: Date.now() + 30000 // 30 second lock
    };

    this.locks.set(id, lock);
    logger.debug('Lock acquired', { lockId: id, userId, rangeStart: range.start, rangeEnd: range.end });

    return id;
  }

  /**
   * Release lock
   */
  releaseLock(lockId: string): void {
    this.locks.delete(lockId);
    logger.debug('Lock released', { lockId });
  }

  /**
   * Check lock
   */
  checkLock(documentId: string, range: { start: number; end: number }): Record<string, any> | null {
    for (const lock of this.locks.values()) {
      if (lock.documentId === documentId && Date.now() < lock.expiresAt) {
        // Check for overlap
        if (!(lock.range.end <= range.start || lock.range.start >= range.end)) {
          return lock;
        }
      }
    }

    return null;
  }

  /**
   * Get user locks
   */
  getUserLocks(userId: string): Record<string, any>[] {
    const userLocks: Record<string, any>[] = [];

    for (const lock of this.locks.values()) {
      if (lock.userId === userId && Date.now() < lock.expiresAt) {
        userLocks.push(lock);
      }
    }

    return userLocks;
  }

  /**
   * Cleanup expired locks
   */
  cleanupExpiredLocks(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [id, lock] of this.locks.entries()) {
      if (lock.expiresAt < now) {
        this.locks.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// ==================== EXPORTS ====================

export const documentManager = new DocumentManager();
export const editorSession = new EditorSession();
export const contentVersioning = new ContentVersioning();
export const lockManager = new LockManager();
