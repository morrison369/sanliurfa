# E2E Skip Report

- Generated at: 2026-05-15T12:08:14.139Z
- Status: ok
- Static skip declarations: 17
- Undocumented declarations: 0

| Reason | Count |
|---|---:|
| auth or environment dependent | 3 |
| runtime setup dependent | 4 |
| seed data dependent | 7 |
| environment schema dependent | 3 |

| File | Line | Reason | Expression |
|---|---:|---|---|
| `e2e/2fa.spec.ts` | 82 | auth or environment dependent | `test.skip(!authToken, 'Auth token üretilemedi, 2FA akışı atlandı.');` |
| `e2e/2fa.spec.ts` | 100 | runtime setup dependent | `test.skip(!response.ok(), `2FA setup başarısız: ${response.status()}`);` |
| `e2e/2fa.spec.ts` | 116 | runtime setup dependent | `test.skip(!setupResponse.ok(), `2FA setup başarısız: ${setupResponse.status()}`);` |
| `e2e/2fa.spec.ts` | 137 | runtime setup dependent | `test.skip(!setupResponse.ok(), `2FA setup başarısız: ${setupResponse.status()}`);` |
| `e2e/admin-site-content-live.spec.ts` | 8 | auth or environment dependent | `test.skip(getRes.status() === 401 \|\| getRes.status() === 403, 'Admin site settings require auth when E2E bypass is unavailable');` |
| `e2e/admin-site-content-live.spec.ts` | 26 | runtime setup dependent | `test.skip(!putRes.ok(), 'Admin hero publish is unavailable in this E2E environment');` |
| `e2e/analytics/realtime-metrics.spec.ts` | 42 | auth or environment dependent | `test.skip(true, 'Admin auth seed is unavailable for SSE header check in this E2E profile');` |
| `e2e/blog.spec.ts` | 42 | seed data dependent | `test.skip(!href, 'No blog post seeded in test database');` |
| `e2e/loyalty/admin-rewards.spec.ts` | 29 | seed data dependent | `test.skip(true, 'Admin role seed is unavailable in this E2E profile');` |
| `e2e/loyalty/admin-rewards.spec.ts` | 52 | seed data dependent | `test.skip(true, 'Admin role seed is unavailable in this E2E profile');` |
| `e2e/loyalty/admin-rewards.spec.ts` | 105 | seed data dependent | `test.skip(true, 'Admin role seed is unavailable in this E2E profile');` |
| `e2e/loyalty/admin-rewards.spec.ts` | 126 | seed data dependent | `test.skip(true, 'Admin role seed is unavailable in this E2E profile');` |
| `e2e/messaging.spec.ts` | 91 | seed data dependent | `test.skip(messages.length === 0, 'Current E2E seed returned no readable messages for this conversation');` |
| `e2e/social/hashtags.spec.ts` | 25 | seed data dependent | `test.skip(true, 'No hashtag seed data is available in this E2E profile');` |
| `e2e/social-phase1.spec.ts` | 83 | environment schema dependent | `test.skip(true, 'Lokal ortamda sosyal şema migration tamamlanmamış');` |
| `e2e/social-phase1.spec.ts` | 104 | environment schema dependent | `test.skip(true, 'Lokal ortamda sosyal şema migration tamamlanmamış');` |
| `e2e/social-phase1.spec.ts` | 122 | environment schema dependent | `test.skip(true, 'Lokal ortamda sosyal şema migration tamamlanmamış');` |
