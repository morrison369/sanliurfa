# DB Usage Audit

- Generated at: 2026-05-15T12:07:46.913Z
- Status: ok
- Database source: DATABASE_URL
- Database target: localhost:5432/sanliurfa
- Table count: 497
- Index count: 1149
- Active tables: 444
- Zero-row tables: 477
- Zero-row no-activity tables: 53
- Cold tables: 0
- Zero-scan indexes: 1046
- Protected zero-scan indexes: 280
- Reviewable unused index candidates: 766
- Speculative/legacy zero-row candidates: 3
- Unclassified zero-row review sample: 0

## Classification Summary

| Bucket | Table Count |
|---|---:|
| core_surface | 340 |
| ops_runtime | 74 |
| speculative_or_legacy | 83 |
| unclassified | 0 |

## Largest Tables

| Table | Estimated Rows | Seq Scan | Idx Scan |
|---|---:|---:|---:|
| public.client_performance_metrics | 6731 | 488 | 48 |
| public.city_content_drafts | 487 | 1655 | 649 |
| public.user_match_profiles | 381 | 422 | 1356 |
| public.user_activities | 364 | 1342 | 13 |
| public.pharmacies | 90 | 2870 | 31 |
| public.blog_posts | 40 | 2428 | 1514 |
| public.site_settings | 33 | 6718 | 85 |
| public.conversation_participants | 32 | 0 | 64 |
| public.user_social_stats | 32 | 0 | 32 |
| public.users | 32 | 3595 | 10719 |
| public.conversations | 16 | 268 | 128 |
| public.direct_messages | 16 | 134 | 16 |
| public.social_event_store | 16 | 402 | 66 |
| public.user_follows | 16 | 34 | 0 |
| public.schema_migrations | 13 | 464 | 2 |
| public.search_history | 10 | 536 | 54 |
| public.recipes | 6 | 1428 | 393 |
| public.ssr_perf_metrics | 2 | 137 | 0 |
| public.places | 1 | 15233 | 0 |
| public.support_tickets | 1 | 2310 | 0 |

## Active Core Tables

| Table | Estimated Rows | Inserts | Updates |
|---|---:|---:|---:|
| public.city_content_drafts | 487 | 487 | 447 |
| public.user_match_profiles | 381 | 16 | 365 |
| public.user_activities | 364 | 364 | 0 |
| public.pharmacies | 90 | 90 | 606 |
| public.blog_posts | 40 | 50 | 0 |
| public.site_settings | 33 | 4 | 81 |
| public.conversation_participants | 32 | 32 | 0 |
| public.user_social_stats | 32 | 32 | 0 |
| public.users | 32 | 32 | 16 |
| public.conversations | 16 | 16 | 16 |
| public.direct_messages | 16 | 16 | 0 |
| public.social_event_store | 16 | 16 | 0 |
| public.user_follows | 16 | 16 | 0 |
| public.search_history | 10 | 10 | 0 |
| public.recipes | 6 | 0 | 89 |
| public.places | 1 | 16 | 0 |
| public.support_tickets | 1 | 16 | 0 |
| public.activity_feeds | 0 | 0 | 0 |
| public.activity_interactions | 0 | 0 | 0 |
| public.activity_summaries | 0 | 0 | 0 |
| public.advertisements | 0 | 0 | 0 |
| public.alert_notifications | 0 | 0 | 0 |
| public.alert_rules | 0 | 0 | 0 |
| public.billing_history | 0 | 0 | 0 |
| public.blocked_users | 0 | 0 | 0 |

## Cold Non-Empty Tables

| Table | Estimated Rows | Inserts | Updates | Deletes |
|---|---:|---:|---:|---:|

## Speculative / Legacy Zero-Row Candidates

| Table | Bucket |
|---|---|
| public.campaign_metrics | speculative_or_legacy |
| public.campaign_performance | speculative_or_legacy |
| public.campaign_segments | speculative_or_legacy |

## Retirement Plan

- Drop islemi otomatik yapilmaz; production once en az 14 gun usage gozlemi gerekir.
- P0: speculative_or_legacy bucket + zero row + no activity tablolar.
- P1: unclassified zero-row no-activity tablolar; once kod referansi ve migration sahipligi dogrulanir.
- P2: unique/constraint olmayan zero-scan index adaylari; query plan ve 14 gun production gozlemi olmadan drop yapilmaz.

| Priority | Count | Action |
|---|---:|---|
| P0 | 3 | quarantine/drop migration adayi |
| P1 | 0 | ownership ve code-reference review |
| P2 | 766 | index usage gozlem ve EXPLAIN review |

