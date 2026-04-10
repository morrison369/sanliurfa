/**
 * Email Marketing
 * Campaign creation, management, and subscriber handling
 */

import { query, queryOne, queryRows, insert, update } from './postgres';
import { logger } from './logging';

export interface Campaign {
  id: string;
  userId: string;
  templateId?: string;
  name: string;
  campaignType: string;
  status: string;
  subjectLine: string;
  previewText?: string;
  htmlContent: string;
  plainTextContent?: string;
  fromName?: string;
  fromEmail: string;
  replyToEmail?: string;
  sendCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  budgetCents?: number;
  spentCents: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create new campaign
 */
export async function createCampaign(
  userId: string,
  name: string,
  campaignType: string,
  fromEmail: string,
  subjectLine: string,
  htmlContent: string,
  plainTextContent?: string,
): Promise<Campaign> {
  const id = crypto.randomUUID();

  try {
    const campaign = await insert('email_campaigns', {
      id,
      user_id: userId,
      name,
      campaign_type: campaignType,
      status: 'draft',
      subject_line: subjectLine,
      html_content: htmlContent,
      plain_text_content: plainTextContent || null,
      from_email: fromEmail,
      send_count: 0,
      open_count: 0,
      click_count: 0,
      bounce_count: 0,
      unsubscribe_count: 0,
      spent_cents: 0,
      created_at: new Date(),
      updated_at: new Date(),
    });

    logger.info('Campaign created', { id, userId, name });
    return campaign as Campaign;
  } catch (error) {
    logger.error('Failed to create campaign', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get campaign by ID
 */
export async function getCampaign(campaignId: string): Promise<Campaign | null> {
  try {
    const campaign = await queryOne(`
      SELECT * FROM email_campaigns WHERE id = $1
    `, [campaignId]);

    return campaign ? formatCampaign(campaign) : null;
  } catch (error) {
    logger.error('Failed to get campaign', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get user's campaigns
 */
export async function getUserCampaigns(
  userId: string,
  status?: string,
  limit: number = 50,
  offset: number = 0,
): Promise<Campaign[]> {
  try {
    const statusFilter = status ? 'AND status = $2' : '';
    const params = status ? [userId, status, limit, offset] : [userId, limit, offset];

    const campaigns = await queryRows(`
      SELECT * FROM email_campaigns
      WHERE user_id = $1 ${statusFilter}
      ORDER BY created_at DESC
      LIMIT $${status ? 3 : 2} OFFSET $${status ? 4 : 3}
    `, params);

    return campaigns.map(formatCampaign);
  } catch (error) {
    logger.error('Failed to get user campaigns', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Update campaign
 */
export async function updateCampaign(
  campaignId: string,
  userId: string,
  updates: Partial<Campaign>,
): Promise<Campaign | null> {
  try {
    // Verify ownership
    const campaign = await queryOne('SELECT user_id FROM email_campaigns WHERE id = $1', [campaignId]);
    if (!campaign || campaign.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    const updated = await update('email_campaigns', { id: campaignId }, {
      name: updates.name,
      subject_line: updates.subjectLine,
      preview_text: updates.previewText,
      html_content: updates.htmlContent,
      plain_text_content: updates.plainTextContent,
      from_name: updates.fromName,
      from_email: updates.fromEmail,
      reply_to_email: updates.replyToEmail,
      updated_at: new Date(),
    });

    logger.info('Campaign updated', { campaignId, userId });
    return updated ? formatCampaign(updated) : null;
  } catch (error) {
    logger.error('Failed to update campaign', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Delete campaign
 */
export async function deleteCampaign(campaignId: string, userId: string): Promise<boolean> {
  try {
    const campaign = await queryOne('SELECT user_id FROM email_campaigns WHERE id = $1', [campaignId]);
    if (!campaign || campaign.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    await query('DELETE FROM email_campaigns WHERE id = $1', [campaignId]);
    logger.info('Campaign deleted', { campaignId, userId });
    return true;
  } catch (error) {
    logger.error('Failed to delete campaign', error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Launch campaign (change status to scheduled/active)
 */
export async function launchCampaign(
  campaignId: string,
  userId: string,
  scheduledFor?: Date,
): Promise<Campaign | null> {
  try {
    const campaign = await queryOne('SELECT user_id FROM email_campaigns WHERE id = $1', [campaignId]);
    if (!campaign || campaign.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    const updated = await update('email_campaigns', { id: campaignId }, {
      status: scheduledFor ? 'scheduled' : 'active',
      started_at: scheduledFor ? null : new Date(),
      updated_at: new Date(),
    });

    logger.info('Campaign launched', { campaignId, userId, scheduledFor });
    return updated ? formatCampaign(updated) : null;
  } catch (error) {
    logger.error('Failed to launch campaign', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Pause campaign
 */
export async function pauseCampaign(campaignId: string, userId: string): Promise<Campaign | null> {
  try {
    const campaign = await queryOne('SELECT user_id FROM email_campaigns WHERE id = $1', [campaignId]);
    if (!campaign || campaign.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    const updated = await update('email_campaigns', { id: campaignId }, {
      status: 'paused',
      updated_at: new Date(),
    });

    logger.info('Campaign paused', { campaignId, userId });
    return updated ? formatCampaign(updated) : null;
  } catch (error) {
    logger.error('Failed to pause campaign', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Add targeting rule
 */
export async function addTargetingRule(
  campaignId: string,
  userId: string,
  ruleType: string,
  field: string,
  operator: string,
  value: any,
): Promise<void> {
  try {
    const campaign = await queryOne('SELECT user_id FROM email_campaigns WHERE id = $1', [campaignId]);
    if (!campaign || campaign.user_id !== userId) {
      throw new Error('Unauthorized');
    }

    await insert('campaign_targeting_rules', {
      campaign_id: campaignId,
      rule_type: ruleType,
      field,
      operator,
      value: JSON.stringify(value),
    });

    logger.info('Targeting rule added', { campaignId, ruleType, field });
  } catch (error) {
    logger.error('Failed to add targeting rule', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Get campaign targeting rules
 */
export async function getCampaignTargetingRules(campaignId: string): Promise<any[]> {
  try {
    const rules = await queryRows(`
      SELECT * FROM campaign_targeting_rules
      WHERE campaign_id = $1
      ORDER BY created_at ASC
    `, [campaignId]);

    return rules.map((rule: any) => ({
      ...rule,
      value: JSON.parse(rule.value),
    }));
  } catch (error) {
    logger.error('Failed to get targeting rules', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Add subscribers to campaign
 */
export async function addCampaignSubscribers(
  campaignId: string,
  subscribers: Array<{ email: string; userId?: string }>,
): Promise<number> {
  try {
    let added = 0;

    for (const subscriber of subscribers) {
      await insert('campaign_subscribers', {
        campaign_id: campaignId,
        user_id: subscriber.userId || null,
        email: subscriber.email.toLowerCase(),
      });
      added++;
    }

    logger.info('Subscribers added to campaign', { campaignId, count: added });
    return added;
  } catch (error) {
    logger.error('Failed to add campaign subscribers', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

/**
 * Get campaign subscribers
 */
export async function getCampaignSubscribers(
  campaignId: string,
  limit: number = 100,
  offset: number = 0,
): Promise<any[]> {
  try {
    const subscribers = await queryRows(`
      SELECT * FROM campaign_subscribers
      WHERE campaign_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [campaignId, limit, offset]);

    return subscribers;
  } catch (error) {
    logger.error('Failed to get campaign subscribers', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get campaign performance
 */
export async function getCampaignPerformance(campaignId: string): Promise<any> {
  try {
    const stats = await queryOne(`
      SELECT
        send_count,
        open_count,
        click_count,
        conversion_count,
        bounce_count,
        unsubscribe_count,
        complaint_count,
        spent_cents,
        budget_cents,
        created_at,
        started_at,
        completed_at
      FROM email_campaigns
      WHERE id = $1
    `, [campaignId]);

    if (!stats) return null;

    const openRate = stats.send_count > 0 ? ((stats.open_count / stats.send_count) * 100).toFixed(2) : '0.00';
    const clickRate = stats.open_count > 0 ? ((stats.click_count / stats.open_count) * 100).toFixed(2) : '0.00';
    const conversionRate = stats.click_count > 0 ? ((stats.conversion_count / stats.click_count) * 100).toFixed(2) : '0.00';
    const bounceRate = stats.send_count > 0 ? ((stats.bounce_count / stats.send_count) * 100).toFixed(2) : '0.00';

    return {
      sendCount: stats.send_count,
      openCount: stats.open_count,
      clickCount: stats.click_count,
      conversionCount: stats.conversion_count,
      bounceCount: stats.bounce_count,
      unsubscribeCount: stats.unsubscribe_count,
      complaintCount: stats.complaint_count,
      openRate: parseFloat(openRate),
      clickRate: parseFloat(clickRate),
      conversionRate: parseFloat(conversionRate),
      bounceRate: parseFloat(bounceRate),
      spentCents: stats.spent_cents,
      budgetCents: stats.budget_cents,
      createdAt: stats.created_at,
      startedAt: stats.started_at,
      completedAt: stats.completed_at,
    };
  } catch (error) {
    logger.error('Failed to get campaign performance', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Helper: Format campaign object
 */
function formatCampaign(campaign: any): Campaign {
  return {
    id: campaign.id,
    userId: campaign.user_id,
    templateId: campaign.template_id,
    name: campaign.name,
    campaignType: campaign.campaign_type,
    status: campaign.status,
    subjectLine: campaign.subject_line,
    previewText: campaign.preview_text,
    htmlContent: campaign.html_content,
    plainTextContent: campaign.plain_text_content,
    fromName: campaign.from_name,
    fromEmail: campaign.from_email,
    replyToEmail: campaign.reply_to_email,
    sendCount: campaign.send_count,
    openCount: campaign.open_count,
    clickCount: campaign.click_count,
    bounceCount: campaign.bounce_count,
    unsubscribeCount: campaign.unsubscribe_count,
    budgetCents: campaign.budget_cents,
    spentCents: campaign.spent_cents,
    startedAt: campaign.started_at,
    completedAt: campaign.completed_at,
    createdAt: campaign.created_at,
    updatedAt: campaign.updated_at,
  };
}
