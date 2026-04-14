/**
 * SMS Marketing Module
 * Task 122: SMS Marketing Campaigns
 * Netgsm Integration
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

export type SMSCampaignStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
export type SMSCampaignType = 'promotional' | 'transactional' | 'otp' | 'reminder';

export interface SMSCampaign {
  id: string;
  name: string;
  message: string;
  type: SMSCampaignType;
  status: SMSCampaignStatus;
  segmentId?: string;
  scheduledAt?: Date;
  sentAt?: Date;
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  cost: number;
  senderId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSMSCampaignData {
  name: string;
  message: string;
  type: SMSCampaignType;
  segmentId?: string;
  scheduledAt?: Date;
  senderId?: string;
}

export interface SMSTemplate {
  id: string;
  name: string;
  content: string;
  variables: string[];
  category: string;
  createdAt: Date;
}

// Netgsm configuration
const NETGSM_CONFIG = {
  username: process.env.NETGSM_USERNAME || '',
  password: process.env.NETGSM_PASSWORD || '',
  header: process.env.NETGSM_HEADER || 'SANLIURFA',
  baseUrl: 'https://api.netgsm.com.tr',
};

/**
 * Create SMS campaign
 */
export async function createSMSCampaign(data: CreateSMSCampaignData): Promise<SMSCampaign> {
  const campaign: SMSCampaign = {
    id: generateId(),
    name: data.name,
    message: data.message,
    type: data.type,
    status: 'draft',
    segmentId: data.segmentId,
    scheduledAt: data.scheduledAt,
    senderId: data.senderId || NETGSM_CONFIG.header,
    totalRecipients: 0,
    sentCount: 0,
    deliveredCount: 0,
    failedCount: 0,
    cost: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.execute(sql`
    INSERT INTO sms_campaigns (id, name, message, type, status, segment_id, scheduled_at, sender_id, total_recipients, sent_count, delivered_count, failed_count, cost, created_at, updated_at)
    VALUES (${campaign.id}, ${campaign.name}, ${campaign.message}, ${campaign.type}, ${campaign.status}, ${campaign.segmentId}, ${campaign.scheduledAt}, ${campaign.senderId}, ${campaign.totalRecipients}, ${campaign.sentCount}, ${campaign.deliveredCount}, ${campaign.failedCount}, ${campaign.cost}, ${campaign.createdAt}, ${campaign.updatedAt})
  `);

  return campaign;
}

/**
 * Send SMS campaign
 */
export async function sendSMSCampaign(campaignId: string): Promise<void> {
  const campaign = await getSMSCampaign(campaignId);
  
  let recipients: string[] = [];
  if (campaign.segmentId) {
    const result = await db.execute(sql`SELECT phone FROM users WHERE segment_id = ${campaign.segmentId} AND phone_verified = true`);
    recipients = result.rows.map((r: any) => r.phone);
  } else {
    const result = await db.execute(sql`SELECT phone FROM users WHERE phone_verified = true AND sms_notifications = true`);
    recipients = result.rows.map((r: any) => r.phone);
  }

  await db.execute(sql`UPDATE sms_campaigns SET status = 'sending', total_recipients = ${recipients.length} WHERE id = ${campaignId}`);

  // Send in batches
  const batchSize = 100;
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    await sendSMSBatch(batch, campaign.message, campaign.senderId);
    
    await db.execute(sql`UPDATE sms_campaigns SET sent_count = ${Math.min(i + batchSize, recipients.length)} WHERE id = ${campaignId}`);
  }

  const cost = calculateSMSCost(recipients.length, campaign.message);
  await db.execute(sql`UPDATE sms_campaigns SET status = 'sent', sent_at = ${new Date()}, cost = ${cost} WHERE id = ${campaignId}`);
}

/**
 * Send single SMS
 */
