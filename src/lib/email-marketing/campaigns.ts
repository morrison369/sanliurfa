/**
 * Email Marketing Campaign Management
 * Task 121: Email Marketing Automation
 */

import { sendEmail, type EmailData } from '../email/index';
import { db } from '../db';
// @ts-ignore
import { sql } from 'drizzle-orm';
import { logger } from '../logging';
import { getPublicAppUrl } from '../public-app-url';

// Campaign types
export type CampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
export type CampaignType = 'newsletter' | 'promotional' | 'transactional' | 'automation' | 'abandoned_cart';
const PUBLIC_APP_URL = getPublicAppUrl();

// Campaign interface
export interface EmailCampaign {
  id: string;
  name: string;
  subject: string;
  preheader?: string;
  htmlContent: string;
  textContent?: string;
  type: CampaignType;
  status: CampaignStatus;
  segmentId?: string;
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  scheduledAt?: Date;
  sentAt?: Date;
  totalRecipients: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Campaign creation data
export interface CreateCampaignData {
  name: string;
  subject: string;
  preheader?: string;
  htmlContent: string;
  textContent?: string;
  type: CampaignType;
  segmentId?: string;
  fromName?: string;
  fromEmail?: string;
  replyTo?: string;
  scheduledAt?: Date;
}

// Campaign segment
export interface EmailSegment {
  id: string;
  name: string;
  description?: string;
  criteria: SegmentCriteria;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Segment criteria
export interface SegmentCriteria {
  minActivityScore?: number;
  maxInactiveDays?: number;
  subscribedOnly?: boolean;
  locationRadius?: {
    lat: number;
    lng: number;
    radiusKm: number;
  };
  categories?: string[];
  tags?: string[];
  customFilters?: Record<string, any>;
}

// Campaign analytics
export interface CampaignAnalytics {
  campaignId: string;
  totalSent: number;
  delivered: number;
  opens: number;
  uniqueOpens: number;
  clicks: number;
  uniqueClicks: number;
  bounces: number;
  unsubscribes: number;
  complaints: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
  revenue?: number;
  topLinks: Array<{
    url: string;
    clicks: number;
  }>;
  hourlyStats: Array<{
    hour: string;
    opens: number;
    clicks: number;
  }>;
}

// A/B Test configuration
export interface ABTestConfig {
  enabled: boolean;
  testPercentage: number;
  testDuration: number; // minutes
  winnerCriteria: 'open_rate' | 'click_rate';
  variants: Array<{
    id: string;
    subject: string;
    preheader?: string;
    htmlContent?: string;
    splitPercentage: number;
  }>;
}

// Campaign queue item
interface CampaignQueueItem {
  id: string;
  campaignId: string;
  userId: string;
  email: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  sendAt?: Date;
  sentAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  variantId?: string;
}

/**
 * Create a new email campaign
 */
export async function createCampaign(data: CreateCampaignData): Promise<EmailCampaign> {
  const campaign: EmailCampaign = {
    id: generateId(),
    name: data.name,
    subject: data.subject,
    preheader: data.preheader,
    htmlContent: data.htmlContent,
    textContent: data.textContent,
    type: data.type,
    status: 'draft',
    segmentId: data.segmentId,
    fromName: data.fromName || 'Sanliurfa.com',
    fromEmail: data.fromEmail || 'noreply@sanliurfa.com',
    replyTo: data.replyTo,
    scheduledAt: data.scheduledAt,
    totalRecipients: 0,
    sentCount: 0,
    openCount: 0,
    clickCount: 0,
    bounceCount: 0,
    unsubscribeCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Save to database
  await db.execute(sql`
    INSERT INTO email_campaigns (
      id, name, subject, preheader, html_content, text_content, type, status,
      segment_id, from_name, from_email, reply_to, scheduled_at,
      total_recipients, sent_count, created_at, updated_at
    ) VALUES (
      ${campaign.id}, ${campaign.name}, ${campaign.subject}, ${campaign.preheader},
      ${campaign.htmlContent}, ${campaign.textContent}, ${campaign.type}, ${campaign.status},
      ${campaign.segmentId}, ${campaign.fromName}, ${campaign.fromEmail}, ${campaign.replyTo},
      ${campaign.scheduledAt}, ${campaign.totalRecipients}, ${campaign.sentCount},
      ${campaign.createdAt}, ${campaign.updatedAt}
    )
  `);

  return campaign;
}

/**
 * Update campaign
 */
export async function updateCampaign(
  campaignId: string,
  updates: Partial<CreateCampaignData>
): Promise<EmailCampaign> {
  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.subject) { fields.push('subject = ?'); values.push(updates.subject); }
  if (updates.preheader !== undefined) { fields.push('preheader = ?'); values.push(updates.preheader); }
  if (updates.htmlContent) { fields.push('html_content = ?'); values.push(updates.htmlContent); }
  if (updates.textContent !== undefined) { fields.push('text_content = ?'); values.push(updates.textContent); }
  if (updates.scheduledAt !== undefined) { fields.push('scheduled_at = ?'); values.push(updates.scheduledAt); }
  
  fields.push('updated_at = ?');
  values.push(new Date());
  values.push(campaignId);

  await db.execute(sql`
    UPDATE email_campaigns 
    SET ${sql.raw(fields.join(', '))}
    WHERE id = ${campaignId}
  `);

  return getCampaign(campaignId);
}

/**
 * Get campaign by ID
 */
export async function getCampaign(campaignId: string): Promise<EmailCampaign> {
  const result = await db.execute(sql`
    SELECT * FROM email_campaigns WHERE id = ${campaignId}
  `);
  
  if (!result.rows[0]) {
    throw new Error('Campaign not found');
  }

  return mapCampaignFromRow(result.rows[0]);
}

/**
 * List campaigns with filters
 */
export async function listCampaigns(options: {
  status?: CampaignStatus;
  type?: CampaignType;
  limit?: number;
  offset?: number;
} = {}): Promise<{ campaigns: EmailCampaign[]; total: number }> {
  let query = sql`SELECT * FROM email_campaigns WHERE 1=1`;
  let countQuery = sql`SELECT COUNT(*) as total FROM email_campaigns WHERE 1=1`;

  if (options.status) {
    query = sql`${query} AND status = ${options.status}`;
    countQuery = sql`${countQuery} AND status = ${options.status}`;
  }

  if (options.type) {
    query = sql`${query} AND type = ${options.type}`;
    countQuery = sql`${countQuery} AND type = ${options.type}`;
  }

  query = sql`${query} ORDER BY created_at DESC`;
  
  if (options.limit) {
    query = sql`${query} LIMIT ${options.limit}`;
    if (options.offset) {
      query = sql`${query} OFFSET ${options.offset}`;
    }
  }

  const [result, countResult] = await Promise.all([
    db.execute(query),
    db.execute(countQuery),
  ]);

  return {
    campaigns: result.rows.map(mapCampaignFromRow),
    total: parseInt(countResult.rows[0]?.total || '0'),
  };
}

/**
 * Schedule campaign
 */
export async function scheduleCampaign(
  campaignId: string,
  scheduledAt: Date
): Promise<void> {
  await db.execute(sql`
    UPDATE email_campaigns 
    SET scheduled_at = ${scheduledAt}, status = 'scheduled', updated_at = ${new Date()}
    WHERE id = ${campaignId} AND status = 'draft'
  `);
}

/**
 * Cancel campaign
 */
export async function cancelCampaign(campaignId: string): Promise<void> {
  await db.execute(sql`
    UPDATE email_campaigns 
    SET status = 'cancelled', updated_at = ${new Date()}
    WHERE id = ${campaignId} AND status IN ('draft', 'scheduled')
  `);
}

/**
 * Duplicate campaign
 */
export async function duplicateCampaign(campaignId: string): Promise<EmailCampaign> {
  const original = await getCampaign(campaignId);
  
  return createCampaign({
    name: `${original.name} (Kopya)`,
    subject: original.subject,
    preheader: original.preheader,
    htmlContent: original.htmlContent,
    textContent: original.textContent,
    type: original.type,
    segmentId: original.segmentId,
    fromName: original.fromName,
    fromEmail: original.fromEmail,
    replyTo: original.replyTo,
  });
}

/**
 * Get campaign analytics
 */
export async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
  const campaign = await getCampaign(campaignId);
  
