import type { EmailCampaign } from './email-campaigns.types';

export function mapEmailCampaignRow(result: Record<string, any>): EmailCampaign {
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
}
