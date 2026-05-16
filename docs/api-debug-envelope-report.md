# API Debug Envelope Report

- Generated at: 2026-05-15T12:08:14.249Z
- Status: ok
- Passed: 3/3

| Check | Status | File | Detail |
|---|---|---|---|
| problem-json-request-id | ok | `src/lib/api.ts` | Problem+JSON hata yanıtları requestId ve X-Request-ID taşır. |
| client-fetch-debug-helper | ok | `src/lib/client/api-debug.ts` | Frontend fetch wrapper endpoint/status/requestId bilgisini tek formatta verir. |
| admin-operations-debug-endpoint | ok | `src/pages/api/admin/operations/summary.ts` | Admin operasyon endpointi debug payload ve requestId header üretir. |
