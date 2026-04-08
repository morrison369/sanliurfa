/**
 * Place Collections System
 * User-curated lists of places
 */

import { query, queryOne, queryMany } from './postgres';
import { deleteCache, deleteCachePattern } from './cache';
import { logger } from './logging';

export interface PlaceCollection {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon?: string;
  is_public: boolean;
  place_count: number;
  follower_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CollectionItem {
  id: string;
  place_id: string;
  place_name: string;
  place_image?: string;
  place_category?: string;
  place_rating?: number;
  note?: string;
  position: number;
  added_at: string;
}

/**
 * Create a new collection
 */
export async function createCollection(
  userId: string,
  name: string,
  description?: string,
  icon?: string,
  isPublic: boolean = false
): Promise<PlaceCollection> {
  try {
    const result = await queryOne(
      `INSERT INTO place_collections (user_id, name, description, icon, is_public)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, name, description || null, icon || null, isPublic]
    );

    // Clear cache
    await deleteCache(`sanliurfa:collections:${userId}`);

    logger.info('Collection created', { userId, collectionId: result.id, name });

    return result;
  } catch (error) {
    logger.error('Failed to create collection', error instanceof Error ? error : new Error(String(error)), {
      userId,
      name
    });
    throw error;
  }
}

/**
 * Update collection details
 */
export async function updateCollection(
  collectionId: string,
  userId: string,
  updates: Partial<PlaceCollection>
): Promise<boolean> {
  try {
    // Verify ownership
    const collection = await queryOne('SELECT user_id FROM place_collections WHERE id = $1', [collectionId]);

    if (!collection || collection.user_id !== userId) {
      throw new Error('Access denied');
    }

    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(updates.description);
    }
    if (updates.icon !== undefined) {
      fields.push(`icon = $${paramCount++}`);
      values.push(updates.icon);
    }
    if (updates.is_public !== undefined) {
      fields.push(`is_public = $${paramCount++}`);
      values.push(updates.is_public);
    }

    if (fields.length === 0) {
      return true;
    }

    fields.push(`updated_at = NOW()`);
    values.push(collectionId);

    const sql = `UPDATE place_collections SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING id`;

    const result = await queryOne(sql, values);

    // Clear caches
    await deleteCache(`sanliurfa:collection:${collectionId}`);
    await deleteCache(`sanliurfa:collections:${userId}`);

    logger.info('Collection updated', { userId, collectionId });
    return !!result;
  } catch (error) {
    logger.error('Failed to update collection', error instanceof Error ? error : new Error(String(error)), {
      collectionId,
      userId
    });
    throw error;
  }
}

/**
 * Delete a collection
 */
export async function deleteCollection(collectionId: string, userId: string): Promise<boolean> {
  try {
    // Verify ownership
    const collection = await queryOne('SELECT user_id FROM place_collections WHERE id = $1', [collectionId]);

    if (!collection || collection.user_id !== userId) {
      throw new Error('Access denied');
    }

    const result = await query('DELETE FROM place_collections WHERE id = $1 AND user_id = $2', [
      collectionId,
      userId
    ]);

    // Clear caches
    await deleteCache(`sanliurfa:collection:${collectionId}`);
    await deleteCache(`sanliurfa:collections:${userId}`);

    logger.info('Collection deleted', { userId, collectionId });
    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Failed to delete collection', error instanceof Error ? error : new Error(String(error)), {
      collectionId,
      userId
    });
    throw error;
  }
}

/**
 * Get user's collections
 */
export async function getUserCollections(userId: string, limit: number = 50): Promise<PlaceCollection[]> {
  try {
    const results = await queryMany(
      `SELECT c.*, COUNT(f.id) as follower_count
       FROM place_collections c
       LEFT JOIN collection_followers f ON c.id = f.collection_id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return results.rows;
  } catch (error) {
    logger.error('Failed to get user collections', error instanceof Error ? error : new Error(String(error)), {
      userId
    });
    throw error;
  }
}

/**
 * Get collection details with items
 */
export async function getCollectionWithItems(
  collectionId: string,
  currentUserId?: string
): Promise<{ collection: PlaceCollection; items: CollectionItem[] } | null> {
  try {
    const collection = await queryOne(
      `SELECT c.*, COUNT(f.id) as follower_count
       FROM place_collections c
       LEFT JOIN collection_followers f ON c.id = f.collection_id
       WHERE c.id = $1
       GROUP BY c.id`,
      [collectionId]
    );

    if (!collection) {
      return null;
    }

    // Check access (public or owner)
    if (!collection.is_public && (!currentUserId || collection.user_id !== currentUserId)) {
      return null;
    }

    // Get items
    const items = await queryMany(
      `SELECT ci.*, p.name as place_name, p.image as place_image, p.category as place_category, p.average_rating as place_rating
       FROM collection_items ci
       JOIN places p ON ci.place_id = p.id
       WHERE ci.collection_id = $1
       ORDER BY ci.position ASC`,
      [collectionId]
    );

    return {
      collection,
      items: items.rows
    };
  } catch (error) {
    logger.error('Failed to get collection with items', error instanceof Error ? error : new Error(String(error)), {
      collectionId
    });
    throw error;
  }
}

/**
 * Add place to collection
 */
export async function addPlaceToCollection(
  collectionId: string,
  placeId: string,
  userId: string,
  note?: string
): Promise<string> {
  try {
    // Verify ownership
    const collection = await queryOne('SELECT id FROM place_collections WHERE id = $1 AND user_id = $2', [
      collectionId,
      userId
    ]);

    if (!collection) {
      throw new Error('Access denied');
    }

    // Get next position
    const maxPos = await queryOne(
      'SELECT MAX(position) as max_pos FROM collection_items WHERE collection_id = $1',
      [collectionId]
    );
    const position = (maxPos?.max_pos || 0) + 1;

    // Add item
    const result = await queryOne(
      `INSERT INTO collection_items (collection_id, place_id, note, position)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (collection_id, place_id) DO UPDATE SET note = $3
       RETURNING id`,
      [collectionId, placeId, note || null, position]
    );

    // Update place count
    const count = await queryOne('SELECT COUNT(*) as count FROM collection_items WHERE collection_id = $1', [
      collectionId
    ]);

    await query('UPDATE place_collections SET place_count = $1, updated_at = NOW() WHERE id = $2', [
      count?.count || 0,
      collectionId
    ]);

    // Clear cache
    await deleteCache(`sanliurfa:collection:${collectionId}`);

    logger.info('Place added to collection', { userId, collectionId, placeId });
    return result.id;
  } catch (error) {
    logger.error('Failed to add place to collection', error instanceof Error ? error : new Error(String(error)), {
      collectionId,
      placeId
    });
    throw error;
  }
}

/**
 * Remove place from collection
 */
export async function removePlaceFromCollection(
  collectionId: string,
  placeId: string,
  userId: string
): Promise<boolean> {
  try {
    // Verify ownership
    const collection = await queryOne('SELECT id FROM place_collections WHERE id = $1 AND user_id = $2', [
      collectionId,
      userId
    ]);

    if (!collection) {
      throw new Error('Access denied');
    }

    // Remove item
    const result = await query('DELETE FROM collection_items WHERE collection_id = $1 AND place_id = $2', [
      collectionId,
      placeId
    ]);

    if ((result.rowCount || 0) > 0) {
      // Update place count
      const count = await queryOne('SELECT COUNT(*) as count FROM collection_items WHERE collection_id = $1', [
        collectionId
      ]);

      await query('UPDATE place_collections SET place_count = $1, updated_at = NOW() WHERE id = $2', [
        count?.count || 0,
        collectionId
      ]);

      // Clear cache
      await deleteCache(`sanliurfa:collection:${collectionId}`);
    }

    logger.info('Place removed from collection', { userId, collectionId, placeId });
    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error(
      'Failed to remove place from collection',
      error instanceof Error ? error : new Error(String(error)),
      { collectionId, placeId }
    );
    throw error;
  }
}

/**
 * Follow a collection
 */
export async function followCollection(collectionId: string, userId: string): Promise<boolean> {
  try {
    const result = await queryOne(
      `INSERT INTO collection_followers (collection_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [collectionId, userId]
    );

    if (result) {
      logger.info('Collection followed', { userId, collectionId });
    }

    return !!result;
  } catch (error) {
    logger.error('Failed to follow collection', error instanceof Error ? error : new Error(String(error)), {
      collectionId,
      userId
    });
    throw error;
  }
}

/**
 * Unfollow a collection
 */
export async function unfollowCollection(collectionId: string, userId: string): Promise<boolean> {
  try {
    const result = await query('DELETE FROM collection_followers WHERE collection_id = $1 AND user_id = $2', [
      collectionId,
      userId
    ]);

    if ((result.rowCount || 0) > 0) {
      logger.info('Collection unfollowed', { userId, collectionId });
    }

    return (result.rowCount || 0) > 0;
  } catch (error) {
    logger.error('Failed to unfollow collection', error instanceof Error ? error : new Error(String(error)), {
      collectionId,
      userId
    });
    throw error;
  }
}

/**
 * Get public collections
 */
export async function getPublicCollections(limit: number = 20, offset: number = 0): Promise<PlaceCollection[]> {
  try {
    const results = await queryMany(
      `SELECT c.*, COUNT(f.id) as follower_count
       FROM place_collections c
       LEFT JOIN collection_followers f ON c.id = f.collection_id
       WHERE c.is_public = true
       GROUP BY c.id
       ORDER BY c.updated_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return results.rows;
  } catch (error) {
    logger.error(
      'Failed to get public collections',
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
}
