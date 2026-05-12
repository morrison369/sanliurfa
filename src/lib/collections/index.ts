/**
 * Bookmark/Collections System
 * Save places to personal collections
 */

import { query } from '../postgres';

export interface Collection {
  id: string;
  userId: string;
  name: string;
  description?: string;
  isPublic: boolean;
  coverImage?: string;
  placeCount: number;
  followers?: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  places?: CollectionPlace[];
}

export interface CollectionPlace {
  collectionId: string;
  placeId: string;
  placeName: string;
  placeImage?: string;
  note?: string;
  addedAt: Date;
}

export async function createCollection(
  userId: string,
  name: string,
  description?: string,
  isPublic = true,
  tags?: string[]
): Promise<Collection> {
  if (!name || name.trim().length < 2) {
    throw new Error('Collection name must be at least 2 characters');
  }

  const result = await query(
    `INSERT INTO collections (user_id, name, description, is_public, tags, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *`,
    [userId, name.trim(), description, isPublic, tags || []]
  );

  return mapCollectionRow(result.rows[0]);
}

export async function getCollectionById(id: string, userId?: string): Promise<Collection | null> {
  const result = await query(
    `SELECT c.*, 
      (SELECT COUNT(*) FROM collection_places WHERE collection_id = c.id) as place_count,
      (SELECT COUNT(*) FROM collection_followers WHERE collection_id = c.id) as followers
     FROM collections c
     WHERE c.id = $1 AND (c.is_public = true OR c.user_id = $2)`,
    [id, userId]
  );

  if (result.rows.length === 0) return null;
  return mapCollectionRow(result.rows[0]);
}

export async function getCollectionWithItems(
  id: string,
  userId?: string
): Promise<(Collection & { places: CollectionPlace[] }) | null> {
  const collection = await getCollectionById(id, userId);
  if (!collection) return null;

  const placesResult = await query(
    `SELECT * FROM collection_places WHERE collection_id = $1 ORDER BY added_at DESC`,
    [id]
  );

  const places = placesResult.rows.map(row => ({
    collectionId: row.collection_id,
    placeId: row.place_id,
    placeName: row.place_name,
    placeImage: row.place_image,
    note: row.note,
    addedAt: new Date(row.added_at),
  }));

  return { ...collection, places };
}

export async function getUserCollections(
  userId: string,
  options: { includePrivate?: boolean; limit?: number; offset?: number } = {}
): Promise<{ collections: Collection[]; total: number }> {
  const { includePrivate = true, limit = 20, offset = 0 } = options;

  const [countResult, result] = await Promise.all([
    query(
      `SELECT COUNT(*) FROM collections WHERE user_id = $1 ${!includePrivate ? 'AND is_public = true' : ''}`,
      [userId]
    ),
    query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM collection_places WHERE collection_id = c.id) as place_count,
        (SELECT COUNT(*) FROM collection_followers WHERE collection_id = c.id) as followers
       FROM collections c
       WHERE c.user_id = $1 ${!includePrivate ? 'AND c.is_public = true' : ''}
       ORDER BY c.updated_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
  ]);

  return {
    collections: result.rows.map(mapCollectionRow),
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function updateCollection(
  id: string,
  userId: string,
  updates: Partial<Pick<Collection, 'name' | 'description' | 'isPublic' | 'tags' | 'coverImage'>>
): Promise<Collection> {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.name !== undefined) {
    sets.push(`name = $${idx++}`);
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    sets.push(`description = $${idx++}`);
    values.push(updates.description);
  }
  if (updates.isPublic !== undefined) {
    sets.push(`is_public = $${idx++}`);
    values.push(updates.isPublic);
  }
  if (updates.tags !== undefined) {
    sets.push(`tags = $${idx++}`);
    values.push(updates.tags);
  }
  if (updates.coverImage !== undefined) {
    sets.push(`cover_image = $${idx++}`);
    values.push(updates.coverImage);
  }
  sets.push(`updated_at = NOW()`);
  values.push(id, userId);

  const result = await query(
    `UPDATE collections SET ${sets.join(', ')} WHERE id = $${idx} AND user_id = $${idx + 1} RETURNING *`,
    values
  );

  if (result.rows.length === 0) {
    throw new Error('Collection not found or no permission');
  }

  return getCollectionById(id, userId) as Promise<Collection>;
}