  // Get detailed stats from tracking table
  const statsResult = await db.execute(sql`
    SELECT 
      COUNT(*) as total_sent,
      SUM(CASE WHEN opened_at IS NOT NULL THEN 1 ELSE 0 END) as opens,
      SUM(CASE WHEN clicked_at IS NOT NULL THEN 1 ELSE 0 END) as clicks,
      SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) as bounces,
      COUNT(DISTINCT CASE WHEN opened_at IS NOT NULL THEN user_id END) as unique_opens,
      COUNT(DISTINCT CASE WHEN clicked_at IS NOT NULL THEN user_id END) as unique_clicks
    FROM email_campaign_recipients
    WHERE campaign_id = ${campaignId}
  `);

  const stats = statsResult.rows[0];
  const totalSent = parseInt(stats?.total_sent || '0');
  const opens = parseInt(stats?.opens || '0');
  const uniqueOpens = parseInt(stats?.unique_opens || '0');
  const clicks = parseInt(stats?.clicks || '0');
  const uniqueClicks = parseInt(stats?.unique_clicks || '0');
  const bounces = parseInt(stats?.bounces || '0');

  // Get top clicked links
  const linksResult = await db.execute(sql`
    SELECT url, COUNT(*) as clicks
    FROM email_link_clicks
    WHERE campaign_id = ${campaignId}
    GROUP BY url
    ORDER BY clicks DESC
    LIMIT 10
  `);

