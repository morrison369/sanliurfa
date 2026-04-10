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
