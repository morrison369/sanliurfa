# Migration Duplicate Remediation

Generated from `docs/migration-duplicate-report.json`.

## Current Advisory

- Duplicate number groups: `3`
- Duplicate slug groups: `14`
- Gate status: baseline duplicates present, no new regressions

## Why This Is Advisory

The migration runner stores the executed migration version from the filename, for example `120_blog_system`.
Renaming old migration files directly can make production treat already-applied migrations as pending. That can
rerun DDL and data backfills unexpectedly.

## Safe Resolution Plan

1. Keep existing migration filenames stable until production `schema_migrations` is mapped.
2. Export production `schema_migrations.version` and compare it with `src/migrations/*.ts`.
3. For duplicate number groups, create a compatibility mapping plan before any rename.
4. If a rename is required, ship a tracking-table-only migration that updates `schema_migrations.version`
   and `schema_migrations.filename` atomically before the source rename lands.
5. For duplicate slug groups, decide case by case whether the later migration is an intentional v2 alignment
   or an obsolete duplicate.
6. After every resolved group, run:
   `npm run db:migrate:check-duplicates`
7. Only update `docs/migration-duplicate-baseline.json` after the duplicate group count decreases.

## Duplicate Number Groups

| Number | Files | Action |
|---|---|---|
| `120` | `120_activity_feed.ts`, `120_blog_system.ts` | Requires production tracking map before rename |
| `121` | `121_mentions_shares.ts`, `121_notifications_v2.ts` | Requires production tracking map before rename |
| `122` | `122_analytics_v2.ts`, `122_multi_tenant.ts` | Requires production tracking map before rename |

## Duplicate Slug Groups

| Slug | Files | Action |
|---|---|---|
| `push_subscriptions` | `008_push_subscriptions.ts`, `084_push_subscriptions.ts` | Review v2 intent |
| `email_campaigns` | `018_email_campaigns.ts`, `073_email_campaigns.ts` | Review v2 intent |
| `blog_system` | `020_blog_system.ts`, `120_blog_system.ts` | Review v2 intent |
| `missing_tables` | `024_missing_tables.ts`, `138_missing_tables.ts` | Review v2 intent |
| `email_queue` | `038_email_queue.ts`, `074_email_queue.ts` | Review v2 intent |
| `activity_feed` | `043_activity_feed.ts`, `120_activity_feed.ts` | Review v2 intent |
| `oauth_support` | `055_oauth_support.ts`, `107_oauth_support.ts` | Review v2 intent |
| `two_factor_auth` | `056_two_factor_auth.ts`, `108_two_factor_auth.ts` | Review v2 intent |
| `marketing_campaigns` | `064_marketing_campaigns.ts`, `104_marketing_campaigns.ts` | Review v2 intent |
| `loyalty_points` | `065_loyalty_points.ts`, `093_loyalty_points.ts` | Review v2 intent |
| `loyalty_tiers` | `066_loyalty_tiers.ts`, `095_loyalty_tiers.ts` | Review v2 intent |
| `rewards_catalog` | `068_rewards_catalog.ts`, `094_rewards_catalog.ts` | Review v2 intent |
| `business_metrics` | `079_business_metrics.ts`, `096_business_metrics.ts` | Review v2 intent |
| `rate_limiting` | `109_rate_limiting.ts`, `132_rate_limiting.ts` | Review v2 intent |
