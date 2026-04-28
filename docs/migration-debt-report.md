# Migration Duplicate Debt Report

- Generated At: 2026-04-28T23:14:48.886Z
- Status: clear
- Duplicate Number Groups: 3
- Duplicate Slug Groups: 14
- Known Duplicate Number Groups: 3
- Known Duplicate Slug Groups: 14
- New Duplicate Number Groups: 0
- New Duplicate Slug Groups: 0

## New Duplicate Numbers

- Yok

## New Duplicate Slugs

- Yok

## Known Baseline Duplicate Numbers

- 120: 120_activity_feed.ts, 120_blog_system.ts
- 121: 121_mentions_shares.ts, 121_notifications_v2.ts
- 122: 122_analytics_v2.ts, 122_multi_tenant.ts

## Known Baseline Duplicate Slugs

- push_subscriptions: 008_push_subscriptions.ts, 084_push_subscriptions.ts
- email_campaigns: 018_email_campaigns.ts, 073_email_campaigns.ts
- blog_system: 020_blog_system.ts, 120_blog_system.ts
- missing_tables: 024_missing_tables.ts, 138_missing_tables.ts
- email_queue: 038_email_queue.ts, 074_email_queue.ts
- activity_feed: 043_activity_feed.ts, 120_activity_feed.ts
- oauth_support: 055_oauth_support.ts, 107_oauth_support.ts
- two_factor_auth: 056_two_factor_auth.ts, 108_two_factor_auth.ts
- marketing_campaigns: 064_marketing_campaigns.ts, 104_marketing_campaigns.ts
- loyalty_points: 065_loyalty_points.ts, 093_loyalty_points.ts
- loyalty_tiers: 066_loyalty_tiers.ts, 095_loyalty_tiers.ts
- rewards_catalog: 068_rewards_catalog.ts, 094_rewards_catalog.ts
- business_metrics: 079_business_metrics.ts, 096_business_metrics.ts
- rate_limiting: 109_rate_limiting.ts, 132_rate_limiting.ts

## Recommendation

Tarihi migration duplicate kayitlari baseline ile sinirli. DB gecmisini bozmamak icin dosya rename yapilmadi; yeni duplicate regresyonlari gate tarafindan yakalanir.
