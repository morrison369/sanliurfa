/**
 * Content Versioning Module
 * Track and manage content versions with diff, rollback, and history
 */

import { query } from '../postgres';

export interface Version {
  id: string;
  entityType: string;
  entityId: string;
  versionNumber: number;
  data: any;
  changeSummary?: string;
  changedBy: string;
  changedAt: Date;
  isCurrent: boolean;
}

export interface VersionDiff {
  added: Record<string, any>;
  removed: Record<string, any>;
  modified: Record<string, { old: any; new: any }>;
}

/**
 * Create new version for an entity
 */
export async function createVersion(
  entityType: string,
  entityId: string,
  data: any,
  changedBy: string,
  changeSummary?: string
): Promise<Version> {
  // Get next version number
  const versionResult = await query(
    `SELECT COALESCE(MAX(version_number), 0) + 1 as next_version
     FROM content_versions 
     WHERE entity_type = $1 AND entity_id = $2`,
    [entityType, entityId]
  );
  
  const versionNumber = parseInt(versionResult.rows[0].next_version);

  // Mark previous versions as not current
  await query(
    `UPDATE content_versions 
     SET is_current = false 
     WHERE entity_type = $1 AND entity_id = $2`,
    [entityType, entityId]
  );

  // Create new version
  const result = await query(
    `INSERT INTO content_versions 
     (entity_type, entity_id, version_number, data, change_summary, changed_by, is_current)
     VALUES ($1, $2, $3, $4, $5, $6, true)
     RETURNING *`,
    [entityType, entityId, versionNumber, JSON.stringify(data), changeSummary, changedBy]
  );

  return result.rows[0];
}

/**
 * Get version by ID
 */
export async function getVersion(versionId: string): Promise<Version | null> {
  const result = await query(
    `SELECT * FROM content_versions WHERE id = $1`,
    [versionId]
  );
  return result.rows[0] || null;
}

/**
 * Get version history for an entity
 */
export async function getVersionHistory(
  entityType: string,
  entityId: string,
  limit: number = 20
): Promise<Version[]> {
  const result = await query(
    `SELECT * FROM content_versions 
     WHERE entity_type = $1 AND entity_id = $2
     ORDER BY version_number DESC
     LIMIT $3`,
    [entityType, entityId, limit]
  );
  return result.rows;
}

/**
 * Get current version
 */
export async function getCurrentVersion(
  entityType: string,
  entityId: string
): Promise<Version | null> {
  const result = await query(
    `SELECT * FROM content_versions 
     WHERE entity_type = $1 AND entity_id = $2 AND is_current = true
     LIMIT 1`,
    [entityType, entityId]
  );
  return result.rows[0] || null;
}

/**
 * Get specific version by number
 */
export async function getVersionByNumber(
  entityType: string,
  entityId: string,
  versionNumber: number
): Promise<Version | null> {
  const result = await query(
    `SELECT * FROM content_versions 
     WHERE entity_type = $1 AND entity_id = $2 AND version_number = $3`,
    [entityType, entityId, versionNumber]
  );
  return result.rows[0] || null;
}

/**
 * Calculate diff between two versions
 */
export function calculateDiff(oldData: any, newData: any): VersionDiff {
  const diff: VersionDiff = {
    added: {},
    removed: {},
    modified: {}
  };

  const oldKeys = Object.keys(oldData);
  const newKeys = Object.keys(newData);

  // Find added fields
  for (const key of newKeys) {
    if (!(key in oldData)) {
      diff.added[key] = newData[key];
    }
  }

  // Find removed fields
  for (const key of oldKeys) {
    if (!(key in newData)) {
      diff.removed[key] = oldData[key];
    }
  }

  // Find modified fields
  for (const key of newKeys) {
    if (key in oldData && JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      diff.modified[key] = { old: oldData[key], new: newData[key] };
    }
  }

  return diff;
}

/**
 * Compare two versions
 */
export async function compareVersions(
  versionId1: string,
  versionId2: string
): Promise<{ version1: Version; version2: Version; diff: VersionDiff } | null> {
  const [v1, v2] = await Promise.all([
    getVersion(versionId1),
    getVersion(versionId2)
  ]);

  if (!v1 || !v2) return null;

  const diff = calculateDiff(v1.data, v2.data);

  return { version1: v1, version2: v2, diff };
}

/**
 * Rollback to a specific version
 */
export async function rollbackToVersion(
  entityType: string,
  entityId: string,
  versionNumber: number,
  changedBy: string
): Promise<Version | null> {
  const targetVersion = await getVersionByNumber(entityType, entityId, versionNumber);
  if (!targetVersion) return null;

  // Create new version with rolled back data
  const rollbackVersion = await createVersion(
    entityType,
    entityId,
    targetVersion.data,
    changedBy,
    `Rollback to version ${versionNumber}`
  );

  return rollbackVersion;
}

