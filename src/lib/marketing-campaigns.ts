/**
 * Marketing Campaigns Management
 * Campaign creation, targeting, and performance tracking
 */

import { query, queryOne, queryMany, insert, update } from './postgres';
import { getCache, setCache, deleteCache, deleteCachePattern } from './cache';
import { logger } from './logging';

export interface MarketingCampaign {
  id: string;
  place_id: string;
  user_id: string;
  name: string;
  description?: string;
  campaign_type: string;
  status: string;
  start_date?: string;
  end_date?: string;
  budget: number;
  spent: number;
  targeting: Record<string, any>;
  creative_content: Record<string, any>;
  schedule_config: Record<string, any>;
  performance_goals: Record<string, any>;
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface CampaignPerformance {
  date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spent: number;
  revenue: number;
  ctr: number;
  conversion_rate: number;
  roi: number;
}

/**
 * Create a marketing campaign
 */
export async function createMarketingCampaign(
  placeId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    campaign_type: string;
    budget: number;
    targeting?: Record<string, any>;
    creative_content?: Record<string, any>;
    schedule_config?: Record<string, any>;
    performance_goals?: Record<string, any>;
  }
): Promise<MarketingCampaign> {
  try {
    const campaign = await insert('marketing_campaigns', {
      place_id: placeId,
      user_id: userId,
      name: data.name,
      description: data.description,
      campaign_type: data.campaign_type,
      status: 'draft',
      budget: data.budget,
      spent: 0,
      targeting: data.targeting || {},
      creative_content: data.creative_content || {},
      schedule_config: data.schedule_config || {},
      performance_goals: data.performance_goals || {}
    });

    // Clear cache
    await deleteCachePattern(`sanliurfa:campaigns:user:${userId}`);

    logger.info('Marketing campaign created', { id: campaign.id, placeId, userId });
    return campaign;
  } catch (error) {
    logger.error('Failed to create marketing campaign', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get campaign by ID
 */
export async function getMarketingCampaign(id: string): Promise<MarketingCampaign | null> {
  try {
    const cacheKey = `sanliurfa:campaign:${id}`;
    const cached = await getCache<MarketingCampaign>(cacheKey);
    if (cached) return cached;

    const campaign = await queryOne('SELECT * FROM marketing_campaigns WHERE id = $1', [id]);
    if (campaign) {
      await setCache(cacheKey, campaign, 300);
    }
    return campaign;
  } catch (error) {
    logger.error('Failed to get marketing campaign', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get campaigns for a user
 */
export async function getUserCampaigns(userId: string): Promise<MarketingCampaign[]> {
  const cacheKey = `sanliurfa:campaigns:user:${userId}`;

  try {
    const cached = await getCache<MarketingCampaign[]>(cacheKey);
    if (cached) return cached;

    const campaigns = await queryMany(
      `SELECT * FROM marketing_campaigns
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    await setCache(cacheKey, campaigns.rows, 300);
    return campaigns.rows;
  } catch (error) {
    logger.error('Failed to get user campaigns', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Update campaign
 */
export async function updateMarketingCampaign(
  id: string,
  userId: string,
  updates: Partial<MarketingCampaign>
): Promise<MarketingCampaign> {
  try {
    // Verify ownership
    const campaign = await queryOne('SELECT user_id, status FROM marketing_campaigns WHERE id = $1', [id]);
    if (!campaign || campaign.user_id !== userId) {
      throw new Error('Access denied');
    }

    // Can't edit published campaigns
    if (campaign.status === 'published') {
      throw new Error('Cannot edit published campaigns');
    }

    const updated = await update('marketing_campaigns', { id }, { ...updates, updated_at: new Date() });

    // Clear caches
    await deleteCache(`sanliurfa:campaign:${id}`);
    await deleteCachePattern(`sanliurfa:campaigns:user:${userId}`);

    logger.info('Marketing campaign updated', { id, userId });
    return updated;
  } catch (error) {
    logger.error('Failed to update marketing campaign', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Publish a campaign (activate it)
 */
export async function publishCampaign(id: string, userId: string): Promise<MarketingCampaign> {
  try {
    // Verify ownership and status
    const campaign = await queryOne('SELECT user_id, status FROM marketing_campaigns WHERE id = $1', [id]);
    if (!campaign || campaign.user_id !== userId) {
      throw new Error('Access denied');
    }

    if (campaign.status !== 'draft' && campaign.status !== 'paused') {
      throw new Error('Only draft or paused campaigns can be published');
    }

    const updated = await update(
      'marketing_campaigns',
      { id },
      {
        status: 'published',
        published_at: new Date(),
        updated_at: new Date()
      }
    );

    // Clear caches
    await deleteCache(`sanliurfa:campaign:${id}`);
    await deleteCachePattern(`sanliurfa:campaigns:user:${userId}`);

    logger.info('Campaign published', { id, userId });
    return updated;
  } catch (error) {
    logger.error('Failed to publish campaign', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(id: string, userId: string): Promise<MarketingCampaign> {
  try {
    // Verify ownership
    const campaign = await queryOne('SELECT user_id, status FROM marketing_campaigns WHERE id = $1', [id]);
    if (!campaign || campaign.user_id !== userId) {
      throw new Error('Access denied');
    }

    const updated = await update('marketing_campaigns', { id }, { status: 'paused', updated_at: new Date() });

    await deleteCache(`sanliurfa:campaign:${id}`);
    return updated;
  } catch (error) {
    logger.error('Failed to pause campaign', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get campaign targeting rules
 */
export async function getCampaignTargeting(campaignId: string): Promise<any[]> {
  try {
    const targeting = await queryMany(
      `SELECT * FROM campaign_targeting
       WHERE campaign_id = $1
       ORDER BY created_at ASC`,
      [campaignId]
    );
    return targeting.rows;
  } catch (error) {
    logger.error('Failed to get campaign targeting', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Add targeting rule to campaign
 */
export async function addCampaignTargetingRule(
  campaignId: string,
  userId: string,
  rule: {
    target_type: string;
    target_value: string;
    operator?: string;
  }
): Promise<any> {
  try {
    // Verify ownership
    const campaign = await queryOne('SELECT user_id FROM marketing_campaigns WHERE id = $1', [campaignId]);
    if (!campaign || campaign.user_id !== userId) {
      throw new Error('Access denied');
    }

    const targeting = await insert('campaign_targeting', {
      campaign_id: campaignId,
      target_type: rule.target_type,
      target_value: rule.target_value,
      operator: rule.operator || 'equals'
    });

    await deleteCache(`sanliurfa:campaign:${campaignId}`);
    return targeting;
  } catch (error) {
    logger.error('Failed to add targeting rule', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get campaign performance metrics
 */
export async function getCampaignPerformance(
  id: string,
  userId: string,
  days: number = 30
): Promise<{
  summary: {
    total_impressions: number;
    total_clicks: number;
    total_conversions: number;
    total_spent: number;
    total_revenue: number;
    avg_ctr: number;
    conversion_rate: number;
    roi: number;
  };
  daily_metrics: CampaignPerformance[];
}> {
  try {
    // Verify ownership
    const campaign = await queryOne('SELECT user_id FROM marketing_campaigns WHERE id = $1', [id]);
    if (!campaign || campaign.user_id !== userId) {
      throw new Error('Access denied');
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    // Get daily metrics
    const metrics = await queryMany(
      `SELECT * FROM campaign_performance
       WHERE campaign_id = $1 AND date >= $2
       ORDER BY date DESC`,
      [id, fromDate.toISOString().split('T')[0]]
    );

    // Calculate summary
    const summary = {
      total_impressions: 0,
      total_clicks: 0,
      total_conversions: 0,
      total_spent: 0,
      total_revenue: 0,
      avg_ctr: 0,
      conversion_rate: 0,
      roi: 0
    };

    metrics.rows.forEach((m: any) => {
      summary.total_impressions += m.impressions || 0;
      summary.total_clicks += m.clicks || 0;
      summary.total_conversions += m.conversions || 0;
      summary.total_spent += m.spent || 0;
      summary.total_revenue += m.revenue || 0;
    });

    if (summary.total_impressions > 0) {
      summary.avg_ctr = (summary.total_clicks / summary.total_impressions) * 100;
    }
    if (summary.total_clicks > 0) {
      summary.conversion_rate = (summary.total_conversions / summary.total_clicks) * 100;
    }
    if (summary.total_spent > 0) {
      summary.roi = ((summary.total_revenue - summary.total_spent) / summary.total_spent) * 100;
    }

    return {
      summary,
      daily_metrics: metrics.rows
    };
  } catch (error) {
    logger.error('Failed to get campaign performance', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Delete campaign
 */
export async function deleteMarketingCampaign(id: string, userId: string): Promise<boolean> {
  try {
    // Verify ownership
    const campaign = await queryOne('SELECT user_id, status FROM marketing_campaigns WHERE id = $1', [id]);
    if (!campaign || campaign.user_id !== userId) {
      throw new Error('Access denied');
    }

    // Can only delete draft or paused campaigns
    if (campaign.status === 'published') {
      throw new Error('Cannot delete published campaigns');
    }

    const result = await query('DELETE FROM marketing_campaigns WHERE id = $1', [id]);

    // Clear caches
    await deleteCache(`sanliurfa:campaign:${id}`);
    await deleteCachePattern(`sanliurfa:campaigns:user:${userId}`);

    logger.info('Marketing campaign deleted', { id, userId });
    return result.rowCount > 0;
  } catch (error) {
    logger.error('Failed to delete marketing campaign', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
