// Stub for feature-gating module

export type FeatureName = 
  | 'advanced_search'
  | 'custom_analytics'
  | 'api_access'
  | 'webhooks'
  | 'priority_support'
  | 'white_label'
  | 'team_collaboration'
  | 'export_data'
  | 'ai_recommendations'
  | 'bulk_operations';

export function hasFeatureAccess(userId: string, feature: FeatureName): boolean {
  return true;
}

export function getEnabledFeatures(userId: string): FeatureName[] {
  return [];
}

export function isFeatureEnabled(feature: FeatureName): boolean {
  return true;
}