/**
 * Restore entity to a specific version (updates actual entity)
 */
export async function restoreVersion(
  entityType: string,
  entityId: string,
  versionNumber: number,
  changedBy: string
): Promise<boolean> {
  const version = await getVersionByNumber(entityType, entityId, versionNumber);
  if (!version) return false;

  // Update actual entity table
  const tableName = getTableNameForEntity(entityType);
  if (!tableName) return false;

  const data = version.data;
  const fields = Object.keys(data).filter(k => k !== 'id');
  
  if (fields.length === 0) return false;

  const setClause = fields.map((f, i) => `${f} = $${i + 3}`).join(', ');
  const values = fields.map(f => data[f]);

  await query(
    `UPDATE ${tableName} 
     SET ${setClause}, updated_at = NOW() 
     WHERE id = $1`,
    [entityId, ...values]
  );

  // Create version record for restore
  await createVersion(
    entityType,
    entityId,
    data,
    changedBy,
    `Restored from version ${versionNumber}`
  );

  return true;
}

/**
 * Delete old versions (keep last N)
 */
export async function pruneVersions(
  entityType: string,
  entityId: string,
  keepCount: number = 10
): Promise<number> {
  const result = await query(
    `DELETE FROM content_versions 
     WHERE entity_type = $1 
     AND entity_id = $2 
     AND version_number <= (
       SELECT MAX(version_number) - $3 
       FROM content_versions 
       WHERE entity_type = $1 AND entity_id = $2
     )`,
    [entityType, entityId, keepCount]
  );

  return result.rowCount;
}

/**
 * Get version statistics
 */
export async function getVersionStats(): Promise<{
  totalVersions: number;
  entitiesWithVersions: number;
  averageVersionsPerEntity: number;
}> {
  const result = await query(`
    SELECT 
      COUNT(*) as total_versions,
      COUNT(DISTINCT CONCAT(entity_type, ':', entity_id)) as entities_with_versions,
      ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT CONCAT(entity_type, ':', entity_id)), 0), 2) as avg_versions
    FROM content_versions
  `);

  return {
    totalVersions: parseInt(result.rows[0].total_versions),
    entitiesWithVersions: parseInt(result.rows[0].entities_with_versions),
    averageVersionsPerEntity: parseFloat(result.rows[0].avg_versions) || 0
  };
}

/**
 * Auto-version entity on change (hook)
 */
export async function autoVersion(
  entityType: string,
  entityId: string,
  changedBy: string
): Promise<Version | null> {
  const tableName = getTableNameForEntity(entityType);
  if (!tableName) return null;

  // Get current entity data
  const result = await query(`SELECT * FROM ${tableName} WHERE id = $1`, [entityId]);
  if (result.rows.length === 0) return null;

  // Create version
  return createVersion(entityType, entityId, result.rows[0], changedBy);
}

/**
 * Get table name for entity type
 */
function getTableNameForEntity(entityType: string): string | null {
  const mapping: Record<string, string> = {
    'place': 'places',
    'blog': 'blog_posts',
    'event': 'events',
    'user': 'users',
    'review': 'reviews',
    'comment': 'comments'
  };
  return mapping[entityType] || null;
}

/**
 * Search version history
 */
export async function searchVersions(
  options: {
    entityType?: string;
    entityId?: string;
    changedBy?: string;
    fromDate?: Date;
    toDate?: Date;
    searchTerm?: string;
    limit?: number;
  } = {}
): Promise<Version[]> {
  let sql = `SELECT * FROM content_versions WHERE 1=1`;
  const params: any[] = [];
  let paramIndex = 1;

  if (options.entityType) {
    sql += ` AND entity_type = $${paramIndex++}`;
    params.push(options.entityType);
  }

  if (options.entityId) {
    sql += ` AND entity_id = $${paramIndex++}`;
    params.push(options.entityId);
  }

  if (options.changedBy) {
    sql += ` AND changed_by = $${paramIndex++}`;
    params.push(options.changedBy);
  }

  if (options.fromDate) {
    sql += ` AND changed_at >= $${paramIndex++}`;
    params.push(options.fromDate);
  }

  if (options.toDate) {
    sql += ` AND changed_at <= $${paramIndex++}`;
    params.push(options.toDate);
  }

  if (options.searchTerm) {
    sql += ` AND (change_summary ILIKE $${paramIndex} OR data::text ILIKE $${paramIndex})`;
    params.push(`%${options.searchTerm}%`);
    paramIndex++;
  }

  sql += ` ORDER BY changed_at DESC LIMIT $${paramIndex}`;
  params.push(options.limit || 50);

  const result = await query(sql, params);
  return result.rows;
}
