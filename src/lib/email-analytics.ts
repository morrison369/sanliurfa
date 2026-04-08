/**
 * Email Analytics
 * Campaign analytics, engagement metrics, and reporting
 */

import { query, queryOne, queryMany } from './postgres';
import { logger } from './logging';

export interface CampaignMetrics {
  campaignId: string;
  date: Date;
  sends: number;
  opens: number;
  clicks: number;
  conversions: number;
  bounces: number;
  unsubscribes: number;
  complaints: number;
  revenue: number;
}

/**
 * Get campaign performance overview
 */
export async function getCampaignOverview(campaignId: string): Promise<any> {
  try {
    const overview = await queryOne(`
      SELECT
        id, name, status, campaign_type,
        send_count, open_count, click_count, conversion_count,
        bounce_count, unsubscribe_count, complaint_count,
        budget_cents, spent_cents,
        started_at, completed_at, created_at
      FROM email_campaigns
      WHERE id = $1
    `, [campaignId]);

    if (!overview) return null;

    const metrics = await getCampaignPerformanceMetrics(campaignId);

    return {
      id: overview.id,
      name: overview.name,
      status: overview.status,
      campaignType: overview.campaign_type,
      metrics: {
        sends: overview.send_count,
        opens: overview.open_count,
        clicks: overview.click_count,
        conversions: overview.conversion_count,
        bounces: overview.bounce_count,
        unsubscribes: overview.unsubscribe_count,
        complaints: overview.complaint_count,
      },
      budget: {
        budgetCents: overview.budget_cents,
        spentCents: overview.spent_cents,
      },
      dates: {
        createdAt: overview.created_at,
        startedAt: overview.started_at,
        completedAt: overview.completed_at,
      },
      detailed: metrics,
    };
  } catch (error) {
    logger.error('Failed to get campaign overview', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get detailed performance metrics
 */
export async function getCampaignPerformanceMetrics(campaignId: string): Promise<any> {
  try {
    const stats = await queryOne(`
      SELECT
        send_count, open_count, click_count, conversion_count,
        bounce_count, unsubscribe_count, complaint_count
      FROM email_campaigns
      WHERE id = $1
    `, [campaignId]);

    if (!stats) return null;

    const openRate = stats.send_count > 0 ? ((stats.open_count / stats.send_count) * 100).toFixed(2) : '0.00';
    const clickRate = stats.open_count > 0 ? ((stats.click_count / stats.open_count) * 100).toFixed(2) : '0.00';
    const conversionRate = stats.click_count > 0 ? ((stats.conversion_count / stats.click_count) * 100).toFixed(2) : '0.00';
    const bounceRate = stats.send_count > 0 ? ((stats.bounce_count / stats.send_count) * 100).toFixed(2) : '0.00';
    const complaintRate = stats.send_count > 0 ? ((stats.complaint_count / stats.send_count) * 100).toFixed(2) : '0.00';

    return {
      sends: stats.send_count,
      opens: stats.open_count,
      openRate: parseFloat(openRate),
      clicks: stats.click_count,
      clickRate: parseFloat(clickRate),
      conversions: stats.conversion_count,
      conversionRate: parseFloat(conversionRate),
      bounces: stats.bounce_count,
      bounceRate: parseFloat(bounceRate),
      unsubscribes: stats.unsubscribe_count,
      complaints: stats.complaint_count,
      complaintRate: parseFloat(complaintRate),
    };
  } catch (error) {
    logger.error('Failed to get performance metrics', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get daily performance metrics
 */
export async function getDailyMetrics(
  campaignId: string,
  daysBack: number = 30,
): Promise<CampaignMetrics[]> {
  try {
    const metrics = await queryMany(`
      SELECT
        campaign_id, metric_date,
        sends, opens, clicks, conversions, bounces, unsubscribes, complaints,
        revenue_cents
      FROM campaign_performance
      WHERE campaign_id = $1
      AND metric_date >= NOW()::DATE - INTERVAL '$2 days'
      ORDER BY metric_date DESC
    `, [campaignId, daysBack]);

    return metrics.map((m: any) => ({
      campaignId: m.campaign_id,
      date: new Date(m.metric_date),
      sends: m.sends,
      opens: m.opens,
      clicks: m.clicks,
      conversions: m.conversions,
      bounces: m.bounces,
      unsubscribes: m.unsubscribes,
      complaints: m.complaints,
      revenue: m.revenue_cents,
    }));
  } catch (error) {
    logger.error('Failed to get daily metrics', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get engagement timeline (opens and clicks over time)
 */
export async function getEngagementTimeline(
  campaignId: string,
  hours: number = 24,
): Promise<any[]> {
  try {
    const timeline = await queryMany(`
      SELECT
        DATE_TRUNC('hour', created_at) as hour,
        engagement_type,
        COUNT(*) as count
      FROM email_engagement
      WHERE campaign_id = $1
      AND created_at >= NOW() - INTERVAL '$2 hours'
      GROUP BY DATE_TRUNC('hour', created_at), engagement_type
      ORDER BY hour DESC
    `, [campaignId, hours]);

    return timeline.map((t: any) => ({
      hour: t.hour,
      type: t.engagement_type,
      count: t.count,
    }));
  } catch (error) {
    logger.error('Failed to get engagement timeline', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get top links clicked
 */
export async function getTopLinks(campaignId: string, limit: number = 10): Promise<any[]> {
  try {
    const links = await queryMany(`
      SELECT
        link_url, COUNT(*) as click_count
      FROM email_engagement
      WHERE campaign_id = $1
      AND engagement_type = 'click'
      AND link_url IS NOT NULL
      GROUP BY link_url
      ORDER BY click_count DESC
      LIMIT $2
    `, [campaignId, limit]);

    return links;
  } catch (error) {
    logger.error('Failed to get top links', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get engagement by device type
 */
export async function getEngagementByDevice(campaignId: string): Promise<any[]> {
  try {
    const devices = await queryMany(`
      SELECT
        device_type,
        COUNT(CASE WHEN engagement_type = 'open' THEN 1 END) as opens,
        COUNT(CASE WHEN engagement_type = 'click' THEN 1 END) as clicks,
        COUNT(*) as total
      FROM email_engagement
      WHERE campaign_id = $1
      GROUP BY device_type
      ORDER BY total DESC
    `, [campaignId]);

    return devices;
  } catch (error) {
    logger.error('Failed to get device engagement', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get geographic engagement
 */
export async function getGeographicEngagement(campaignId: string): Promise<any[]> {
  try {
    const geographic = await queryMany(`
      SELECT
        country, city,
        COUNT(CASE WHEN engagement_type = 'open' THEN 1 END) as opens,
        COUNT(CASE WHEN engagement_type = 'click' THEN 1 END) as clicks,
        COUNT(*) as total
      FROM email_engagement
      WHERE campaign_id = $1
      AND country IS NOT NULL
      GROUP BY country, city
      ORDER BY total DESC
      LIMIT 50
    `, [campaignId]);

    return geographic;
  } catch (error) {
    logger.error('Failed to get geographic engagement', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get delivery status breakdown
 */
export async function getDeliveryStats(campaignId: string): Promise<any> {
  try {
    const stats = await queryOne(`
      SELECT
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as delivered,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
        COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced
      FROM email_queue
      WHERE campaign_id = $1
    `, [campaignId]);

    return stats || {
      delivered: 0,
      pending: 0,
      failed: 0,
      bounced: 0,
    };
  } catch (error) {
    logger.error('Failed to get delivery stats', error instanceof Error ? error : new Error(String(error)));
    return {
      delivered: 0,
      pending: 0,
      failed: 0,
      bounced: 0,
    };
  }
}

/**
 * Get unsubscribe reasons
 */
export async function getUnsubscribeReasons(campaignId: string): Promise<any[]> {
  try {
    const reasons = await queryMany(`
      SELECT
        COUNT(*) as count
      FROM email_engagement
      WHERE campaign_id = $1
      AND engagement_type = 'unsubscribe'
      GROUP BY engagement_type
    `, [campaignId]);

    return reasons;
  } catch (error) {
    logger.error('Failed to get unsubscribe reasons', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Compare campaigns
 */
export async function compareCampaigns(campaignIds: string[]): Promise<any[]> {
  try {
    const comparisons = await queryMany(`
      SELECT
        id, name,
        send_count, open_count, click_count, conversion_count,
        bounce_count, unsubscribe_count, complaint_count,
        spent_cents
      FROM email_campaigns
      WHERE id = ANY($1::uuid[])
      ORDER BY created_at DESC
    `, [campaignIds]);

    return comparisons.map((c: any) => ({
      id: c.id,
      name: c.name,
      sends: c.send_count,
      opens: c.open_count,
      openRate: c.send_count > 0 ? ((c.open_count / c.send_count) * 100).toFixed(2) : '0.00',
      clicks: c.click_count,
      clickRate: c.open_count > 0 ? ((c.click_count / c.open_count) * 100).toFixed(2) : '0.00',
      conversions: c.conversion_count,
      bounces: c.bounce_count,
      bounceRate: c.send_count > 0 ? ((c.bounce_count / c.send_count) * 100).toFixed(2) : '0.00',
      unsubscribes: c.unsubscribe_count,
      complaints: c.complaint_count,
      spent: c.spent_cents,
    }));
  } catch (error) {
    logger.error('Failed to compare campaigns', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get subscriber health (engagement segments)
 */
export async function getSubscriberSegments(campaignId: string): Promise<any[]> {
  try {
    const segments = await queryMany(`
      SELECT
        CASE
          WHEN opened_at IS NOT NULL AND clicked_at IS NOT NULL THEN 'highly_engaged'
          WHEN opened_at IS NOT NULL THEN 'opened'
          WHEN sent_at IS NOT NULL THEN 'sent_no_open'
          WHEN bounced_at IS NOT NULL THEN 'bounced'
          WHEN unsubscribed_at IS NOT NULL THEN 'unsubscribed'
          ELSE 'inactive'
        END as segment,
        COUNT(*) as count
      FROM campaign_subscribers
      WHERE campaign_id = $1
      GROUP BY segment
      ORDER BY count DESC
    `, [campaignId]);

    return segments;
  } catch (error) {
    logger.error('Failed to get subscriber segments', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
