import { Pool } from 'pg';
import { getCache, setCache, deleteCache } from './cache';

export interface WebhookFilter {
  id: string;
  webhookId: string;
  filterType: 'event' | 'field' | 'condition';
  filterKey: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'exists';
  filterValue: string | number | string[];
  createdAt: string;
}

export interface WebhookSettings {
  webhookId: string;
  timeoutSeconds: number;
  maxRetries: number;
  retryDelayMs: number;
  rateLimit: number;
  rateLimitWindow: number;
  enabled: boolean;
}

/**
 * Create webhook filter
 */
export async function createWebhookFilter(
  pool: Pool,
  webhookId: string,
  userId: string,
  filterType: string,
  filterKey: string,
  operator: string,
  filterValue: any
): Promise<WebhookFilter> {
  try {
    const result = await pool.query(
      `INSERT INTO webhook_filters
        (webhook_id, filter_type, filter_key, operator, filter_value)
       SELECT $1, $2, $3, $4, $5
       FROM webhooks
       WHERE id = $1 AND user_id = $6
       RETURNING id, webhook_id, filter_type, filter_key, operator, filter_value, created_at`,
      [webhookId, filterType, filterKey, operator, JSON.stringify(filterValue), userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Webhook not found');
    }

    // Invalidate webhook cache
    await deleteCache(`sanliurfa:webhook:${webhookId}`);

    return result.rows[0];
  } catch (error) {
    console.error('Error creating webhook filter:', error);
    throw error;
  }
}

/**
 * Get webhook filters
 */
export async function getWebhookFilters(
  pool: Pool,
  webhookId: string,
  userId: string
): Promise<WebhookFilter[]> {
  try {
    const result = await pool.query(
      `SELECT wf.id, wf.webhook_id, wf.filter_type, wf.filter_key,
              wf.operator, wf.filter_value, wf.created_at
       FROM webhook_filters wf
       JOIN webhooks w ON wf.webhook_id = w.id
       WHERE wf.webhook_id = $1 AND w.user_id = $2
       ORDER BY wf.created_at DESC`,
      [webhookId, userId]
    );

    return result.rows.map(row => ({
      ...row,
      filterValue: JSON.parse(row.filter_value)
    }));
  } catch (error) {
    console.error('Error getting webhook filters:', error);
    throw error;
  }
}

/**
 * Delete webhook filter
 */
export async function deleteWebhookFilter(
  pool: Pool,
  filterId: string,
  userId: string
): Promise<boolean> {
  try {
    const filterRes = await pool.query(
      `SELECT webhook_id FROM webhook_filters
       WHERE id = $1 AND webhook_id IN
       (SELECT id FROM webhooks WHERE user_id = $2)`,
      [filterId, userId]
    );

    if (filterRes.rows.length === 0) {
      return false;
    }

    const webhookId = filterRes.rows[0].webhook_id;

    await pool.query('DELETE FROM webhook_filters WHERE id = $1', [filterId]);

    // Invalidate webhook cache
    await deleteCache(`sanliurfa:webhook:${webhookId}`);

    return true;
  } catch (error) {
    console.error('Error deleting webhook filter:', error);
    throw error;
  }
}

/**
 * Update webhook settings
 */
export async function updateWebhookSettings(
  pool: Pool,
  webhookId: string,
  userId: string,
  settings: Partial<WebhookSettings>
): Promise<WebhookSettings> {
  try {
    const validSettings = {
      timeoutSeconds: settings.timeoutSeconds || 30,
      maxRetries: settings.maxRetries !== undefined ? settings.maxRetries : 3,
      retryDelayMs: settings.retryDelayMs || 60000,
      rateLimit: settings.rateLimit || 0,
      rateLimitWindow: settings.rateLimitWindow || 3600,
      enabled: settings.enabled !== undefined ? settings.enabled : true
    };

    const result = await pool.query(
      `UPDATE webhook_settings
       SET timeout_seconds = $1, max_retries = $2, retry_delay_ms = $3,
           rate_limit = $4, rate_limit_window = $5, enabled = $6,
           updated_at = NOW()
       WHERE webhook_id = $7 AND webhook_id IN
       (SELECT id FROM webhooks WHERE user_id = $8)
       RETURNING webhook_id, timeout_seconds, max_retries, retry_delay_ms,
                 rate_limit, rate_limit_window, enabled`,
      [
        validSettings.timeoutSeconds,
        validSettings.maxRetries,
        validSettings.retryDelayMs,
        validSettings.rateLimit,
        validSettings.rateLimitWindow,
        validSettings.enabled,
        webhookId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Webhook not found');
    }

    // Invalidate cache
    await deleteCache(`sanliurfa:webhook:settings:${webhookId}`);

    return {
      webhookId: result.rows[0].webhook_id,
      timeoutSeconds: result.rows[0].timeout_seconds,
      maxRetries: result.rows[0].max_retries,
      retryDelayMs: result.rows[0].retry_delay_ms,
      rateLimit: result.rows[0].rate_limit,
      rateLimitWindow: result.rows[0].rate_limit_window,
      enabled: result.rows[0].enabled
    };
  } catch (error) {
    console.error('Error updating webhook settings:', error);
    throw error;
  }
}

/**
 * Get webhook settings
 */
export async function getWebhookSettings(
  pool: Pool,
  webhookId: string,
  userId: string
): Promise<WebhookSettings> {
  try {
    // Check cache first
    const cacheKey = `sanliurfa:webhook:settings:${webhookId}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const result = await pool.query(
      `SELECT webhook_id, timeout_seconds, max_retries, retry_delay_ms,
              rate_limit, rate_limit_window, enabled
       FROM webhook_settings
       WHERE webhook_id = $1 AND webhook_id IN
       (SELECT id FROM webhooks WHERE user_id = $2)`,
      [webhookId, userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Webhook not found');
    }

    const settings: WebhookSettings = {
      webhookId: result.rows[0].webhook_id,
      timeoutSeconds: result.rows[0].timeout_seconds,
      maxRetries: result.rows[0].max_retries,
      retryDelayMs: result.rows[0].retry_delay_ms,
      rateLimit: result.rows[0].rate_limit,
      rateLimitWindow: result.rows[0].rate_limit_window,
      enabled: result.rows[0].enabled
    };

    // Cache for 10 minutes
    await setCache(cacheKey, JSON.stringify(settings), 600);

    return settings;
  } catch (error) {
    console.error('Error getting webhook settings:', error);
    throw error;
  }
}

/**
 * Check if event should be delivered based on filters
 */
export function shouldDeliverEvent(
  event: any,
  filters: WebhookFilter[]
): boolean {
  if (filters.length === 0) {
    return true; // No filters = deliver all
  }

  return filters.every(filter => {
    const value = event.data?.[filter.filterKey];

    switch (filter.operator) {
      case 'equals':
        return value === filter.filterValue;
      case 'contains':
        return String(value).includes(String(filter.filterValue));
      case 'greater_than':
        return Number(value) > Number(filter.filterValue);
      case 'less_than':
        return Number(value) < Number(filter.filterValue);
      case 'in':
        return Array.isArray(filter.filterValue) &&
               filter.filterValue.includes(value);
      case 'exists':
        return value !== undefined && value !== null;
      default:
        return true;
    }
  });
}
