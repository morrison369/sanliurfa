# API Documentation

> ⚠️ **Bu doküman güncel değil.** Canonical (single-source-of-truth) API spec
> `/api/docs/openapi.json` endpoint'inden alınır — auto-generated OpenAPI 3.1
> spec, codebase'den türetilir ve tüm 460+ endpoint'i kapsar. Browser'da
> görmek için `/api/docs` UI'ını ziyaret edin. Bu Markdown sadece tarihsel
> referans için tutulur, deploy edilmiş gerçek API ile çelişebilir.

## Base URL

```
Production: https://sanliurfa.com/api
Local dev:  http://localhost:4321/api
```

> Eskiden `api.sanliurfa.com` ayrı subdomain değildi — tüm API endpoint'leri ana
> domain'in `/api/*` path'i altında.

## Authentication

All API requests require authentication via Bearer token:

```http
Authorization: Bearer <jwt_token>
```

## Rate Limits

- Anonymous: 100 requests/hour
- Authenticated: 1000 requests/hour
- Premium: 10000 requests/hour

## Endpoints

### Authentication

#### POST /api/auth/login
Login with email and password.

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "...",
  "user": {
    "id": "123",
    "email": "user@example.com",
    "name": "John Doe"
  }
}
```

### Places

#### GET /api/places
List places with filters.

**Query Parameters:**
- `category` (optional): Filter by category
- `lat`, `lng`, `radius` (optional): Location search
- `rating` (optional): Minimum rating
- `sort`: Sort by (rating, distance, popularity)
- `page`, `limit`: Pagination

**Response:**
```json
{
  "places": [...],
  "total": 150,
  "page": 1,
  "limit": 20
}
```

#### GET /api/places/:id
Get place details.

### Reviews

#### POST /api/reviews
Create a review.

```json
{
  "placeId": "123",
  "rating": 5,
  "content": "Great place!",
  "photos": ["url1", "url2"]
}
```

### Bookings

#### POST /api/bookings
Create a booking.

```json
{
  "placeId": "123",
  "date": "2024-01-15",
  "time": "19:00",
  "guests": 4,
  "notes": "Window seat preferred"
}
```

### Admin

#### GET /api/admin/stats
Get dashboard statistics.

**Requires:** Admin role

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

## Webhooks

### Subscribe to webhooks

```http
POST /api/webhooks
{
  "url": "https://your-domain.com/webhook",
  "events": ["booking.created", "review.posted"],
  "secret": "your-webhook-secret"
}
```

### Webhook Events

- `booking.created`
- `booking.cancelled`
- `review.posted`
- `user.registered`
- `payment.completed`

## SDK

### JavaScript

```bash
npm install @sanliurfa/sdk
```

```javascript
import { SanliurfaClient } from '@sanliurfa/sdk';

const client = new SanliurfaClient({
  apiKey: 'your-api-key'
});

const places = await client.places.list({
  category: 'restoran',
  lat: 37.159,
  lng: 38.796
});
```

## OpenAPI Spec

Full OpenAPI specification available at:
- `/openapi.json`
- `/api/docs` (Swagger UI)
