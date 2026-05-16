# DB Advisory Evidence Bundle

- Status: observation_required
- Generated: 2026-05-15T12:07:47.656Z
- Automatic DB drop: no
- Automatic index drop: no
- Quarantine candidates: 2
- Runtime holds: 1
- Observation: 3/14 snapshots, missing days=11
- Earliest action: 2026-05-29T12:07:47.159Z

## Decisions

| Area | Decision | Automatic Action | Blockers |
|---|---|---|---|
| p0-table-quarantine | continue-observation | disabled | observation-window-not-complete, runtime-references-present, manual-evidence-incomplete |
| unused-indexes | explain-review-only | disabled | idx_scan-zero-alone-is-not-evidence |

## P0 Candidates

| Table | Owner | Runtime Refs | Blocker |
|---|---|---:|---|
| public.campaign_metrics | marketing campaign analytics | 0 | production observation evidence missing |
| public.campaign_segments | marketing campaign targeting | 0 | production observation evidence missing |

## Runtime Holds

| Table | Owner | Runtime Refs | Required Action |
|---|---|---:|---|
| public.campaign_performance | email/marketing campaign performance | 2 | Once runtime references are removed or migrated, re-run db:retirement:observe. |
