/**
 * Ownership-Based Access Control
 * Users can operate on resources they own without explicit permissions
 */

import { pool } from './postgres';
import { logger } from './logging';

export async function isResourceOwner(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  try {
    let query = '';
    let params: any[] = [];

    switch (resourceType) {
      case 'review':
        query = `SELECT user_id FROM reviews WHERE id = $1`;
        params = [resourceId];
        break;
      case 'favorite':
        query = `SELECT user_id FROM favorites WHERE id = $1`;
        params = [resourceId];
        break;
      case 'comment':
        query = `SELECT user_id FROM comments WHERE id = $1`;
        params = [resourceId];
        break;
      default:
        return false;
    }

    if (!query) return false;

    const result = await pool.query(query, params);
    return result.rows[0]?.user_id === userId;
  } catch (error) {
    logger.warn('Ownership check failed', { userId, resourceType, resourceId });
    return false;
  }
}

export async function canUserAccessResource(
  userId: string,
  resourceType: string,
  resourceId: string,
  requiredPermission?: string
): Promise<boolean> {
  // Check ownership first
  const isOwner = await isResourceOwner(userId, resourceType, resourceId);
  if (isOwner) return true;

  // If not owner, check explicit permissions if provided
  if (requiredPermission) {
    const { hasPermission } = await import('./rbac');
    return await hasPermission(userId, requiredPermission);
  }

  return false;
}