  // Get hourly stats
  const hourlyResult = await db.execute(sql`
    SELECT 
      DATE_TRUNC('hour', opened_at) as hour,
      COUNT(*) as opens,
      0 as clicks
    FROM email_campaign_recipients
    WHERE campaign_id = ${campaignId} AND opened_at IS NOT NULL
    GROUP BY DATE_TRUNC('hour', opened_at)
    ORDER BY hour
  `);

  return {
    campaignId,
    totalSent,
    delivered: totalSent - bounces,
    opens,
    uniqueOpens,
    clicks,
    uniqueClicks,
    bounces,
    unsubscribes: campaign.unsubscribeCount,
    complaints: 0,
    openRate: totalSent > 0 ? (uniqueOpens / totalSent) * 100 : 0,
    clickRate: totalSent > 0 ? (uniqueClicks / totalSent) * 100 : 0,
    bounceRate: totalSent > 0 ? (bounces / totalSent) * 100 : 0,
    unsubscribeRate: totalSent > 0 ? (campaign.unsubscribeCount / totalSent) * 100 : 0,
    topLinks: linksResult.rows.map((row: any) => ({
      url: row.url,
      clicks: parseInt(row.clicks),
    })),
    hourlyStats: hourlyResult.rows.map((row: any) => ({
      hour: row.hour,
      opens: parseInt(row.opens),
      clicks: 0,
    })),
  };
}

/**
 * Send campaign to recipients
 */
export async function sendCampaign(campaignId: string): Promise<void> {
  const campaign = await getCampaign(campaignId);
  
  if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
    throw new Error('Campaign must be in draft or scheduled status');
  }

  // Get segment users
  let recipients: Array<{ id: string; email: string; name: string }> = [];
  
  if (campaign.segmentId) {
    recipients = await getSegmentUsers(campaign.segmentId);
  } else {
    // Get all subscribed users
    const result = await db.execute(sql`
      SELECT id, email, full_name as name
      FROM users
      WHERE email_verified = true AND email_notifications = true
    `);
    recipients = result.rows as any;
  }

  // Update campaign status
  await db.execute(sql`
    UPDATE email_campaigns 
    SET status = 'sending', total_recipients = ${recipients.length}, updated_at = ${new Date()}
    WHERE id = ${campaignId}
  `);

  // Queue recipients
  await queueRecipients(campaignId, recipients);

  // Process queue in batches
  await processCampaignQueue(campaignId);
}

/**
 * Queue recipients for campaign
 */
async function queueRecipients(
  campaignId: string,
  recipients: Array<{ id: string; email: string; name: string }>
): Promise<void> {
  const batchSize = 1000;
  
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    
    const values = batch.map(r => 
      `('${generateId()}', '${campaignId}', '${r.id}', '${r.email}', 'pending')`
    ).join(',');

    await db.execute(sql`
      INSERT INTO email_campaign_recipients (id, campaign_id, user_id, email, status)
      VALUES ${sql.raw(values)}
    `);
  }
}

/**
 * Process campaign queue
 */