export async function deleteCollection(id: string, userId: string): Promise<void> {
  const result = await query(
    `DELETE FROM collections WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Collection not found or no permission');
  }
}

export async function addPlaceToCollection(
  collectionId: string,
  placeId: string,
  userId: string,
  note?: string
): Promise<void> {
  // Verify ownership
  const collectionResult = await query(
    'SELECT user_id FROM collections WHERE id = $1',
    [collectionId]
  );

  if (collectionResult.rows.length === 0) {
    throw new Error('Collection not found');
  }

  if (collectionResult.rows[0].user_id !== userId) {
    throw new Error('No permission to modify this collection');
  }

  // Get place info
  const placeResult = await query(
    'SELECT name, COALESCE(thumbnail_url, images[1]) as image FROM places WHERE id = $1',
    [placeId]
  );

  if (placeResult.rows.length === 0) {
    throw new Error('Place not found');
  }

  const place = placeResult.rows[0];

  await query(
    `INSERT INTO collection_places (collection_id, place_id, place_name, place_image, note, added_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (collection_id, place_id) DO UPDATE SET note = $5`,
    [collectionId, placeId, place.name, place.image, note]
  );
}

export async function removePlaceFromCollection(
  collectionId: string,
  placeId: string,
  userId: string
): Promise<void> {
  const result = await query(
    `DELETE FROM collection_places 
     WHERE collection_id = $1 AND place_id = $2 
     AND EXISTS(SELECT 1 FROM collections WHERE id = $1 AND user_id = $3)
     RETURNING *`,
    [collectionId, placeId, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('Place not found in collection or no permission');
  }
}

export async function getCollectionPlaces(
  collectionId: string,
  userId?: string,
  limit = 50,
  offset = 0
): Promise<{ places: CollectionPlace[]; total: number }> {
  // Verify access
  const collection = await getCollectionById(collectionId, userId);
  if (!collection) {
    throw new Error('Collection not found or private');
  }

  const [countResult, result] = await Promise.all([
    query(
      'SELECT COUNT(*) FROM collection_places WHERE collection_id = $1',
      [collectionId]
    ),
    query(
      `SELECT * FROM collection_places
       WHERE collection_id = $1
       ORDER BY added_at DESC
       LIMIT $2 OFFSET $3`,
      [collectionId, limit, offset]
    ),
  ]);

  return {
    places: result.rows.map(row => ({
      collectionId: row.collection_id,
      placeId: row.place_id,
      placeName: row.place_name,
      placeImage: row.place_image,
      note: row.note,
      addedAt: new Date(row.added_at),
    })),
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function followCollection(collectionId: string, userId: string): Promise<void> {
  await query(
    `INSERT INTO collection_followers (collection_id, user_id, followed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT DO NOTHING`,
    [collectionId, userId]
  );
}

export async function unfollowCollection(collectionId: string, userId: string): Promise<void> {
  await query(
    `DELETE FROM collection_followers WHERE collection_id = $1 AND user_id = $2`,
    [collectionId, userId]
  );
}

export async function isFollowingCollection(collectionId: string, userId: string): Promise<boolean> {
  const result = await query(
    `SELECT 1 FROM collection_followers WHERE collection_id = $1 AND user_id = $2`,
    [collectionId, userId]
  );
  return result.rows.length > 0;
}

export async function getPublicCollections(limit = 20, offset = 0): Promise<{ collections: Collection[]; total: number }> {
  const [countResult, result] = await Promise.all([
    query(`SELECT COUNT(*) FROM collections WHERE is_public = true`, []),
    query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM collection_places WHERE collection_id = c.id) as place_count,
        (SELECT COUNT(*) FROM collection_followers WHERE collection_id = c.id) as followers
       FROM collections c
       WHERE c.is_public = true
       ORDER BY c.updated_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    ),
  ]);

  return {
    collections: result.rows.map(mapCollectionRow),
    total: parseInt(countResult.rows[0].count, 10),
  };
}

export async function getFeaturedCollections(limit = 10): Promise<Collection[]> {
  const result = await query(
    `SELECT c.*, 
      (SELECT COUNT(*) FROM collection_places WHERE collection_id = c.id) as place_count,
      (SELECT COUNT(*) FROM collection_followers WHERE collection_id = c.id) as followers
     FROM collections c
     WHERE c.is_public = true
     ORDER BY followers DESC, place_count DESC
     LIMIT $1`,
    [limit]
  );

  return result.rows.map(mapCollectionRow);
}

export async function searchCollections(searchTerm: string, limit = 20): Promise<Collection[]> {
  const result = await query(
    `SELECT c.*,
      (SELECT COUNT(*) FROM collection_places WHERE collection_id = c.id) as place_count,
      (SELECT COUNT(*) FROM collection_followers WHERE collection_id = c.id) as followers
     FROM collections c
     WHERE c.is_public = true
     AND (c.name ILIKE $1 OR c.description ILIKE $1 OR $2 = ANY(c.tags))
     ORDER BY followers DESC
     LIMIT $3`,
    [`%${searchTerm}%`, searchTerm, limit]
  );

  return result.rows.map(mapCollectionRow);
}

function mapCollectionRow(row: any): Collection {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    isPublic: row.is_public,
    coverImage: row.cover_image,
    placeCount: parseInt(row.place_count || '0', 10),
    followers: parseInt(row.followers || '0', 10),
    tags: row.tags || [],
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

