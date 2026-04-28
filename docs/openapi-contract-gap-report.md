# OpenAPI Contract Gap Report

- Generated At: 2026-04-28T22:55:24.289Z
- Status: ok
- P1 Routes: 65
- P1 Covered: 30
- P1 Gap: 35
- P2 Routes: 310
- P2 Covered: 1
- P2 Gap: 309

| Tier | Route | Methods |
|---|---|---|
| P1 | `/messages` | GET |
| P1 | `/messages/{conversationId}` | GET |
| P1 | `/messages/{conversationId}/read` | GET |
| P1 | `/messages/unread-count` | GET |
| P1 | `/notifications` | GET |
| P1 | `/notifications/{id}` | GET |
| P1 | `/notifications/{id}/read` | POST |
| P1 | `/notifications/center` | GET |
| P1 | `/notifications/clear` | POST |
| P1 | `/notifications/draft` | POST |
| P1 | `/notifications/drafts` | GET |
| P1 | `/notifications/drafts/{id}` | GET |
| P1 | `/notifications/history` | GET |
| P1 | `/notifications/mark-all-read` | POST |
| P1 | `/notifications/preferences` | GET |
| P1 | `/notifications/push/subscribe` | POST |
| P1 | `/notifications/read-all` | POST |
| P1 | `/notifications/send` | POST |
| P1 | `/notifications/sse` | GET |
| P1 | `/notifications/stats` | GET |
| P1 | `/notifications/subscribe` | POST |
| P1 | `/notifications/unsubscribe` | POST |
| P1 | `/notifications/vapid-key` | GET |
| P1 | `/social/events/stream` | GET |
| P1 | `/social/feed` | GET |
| P1 | `/social/follow` | POST |
| P1 | `/social/followers` | GET |
| P1 | `/social/follows` | GET |
| P1 | `/social/match-candidates` | GET |
| P1 | `/social/matches` | GET |

Not: P0 kapalıdır; bu rapor P1/P2 contract test planlaması içindir.
