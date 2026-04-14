/**
 * Newsletter System
 * Email subscription and campaign management
 */

import { query } from '../postgres';
import { queueEmail } from '../email';

export interface Subscriber {
  id: string;
  email: string;
  name?: string;
  status: 'active' | 'unsubscribed' | 'bounced';
  preferences: NewsletterPreferences;
  subscribed_at: Date;
}

export interface NewsletterPreferences {
  weekly_digest: boolean;
  new_places: boolean;
  events: boolean;
  blog_posts: boolean;
}

export interface NewsletterCampaign {
  id: string;
  subject: string;
  content_html: string;
  content_text: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  scheduled_at?: Date;
  sent_at?: Date;
  recipient_count: number;
  open_count: number;
  click_count: number;
}

const DEFAULT_PREFERENCES: NewsletterPreferences = {
  weekly_digest: true,
  new_places: true,
  events: true,
  blog_posts: true,
};

/**
 * Subscribe to newsletter
 */
export async function subscribe(
  email: string,
  name?: string,
  preferences?: Partial<NewsletterPreferences>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if already subscribed
    const existing = await query(
      'SELECT id FROM newsletter_subscribers WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      // Update existing subscription
      await query(
        `UPDATE newsletter_subscribers 
         SET status = 'active', 
             name = COALESCE($2, name),
             preferences = preferences || $3::jsonb,
             updated_at = NOW()
         WHERE email = $1`,
        [email.toLowerCase(), name, JSON.stringify({ ...DEFAULT_PREFERENCES, ...preferences })]
      );
    } else {
      // Create new subscription
      await query(
        `INSERT INTO newsletter_subscribers (email, name, preferences, status, subscribed_at)
         VALUES ($1, $2, $3, 'active', NOW())`,
        [email.toLowerCase(), name, JSON.stringify({ ...DEFAULT_PREFERENCES, ...preferences })]
      );
    }

    // Send welcome email
    await sendWelcomeEmail(email, name);

    return { success: true };
  } catch (error) {
    console.error('Subscribe error:', error);
    return { success: false, error: 'Failed to subscribe' };
  }
}

/**
 * Unsubscribe from newsletter
 */
export async function unsubscribe(email: string, token?: string): Promise<boolean> {
  try {
    const result = await query(
      `UPDATE newsletter_subscribers 
       SET status = 'unsubscribed', unsubscribed_at = NOW()
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    return result.rowCount > 0;
  } catch (error) {
    console.error('Unsubscribe error:', error);
    return false;
  }
}

/**
 * Get subscribers
 */
export async function getSubscribers(options: {
  status?: 'active' | 'unsubscribed' | 'all';
  limit?: number;
  offset?: number;
} = {}): Promise<{ subscribers: Subscriber[]; total: number }> {
  const { status = 'active', limit = 100, offset = 0 } = options;

  let sql = 'SELECT * FROM newsletter_subscribers';
  const params: any[] = [];

  if (status !== 'all') {
    sql += ' WHERE status = $1';
    params.push(status);
  }

  sql += ' ORDER BY subscribed_at DESC';

  const countResult = await query(
    `SELECT COUNT(*) as total FROM newsletter_subscribers ${status !== 'all' ? 'WHERE status = $1' : ''}`,
    status !== 'all' ? [status] : []
  );

  const result = await query(sql + ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return {
    subscribers: result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      status: row.status,
      preferences: row.preferences,
      subscribed_at: new Date(row.subscribed_at),
    })),
    total: parseInt(countResult.rows[0].total),
  };
}

/**
 * Create newsletter campaign
 */
export async function createCampaign(data: {
  subject: string;
  content_html: string;
  content_text: string;
  scheduled_at?: Date;
}): Promise<string> {
  const result = await query(
    `INSERT INTO newsletter_campaigns (subject, content_html, content_text, status, scheduled_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      data.subject,
      data.content_html,
      data.content_text,
      data.scheduled_at ? 'scheduled' : 'draft',
      data.scheduled_at,
    ]
  );

  return result.rows[0].id;
}

/**
 * Send campaign to subscribers
 */
export async function sendCampaign(campaignId: string): Promise<{ sent: number; failed: number }> {
  // Get campaign
  const campaignResult = await query(
    'SELECT * FROM newsletter_campaigns WHERE id = $1',
    [campaignId]
  );

  if (campaignResult.rows.length === 0) {
    throw new Error('Campaign not found');
  }

  const campaign = campaignResult.rows[0];

  // Update status
  await query(
    "UPDATE newsletter_campaigns SET status = 'sending' WHERE id = $1",
    [campaignId]
  );

  // Get active subscribers
  const subscribersResult = await query(
    "SELECT email, name FROM newsletter_subscribers WHERE status = 'active'"
  );

  let sent = 0;
  let failed = 0;

  // Queue emails
  for (const subscriber of subscribersResult.rows) {
    try {
      // Personalize content
      const html = campaign.content_html.replace(/{{name}}/g, subscriber.name || 'Değerli Üyemiz');
      const text = campaign.content_text.replace(/{{name}}/g, subscriber.name || 'Değerli Üyemiz');

      await queueEmail({
        to: subscriber.email,
        subject: campaign.subject,
        html,
        text,
      });

      sent++;
    } catch {
      failed++;
    }
  }

  // Update campaign
  await query(
    `UPDATE newsletter_campaigns 
     SET status = 'sent', sent_at = NOW(), recipient_count = $2
     WHERE id = $1`,
    [campaignId, sent]
  );

  return { sent, failed };
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(email: string, name?: string): Promise<void> {
  const html = `
    <h1>Hoşgeldiniz!</h1>
    <p>Merhaba ${name || ''},</p>
    <p>Şanlıurfa.com bültenine abone olduğunuz için teşekkür ederiz.</p>
    <p>En güncel haberleri ve fırsatları kaçırmayın!</p>
  `;

  await queueEmail({
    to: email,
    subject: 'Bülten Aboneliğiniz Başladı - Şanlıurfa.com',
    html,
    text: 'Bültenimize hoşgeldiniz!',
  });
}

/**
 * Get campaign stats
 */
export async function getCampaignStats(campaignId: string): Promise<{
  subject: string;
  status: string;
  recipient_count: number;
  open_count: number;
  click_count: number;
  open_rate: number;
  click_rate: number;
}> {
  const result = await query(
    'SELECT * FROM newsletter_campaigns WHERE id = $1',
    [campaignId]
  );

  if (result.rows.length === 0) {
    throw new Error('Campaign not found');
  }

  const campaign = result.rows[0];
  const open_rate = campaign.recipient_count > 0
    ? (campaign.open_count / campaign.recipient_count) * 100
    : 0;
  const click_rate = campaign.recipient_count > 0
    ? (campaign.click_count / campaign.recipient_count) * 100
    : 0;

  return {
    subject: campaign.subject,
    status: campaign.status,
    recipient_count: campaign.recipient_count,
    open_count: campaign.open_count,
    click_count: campaign.click_count,
    open_rate: Math.round(open_rate * 100) / 100,
    click_rate: Math.round(click_rate * 100) / 100,
  };
}
