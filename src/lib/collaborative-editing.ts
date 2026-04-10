/**
 * Collaborative Editing Library
 * Real-time collaboration, operational transformation, conflict resolution
 */

import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';
import crypto from 'crypto';

export async function createCollaborationSession(contentId: string, initiatedByUserId: string, maxParticipants: number = 10): Promise<any | null> {
  try {
    const sessionToken = crypto.randomBytes(32).toString('hex');

    const result = await insert('collaboration_sessions', {
      content_id: contentId,
      session_token: sessionToken,
      initiated_by_user_id: initiatedByUserId,
      max_participants: maxParticipants,
      current_participants: 1,
      is_active: true
    });

    logger.info('Collaboration session created', { contentId, sessionToken: sessionToken.substring(0, 8) });
    return result;
  } catch (error) {
    logger.error('Failed to create collaboration session', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getCollaborationSession(sessionToken: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:collab:${sessionToken}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const session = await queryOne(
      'SELECT * FROM collaboration_sessions WHERE session_token = $1 AND is_active = true',
      [sessionToken]
    );

    if (session) {
      await setCache(cacheKey, JSON.stringify(session), 600); // 10 min cache for active sessions
    }

    return session || null;
  } catch (error) {
    logger.error('Failed to get collaboration session', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function addParticipant(sessionId: string, userId: string): Promise<any | null> {
  try {
    const result = await insert('collaboration_participants', {
      session_id: sessionId,
      user_id: userId,
      joined_at: new Date(),
      is_editing: false
    });

    // Update session participant count
    const count = await queryOne(
      'SELECT COUNT(*) as count FROM collaboration_participants WHERE session_id = $1 AND left_at IS NULL',
      [sessionId]
    );

    await update('collaboration_sessions', { id: sessionId }, {
      current_participants: parseInt(count?.count || '1')
    });

    await deleteCache(`sanliurfa:collab:session:${sessionId}`);
    logger.info('Participant added to session', { sessionId, userId });
    return result;
  } catch (error) {
    logger.error('Failed to add participant', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function removeParticipant(sessionId: string, userId: string): Promise<boolean> {
  try {
    await update('collaboration_participants', { session_id: sessionId, user_id: userId }, {
      left_at: new Date(),
      is_editing: false
    });

    // Check if session should be closed
    const activeCount = await queryOne(
      'SELECT COUNT(*) as count FROM collaboration_participants WHERE session_id = $1 AND left_at IS NULL',
      [sessionId]
    );

    if (parseInt(activeCount?.count || '0') === 0) {
      await update('collaboration_sessions', { id: sessionId }, {
        is_active: false,
        ended_at: new Date()
      });
    }

    await deleteCache(`sanliurfa:collab:session:${sessionId}`);
    return true;
  } catch (error) {
    logger.error('Failed to remove participant', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function recordEditOperation(sessionId: string, userId: string, operationType: string, operationData: any, operationIndex: number, timestamp: number): Promise<any | null> {
  try {
    const result = await insert('edit_operations', {
      session_id: sessionId,
      user_id: userId,
      operation_type: operationType,
      operation_data: operationData,
      operation_index: operationIndex,
      timestamp: timestamp
    });

    logger.info('Edit operation recorded', { sessionId, operationType, index: operationIndex });
    return result;
  } catch (error) {
    logger.error('Failed to record edit operation', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getEditOperations(sessionId: string, startIndex: number = 0, limit: number = 100): Promise<any[]> {
  try {
    return await queryRows(
      `SELECT * FROM edit_operations
       WHERE session_id = $1 AND operation_index >= $2
       ORDER BY operation_index ASC
       LIMIT $3`,
      [sessionId, startIndex, limit]
    );
  } catch (error) {
    logger.error('Failed to get edit operations', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function createEditSnapshot(sessionId: string, contentSnapshot: string, operationCount: number): Promise<any | null> {
  try {
    const result = await insert('edit_snapshots', {
      session_id: sessionId,
      content_snapshot: contentSnapshot,
      operation_count: operationCount,
      taken_at: new Date()
    });

    return result;
  } catch (error) {
    logger.error('Failed to create edit snapshot', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getLatestSnapshot(sessionId: string): Promise<any | null> {
  try {
    return await queryOne(
      `SELECT * FROM edit_snapshots
       WHERE session_id = $1
       ORDER BY taken_at DESC
       LIMIT 1`,
      [sessionId]
    );
  } catch (error) {
    logger.error('Failed to get latest snapshot', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function recordConflict(sessionId: string, operation1Id: string, operation2Id: string, conflictType: string): Promise<any | null> {
  try {
    const result = await insert('edit_conflicts', {
      session_id: sessionId,
      operation_1_id: operation1Id,
      operation_2_id: operation2Id,
      conflict_type: conflictType,
      resolution_type: 'pending'
    });

    logger.warn('Edit conflict detected', { sessionId, conflictType });
    return result;
  } catch (error) {
    logger.error('Failed to record conflict', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function resolveConflict(conflictId: string, resolutionType: string, resolvedByUserId: string): Promise<boolean> {
  try {
    await update('edit_conflicts', { id: conflictId }, {
      resolution_type: resolutionType,
      resolved_at: new Date(),
      resolved_by_user_id: resolvedByUserId
    });

    logger.info('Conflict resolved', { conflictId, resolutionType });
    return true;
  } catch (error) {
    logger.error('Failed to resolve conflict', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function addCollaborationComment(sessionId: string, userId: string, commentText: string, positionInDoc: number): Promise<any | null> {
  try {
    const result = await insert('collaboration_comments', {
      session_id: sessionId,
      user_id: userId,
      comment_text: commentText,
      position_in_doc: positionInDoc,
      resolved: false
    });

    return result;
  } catch (error) {
    logger.error('Failed to add collaboration comment', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getCollaborationComments(sessionId: string, resolvedOnly: boolean = false): Promise<any[]> {
  try {
    let query = 'SELECT * FROM collaboration_comments WHERE session_id = $1';
    const params = [sessionId];

    if (resolvedOnly) {
      query += ' AND resolved = true';
    }

    query += ' ORDER BY position_in_doc ASC, created_at DESC';

    return await queryRows(query, params);
  } catch (error) {
    logger.error('Failed to get collaboration comments', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function resolveComment(commentId: string): Promise<boolean> {
  try {
    await update('collaboration_comments', { id: commentId }, {
      resolved: true
    });

    return true;
  } catch (error) {
    logger.error('Failed to resolve comment', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getActiveParticipants(sessionId: string): Promise<any[]> {
  try {
    return await queryRows(
      `SELECT * FROM collaboration_participants
       WHERE session_id = $1 AND left_at IS NULL
       ORDER BY joined_at DESC`,
      [sessionId]
    );
  } catch (error) {
    logger.error('Failed to get active participants', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function updateParticipantCursor(participantId: string, cursorPosition: number, selectionStart: number, selectionEnd: number): Promise<boolean> {
  try {
    await update('collaboration_participants', { id: participantId }, {
      cursor_position: cursorPosition,
      selection_start: selectionStart,
      selection_end: selectionEnd,
      last_activity_at: new Date()
    });

    return true;
  } catch (error) {
    logger.error('Failed to update cursor', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getCollaborationStats(): Promise<any> {
  try {
    const stats = await queryRows(
      `SELECT
        COUNT(DISTINCT session_id) as active_sessions,
        COUNT(DISTINCT user_id) as active_users,
        SUM(current_participants) as total_participants
       FROM collaboration_sessions
       WHERE is_active = true`,
      []
    );

    return stats[0] || {};
  } catch (error) {
    logger.error('Failed to get collaboration stats', error instanceof Error ? error : new Error(String(error)));
    return {};
  }
}
