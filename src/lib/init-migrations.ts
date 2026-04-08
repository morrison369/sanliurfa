/**
 * Uygulama başlangıcında migrasyonları otomatik olarak çalıştır
 * Bu dosya middleware.ts veya astro.config.mjs'den import edilmeli
 */

import { runMigrations } from './migrations';
import { logger } from './logging';
import { initializeDefaultEmailTemplates } from './subscription-email-notifications';
import { migration_001_initial_schema } from '../migrations/001_initial_schema';
import { migration_002_audit_logging } from '../migrations/002_audit_logging';
import { migration_003_fulltext_search } from '../migrations/003_fulltext_search';
import { migration_004_webhooks } from '../migrations/004_webhooks';
import { migration_005_analytics } from '../migrations/005_analytics';
import { migration_006_roles_permissions } from '../migrations/006_roles_permissions';
import { migration_007_api_keys } from '../migrations/007_api_keys';
import { migration_008_push_subscriptions } from '../migrations/008_push_subscriptions';
import { migration_009_notifications } from '../migrations/009_notifications';
import { migration_010_saved_searches } from '../migrations/010_saved_searches';
import { migration_011_vendor_and_community } from '../migrations/011_vendor_and_community';
import { migration_012_premium_and_content } from '../migrations/012_premium_and_content';
import { migration_013_email_preferences } from '../migrations/013_email_preferences';
import { migration_014_vendor_onboarding } from '../migrations/014_vendor_onboarding';
import { migration_015_user_onboarding } from '../migrations/015_user_onboarding';
import { migration_016_scheduled_reports } from '../migrations/016_scheduled_reports';
import { migration_017_internationalization } from '../migrations/017_internationalization';
import { migration_018_email_campaigns } from '../migrations/018_email_campaigns';
import { migration_025_email_marketing } from '../migrations/025_email_marketing';
import { migration_026_user_activity } from '../migrations/026_user_activity';
import { migration_027_direct_messages } from '../migrations/027_direct_messages';
import { migration_028_followers } from '../migrations/028_followers';
import { migration_029_comments } from '../migrations/029_comments';
import { migration_030_user_settings } from '../migrations/030_user_settings';
import { migration_031_content_moderation } from '../migrations/031_content_moderation';
import { migration_032_user_blocking } from '../migrations/032_user_blocking';
import { migration_033_email_verification } from '../migrations/033_email_verification';
import { migration_034_account_deletion } from '../migrations/034_account_deletion';
import { migration_035_place_collections } from '../migrations/035_place_collections';
import { migration_037_review_voting } from '../migrations/037_review_voting';
import { migration_038_email_queue } from '../migrations/038_email_queue';
import { migration_039_user_searches } from '../migrations/039_user_searches';
import { migration_040_place_photos } from '../migrations/040_place_photos';
import { migration_041_points_rewards } from '../migrations/041_points_rewards';
import { migration_042_place_followers } from '../migrations/042_place_followers';
import { migration_043_activity_feed } from '../migrations/043_activity_feed';
import { migration_044_place_visits } from '../migrations/044_place_visits';
import { migration_045_place_verification } from '../migrations/045_place_verification';
import { migration_046_place_badges } from '../migrations/046_place_badges';
import { migration_048_events_enhancements } from '../migrations/048_events_enhancements';
import { migration_049_promotions } from '../migrations/049_promotions';
import { migration_050_business_analytics } from '../migrations/050_business_analytics';
import { migration_051_subscriptions } from '../migrations/051_subscriptions';
import { migration_052_premium_features } from '../migrations/052_premium_features';
import { migration_053_subscription_admin } from '../migrations/053_subscription_admin';
import { migration_054_email_notifications } from '../migrations/054_email_notifications';
import { migration_055_oauth_support } from '../migrations/055_oauth_support';
import { migration_056_two_factor_auth } from '../migrations/056_two_factor_auth';
import { migration_057_privacy_settings } from '../migrations/057_privacy_settings';
import { migration_058_performance_metrics } from '../migrations/058_performance_metrics';
import { migration_059_webhooks } from '../migrations/059_webhooks';
import { migration_060_webhook_analytics } from '../migrations/060_webhook_analytics';
import { migration_061_webhook_filters_settings } from '../migrations/061_webhook_filters_settings';
import { migration_062_webhook_advanced } from '../migrations/062_webhook_advanced';
import { migration_063_featured_listings } from '../migrations/063_featured_listings';
import { migration_064_marketing_campaigns } from '../migrations/064_marketing_campaigns';
import { migration_065_loyalty_points } from '../migrations/065_loyalty_points';
import { migration_066_loyalty_tiers } from '../migrations/066_loyalty_tiers';
import { migration_067_loyalty_achievements } from '../migrations/067_loyalty_achievements';
import { migration_068_rewards_catalog } from '../migrations/068_rewards_catalog';
import { migration_069_review_responses } from '../migrations/069_review_responses';
import { migration_070_review_sentiment } from '../migrations/070_review_sentiment';
import { migration_071_review_moderation } from '../migrations/071_review_moderation';
import { migration_072_email_templates } from '../migrations/072_email_templates';
import { migration_073_email_campaigns } from '../migrations/073_email_campaigns';
import { migration_074_email_queue } from '../migrations/074_email_queue';
import { migration_075_notification_preferences } from '../migrations/075_notification_preferences';
import { migration_076_social_interactions } from '../migrations/076_social_interactions';
import { migration_077_trending_and_recommendations } from '../migrations/077_trending_and_recommendations';
import { migration_078_user_behavior_tracking } from '../migrations/078_user_behavior_tracking';
import { migration_079_business_metrics } from '../migrations/079_business_metrics';
import { migration_080_conversion_tracking } from '../migrations/080_conversion_tracking';
import { migration_081_admin_dashboard } from '../migrations/081_admin_dashboard';
import { migration_082_advanced_moderation } from '../migrations/082_advanced_moderation';
import { migration_083_user_management_audit } from '../migrations/083_user_management_audit';
import { migration_084_push_subscriptions } from '../migrations/084_push_subscriptions';
import { migration_085_notification_history } from '../migrations/085_notification_history';
import { migration_086_notification_delivery } from '../migrations/086_notification_delivery';
import { migration_087_search_history } from '../migrations/087_search_history';
import { migration_088_search_filters } from '../migrations/088_search_filters';
import { migration_089_search_suggestions } from '../migrations/089_search_suggestions';
import { migration_090_reputation_badges } from '../migrations/090_reputation_badges';
import { migration_091_achievements_leaderboards } from '../migrations/091_achievements_leaderboards';
import { migration_092_community_roles } from '../migrations/092_community_roles';
import { migration_093_loyalty_points } from '../migrations/093_loyalty_points';
import { migration_094_rewards_catalog } from '../migrations/094_rewards_catalog';
import { migration_095_loyalty_tiers } from '../migrations/095_loyalty_tiers';
import { migration_096_business_metrics } from '../migrations/096_business_metrics';
import { migration_097_business_dashboard } from '../migrations/097_business_dashboard';
import { migration_098_business_insights } from '../migrations/098_business_insights';
import { migration_099_search_intelligence } from '../migrations/099_search_intelligence';
import { migration_100_search_personalization } from '../migrations/100_search_personalization';
import { migration_101_content_library } from '../migrations/101_content_library';
import { migration_102_file_management } from '../migrations/102_file_management';
import { migration_103_content_publishing } from '../migrations/103_content_publishing';
import { migration_104_marketing_campaigns } from '../migrations/104_marketing_campaigns';
import { migration_105_user_segments } from '../migrations/105_user_segments';
import { migration_106_marketing_automation } from '../migrations/106_marketing_automation';
import { migration_107_oauth_support } from '../migrations/107_oauth_support';
import { migration_108_two_factor_auth } from '../migrations/108_two_factor_auth';
import { migration_109_rate_limiting } from '../migrations/109_rate_limiting';
import { migration_110_security_audit } from '../migrations/110_security_audit';
import { migration_111_cohort_analysis } from '../migrations/111_cohort_analysis';
import { migration_112_user_journey } from '../migrations/112_user_journey';
import { migration_113_conversion_funnel } from '../migrations/113_conversion_funnel';
import { migration_114_predictive_analytics } from '../migrations/114_predictive_analytics';
import { migration_115_s3_file_storage } from '../migrations/115_s3_file_storage';
import { migration_116_video_processing } from '../migrations/116_video_processing';
import { migration_117_collaborative_editing } from '../migrations/117_collaborative_editing';
import { migration_118_hashtags_trending } from '../migrations/118_hashtags_trending';
import { migration_119_user_follows } from '../migrations/119_user_follows';
import { migration_120_activity_feed } from '../migrations/120_activity_feed';
import { migration_121_mentions_shares } from '../migrations/121_mentions_shares';
import { migration_122_multi_tenant } from '../migrations/122_multi_tenant';
import { migration_123_notification_channels } from '../migrations/123_notification_channels';
import { migration_124_trending_recommendations } from '../migrations/124_trending_recommendations';
import { migration_125_advanced_analytics } from '../migrations/125_advanced_analytics';
import { migration_126_data_warehouse } from '../migrations/126_data_warehouse';

