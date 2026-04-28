# API Documentation

## Base URL

```
Production: https://sanliurfa.com/api
Staging: https://staging.sanliurfa.com/api
Local: http://localhost:4321/api
```

## Authentication

JWT Bearer token required for most endpoints:

```http
Authorization: Bearer <token>
```

## Response Format

```json
{
  "success": true,
  "data": { },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

## Endpoints

### Authentication
- POST `/auth/login` - User login
- POST `/auth/register` - Register
- POST `/auth/refresh` - Refresh token

### Places
- GET `/v1/places` - List places
- GET `/v1/places/:id` - Get place
- POST `/v1/places` - Create place

### Search
- GET `/search?q=query` - Search

## OpenAPI Spec

Full spec at `/api/docs/openapi.json`
