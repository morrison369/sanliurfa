# 📡 API Dokümantasyonu

Şanlıurfa.com API Referansı

## 🔐 Kimlik Doğrulama

API, JWT tabanlı kimlik doğrulama kullanır.

### Giriş Yap

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "kullanici@example.com",
  "password": "sifre123"
}
```

**Yanıt:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-123",
    "email": "kullanici@example.com",
    "role": "user"
  }
}
```

### Token Kullanımı

```http
Authorization: Bearer <token>
```

## 👤 Kullanıcı API

### Kullanıcı Bilgilerini Getir

```http
GET /api/users/[id]
Authorization: Bearer <token>
```

### Kullanıcı Profilini Güncelle

```http
PUT /api/users/[id]
Authorization: Bearer <token>
Content-Type: application/json

{
  "full_name": "Yeni İsim",
  "avatar": "https://..."
}
```

## 🏛️ Mekanlar API

### Tüm Mekanları Listele

```http
GET /api/places
```

**Query Parameters:**
- `category` - Kategori filtresi
- `limit` - Sayfa başına sonuç (default: 20)
- `offset` - Sayfalama (default: 0)

### Mekan Detayı

```http
GET /api/places/[id]
```

### Yeni Mekan Ekle (Admin)

```http
POST /api/places
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Balıklıgöl",
  "description": "Şanlıurfa'nın sembolü...",
  "category": "tarihi",
  "latitude": 37.1493,
  "longitude": 38.7926,
  "address": "Eyyübiye, Şanlıurfa"
}
```

## 📝 Yorumlar API

### Yorum Ekle

```http
POST /api/places/[id]/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "rating": 5,
  "text": "Harika bir yer!",
  "photos": ["url1", "url2"]
}
```

### Yorumlara Yanıt Ver

```http
POST /api/reviews/[id]/responses
Authorization: Bearer <token>
Content-Type: application/json

{
  "text": "Teşekkürler!"
}
```

## 🎫 Etkinlikler API

### Etkinlikleri Listele

```http
GET /api/events
```

**Query Parameters:**
- `start_date` - Başlangıç tarihi (YYYY-MM-DD)
- `end_date` - Bitiş tarihi (YYYY-MM-DD)
- `category` - Kategori filtresi

### Etkinlik Detayı

```http
GET /api/events/[id]
```

### Etkinliğe Katıl

```http
POST /api/events/[id]/rsvp
Authorization: Bearer <token>
```

## 🔖 Koleksiyonlar API

### Koleksiyon Oluştur

```http
POST /api/collections
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Favori Mekanlarım",
  "description": "En sevdiğim yerler",
  "is_public": true
}
```

### Koleksiyona Mekan Ekle

```http
POST /api/collections/[id]/items
Authorization: Bearer <token>
Content-Type: application/json

{
  "place_id": "place-123",
  "note": "Muhakkak gidilmeli"
}
```

## 🏅 Başarılar API

### Kullanıcı Başarımları

```http
GET /api/users/[id]/badges
```

### Tüm Başarımlar

```http
GET /api/badges
```

## 📊 Analytics API

### Sayfa Görüntüleme İstatistikleri

```http
GET /api/analytics/pageviews
Authorization: Bearer <admin_token>
```

### Popüler Mekanlar

```http
GET /api/analytics/popular
```

## 🔍 Arama API

### Genel Arama

```http
GET /api/search?q=balıklıgöl&limit=10
```

### Gelişmiş Arama

```http
POST /api/search/advanced
Content-Type: application/json

{
  "query": "restoran",
  "filters": {
    "category": "yemek",
    "rating": 4,
    "price_range": "medium"
  },
  "sort": "rating",
  "limit": 20
}
```

## 📁 Dosya Yükleme API

### Dosya Yükle

```http
POST /api/upload
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary>
```

**Yanıt:**
```json
{
  "success": true,
  "url": "https://cdn.sanliurfa.com/uploads/...",
  "filename": "image.jpg"
}
```

## ⚙️ Sistem API

### Sağlık Kontrolü

```http
GET /api/health
```

**Yanıt:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-11T17:30:00Z",
  "version": "1.0.0"
}
```

### Önbelleği Temizle (Admin)

```http
POST /api/admin/cache/clear
Authorization: Bearer <admin_token>
```

## 🚨 Hata Kodları

| Kod | Açıklama |
|-----|----------|
| 400 | Geçersiz İstek |
| 401 | Yetkisiz Erişim |
| 403 | Yasak |
| 404 | Bulunamadı |
| 409 | Çakışma |
| 422 | Doğrulama Hatası |
| 429 | Rate Limit Aşıldı |
| 500 | Sunucu Hatası |

## 📊 Rate Limiting

- **Authenticated:** 100 istek / dakika
- **Anonymous:** 20 istek / dakika

---

Son Güncelleme: 2026-04-11