### P0 Drop Candidate Sample

| Table | Reason |
|---|---|
| public.campaign_metrics | speculative_or_legacy + zero rows + no observed activity |
| public.campaign_performance | speculative_or_legacy + zero rows + no observed activity |
| public.campaign_segments | speculative_or_legacy + zero rows + no observed activity |

## Unclassified Zero-Row Review Sample

| Table | Bucket |
|---|---|

## Reviewable Unused Index Candidates

| Index | Table | Size MB | idx_scan | Protected |
|---|---|---:|---:|---|
| idx_blog_posts_search | blog_posts | 0.73 | 0 | no |
| idx_perf_metrics_timestamp | client_performance_metrics | 0.27 | 0 | no |
| idx_social_event_store_tenant_event_created | social_event_store | 0.05 | 0 | no |
| idx_social_stats_user | user_social_stats | 0.05 | 0 | no |
| idx_users_points | users | 0.05 | 0 | no |
| idx_activities_type | user_activities | 0.04 | 0 | no |
| idx_conversations_participant_a | conversations | 0.04 | 0 | no |
| idx_conversations_participant_b | conversations | 0.04 | 0 | no |
| idx_direct_messages_conversation | direct_messages | 0.04 | 0 | no |
| idx_direct_messages_sender | direct_messages | 0.04 | 0 | no |
| idx_direct_messages_unread | direct_messages | 0.04 | 0 | no |
| idx_social_event_store_actor_target | social_event_store | 0.04 | 0 | no |
| idx_user_follows_follower | user_follows | 0.04 | 0 | no |
| idx_user_follows_following | user_follows | 0.04 | 0 | no |
| idx_user_match_profiles_discoverable | user_match_profiles | 0.04 | 0 | no |
| idx_users_email_verified | users | 0.04 | 0 | no |
| idx_users_language | users | 0.04 | 0 | no |
| idx_users_last_login_at | users | 0.04 | 0 | no |
| idx_users_level | users | 0.04 | 0 | no |
| idx_users_onboarding_completed | users | 0.04 | 0 | no |
| idx_users_username | users | 0.04 | 0 | no |
| idx_autocomplete_completion_trgm | autocomplete_index | 0.03 | 0 | no |
| idx_user_follows_follower_created | user_follows | 0.03 | 0 | no |
| idx_reviews_search_vector | reviews | 0.02 | 0 | no |
| idx_2fa_audit_user | two_factor_audit | 0.02 | 0 | no |

## Protected Zero-Scan Index Sample

| Index | Table | Size MB | Protection |
|---|---|---:|---|
| users_email_key | users | 0.27 | constraint:u |
| user_follows_follower_id_following_id_key | user_follows | 0.04 | constraint:u |
| users_username_key | users | 0.04 | constraint:u |
| audit_config_resource_type_key | audit_config | 0.02 | constraint:u |
| autocomplete_index_prefix_completion_text_search_type_key | autocomplete_index | 0.02 | constraint:u |
| badge_definitions_badge_type_key | badge_definitions | 0.02 | constraint:u |
| blocked_users_user_id_blocked_user_id_key | blocked_users | 0.02 | constraint:u |
| blog_categories_name_key | blog_categories | 0.02 | constraint:u |
| blog_tags_name_key | blog_tags | 0.02 | constraint:u |
| blog_tags_slug_key | blog_tags | 0.02 | constraint:u |
| categories_slug_key | categories | 0.02 | constraint:u |
| city_content_sources_source_key_key | city_content_sources | 0.02 | constraint:u |
| homepage_sections_section_key_key | homepage_sections | 0.02 | constraint:u |
| idx_badge_definitions_type | badge_definitions | 0.02 | unique |
| idx_bus_routes_no | bus_routes | 0.02 | unique |
| idx_support_tickets_ticket_number | support_tickets | 0.02 | unique |
| loyalty_points_user_id_key | loyalty_points | 0.02 | constraint:u |
| migrations_version_key | migrations | 0.02 | constraint:u |
| muted_users_user_id_muted_user_id_key | muted_users | 0.02 | constraint:u |
| permissions_name_key | permissions | 0.02 | constraint:u |
| place_followers_user_id_place_id_key | place_followers | 0.02 | constraint:u |
| privacy_settings_user_id_key | privacy_settings | 0.02 | constraint:u |
| recipes_slug_key | recipes | 0.02 | constraint:u |
| reviews_place_id_user_id_key | reviews | 0.02 | constraint:u |
| reward_levels_name_key | reward_levels | 0.02 | constraint:u |

