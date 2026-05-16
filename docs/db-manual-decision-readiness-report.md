# DB Manual Decision Readiness Report

- Generated at: 2026-05-15T12:07:47.437Z
- Status: waiting
- Earliest action at: 2026-05-29T12:07:47.159Z
- Action window open: no
- Automatic drop allowed: no

## Candidates

| Table | Owner | Status | Missing Evidence | Recommended Action |
|---|---|---|---|---|
| `public.campaign_metrics` | marketing campaign analytics | waiting_for_evidence | observationWindowComplete | Continue observation; do not create destructive migration. |
| `public.campaign_segments` | marketing campaign targeting | waiting_for_evidence | observationWindowComplete | Continue observation; do not create destructive migration. |

## Runtime Holds

| Table | Owner | Runtime Refs | Action |
|---|---|---:|---|
| `public.campaign_performance` | email/marketing campaign performance | 2 | Once runtime references are removed or migrated, re-run db:retirement:observe. |
