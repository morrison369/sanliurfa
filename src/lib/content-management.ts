/**
 * Content Management Library
 * Content creation, management, and publishing
 */
import { queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';
import { getCache, setCache, deleteCache } from './cache';

export async function createContent(userId: string, data: any): Promise<any | null> {
  try {
    const slug = data.title.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
    const contentKey = `${slug}-${Date.now()}`;

    const result = await insert('content_items', {
      content_key: contentKey,
      title: data.title,
      slug,
      description: data.description,
      content: data.content,
      content_type: data.content_type || 'article',
      category: data.category,
      author_id: userId,
      status: 'draft',
      visibility: data.visibility || 'private',
      seo_title: data.seo_title,
      seo_description: data.seo_description,
      seo_keywords: data.seo_keywords || []
    });

    // Log audit trail
    await insert('content_audit_trail', {
      content_id: result.id,
      action_type: 'created',
      performed_by_user_id: userId,
      changes: { created: true }
    });

    await deleteCache('sanliurfa:content:*');
    logger.info('Content created', { contentId: result.id, userId });
    return result;
  } catch (error) {
    logger.error('Failed to create content', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function getContentById(contentId: string): Promise<any | null> {
  try {
    const cacheKey = `sanliurfa:content:${contentId}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const content = await queryOne(
      'SELECT * FROM content_items WHERE id = $1 AND deleted_at IS NULL',
      [contentId]
    );

    if (content) {
      await setCache(cacheKey, JSON.stringify(content), 1800);
    }

    return content || null;
  } catch (error) {
    logger.error('Failed to get content', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

export async function updateContent(contentId: string, userId: string, updates: any): Promise<boolean> {
  try {
    const current = await queryOne(
      'SELECT * FROM content_items WHERE id = $1',
      [contentId]
    );

    if (!current || current.author_id !== userId) {
      return false;
    }

    // Create version before update
    await insert('content_versions', {
      content_id: contentId,
      version_number: (current.version_number || 0) + 1,
      title: current.title,
      content: current.content,
      changed_by_user_id: userId,
      change_summary: updates.change_summary
    });

    // Update content
    await update('content_items', { id: contentId }, updates);

    // Log audit trail
    await insert('content_audit_trail', {
      content_id: contentId,
      action_type: 'updated',
      performed_by_user_id: userId,
      changes: updates
    });

    await deleteCache(`sanliurfa:content:${contentId}`);
    return true;
  } catch (error) {
    logger.error('Failed to update content', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function publishContent(contentId: string, userId: string): Promise<boolean> {
  try {
    const content = await queryOne(
      'SELECT author_id FROM content_items WHERE id = $1',
      [contentId]
    );

    if (!content || content.author_id !== userId) {
      return false;
    }

    await update('content_items', { id: contentId }, {
      status: 'published',
      visibility: 'public',
      published_at: new Date()
    });

    await insert('content_audit_trail', {
      content_id: contentId,
      action_type: 'published',
      performed_by_user_id: userId,
      changes: { published: true }
    });

    await deleteCache(`sanliurfa:content:${contentId}`);
    await deleteCache('sanliurfa:content:*');
    logger.info('Content published', { contentId, userId });
    return true;
  } catch (error) {
    logger.error('Failed to publish content', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

export async function getUserContent(userId: string, limit: number = 20): Promise<any[]> {
  try {
    const content = await queryRows(`
      SELECT
        id,
        title,
        slug,
        status,
        visibility,
        view_count,
        like_count,
        published_at,
        created_at
      FROM content_items
      WHERE author_id = $1
      AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);

    return content;
  } catch (error) {
    logger.error('Failed to get user content', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getPublishedContent(category?: string, limit: number = 20): Promise<any[]> {
  try {
    const cacheKey = `sanliurfa:content:published:${category || 'all'}:${limit}`;
    let cached = await getCache(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    let query = `
      SELECT
        id,
        title,
        slug,
        description,
        category,
        view_count,
        like_count,
        published_at,
        created_at
      FROM content_items
      WHERE status = 'published'
      AND visibility = 'public'
      AND deleted_at IS NULL
    `;

    const params: any[] = [];
    if (category) {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }

    query += ` ORDER BY published_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const content = await queryRows(query, params);
    await setCache(cacheKey, JSON.stringify(content), 3600);
    return content;
  } catch (error) {
    logger.error('Failed to get published content', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function recordContentView(contentId: string, userId?: string): Promise<void> {
  try {
    await update('content_items', { id: contentId }, {
      view_count: queryOne('SELECT view_count FROM content_items WHERE id = $1', [contentId])
        .then((c: any) => (c?.view_count || 0) + 1)
    });

    // Record analytics
    const today = new Date().toISOString().split('T')[0];
    const existing = await queryOne(
      'SELECT id FROM content_analytics WHERE content_id = $1 AND view_date = $2',
      [contentId, today]
    );

    if (existing) {
      await update(
        'content_analytics',
        { content_id: contentId, view_date: today },
        { view_count: queryOne('SELECT view_count FROM content_analytics WHERE content_id = $1 AND view_date = $2', [contentId, today])
          .then((c: any) => (c?.view_count || 0) + 1)
        }
      );
    } else {
      await insert('content_analytics', {
        content_id: contentId,
        view_date: today,
        view_count: 1
      });
    }

    await deleteCache(`sanliurfa:content:${contentId}`);
  } catch (error) {
    logger.error('Failed to record view', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function getContentVersions(contentId: string): Promise<any[]> {
  try {
    return await queryRows(`
      SELECT
        version_number,
        title,
        change_summary,
        changed_by_user_id,
        is_published,
        created_at
      FROM content_versions
      WHERE content_id = $1
      ORDER BY version_number DESC
    `, [contentId]);
  } catch (error) {
    logger.error('Failed to get versions', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function getContentAuditTrail(contentId: string, limit: number = 50): Promise<any[]> {
  try {
    return await queryRows(`
      SELECT
        id,
        action_type,
        performed_by_user_id,
        changes,
        created_at
      FROM content_audit_trail
      WHERE content_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [contentId, limit]);
  } catch (error) {
    logger.error('Failed to get audit trail', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

export async function addContentTags(contentId: string, tags: string[]): Promise<void> {
  try {
    for (const tag of tags) {
      await insert('content_tags', {
        content_id: contentId,
        tag_name: tag
      });
    }
    await deleteCache(`sanliurfa:content:${contentId}`);
  } catch (error) {
    logger.error('Failed to add tags', error instanceof Error ? error : new Error(String(error)));
  }
}

export async function likeContent(contentId: string, userId: string): Promise<boolean> {
  try {
    const existing = await queryOne(
      'SELECT id FROM content_items WHERE id = $1 AND like_count > 0',
      [contentId]
    );

    if (existing) {
      await update('content_items', { id: contentId }, {
        like_count: queryOne('SELECT like_count FROM content_items WHERE id = $1', [contentId])
          .then((c: any) => (c?.like_count || 0) + 1)
      });
    }

    await deleteCache(`sanliurfa:content:${contentId}`);
    return true;
  } catch (error) {
    logger.error('Failed to like content', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}
