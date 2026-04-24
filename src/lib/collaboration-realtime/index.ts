/**
 * Real-time Collaboration
 * Task 133: Live Editing, Presence
 */

import { db } from '../db';
// @ts-ignore
import { sql } from 'drizzle-orm';
import { logger } from '../logging';

export interface Presence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  currentPage?: string;
  cursor?: { x: number; y: number };
  lastSeen: Date;
}

export interface LiveDocument {
  id: string;
  type: 'place_edit' | 'event_planning' | 'collection';
  content: any;
  version: number;
  editors: string[];
  operations: Operation[];
  updatedAt: Date;
}

export interface Operation {
  type: 'insert' | 'delete' | 'replace';
  path: string;
  value?: any;
  oldValue?: any;
  userId: string;
  timestamp: Date;
}

// Presence store (in production: Redis)
const presenceStore = new Map<string, Presence>();

/**
 * Update user presence
 */
export async function updatePresence(
  userId: string,
  update: Partial<Presence>
): Promise<void> {
  const existing = presenceStore.get(userId) || {
    userId,
    status: 'online',
    lastSeen: new Date(),
  };

  presenceStore.set(userId, {
    ...existing,
    ...update,
    lastSeen: new Date(),
  });

  // Persist to DB for history
  await db.execute(sql`
    INSERT INTO user_presence (user_id, status, current_page, last_seen)
    VALUES (${userId}, ${update.status || 'online'}, ${update.currentPage || null}, ${new Date()})
    ON CONFLICT (user_id) DO UPDATE SET
      status = EXCLUDED.status,
      current_page = EXCLUDED.current_page,
      last_seen = EXCLUDED.last_seen
  `);
}

/**
 * Get online users
 */
export async function getOnlineUsers(): Promise<Presence[]> {
  const threshold = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes
  
  const result = await db.execute(sql`
    SELECT * FROM user_presence 
    WHERE status = 'online' AND last_seen > ${threshold}
    ORDER BY last_seen DESC
  `);

  return result.rows.map((row: any) => ({
    userId: row.user_id,
    status: row.status,
    currentPage: row.current_page,
    lastSeen: new Date(row.last_seen),
  }));
}

/**
 * Join document for collaborative editing
 */
export async function joinDocument(
  documentId: string,
  userId: string
): Promise<LiveDocument> {
  let doc = await getDocument(documentId);
  
  if (!doc) {
    doc = await createDocument(documentId, userId);
  }

  if (!doc.editors.includes(userId)) {
    doc.editors.push(userId);
    await saveDocument(doc);
  }

  return doc;
}

/**
 * Apply operation to document
 */
export async function applyOperation(
  documentId: string,
  operation: Operation
): Promise<LiveDocument> {
  const doc = await getDocument(documentId);
  if (!doc) throw new Error('Document not found');

  // Apply operation using Operational Transform
  const transformedOp = transformOperation(operation, doc.operations);
  
  // Apply to document
  applyToDocument(doc.content, transformedOp);
  
  doc.operations.push(transformedOp);
  doc.version++;
  doc.updatedAt = new Date();

  await saveDocument(doc);

  // Broadcast to other editors (via WebSocket)
  broadcastOperation(documentId, transformedOp);

  return doc;
}

/**
 * Get document state
 */
export async function getDocument(id: string): Promise<LiveDocument | null> {
  const result = await db.execute(sql`SELECT * FROM live_documents WHERE id = ${id}`);
  if (!result.rows[0]) return null;

  return {
    id: result.rows[0].id,
    type: result.rows[0].type,
    content: JSON.parse(result.rows[0].content),
    version: result.rows[0].version,
    editors: JSON.parse(result.rows[0].editors),
    operations: JSON.parse(result.rows[0].operations),
    updatedAt: new Date(result.rows[0].updated_at),
  };
}

async function createDocument(id: string, userId: string): Promise<LiveDocument> {
  const doc: LiveDocument = {
    id,
    type: 'place_edit',
    content: {},
    version: 1,
    editors: [userId],
    operations: [],
    updatedAt: new Date(),
  };

  await db.execute(sql`
    INSERT INTO live_documents (id, type, content, version, editors, operations, updated_at)
    VALUES (${doc.id}, ${doc.type}, ${JSON.stringify(doc.content)}, ${doc.version}, ${JSON.stringify(doc.editors)}, ${JSON.stringify(doc.operations)}, ${doc.updatedAt})
  `);

  return doc;
}

async function saveDocument(doc: LiveDocument): Promise<void> {
  await db.execute(sql`
    UPDATE live_documents 
    SET content = ${JSON.stringify(doc.content)}, 
        version = ${doc.version}, 
        editors = ${JSON.stringify(doc.editors)},
        operations = ${JSON.stringify(doc.operations)},
        updated_at = ${doc.updatedAt}
    WHERE id = ${doc.id}
  `);
}

function transformOperation(op: Operation, _existingOps: Operation[]): Operation {
  // Simplified OT - in production use proper OT or CRDT
  return op;
}

function applyToDocument(content: any, op: Operation): void {
  const parts = op.path.split('.');
  let target = content;
  
  for (let i = 0; i < parts.length - 1; i++) {
    target = target[parts[i]] = target[parts[i]] || {};
  }

  const key = parts[parts.length - 1];
  
  switch (op.type) {
    case 'insert':
    case 'replace':
      target[key] = op.value;
      break;
    case 'delete':
      delete target[key];
      break;
  }
}

function broadcastOperation(documentId: string, _op: Operation): void {
  // In production: WebSocket broadcast
  logger.info(`[Collaboration] Broadcasting operation on ${documentId}`);
}