// Tüm migrasyonlar
const ALL_MIGRATIONS = [
  migration_001_initial_schema,
  migration_002_audit_logging,
  migration_003_fulltext_search,
  migration_004_webhooks,
  migration_005_analytics,
  migration_006_roles_permissions,
  migration_007_api_keys,
  migration_008_push_subscriptions,
  migration_009_notifications,
  migration_010_saved_searches,
  migration_011_vendor_and_community,
  migration_012_premium_and_content,
  migration_013_email_preferences,
  migration_014_vendor_onboarding,
  migration_015_user_onboarding,
  migration_016_scheduled_reports,
  migration_017_internationalization,
  migration_018_email_campaigns,
  migration_025_email_marketing,
  migration_026_user_activity,
  migration_027_direct_messages,
  migration_028_followers,
  migration_029_comments,
  migration_030_user_settings,
  migration_031_content_moderation,
  migration_032_user_blocking,
  migration_033_email_verification,
  migration_034_account_deletion,
  migration_035_place_collections,
  migration_037_review_voting,
  migration_038_email_queue,
  migration_039_user_searches,
  migration_040_place_photos,
  migration_041_points_rewards,
  migration_042_place_followers,
  migration_043_activity_feed,
  migration_044_place_visits,
  migration_045_place_verification,
  migration_046_place_badges,
  migration_048_events_enhancements,
  migration_049_promotions,
  migration_050_business_analytics,
  migration_051_subscriptions,
  migration_052_premium_features,
  migration_053_subscription_admin,
  migration_054_email_notifications,
  migration_055_oauth_support,
  migration_056_two_factor_auth,
  migration_057_privacy_settings,
  migration_058_performance_metrics,
  migration_059_webhooks,
  migration_060_webhook_analytics,
  migration_061_webhook_filters_settings,
  migration_062_webhook_advanced,
  migration_063_featured_listings,
  migration_064_marketing_campaigns,
  migration_065_loyalty_points,
  migration_066_loyalty_tiers,
  migration_067_loyalty_achievements,
  migration_068_rewards_catalog,
  migration_069_review_responses,
  migration_070_review_sentiment,
  migration_071_review_moderation,
  migration_072_email_templates,
  migration_073_email_campaigns,
  migration_074_email_queue,
  migration_075_notification_preferences,
  migration_076_social_interactions,
  migration_077_trending_and_recommendations,
  migration_078_user_behavior_tracking,
  migration_079_business_metrics,
  migration_080_conversion_tracking,
  migration_081_admin_dashboard,
  migration_082_advanced_moderation,
  migration_083_user_management_audit,
  migration_084_push_subscriptions,
  migration_085_notification_history,
  migration_086_notification_delivery,
  migration_087_search_history,
  migration_088_search_filters,
  migration_089_search_suggestions,
  migration_090_reputation_badges,
  migration_091_achievements_leaderboards,
  migration_092_community_roles,
  migration_093_loyalty_points,
  migration_094_rewards_catalog,
  migration_095_loyalty_tiers,
  migration_096_business_metrics,
  migration_097_business_dashboard,
  migration_098_business_insights,
  migration_099_search_intelligence,
  migration_100_search_personalization,
  migration_101_content_library,
  migration_102_file_management,
  migration_103_content_publishing,
  migration_104_marketing_campaigns,
  migration_105_user_segments,
  migration_106_marketing_automation,
  migration_107_oauth_support,
  migration_108_two_factor_auth,
  migration_109_rate_limiting,
  migration_110_security_audit,
  migration_111_cohort_analysis,
  migration_112_user_journey,
  migration_113_conversion_funnel,
  migration_114_predictive_analytics,
  migration_115_s3_file_storage,
  migration_116_video_processing,
  migration_117_collaborative_editing,
  migration_118_hashtags_trending,
  migration_119_user_follows,
  migration_120_activity_feed,
  migration_121_mentions_shares,
  migration_122_multi_tenant,
  migration_123_notification_channels,
  migration_124_trending_recommendations,
  migration_125_advanced_analytics,
  migration_126_data_warehouse
];

let migrationsInitialized = false;

/**
 * Migrasyonları başlat (güvenli - sadece bir kez çalışır)
 */
export async function initializeMigrations(): Promise<void> {
  if (migrationsInitialized) {
    return;
  }

  try {
    migrationsInitialized = true;
    logger.info('Migrasyonlar başlatılıyor...');
    await runMigrations(ALL_MIGRATIONS);
    logger.info('Migrasyonlar başarıyla tamamlandı');

    // Initialize default email templates
    logger.info('Email template\'leri başlatılıyor...');
    await initializeDefaultEmailTemplates();
    logger.info('Email template\'leri hazırlandı');
  } catch (error) {
    logger.error('Migrasyon hatası', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

/**
 * Migrasyonların başlatılıp başlatılmadığını kontrol et
 */
export function areMigrationsInitialized(): boolean {
  return migrationsInitialized;
}
