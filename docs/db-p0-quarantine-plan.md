# DB P0 Quarantine Plan

- Generated at: 2026-05-15T12:07:47.365Z
- Status: advisory
- Automatic drop allowed: no
- Automatic quarantine allowed: no
- Earliest action at: 2026-05-29T12:07:47.159Z

## Quarantine Candidates

| Table | Owner | Runtime Refs | Blocker | Migration Sources |
|---|---|---:|---|---|
| `public.campaign_metrics` | marketing campaign analytics | 0 | production observation evidence missing | 104_marketing_campaigns.ts |
| `public.campaign_segments` | marketing campaign targeting | 0 | production observation evidence missing | 104_marketing_campaigns.ts |

## Runtime Holds

| Table | Owner | Runtime Refs | Blocker |
|---|---|---:|---|
| `public.campaign_performance` | email/marketing campaign performance | 2 | runtime source references present |

Not: Bu plan migration üretmez, tablo silmez ve veri değiştirmez. Sadece manuel PR/DB review için kanıt kuyruğu üretir.
