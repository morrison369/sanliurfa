# Release Next Actions

- Generated at: 2026-05-15T12:08:15.454Z
- Status: ok
- Release decision: ADVISORY
- Destructive actions allowed: no

| Priority | Area | Status | Title | Command | Detail |
|---|---|---|---|---|---|
| P1 | database | waiting_for_evidence | DB P0 quarantine adaylarını production gözlem sürecinde tut | `npm run -s db:retirement:observe && npm run -s db:p0:quarantine:plan` | 2 quarantine candidate, 1 runtime hold. Cadence=observing (3/14). Otomatik drop yok. |
| P2 | database-indexes | observed | DB P2 index adaylarını EXPLAIN review planında tut | `npm run -s db:index:review:plan` | 766 reviewable index candidate, 505 high-risk keep/review. Otomatik index drop yok. |
| P3 | storage | ok | Local media storage kanıtını periyodik tazele | `npm run -s storage:local:gate` | local-only=yes, external-object-storage=no, live=5/5, failed-patterns=0. |
| P3 | adsense | ok | Canlı AdSense kanıtını periyodik tazele | `npm run -s adsense:readiness:live` | ads.txt, meta ve robots canlıda geçti. |
| P3 | scripts | ok | Script yüzeyini kanonik komutlarla yönet | `npm run -s scripts:canonical:report` | 370 package script var; 15 kanonik komut, 0 eksik. Script silme yok; CI kanonik komutları kullanır. |
| P2 | pagespeed | observed | PageSpeed live quota yenilenince tekrar kontrol et | `npm run -s pagespeed:live && npm run -s pagespeed:quota:management` | quotaLimited=1, live=review, service=enabled. Quota-limited advisory; release blocker değil. |
| P3 | cron | ok | Managed cron tanımını güncel tut | `npm run -s cron:readiness:report` | 16/16 managed cron job preview içinde mevcut. |
