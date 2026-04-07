/**
 * Email Campaign Builder
 * Create, manage, and track email marketing campaigns
 */

import { queryMany, queryOne, insert, update } from './postgres';
import { logger } from './logging';

export type CampaignStatus = 'draft' | 'scheduled' | 'active' | 'paused' | 'completed' | 'failed';
export type SegmentType = 'all_users' | 'subscribers' | 'premium' | 'inactive' | 'custom';

export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  fromName: string;
  fromEmail: string;
  htmlContent: string;
  textContent: string;
  segment: SegmentType;
  segmentFilters?: Record<string, any>;
  scheduledAt?: string;
  status: CampaignStatus;
  sendCount: number;
  openCount: number;
  clickCount: number;
  unsubscribeCount: number;
  bounceCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignMetrics {
  campaignId: string;
  sendCount: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  bounceRate: number;
  conversionRate: number;
  topLinks: { url: string; clicks: number }[];
  topRegions: { region: string; opens: number }[];
}

/**
 * Create email campaign
 */
export async function createCampaign(campaign: Omit<EmailCampaign, 'id' | 'createdAt' | 'updatedAt' | 'sendCount' | 'openCount' | 'clickCount' | 'unsubscribeCount' | 'bounceCount'>): Promise<EmailCampaign | null> {
  try {
    const query = `
      INSERT INTO email_campaigns
      (name, subject, from_name, from_email, html_content, text_content, segment, segment_filters, scheduled_at, status, send_count, open_count, click_count, unsubscribe_count, bounce_count, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 0, 0, 0, 0, 0, NOW(), NOW())
      RETURNING id, name, subject, from_name, from_email, html_content, text_content, segment, segment_filters, scheduled_at, status, send_count, open_count, click_count, unsubscribe_count, bounce_count, created_at, updated_at
    `;

    const result = await queryOne(query, [
      campaign.name,
      campaign.subject,
      campaign.fromName,
      campaign.fromEmail,
      campaign.htmlContent,
      campaign.textContent,
      campaign.segment,
      campaign.segmentFilters ? JSON.stringify(campaign.segmentFilters) : null,
      campaign.scheduledAt,
      campaign.status
    ]);

    if (!result) {
      return null;
    }

    logger.info('Email campaign created', { campaignId: result.id, name: campaign.name });

    return {
      id: result.id,
      name: result.name,
      subject: result.subject,
      fromName: result.from_name,
      fromEmail: result.from_email,
      htmlContent: result.html_content,
      textContent: result.text_content,
      segment: result.segment,
      segmentFilters: result.segment_filters ? JSON.parse(result.segment_filters) : undefined,
      scheduledAt: result.scheduled_at,
      status: result.status,
      sendCount: result.send_count,
      openCount: result.open_count,
      clickCount: result.click_count,
      unsubscribeCount: result.unsubscribe_count,
      bounceCount: result.bounce_count,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  } catch (error) {
    logger.error('Create campaign failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get campaign by ID
 */
export async function getCampaign(campaignId: string): Promise<EmailCampaign | null> {
  try {
    const result = await queryOne('SELECT * FROM email_campaigns WHERE id = $1', [campaignId]);

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      name: result.name,
      subject: result.subject,
      fromName: result.from_name,
      fromEmail: result.from_email,
      htmlContent: result.html_content,
      textContent: result.text_content,
      segment: result.segment,
      segmentFilters: result.segment_filters ? JSON.parse(result.segment_filters) : undefined,
      scheduledAt: result.scheduled_at,
      status: result.status,
      sendCount: result.send_count,
      openCount: result.open_count,
      clickCount: result.click_count,
      unsubscribeCount: result.unsubscribe_count,
      bounceCount: result.bounce_count,
      createdAt: result.created_at,
      updatedAt: result.updated_at
    };
  } catch (error) {
    logger.error('Get campaign failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get all campaigns
 */
export async function getAllCampaigns(limit: number = 50): Promise<EmailCampaign[]> {
  try {
    const results = await queryMany('SELECT * FROM email_campaigns ORDER BY created_at DESC LIMIT $1', [limit]);

    return results.map((r: any) => ({
      id: r.id,
      name: r.name,
      subject: r.subject,
      fromName: r.from_name,
      fromEmail: r.from_email,
      htmlContent: r.html_content,
      textContent: r.text_content,
      segment: r.segment,
      segmentFilters: r.segment_filters ? JSON.parse(r.segment_filters) : undefined,
      scheduledAt: r.scheduled_at,
      status: r.status,
      sendCount: r.send_count,
      openCount: r.open_count,
      clickCount: r.click_count,
      unsubscribeCount: r.unsubscribe_count,
      bounceCount: r.bounce_count,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  } catch (error) {
    logger.error('Get all campaigns failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Update campaign
 */
export async function updateCampaign(campaignId: string, updates: Partial<EmailCampaign>): Promise<EmailCampaign | null> {
  try {
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString()
    };

    if (updates.name) dbUpdates.name = updates.name;
    if (updates.subject) dbUpdates.subject = updates.subject;
    if (updates.htmlContent) dbUpdates.html_content = updates.htmlContent;
    if (updates.textContent) dbUpdates.text_content = updates.textContent;
    if (updates.status) dbUpdates.status = updates.status;
    if (updates.scheduledAt) dbUpdates.scheduled_at = updates.scheduledAt;

    const result = await update('email_campaigns', { id: campaignId }, dbUpdates);

    if (!result) {
      return null;
    }

    logger.info('Campaign updated', { campaignId });

    return getCampaign(campaignId);
  } catch (error) {
    logger.error('Update campaign failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get campaign metrics
 */
export async function getCampaignMetrics(campaignId: string): Promise<CampaignMetrics | null> {
  try {
    const campaign = await getCampaign(campaignId);

    if (!campaign) {
      return null;
    }

    const metrics: CampaignMetrics = {
      campaignId,
      sendCount: campaign.sendCount,
      deliveryRate: campaign.sendCount > 0 ? ((campaign.sendCount - campaign.bounceCount) / campaign.sendCount) * 100 : 0,
      openRate: campaign.sendCount > 0 ? (campaign.openCount / campaign.sendCount) * 100 : 0,
      clickRate: campaign.sendCount > 0 ? (campaign.clickCount / campaign.sendCount) * 100 : 0,
      unsubscribeRate: campaign.sendCount > 0 ? (campaign.unsubscribeCount / campaign.sendCount) * 100 : 0,
      bounceRate: campaign.sendCount > 0 ? (campaign.bounceCount / campaign.sendCount) * 100 : 0,
      conversionRate: campaign.clickCount > 0 ? (campaign.clickCount / campaign.sendCount) * 100 : 0,
      topLinks: [],
      topRegions: []
    };

    return metrics;
  } catch (error) {
    logger.error('Get campaign metrics failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Calculate campaign effectiveness score
 */
export async function calculateEffectivenessScore(campaignId: string): Promise<number> {
  const metrics = await getCampaignMetrics(campaignId);

  if (!metrics) {
    return 0;
  }

  // Score calculation (0-100)
  // Weight: 40% open rate, 40% click rate, 20% delivery rate
  const score = (metrics.openRate * 0.4) + (metrics.clickRate * 0.4) + (metrics.deliveryRate * 0.2);

  return Math.round(Math.min(score, 100));
}

/**
 * Get campaign A/B test results
 */
export async function getABTestResults(campaignId: string): Promise<{ variant_a: CampaignMetrics; variant_b: CampaignMetrics; winner: 'a' | 'b' | 'tie' } | null> {
  // This would require storing variant data, simplified here
  try {
    const campaign = await getCampaign(campaignId);

    if (!campaign) {
      return null;
    }

    const metricsA = await getCampaignMetrics(campaignId);
    const metricsB = await getCampaignMetrics(campaignId);

    if (!metricsA || !metricsB) {
      return null;
    }

    const scoreA = metricsA.openRate + metricsA.clickRate;
    const scoreB = metricsB.openRate + metricsB.clickRate;

    let winner: 'a' | 'b' | 'tie' = 'tie';
    if (scoreA > scoreB) winner = 'a';
    if (scoreB > scoreA) winner = 'b';

    return {
      variant_a: metricsA,
      variant_b: metricsB,
      winner
    };
  } catch (error) {
    logger.error('Get A/B test results failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Template library
 */
export const EMAIL_TEMPLATES = {
  welcome: {
    subject: 'Şanlıurfa\'ya Hoşgeldin!',
    htmlContent: '<h1>Hoşgeldin</h1><p>Şanlıurfa.com topluluğuna katılmış olmaktan mutluyuz.</p>'
  },
  promotion: {
    subject: 'Özel İndirim Sadece Senin İçin 🎉',
    htmlContent: '<h1>Özel Teklif</h1><p>Premium üyelikte %20 indirim seni bekliyor!</p>'
  },
  announcement: {
    subject: 'Şanlıurfa.com Haber',
    htmlContent: '<h1>Yeni Özellikler</h1><p>Platformumuzda yeni özellikler yayınlandı.</p>'
  },
  reengagement: {
    subject: 'Seni Özledik! Geri Dön Ve Harika Şeyler Keşfet',
    htmlContent: '<h1>Seni Özledik</h1><p>Yeni yerler ve yorumlar seni bekliyor.</p>'
  }
};
