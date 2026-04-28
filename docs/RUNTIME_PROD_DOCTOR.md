# Runtime Production Doctor

- Generated At: 2026-04-28T23:10:53.239Z
- Status: ready_with_advisories
- OK: 2
- Advisory: 2

| Check | Status | Detail |
|---|---|---|
| REDIS_URL | advisory | production Redis URL tanımlı değil |
| REDIS_GLOBAL_PORT | ok | project/global port çakışması görünmüyor |
| SESSION_TTL | ok | ttl=86400 |
| NODE_ENV | advisory | tanımlı değil |

Secret değerleri yazılmaz; sadece yapılandırma durumu raporlanır.
