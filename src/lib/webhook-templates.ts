import type { Pool } from 'pg';
import { getCache, setCache, deleteCache } from './cache';

export interface WebhookTemplate {
  id: string;
  userId: string;
  name: string;
  description?: string;
  event: string;
  url?: string;
  timeoutSeconds: number;
  maxRetries: number;
  retryDelayMs: number;
  rateLimit: number;
  rateLimitWindow: number;
  enabled: boolean;
  createdAt: string;
  usageCount: number;
}

/**
 * Create webhook template
 */
export async function createWebhookTemplate(
  pool: Pool,
  userId: string,
  name: string,
  event: string,
  settings: any,
  description?: string
): Promise<WebhookTemplate> {
  try {
    const result = await pool.query(
      `INSERT INTO webhook_templates
        (user_id, name, description, event, timeout_seconds, max_retries,
         retry_delay_ms, rate_limit, rate_limit_window, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, user_id, name, description, event, timeout_seconds,
                 max_retries, retry_delay_ms, rate_limit, rate_limit_window,
                 enabled, created_at, usage_count`,
      [
        userId,
        name,
        description || '',
        event,
        settings.timeoutSeconds || 30,
        settings.maxRetries || 3,
        settings.retryDelayMs || 60000,
        settings.rateLimit || 0,
        settings.rateLimitWindow || 3600,
        settings.enabled !== false
      ]
    );

    // Invalidate cache
    await deleteCache(`sanliurfa:webhook:templates:${userId}`);

    return result.rows[0];
  } catch (error) {
    console.error('Error creating webhook template:', error);
    throw error;
  }
}

/**
 * Get user templates
 */
export async function getUserTemplates(
  pool: Pool,
  userId: string
): Promise<WebhookTemplate[]> {
  try {
    const cacheKey = `sanliurfa:webhook:templates:${userId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await pool.query(
      `SELECT id, user_id, name, description, event, timeout_seconds,
              max_retries, retry_delay_ms, rate_limit, rate_limit_window,
              enabled, created_at, usage_count
       FROM webhook_templates
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    // Cache for 10 minutes
    await setCache(cacheKey, JSON.stringify(result.rows), 600);

    return result.rows;
  } catch (error) {
    console.error('Error getting webhook templates:', error);
    throw error;
  }
}

/**
 * Apply template to create webhook
 */
export async function applyTemplate(
  pool: Pool,
  userId: string,
  templateId: string,
  webhookUrl: string,
  filters?: any
): Promise<string> {
  try {
    // Get template
    const templateRes = await pool.query(
      `SELECT * FROM webhook_templates
       WHERE id = $1 AND user_id = $2`,
      [templateId, userId]
    );

    if (templateRes.rows.length === 0) {
      throw new Error('Template not found');
    }

    const template = templateRes.rows[0];

    // Create webhook from template
    const webhookRes = await pool.query(
      `INSERT INTO webhooks (user_id, event, url, active)
       VALUES ($1, $2, $3, true)
       RETURNING id`,
      [userId, template.event, webhookUrl]
    );

    const webhookId = webhookRes.rows[0].id;

    // Apply settings
    await pool.query(
      `INSERT INTO webhook_settings
        (webhook_id, timeout_seconds, max_retries, retry_delay_ms,
         rate_limit, rate_limit_window, enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        webhookId,
        template.timeout_seconds,
        template.max_retries,
        template.retry_delay_ms,
        template.rate_limit,
        template.rate_limit_window,
        template.enabled
      ]
    );

    // Apply filters if provided
    if (filters && Array.isArray(filters)) {
      for (const filter of filters) {
        await pool.query(
          `INSERT INTO webhook_filters
            (webhook_id, filter_type, filter_key, operator, filter_value)
           VALUES ($1, $2, $3, $4, $5)`,
          [webhookId, filter.filterType, filter.filterKey, filter.operator, JSON.stringify(filter.filterValue)]
        );
      }
    }

    // Increment usage count
    await pool.query(
      `UPDATE webhook_templates SET usage_count = usage_count + 1 WHERE id = $1`,
      [templateId]
    );

    // Invalidate cache
    await deleteCache(`sanliurfa:webhook:templates:${userId}`);

    return webhookId;
  } catch (error) {
    console.error('Error applying template:', error);
    throw error;
  }
}

/**
 * Delete template
 */
export async function deleteTemplate(
  pool: Pool,
  templateId: string,
  userId: string
): Promise<boolean> {
  try {
    const result = await pool.query(
      `DELETE FROM webhook_templates WHERE id = $1 AND user_id = $2`,
      [templateId, userId]
    );

    // Invalidate cache
    await deleteCache(`sanliurfa:webhook:templates:${userId}`);

    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
}

/**
 * Get popular templates (system-wide)
 */
export async function getPopularTemplates(
  pool: Pool,
  limit = 10
): Promise<WebhookTemplate[]> {
  try {
    const cacheKey = 'sanliurfa:webhook:templates:popular';
    const cached = await getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await pool.query(
      `SELECT id, user_id, name, description, event, timeout_seconds,
              max_retries, retry_delay_ms, rate_limit, rate_limit_window,
              enabled, created_at, usage_count
       FROM webhook_templates
       WHERE user_id IS NOT NULL
       ORDER BY usage_count DESC
       LIMIT $1`,
      [limit]
    );

    // Cache for 1 hour
    await setCache(cacheKey, JSON.stringify(result.rows), 3600);

    return result.rows;
  } catch (error) {
    console.error('Error getting popular templates:', error);
    throw error;
  }
}
