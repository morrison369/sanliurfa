import type { EmailCampaign } from './email-campaigns.types';

function parseSegmentFilters(value: unknown): Record<string, any> | undefined {
  if (!value) {
    return undefined;
  }

  if (typeof value === 'object') {
    return value as Record<string, any>;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

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
    segmentFilters: parseSegmentFilters(result.segment_filters),
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
