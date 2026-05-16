# DB Production Version Compare Report

- Generated at: 2026-05-15T12:07:47.536Z
- Status: ok
- Database source: DATABASE_URL
- Database target: localhost:5432/sanliurfa
- Source migration files: 188
- DB schema_migrations rows: 192
- Applied source matches: 188
- Source pending/unmatched: 0
- DB-only migrations: 4

## Database Runtime

- PostgreSQL: PostgreSQL 16.11, compiled by Visual C++ build 1944, 64-bit
- Current database: sanliurfa
- Server port: 5432

## Recent Applied Migrations

| Version | Filename | Executed At |
|---|---|---|
| 185_place_external_provenance | 185_place_external_provenance.ts | 2026-05-14T00:09:46.399Z |
| 184_homepage_cta_theme_defaults | 184_homepage_cta_theme_defaults.ts | 2026-05-13T15:47:14.217Z |
| 183_match_profile_filters | 183_match_profile_filters.ts | 2026-05-13T03:05:18.212Z |
| 182_backfill_user_activities | 182_backfill_user_activities.ts | 2026-05-13T03:05:18.173Z |
| 181_drop_legacy_duplicate_tables | 181_drop_legacy_duplicate_tables.ts | 2026-05-13T03:05:18.134Z |
| 180_event_submissions_and_integrity | 180_event_submissions_and_integrity.ts | 2026-05-13T03:05:18.073Z |
| 179_historical_sites_default_status | 179_historical_sites_default_status.ts | 2026-05-13T03:05:18.040Z |
| 178_csp_violations | 178_csp_violations.ts | 2026-05-11T20:01:56.677Z |
| 177_ssr_perf_metrics | 177_ssr_perf_metrics.ts | 2026-05-11T20:01:56.586Z |
| 176_turkish_fts | 176_turkish_fts.ts | 2026-05-11T20:01:56.523Z |
| 175_historical_site_reviews | 175_historical_site_reviews.ts | 2026-05-11T20:01:56.480Z |
| 174_place_claims | 174_place_claims.ts | 2026-05-08T15:10:46.198Z |
| 173_community_photos | 173_community_photos.ts | 2026-05-08T15:10:46.110Z |
| 173_ux_metrics_daily_table | 173_ux_metrics_daily_table.ts | 2026-05-01T12:32:01.204Z |
| 172_loyalty_tiers_schema_alignment | 172_loyalty_tiers_schema_alignment.ts | 2026-04-28T13:42:39.090Z |
| 171_notification_preferences_channel_unique | 171_notification_preferences_channel_unique.ts | 2026-04-28T12:59:50.784Z |
| 170_stripe_billing_unique_constraints | 170_stripe_billing_unique_constraints.ts | 2026-04-28T12:59:50.768Z |
| 169_drop_dead_backup_tables | 169_drop_dead_backup_tables.ts | 2026-04-28T12:59:50.757Z |
| 168_perf_metrics_cls_inp | 168_perf_metrics_cls_inp.ts | 2026-04-26T15:35:57.563Z |
| 167_social_messaging_tables | 167_social_messaging_tables.ts | 2026-04-25T02:12:28.331Z |
| 166_chat_content_reports | 166_chat_content_reports.ts | 2026-04-25T01:58:52.654Z |
| 165_users_ban_suspend_columns | 165_users_ban_suspend_columns.ts | 2026-04-25T01:58:52.605Z |
| 164_recipes | 164_recipes.ts | 2026-04-23T19:02:51.181Z |
| 163_pharmacy_seed | 163_pharmacy_seed.ts | 2026-04-23T18:49:43.785Z |
| 162_bus_schedules | 162_bus_schedules.ts | 2026-04-23T18:49:43.764Z |

## Source Pending / Unmatched Sample

| Version | Filename |
|---|---|

## DB-Only Migration Sample

| Version | Filename |
|---|---|
| 173_ux_metrics_daily_table | 173_ux_metrics_daily_table.ts |
| 122_analytics | 122_analytics.ts |
| 121_notifications | 121_notifications.ts |
| 059_webhooks | 059_webhooks.ts |

