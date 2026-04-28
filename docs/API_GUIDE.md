# API Dokümantasyonu

> ⚠️ **Bu doküman güncel değil.** Canonical (tek doğru kaynak) API spec
> `/api/docs/openapi.json` endpoint'inden alınır — auto-generated OpenAPI 3.1
> spec, codebase'den türetilir ve tüm 460+ endpoint'i kapsar. Browser'da
> görmek için `/api/docs` UI'ını ziyaret edin. Bu Markdown sadece tarihsel
> referans için tutulur; gerçek deploy edilmiş API ile çelişebilir.
>
> API versiyonlama planlandı ama henüz aktif değil — `/v2` prefix'i kullanılmıyor.

## Base URL
```
Production:  https://sanliurfa.com/api
Local dev:   http://localhost:4321/api
```

## Authentication

Tüm API istekleri Bearer token gerektirir:
```
Authorization: Bearer <your-token>
```

## Endpoints

### Places

#### List Places
```http
GET /places?lat=37.1590&lng=38.7969&radius=5000&limit=20
```

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| lat | float | Latitude |
| lng | float | Longitude |
| radius | int | Search radius in meters (default: 5000) |
| category | string | Category ID |
| limit | int | Results per page (max: 50) |
| offset | int | Pagination offset |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "place-001",
      "name": "Ciğerci Aziz",
      "rating": 4.8,
      "distance": 1200,
      "category_name": "Restoran"
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

### User

#### Get Current User
```http
GET /users/me
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "user-001",
    "name": "Ahmet Yılmaz",
    "email": "ahmet@example.com",
    "favorites_count": 15,
    "reviews_count": 8
  }
}
```

#### Update Profile
```http
PATCH /users/me
Content-Type: application/json

{
  "name": "Yeni İsim",
  "phone": "+905551234567"
}
```

### Favorites

#### List Favorites
```http
GET /favorites
```

#### Add to Favorites
```http
POST /favorites
Content-Type: application/json

{
  "place_id": "place-001"
}
```

#### Remove from Favorites
```http
DELETE /favorites?place_id=place-001
```

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

## Rate Limiting

- **Free Plan**: 100 requests/hour
- **Basic Plan**: 1000 requests/hour
- **Pro Plan**: 10000 requests/hour

Rate limit headers:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```
