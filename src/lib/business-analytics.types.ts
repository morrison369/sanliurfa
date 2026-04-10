export interface PlaceAnalytics {
  placeId: string;
  placeName: string;
  totalVisitors: number;
  avgRating: number;
  reviewCount: number;
  followerCount: number;
  eventCount: number;
  promotionCount: number;
  visitTrend: number;
  reviewTrend: number;
  ratingDistribution: { rating: number; count: number }[];
}

export interface VisitorStats {
  date: string;
  visitorCount: number;
  uniqueVisitors: number;
  peakHour?: string;
}

export interface ReviewAnalysis {
  totalReviews: number;
  averageRating: number;
  positiveCount: number;
  neutralCount: number;
  negativeCount: number;
  topKeywords: { keyword: string; frequency: number }[];
  recentReviews: any[];
}

export interface PromotionMetrics {
  promotionId: string;
  title: string;
  discountValue: number;
  totalRedemptions: number;
  totalSavings: number;
  conversionRate: number;
  averageOrderValue: number;
}

export interface KPIDefinition {
  id: string;
  key: string;
  name: string;
  description?: string;
  formula?: string;
  unit?: string;
  target_value?: number;
  alert_threshold?: number;
  category?: string;
  owner_id?: string;
  is_active: boolean;
}

export interface KPIValue {
  id: string;
  kpi_id: string;
  value: number;
  target_value?: number;
  period_date: string;
  period_type: string;
  is_final: boolean;
}

export interface BusinessMetrics {
  id: string;
  metric_date: string;
  revenue: number;
  user_count: number;
  active_users: number;
  new_users: number;
  engagement_rate: number;
  churn_rate: number;
  retention_rate: number;
  conversion_rate: number;
  avg_session_duration: number;
  page_views: number;
  bounce_rate: number;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  is_public: boolean;
  layout?: any;
  widgets?: any;
  refresh_interval: number;
}

export interface Report {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  report_type?: string;
  metric_ids?: string[];
  filters?: any;
  schedule?: string;
  next_run_at?: string;
  format: string;
  recipients?: string[];
  is_active: boolean;
}