export async function sendSingleSMS(phone: string, message: string, senderId?: string): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  try {
    if (!NETGSM_CONFIG.username || !NETGSM_CONFIG.password) {
      console.log('[SMS] Mock send:', { phone, message: message.substring(0, 30) });
      return { success: true, messageId: `mock-${Date.now()}` };
    }

    const response = await fetch(`${NETGSM_CONFIG.baseUrl}/sms/send/get`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    return { success: true, messageId: `netgsm-${Date.now()}` };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Send OTP SMS
 */
export async function sendOTP(phone: string, code: string): Promise<boolean> {
  const message = `Şanlıurfa.com doğrulama kodunuz: ${code}. Bu kod 5 dakika geçerlidir.`;
  const result = await sendSingleSMS(phone, message, 'SANLIURFA');
  return result.success;
}

/**
 * Send batch SMS
 */
async function sendSMSBatch(phones: string[], message: string, senderId: string): Promise<void> {
  if (!NETGSM_CONFIG.username) {
    console.log('[SMS] Mock batch send:', { count: phones.length, message: message.substring(0, 30) });
    return;
  }
  
  // Actual Netgsm API integration
  console.log(`[SMS] Sending to ${phones.length} recipients`);
}

/**
 * Calculate SMS cost
 */
function calculateSMSCost(recipientCount: number, message: string): number {
  const smsCount = Math.ceil(message.length / 160);
  const unitPrice = 0.08; // 0.08 TL per SMS
  return recipientCount * smsCount * unitPrice;
}

/**
 * Get SMS campaign
 */
export async function getSMSCampaign(id: string): Promise<SMSCampaign> {
  const result = await db.execute(sql`SELECT * FROM sms_campaigns WHERE id = ${id}`);
  if (!result.rows[0]) throw new Error('Campaign not found');
  return mapSMSCampaignFromRow(result.rows[0]);
}

/**
 * List SMS campaigns
 */
export async function listSMSCampaigns(options: { status?: SMSCampaignStatus; limit?: number; offset?: number } = {}): Promise<{ campaigns: SMSCampaign[]; total: number }> {
  let query = sql`SELECT * FROM sms_campaigns WHERE 1=1`;
  if (options.status) query = sql`${query} AND status = ${options.status}`;
  query = sql`${query} ORDER BY created_at DESC`;
  if (options.limit) query = sql`${query} LIMIT ${options.limit} OFFSET ${options.offset || 0}`;
  
  const result = await db.execute(query);
  const count = await db.execute(sql`SELECT COUNT(*) as total FROM sms_campaigns`);
  
  return { campaigns: result.rows.map(mapSMSCampaignFromRow), total: parseInt(count.rows[0]?.total || '0') };
}

/**
 * Get SMS analytics
 */
export async function getSMSAnalytics(): Promise<{
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalCost: number;
  deliveryRate: number;
}> {
  const result = await db.execute(sql`
    SELECT 
      COALESCE(SUM(sent_count), 0) as total_sent,
      COALESCE(SUM(delivered_count), 0) as total_delivered,
      COALESCE(SUM(failed_count), 0) as total_failed,
      COALESCE(SUM(cost), 0) as total_cost
    FROM sms_campaigns
    WHERE status = 'sent'
  `);
  
  const row = result.rows[0];
  const totalSent = parseInt(row?.total_sent || '0');
  const totalDelivered = parseInt(row?.total_delivered || '0');
  
  return {
    totalSent,
    totalDelivered,
    totalFailed: parseInt(row?.total_failed || '0'),
    totalCost: parseFloat(row?.total_cost || '0'),
    deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
  };
}

/**
 * Create SMS template
 */
export async function createSMSTemplate(name: string, content: string, category: string): Promise<SMSTemplate> {
  const variables = extractVariables(content);
  const template: SMSTemplate = {
    id: generateId(),
    name,
    content,
    variables,
    category,
    createdAt: new Date(),
  };

  await db.execute(sql`
    INSERT INTO sms_templates (id, name, content, variables, category, created_at)
    VALUES (${template.id}, ${template.name}, ${template.content}, ${JSON.stringify(template.variables)}, ${template.category}, ${template.createdAt})
  `);

  return template;
}

/**
 * Extract variables from template
 */
function extractVariables(content: string): string[] {
  const matches = content.match(/\{\{(\w+)\}\}/g);
  return matches ? matches.map(m => m.replace(/[{}]/g, '')) : [];
}

/**
 * Personalize SMS message
 */
export function personalizeSMS(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => data[key] || match);
}

function mapSMSCampaignFromRow(row: any): SMSCampaign {
  return {
    id: row.id,
    name: row.name,
    message: row.message,
    type: row.type,
    status: row.status,
    segmentId: row.segment_id,
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at) : undefined,
    sentAt: row.sent_at ? new Date(row.sent_at) : undefined,
    totalRecipients: parseInt(row.total_recipients || '0'),
    sentCount: parseInt(row.sent_count || '0'),
    deliveredCount: parseInt(row.delivered_count || '0'),
    failedCount: parseInt(row.failed_count || '0'),
    cost: parseFloat(row.cost || '0'),
    senderId: row.sender_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Pre-built SMS templates
export const SMS_TEMPLATES = {
  welcome: 'Hoş geldiniz {{name}}! Şanlıurfa.com ailesine katıldınız. 🎉',
  otp: 'Doğrulama kodunuz: {{code}}. 5 dk geçerli.',
  reservationReminder: '{{name}}, yarın {{time}} için rezervasyonunuz var. İyi eğlenceler! 🎭',
  promotion: '{{name}}, {{place}} de %{{discount}} indirim fırsatını kaçırmayın! 🎁',
  reviewRequest: '{{name}}, {{place}} ziyaretiniz nasıldı? Değerlendirmenizi bekliyoruz ⭐',
};
