# API Reference

Complete reference documentation for Şanlıurfa.com API endpoints. All endpoints return JSON with `{ success: boolean, data?: T, error?: string }` format.

---

## Authentication Endpoints

### POST /api/auth/register

Create a new user account.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "fullName": "John Doe"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "fullName": "John Doe",
    "role": "user"
  }
}
```

**Errors**: 400, 422, 409, 429

---

### POST /api/auth/login

Authenticate user and create session.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "userId": "uuid",
    "email": "user@example.com",
    "token": "jwt_token_here"
  }
}
```

**Notes**: Token valid for 24 hours, httpOnly cookie

---

## Loyalty & Rewards Endpoints

### GET /api/loyalty/points

Get user's points balance (auth required).

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "currentBalance": 2450,
    "lifetimeEarned": 5000,
    "lifetimeSpent": 2550,
    "pendingPoints": 0
  }
}
```

---

### GET /api/loyalty/rewards

List available rewards (public).

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "reward_uuid",
      "reward_name": "Premium Badge",
      "category": "badge",
      "points_cost": 500,
      "available_stock": 100
    }
  ]
}
```

---

### GET /api/loyalty/achievements

Get user achievements (auth required).

**Query Parameters**:
- `view` — `all` (default), `unviewed`, `stats`

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "achievement_uuid",
      "title": "First Review",
      "unlockedAt": "2026-03-01T10:00:00Z"
    }
  ]
}
```

---

### POST /api/loyalty/achievements

Mark achievement as viewed (auth required).

**Request**:
```json
{
  "userAchievementId": "achievement_uuid"
}
```

---

## Admin Loyalty Endpoints

### GET /api/admin/loyalty/rewards

List all rewards (admin-only).

**Response**: Same as public with inactive rewards included

---

### POST /api/admin/loyalty/rewards

Create new reward (admin-only).

**Request**:
```json
{
  "reward_name": "Premium Badge",
  "category": "badge",
  "points_cost": 500,
  "stock_quantity": 100
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "reward_uuid",
    "reward_name": "Premium Badge"
  }
}
```

---

### POST /api/admin/loyalty/award

Manually award points or badge (admin-only).

**Request - Points**:
```json
{
  "userId": "user_uuid",
  "type": "points",
  "amount": 500,
  "reason": "Special promotion"
}
```

**Request - Badge**:
```json
{
  "userId": "user_uuid",
  "type": "badge",
  "badgeKey": "special_event",
  "reason": "Event attendance"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "type": "points",
    "awarded": 500
  }
}
```

**Errors**: 403 (admin), 404 (user), 409 (badge exists)

---

## Social Features Endpoints

### GET /api/hashtags

Get trending hashtags.

**Query Parameters**:
- `limit` — Results (default: 20, max: 100)
- `period` — `24h`, `7d`, `30d` (default: `7d`)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "name": "arkeoloji",
      "slug": "arkeoloji",
      "count": 456
    }
  ]
}
```

---

### GET /api/hashtags/:slug

Get hashtag details.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "name": "arkeoloji",
    "totalCount": 456,
    "places": [...],
    "reviews": [...]
  }
}
```

---

### GET /api/users/:id/mentions

Get user mentions (auth required).

**Query Parameters**:
- `unreadOnly` — true/false (default: false)

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "mention_uuid",
      "mentionedBy": {"fullName": "Jane Smith"},
      "content": "Great review!",
      "viewedAt": null
    }
  ]
}
```

---

### GET /api/realtime/feed

Real-time social feed (SSE, auth required).

**Connection**: EventSource `/api/realtime/feed`

**Response**: Server-Sent Events stream

```
data: {"id":"activity_uuid","type":"review_created","userName":"John Doe"}
```

**Activity Types**: review_created, photo_uploaded, tier_achieved, badge_earned

---

### GET /api/leaderboards/users

Top users leaderboard.

**Query Parameters**:
- `sortBy` — `points` (default), `reviews`
- `limit` — Results (default: 10)
- `period` — `all_time` (default), `30d`, `7d`

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "rank": 1,
      "fullName": "John Doe",
      "points": 15000,
      "tier": "platinum"
    }
  ]
}
```

---

## User Management Endpoints

### GET /api/users/:id/profile

Get public user profile.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "fullName": "John Doe",
    "tier": "gold",
    "stats": {
      "reviewsWritten": 45,
      "badgesEarned": 12
    }
  }
}
```

---

### GET /api/users/me

Get current user (auth required).

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "user_uuid",
    "email": "john@example.com",
    "role": "user"
  }
}
```

---

## Blocking Endpoints

### POST /api/blocking/block

Block a user (auth required).

**Request**:
```json
{
  "blockedUserId": "user_uuid"
}
```

---

### GET /api/blocking/check

Check if user is blocked (auth required).

**Query Parameters**:
- `userId` — User UUID

**Response**: `{ "isBlocked": false }`

---

## Health & Observability

### GET /api/health

Basic health check.

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": {"connected": true},
    "redis": {"connected": true}
  }
}
```

---

### GET /api/metrics

Aggregated metrics (admin-only).

**Response**: Request counts, error rates, cache stats, slowest endpoints

---

## Error Handling

**Standard Error Response**:
```json
{
  "success": false,
  "error": "User not found",
  "code": "NOT_FOUND",
  "requestId": "req_12345678"
}
```

**HTTP Status Codes**:
- 200: OK
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 422: Validation failed
- 429: Rate limited
- 500: Server error

---

## Rate Limiting

- 100 req/15min per IP (default)
- Auth endpoints: 5 attempts/15min
- Report endpoints: 5/hour

**Headers**: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

---

## Caching

- GET /api/places: 5 min
- GET /api/places/:id: 10 min
- GET /api/reviews: 10 min
- GET /api/loyalty/points: 5 min
- GET /api/hashtags: 30 min
- GET /api/admin/loyalty/rewards: 2 min

**Headers**: Cache-Control, X-Cache

---

## Last Updated

2026-04-08 — Complete API reference with Loyalty, Social, and Real-time endpoints
