# DB Index Review Plan

- Generated at: 2026-05-15T12:07:47.618Z
- Status: advisory
- Reviewable indexes: 766
- High risk keep/review: 505
- Medium risk review: 261
- Automatic index drop allowed: false
- Earliest action after: 2026-05-29T12:07:47.159Z

## Policy

- idx_scan=0 tek basina drop karari degildir.
- Unique/constraint indexler bu plana zaten dahil edilmez.
- High risk indexler EXPLAIN ve owner onayi olmadan drop adayi sayilmaz.

## Largest Candidate Tables

| Table | Candidate Count |
|---|---:|
| places | 12 |
| users | 10 |
| blog_posts | 8 |
| notifications | 8 |
| page_views | 8 |
| comments | 7 |
| reviews | 6 |
| audit_logs | 5 |
| email_queue | 5 |
| email_templates | 5 |
| messages | 5 |
| moderation_actions | 5 |
| promotions | 5 |
| reports | 5 |
| reservations | 5 |
| support_tickets | 5 |
| user_achievements | 5 |
| webhook_deliveries | 5 |
| api_keys | 4 |
| campaign_events | 4 |
| client_performance_metrics | 4 |
| email_campaigns | 4 |
| events | 4 |
| followers | 4 |
| loyalty_transactions | 4 |

## High Risk Sample

| Table | Index | Size MB | Action | Reason |
|---|---|---:|---|---|
| blog_posts | idx_blog_posts_search | 0.73 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| social_event_store | idx_social_event_store_tenant_event_created | 0.05 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| user_social_stats | idx_social_stats_user | 0.05 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| users | idx_users_points | 0.05 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| user_activities | idx_activities_type | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| conversations | idx_conversations_participant_a | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| conversations | idx_conversations_participant_b | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| direct_messages | idx_direct_messages_conversation | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| direct_messages | idx_direct_messages_sender | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| direct_messages | idx_direct_messages_unread | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| social_event_store | idx_social_event_store_actor_target | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| user_follows | idx_user_follows_follower | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| user_follows | idx_user_follows_following | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| user_match_profiles | idx_user_match_profiles_discoverable | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| users | idx_users_email_verified | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| users | idx_users_language | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| users | idx_users_last_login_at | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| users | idx_users_level | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| users | idx_users_onboarding_completed | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| users | idx_users_username | 0.04 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| user_follows | idx_user_follows_follower_created | 0.03 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| reviews | idx_reviews_search_vector | 0.02 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| two_factor_audit | idx_2fa_audit_user | 0.02 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| blocked_users | idx_blocked_users_blocked | 0.02 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| blocked_users | idx_blocked_users_user | 0.02 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| blog_posts | idx_blog_posts_category | 0.02 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| blog_posts | idx_blog_posts_category_id | 0.02 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| blog_posts | idx_blog_posts_created_at | 0.02 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| blog_posts | idx_blog_posts_featured | 0.02 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |
| blog_posts | idx_blog_posts_is_featured | 0.02 | keep_until_explain_review | Kritik runtime/auth/social/content tablo veya sorgu paterni; idx_scan=0 tek basina drop kaniti degildir. |

## Medium Risk Sample

| Table | Index | Size MB | Action | Reason |
|---|---|---:|---|---|
| client_performance_metrics | idx_perf_metrics_timestamp | 0.27 | observe_and_explain_review | Analytics/ops agirlikli index; 14 gun production gozlemi ve EXPLAIN sonrasi manuel PR ile degerlendirilebilir. |
| autocomplete_index | idx_autocomplete_completion_trgm | 0.03 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| autocomplete_index | idx_autocomplete_prefix | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| badge_definitions | idx_badge_definitions_category | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| bus_schedules | idx_bus_schedules_route | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| conversation_participants | idx_conv_participants_conv | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| events | idx_events_properties | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| homepage_sections | idx_homepage_sections_active_sort | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| loyalty_points | idx_loyalty_balance | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| client_performance_metrics | idx_perf_lcp_poor | 0.02 | observe_and_explain_review | Analytics/ops agirlikli index; 14 gun production gozlemi ve EXPLAIN sonrasi manuel PR ile degerlendirilebilir. |
| pharmacies | idx_pharmacies_district | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| seo_overrides | idx_seo_overrides_entity | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| site_change_audit | idx_site_change_audit_key_time | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| site_media_assets | idx_site_media_assets_key | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| site_service_entries | idx_site_service_entries_group_sort | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| site_setting_versions | idx_site_setting_versions_key | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| site_settings | idx_site_settings_key | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| site_settings | idx_site_settings_updated_at | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| support_tickets | idx_support_tickets_assigned | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| ux_metrics_daily | idx_ux_metrics_daily_date | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| zero_result_searches | idx_zero_result_unresolved | 0.02 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| ab_test_results | idx_ab_test_results | 0.01 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| ab_test_variants | idx_ab_variants_campaign | 0.01 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| account_deletions | idx_account_deletions_scheduled | 0.01 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| account_flags | idx_account_flags_active | 0.01 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| achievements | idx_achievements_category | 0.01 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| active_alerts | idx_active_alerts_rule | 0.01 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| active_alerts | idx_active_alerts_unresolved | 0.01 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| activity_likes | idx_activity_likes_activity | 0.01 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
| advertisements | idx_ads_vendor | 0.01 | manual_ownership_review | Owner/source ve query plan kaniti olmadan drop yapilmaz. |
