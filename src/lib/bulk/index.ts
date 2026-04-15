/**
 * Bulk Operations System
 * Perform actions on multiple entities at once
 */

import { query } from '../postgres';
import { logAudit } from '../audit/index';

export type BulkOperationType =
  | 'delete'
  | 'update'
  | 'export'
  | 'approve'
  | 'reject'
  | 'ban'
  | 'unban'
  | 'notify'
  | 'tag'
  | 'move'
  | 'merge';

export type BulkEntityType = 'users' | 'places' | 'reviews' | 'comments' | 'collections';

export interface BulkOperation {
  id: string;
  type: BulkOperationType;
  entityType: BulkEntityType;
  entityIds: string[];
  data?: Record<string, any>;
  executedBy: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'partial';
  results?: BulkOperationResult;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
}

export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{ entityId: string; error: string }>;
  details?: Record<string, any>;
}

export async function bulkDelete(
  entityType: BulkEntityType,
  entityIds: string[],
  userId: string,
  options: { soft?: boolean; reason?: string } = {}
): Promise<BulkOperationResult> {
  const { soft = true, reason } = options;
  const tableMap: Record<BulkEntityType, string> = {
    users: 'users',
    places: 'places',
    reviews: 'reviews',
    comments: 'comments',
    collections: 'collections',
  };

  const table = tableMap[entityType];
  const results: BulkOperationResult = { success: 0, failed: 0, errors: [] };

  for (const id of entityIds) {
    try {
      if (soft) {
        await query(
          `UPDATE ${table} SET status = 'deleted', deleted_at = NOW(), deleted_reason = $1 WHERE id = $2`,
          [reason, id]
        );
      } else {
        await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
      }

      await logAudit('delete', entityType.slice(0, -1) as any, {
        userId,
        entityId: id,
        metadata: { bulk: true, reason },
      });

      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({ entityId: id, error: error.message });
    }
  }

  return results;
}

export async function bulkUpdate(
  entityType: BulkEntityType,
  entityIds: string[],
  updates: Record<string, any>,
  userId: string
): Promise<BulkOperationResult> {
  const tableMap: Record<BulkEntityType, string> = {
    users: 'users',
    places: 'places',
    reviews: 'reviews',
    comments: 'comments',
    collections: 'collections',
  };

  const table = tableMap[entityType];
  const results: BulkOperationResult = { success: 0, failed: 0, errors: [] };

  const sets: string[] = [];
  const values: any[] = [];

  Object.entries(updates).forEach(([key, value], index) => {
    sets.push(`${key} = $${index + 1}`);
    values.push(value);
  });

  const setClause = sets.join(', ');

  for (const id of entityIds) {
    try {
      const oldResult = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
      const oldValue = oldResult.rows[0];

      await query(
        `UPDATE ${table} SET ${setClause}, updated_at = NOW() WHERE id = $${values.length + 1}`,
        [...values, id]
      );

      await logAudit('update', entityType.slice(0, -1) as any, {
        userId,
        entityId: id,
        oldValue,
        newValue: { ...oldValue, ...updates },
        metadata: { bulk: true },
      });

      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({ entityId: id, error: error.message });
    }
  }

  return results;
}

export async function bulkModerate(
  entityType: BulkEntityType,
  entityIds: string[],
  action: 'approve' | 'reject',
  userId: string,
  reason?: string
): Promise<BulkOperationResult> {
  const tableMap: Record<BulkEntityType, string> = {
    users: 'users',
    places: 'places',
    reviews: 'reviews',
    comments: 'comments',
    collections: 'collections',
  };

  const table = tableMap[entityType];
  const results: BulkOperationResult = { success: 0, failed: 0, errors: [] };

  for (const id of entityIds) {
    try {
      await query(
        `UPDATE ${table} SET status = $1, moderated_by = $2, moderated_at = NOW(), moderation_reason = $3 WHERE id = $4`,
        [action === 'approve' ? 'active' : 'rejected', userId, reason, id]
      );

      await logAudit(action === 'approve' ? 'approve' : 'reject', entityType.slice(0, -1) as any, {
        userId,
        entityId: id,
        metadata: { bulk: true, reason },
      });

      results.success++;
    } catch (error: any) {
      results.failed++;
      results.errors.push({ entityId: id, error: error.message });
    }
  }

  return results;
}

export async function bulkExport(
  entityType: BulkEntityType,
  entityIds: string[],
  format: 'json' | 'csv'
): Promise<{ data: string; contentType: string; fileName: string }> {
  const tableMap: Record<BulkEntityType, string> = {
    users: 'users',
    places: 'places',
    reviews: 'reviews',
    comments: 'comments',
    collections: 'collections',
  };

  const table = tableMap[entityType];
  const result = await query(`SELECT * FROM ${table} WHERE id = ANY($1)`, [entityIds]);

  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `${entityType}_export_${timestamp}.${format}`;

  if (format === 'csv') {
    if (result.rows.length === 0) {
      return { data: '', contentType: 'text/csv', fileName };
    }

    const headers = Object.keys(result.rows[0]);
    const csvRows = result.rows.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val).replace(/"/g, '""');
      }).join(',')
    );

    const data = [headers.join(','), ...csvRows].join('\n');
    return { data, contentType: 'text/csv', fileName };
  }

  return {
    data: JSON.stringify(result.rows, null, 2),
    contentType: 'application/json',
    fileName,
  };
}

export async function executeBulkOperation(
  operation: Omit<BulkOperation, 'id' | 'startedAt' | 'completedAt'>
): Promise<BulkOperation> {
  const id = `bulk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const bulkOp: BulkOperation = {
    ...operation,
    id,
    startedAt: new Date(),
    status: 'running',
  };

  await query(
    `INSERT INTO bulk_operations (id, type, entity_type, entity_ids, data, executed_by, status, started_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [id, operation.type, operation.entityType, operation.entityIds, 
     JSON.stringify(operation.data), operation.executedBy, 'running']
  );

  let results: BulkOperationResult;

  try {
    switch (operation.type) {
      case 'delete':
        results = await bulkDelete(operation.entityType, operation.entityIds, operation.executedBy, operation.data);
        break;
      case 'update':
        results = await bulkUpdate(operation.entityType, operation.entityIds, operation.data?.updates || {}, operation.executedBy);
        break;
      case 'approve':
      case 'reject':
        results = await bulkModerate(operation.entityType, operation.entityIds, operation.type, operation.executedBy, operation.data?.reason);
        break;
      default:
        throw new Error(`Unsupported bulk operation type: ${operation.type}`);
    }

    bulkOp.results = results;
    bulkOp.status = results.failed === 0 ? 'completed' : results.success === 0 ? 'failed' : 'partial';
  } catch (error: any) {
    bulkOp.status = 'failed';
    bulkOp.errorMessage = error.message;
  }

  bulkOp.completedAt = new Date();

  await query(
    `UPDATE bulk_operations SET status = $1, results = $2, error_message = $3, completed_at = NOW() WHERE id = $4`,
    [bulkOp.status, JSON.stringify(bulkOp.results), bulkOp.errorMessage, id]
  );

  return bulkOp;
}
