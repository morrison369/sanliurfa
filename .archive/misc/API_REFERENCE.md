# API Reference Documentation

Version: 1.0
Last Updated: 2026-04-08
Base URL: https://sanliurfa.com/api

## Quick Start

All endpoints return JSON with success flag and data/error field.

### Authentication
- Register: POST /api/auth/register
- Login: POST /api/auth/login
- Logout: POST /api/auth/logout

### Loyalty (Phase 16)
- Points: GET /api/loyalty/points
- Achievements: GET /api/loyalty/achievements
- Admin Awards: POST /api/admin/loyalty/award
- Admin Rewards: GET/POST /api/admin/loyalty/rewards

### Social (Phase 25)
- Hashtags: GET /api/hashtags, GET /api/hashtags/{slug}
- Mentions: GET /api/users/{id}/mentions
- Profile: GET /api/users/{id}/profile
- Leaderboard: GET /api/leaderboards/users

### User Management
- Settings: GET/PUT /api/users/settings
- Password: POST /api/users/password
- Privacy: GET/PUT /api/users/privacy

### Admin
- Health: GET /api/health/detailed
- Performance: GET /api/performance
- Metrics: GET /api/metrics

### Real-time (Phase 28D)
- Feed: GET /api/realtime/feed (SSE)
- Analytics: GET /api/realtime/analytics (SSE)

## Error Handling

All errors follow format:
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Description"
  }
}

Common codes:
- UNAUTHORIZED (401)
- FORBIDDEN (403)
- VALIDATION_ERROR (422)
- NOT_FOUND (404)
- CONFLICT (409)
- RATE_LIMITED (429)
- INTERNAL_ERROR (500)

## Rate Limiting

- Default: 100 req/15min per IP
- Auth endpoints: 10 req/15min per IP

## Headers

All responses include:
- X-Request-ID: Request tracking UUID
- X-Cache: HIT or MISS for cached endpoints
- Content-Type: application/json

---
Last Reviewed: 2026-04-08
Maintained By: Development Team

