# API Dokümantasyonu

## Kimlik Doğrulama

### POST /api/auth/login
Email ve şifre ile giriş.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "user": { ... }
}
```

### POST /api/auth/register
Yeni kullanıcı kaydı.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "full_name": "John Doe"
}
```

### GET /api/auth/social/google
Google OAuth girişi.

### GET /api/auth/social/facebook
Facebook OAuth girişi.

## Mekanlar

### GET /api/places
Mekan listesi.

**Query Parameters:**
- `category` - Filtre kategorisi
- `page` - Sayfa numarası
- `limit` - Sayfa başına öğe
- `sort` - Sıralama (rating, newest, name)
- `minRating` - Minimum puan

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "totalPages": 10,
    "total": 100
  }
}
```

### POST /api/places
Yeni mekan ekleme (giriş gerekli).

**Request:**
```json
{
  "name": "Mekan Adı",
  "category": "restaurant",
  "description": "Açıklama",
  "address": "Adres",
  "latitude": 37.1591,
  "longitude": 38.7969
}
```

### GET /api/places/:id
Mekan detayı.

### PUT /api/places/:id
Mekan güncelleme (sahibi veya admin).

### DELETE /api/places/:id
Mekan silme (sahibi veya admin).

## Yorumlar

### GET /api/reviews
Yorum listesi.

**Query Parameters:**
- `placeId` - Mekan ID
- `userId` - Kullanıcı ID
- `status` - Durum (pending, approved, rejected)

### POST /api/reviews
Yeni yorum ekleme.

**Request:**
```json
{
  "placeId": "uuid",
  "rating": 5,
  "title": "Başlık",
  "content": "Yorum içeriği"
}
```

### POST /api/reviews/:id/approve
Yorum onaylama (admin).

### POST /api/reviews/:id/reject
Yorum reddetme (admin).

## Kullanıcı

### GET /api/users
Kullanıcı listesi (admin).

### GET /api/users/:id
Kullanıcı detayı.

### POST /api/users/:id/ban
Kullanıcı yasaklama (admin).

### POST /api/users/:id/update-role
Rol güncelleme (admin).

## Bildirimler

### GET /api/notifications
Kullanıcı bildirimleri.

**Response:**
```json
{
  "data": [...],
  "unreadCount": 5
}
```

### POST /api/notifications/:id/read
Bildirimi okundu olarak işaretle.

### POST /api/notifications/read-all
Tüm bildirimleri okundu olarak işaretle.

## Favoriler

### GET /api/favorites
Kullanıcı favorileri.

### POST /api/favorites
Favorilere ekleme.

**Request:**
```json
{
  "placeId": "uuid"
}
```

### DELETE /api/favorites
Favoriden çıkarma.

**Query Parameters:**
- `id` - Mekan ID

## Arama

### GET /api/search
Arama sonuçları.

**Query Parameters:**
- `q` - Arama terimi
- `type` - Tip (place, blog, historical, all)

## Admin

### POST /api/admin/bulk-action
Toplu işlem.

**Request:**
```json
{
  "action": "delete",
  "items": ["uuid1", "uuid2"]
}
```

## Hata Kodları

| Kod | Açıklama |
|-----|----------|
| 400 | Geçersiz istek |
| 401 | Yetkisiz erişim |
| 403 | Yasaklı erişim |
| 404 | Bulunamadı |
| 429 | Çok fazla istek |
| 500 | Sunucu hatası |

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| API Genel | 100/dakika |
| Auth | 5/dakika |
| Yorum | 10/saat |