async function processCampaignQueue(campaignId: string): Promise<void> {
  const batchSize = 100;
  let processed = 0;

  while (true) {
    const pending = await db.execute(sql`
      SELECT r.*, u.full_name as name
      FROM email_campaign_recipients r
      JOIN users u ON u.id = r.user_id
      WHERE r.campaign_id = ${campaignId} AND r.status = 'pending'
      LIMIT ${batchSize}
    `);

    if (pending.rows.length === 0) break;

    const campaign = await getCampaign(campaignId);

    for (const recipient of pending.rows) {
      try {
        // Personalize content
        const htmlContent = personalizeContent(campaign.htmlContent, {
          name: recipient.name,
          email: recipient.email,
          userId: recipient.user_id,
        });

        const textContent = campaign.textContent 
          ? personalizeContent(campaign.textContent, {
              name: recipient.name,
              email: recipient.email,
              userId: recipient.user_id,
            })
          : undefined;

        await sendEmail({
          to: recipient.email as string,
          subject: campaign.subject,
          html: htmlContent,
          text: textContent,
          replyTo: campaign.replyTo,
        });

        await db.execute(sql`
          UPDATE email_campaign_recipients
          SET status = 'sent', sent_at = ${new Date()}
          WHERE id = ${recipient.id}
        `);

        processed++;
      } catch (error) {
        logger.error(`[EmailCampaign] Failed to send to ${recipient.email}:`, error);
        
        await db.execute(sql`
          UPDATE email_campaign_recipients
          SET status = 'failed'
          WHERE id = ${recipient.id}
        `);
      }
    }

    // Update campaign progress
    await db.execute(sql`
      UPDATE email_campaigns
      SET sent_count = ${processed}
      WHERE id = ${campaignId}
    `);
  }

  // Mark campaign as sent
  await db.execute(sql`
    UPDATE email_campaigns
    SET status = 'sent', sent_at = ${new Date()}
    WHERE id = ${campaignId}
  `);
}

/**
 * Personalize email content with user data
 */
function personalizeContent(template: string, data: {
  name?: string;
  email: string;
  userId: string;
}): string {
  return template
    .replace(/\{\{name\}\}/g, data.name || 'Değerli Kullanıcı')
    .replace(/\{\{email\}\}/g, data.email)
    .replace(/\{\{user_id\}\}/g, data.userId)
    .replace(/\{\{unsubscribe_url\}\}/g, `${PUBLIC_APP_URL}/abonelik-iptal?user=${data.userId}`);
}

/**
 * Get segment users
 */
async function getSegmentUsers(segmentId: string): Promise<Array<{ id: string; email: string; name: string }>> {
  const segment = await getSegment(segmentId);
  
  // Build query based on criteria
  let query = sql`
    SELECT DISTINCT u.id, u.email, u.full_name as name
    FROM users u
    LEFT JOIN user_activities ua ON ua.user_id = u.id
    LEFT JOIN user_locations ul ON ul.user_id = u.id
    WHERE u.email_verified = true AND u.email_notifications = true
  `;

  const criteria = segment.criteria;

  if (criteria.minActivityScore) {
    query = sql`${query} AND ua.activity_score >= ${criteria.minActivityScore}`;
  }

  if (criteria.maxInactiveDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - criteria.maxInactiveDays);
    query = sql`${query} AND (ua.last_active_at IS NULL OR ua.last_active_at >= ${cutoffDate})`;
  }

  if (criteria.locationRadius) {
    const { lat, lng, radiusKm } = criteria.locationRadius;
    query = sql`${query} AND (
      ul.latitude IS NOT NULL AND ul.longitude IS NOT NULL AND
      (6371 * acos(
        cos(radians(${lat})) * cos(radians(ul.latitude)) *
        cos(radians(ul.longitude) - radians(${lng})) +
        sin(radians(${lat})) * sin(radians(ul.latitude))
      )) <= ${radiusKm}
    )`;
  }

  const result = await db.execute(query);
  return result.rows as any;
}

/**
 * Get segment by ID
 */
async function getSegment(segmentId: string): Promise<EmailSegment> {
  const result = await db.execute(sql`
    SELECT * FROM email_segments WHERE id = ${segmentId}
  `);
  
  if (!result.rows[0]) {
    throw new Error('Segment not found');
  }

  return {
    id: result.rows[0].id as string,
    name: result.rows[0].name as string,
    description: result.rows[0].description as string | undefined,
    criteria: JSON.parse(result.rows[0].criteria as string),
    userCount: parseInt(result.rows[0].user_count as string),
    createdAt: new Date(result.rows[0].created_at as string),
    updatedAt: new Date(result.rows[0].updated_at as string),
  };
}

/**
 * Create segment
 */
