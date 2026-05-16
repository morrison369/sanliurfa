# DB Retirement Observation Report

- Generated at: 2026-05-15T12:07:47.159Z
- Status: observation_required
- Source audit: `docs/db-usage-audit.json`
- Observation window: 14 days
- Earliest action at: 2026-05-29T12:07:47.159Z
- Automatic table drop allowed: no
- Automatic index drop allowed: no
- Snapshot count: 3
- Snapshot retention: 30 days
- Removed old snapshots: 0
- Stable enough for action: no

## Summary

| Queue | Count | Action |
|---|---:|---|
| P0 | 3 | observe then quarantine/drop migration candidate |
| P0 quarantine candidates | 2 | no runtime source reference; still requires observation evidence |
| P0 runtime holds | 1 | runtime code reference present; no drop/quarantine action |
| P1 | 0 | ownership and code-reference review |
| P2 | 766 | index usage and EXPLAIN review |

## Required Evidence

- 14 gun production pg_stat_user_tables / pg_stat_user_indexes gozlemi
- kod referansi ve migration sahipligi kontrolu
- unique/primary/foreign-key constraint etkisi kontrolu
- EXPLAIN/query plan review
- rollback migration veya restore plani

## P0 Action Queue Sample

| Table | Owner | Migration Source | Action | Blocker |
|---|---|---|---|---|
| public.campaign_metrics | marketing campaign analytics | 104_marketing_campaigns.ts | observe_then_quarantine_migration | production observation evidence missing |
| public.campaign_segments | marketing campaign targeting | 104_marketing_campaigns.ts | observe_then_quarantine_migration | production observation evidence missing |

## P0 Runtime Hold Queue

| Table | Runtime References | Action | Blocker |
|---|---:|---|---|
| public.campaign_performance | 2 | runtime_reference_hold | runtime source references present |

## P2 Index Queue Sample

| Table | Index | Action | Blocker |
|---|---|---|---|
| blog_posts | idx_blog_posts_search | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| client_performance_metrics | idx_perf_metrics_timestamp | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| social_event_store | idx_social_event_store_tenant_event_created | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| user_social_stats | idx_social_stats_user | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| users | idx_users_points | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| user_activities | idx_activities_type | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| conversations | idx_conversations_participant_a | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| conversations | idx_conversations_participant_b | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| direct_messages | idx_direct_messages_conversation | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| direct_messages | idx_direct_messages_sender | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| direct_messages | idx_direct_messages_unread | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| social_event_store | idx_social_event_store_actor_target | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| user_follows | idx_user_follows_follower | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| user_follows | idx_user_follows_following | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| user_match_profiles | idx_user_match_profiles_discoverable | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| users | idx_users_email_verified | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| users | idx_users_language | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| users | idx_users_last_login_at | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| users | idx_users_level | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |
| users | idx_users_onboarding_completed | index_usage_and_query_plan_review | idx_scan=0 alone is not sufficient evidence |

Not: Bu rapor operasyon kuyruğu üretir; migration/drop işlemi yapmaz.