export async function createSegment(
  name: string,
  criteria: SegmentCriteria,
  description?: string
): Promise<EmailSegment> {
  // Calculate user count
  const userCount = await calculateSegmentSize(criteria);

  const segment: EmailSegment = {
    id: generateId(),
    name,
    description,
    criteria,
    userCount,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.execute(sql`
    INSERT INTO email_segments (id, name, description, criteria, user_count, created_at, updated_at)
    VALUES (
      ${segment.id}, ${segment.name}, ${segment.description},
      ${JSON.stringify(criteria)}, ${segment.userCount}, ${segment.createdAt}, ${segment.updatedAt}
    )
  `);

  return segment;
}

/**
 * Calculate segment size
 */
async function calculateSegmentSize(criteria: SegmentCriteria): Promise<number> {
  let query = sql`
    SELECT COUNT(DISTINCT u.id) as count
    FROM users u
    LEFT JOIN user_activities ua ON ua.user_id = u.id
    WHERE u.email_verified = true AND u.email_notifications = true
  `;

  if (criteria.minActivityScore) {
    query = sql`${query} AND ua.activity_score >= ${criteria.minActivityScore}`;
  }

  if (criteria.maxInactiveDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - criteria.maxInactiveDays);
    query = sql`${query} AND (ua.last_active_at IS NULL OR ua.last_active_at >= ${cutoffDate})`;
  }

  const result = await db.execute(query);
  return parseInt(result.rows[0]?.count as string || '0');
}

/**
 * Map campaign from database row
 */
function mapCampaignFromRow(row: any): EmailCampaign {
  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    preheader: row.preheader,
    htmlContent: row.html_content,
    textContent: row.text_content,
    type: row.type,
    status: row.status,
    segmentId: row.segment_id,
    fromName: row.from_name,
    fromEmail: row.from_email,
    replyTo: row.reply_to,
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : undefined,
    sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
    totalRecipients: parseInt(row.total_recipients || '0'),
    sentCount: parseInt(row.sent_count || '0'),
    openCount: parseInt(row.open_count || '0'),
    clickCount: parseInt(row.click_count || '0'),
    bounceCount: parseInt(row.bounce_count || '0'),
    unsubscribeCount: parseInt(row.unsubscribe_count || '0'),
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Track email open
 */
export async function trackEmailOpen(
  campaignId: string,
  recipientId: string
): Promise<void> {
  await db.execute(sql`
    UPDATE email_campaign_recipients
    SET opened_at = ${new Date()}
    WHERE campaign_id = ${campaignId} AND user_id = ${recipientId} AND opened_at IS NULL
  `);

  await db.execute(sql`
    UPDATE email_campaigns
    SET open_count = open_count + 1
    WHERE id = ${campaignId}
  `);
}

/**
 * Track email click
 */
export async function trackEmailClick(
  campaignId: string,
  recipientId: string,
  url: string
): Promise<void> {
  await db.execute(sql`
    UPDATE email_campaign_recipients
    SET clicked_at = ${new Date()}
    WHERE campaign_id = ${campaignId} AND user_id = ${recipientId} AND clicked_at IS NULL
  `);

  await db.execute(sql`
    UPDATE email_campaigns
    SET click_count = click_count + 1
    WHERE id = ${campaignId}
  `);

  // Track link click
  await db.execute(sql`
    INSERT INTO email_link_clicks (id, campaign_id, user_id, url, clicked_at)
    VALUES (${generateId()}, ${campaignId}, ${recipientId}, ${url}, ${new Date()})
  `);
}

/**
 * Track unsubscribe
 */
export async function trackUnsubscribe(
  campaignId: string,
  userId: string
): Promise<void> {
  await db.execute(sql`
    UPDATE email_campaigns
    SET unsubscribe_count = unsubscribe_count + 1
    WHERE id = ${campaignId}
  `);

  await db.execute(sql`
    UPDATE users
    SET email_notifications = false
    WHERE id = ${userId}
  `);
}

/**
 * Get dashboard stats
 */
export async function getDashboardStats(): Promise<{
  totalCampaigns: number;
  totalSent: number;
  avgOpenRate: number;
  avgClickRate: number;
  recentCampaigns: EmailCampaign[];
}> {
  const statsResult = await db.execute(sql`
    SELECT 
      COUNT(*) as total_campaigns,
      SUM(total_recipients) as total_sent,
      AVG(CASE WHEN total_recipients > 0 THEN (open_count::float / total_recipients) * 100 END) as avg_open_rate,
      AVG(CASE WHEN total_recipients > 0 THEN (click_count::float / total_recipients) * 100 END) as avg_click_rate
    FROM email_campaigns
    WHERE status = 'sent'
  `);

  const recentResult = await db.execute(sql`
    SELECT * FROM email_campaigns
    ORDER BY created_at DESC
    LIMIT 5
  `);

  const stats = statsResult.rows[0];

  return {
    totalCampaigns: parseInt(stats?.total_campaigns || '0'),
    totalSent: parseInt(stats?.total_sent || '0'),
    avgOpenRate: parseFloat(stats?.avg_open_rate || '0'),
    avgClickRate: parseFloat(stats?.avg_click_rate || '0'),
    recentCampaigns: recentResult.rows.map(mapCampaignFromRow),
  };
}

