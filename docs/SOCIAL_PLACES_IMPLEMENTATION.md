# Sosyal Medya ve Mekan Sistemi - Uygulama Kılavuzu

Bu dokümanda Şanlıurfa.com için geliştirilen sosyal medya özellikleri ve mekan yönetim sistemi açıklanmaktadır.

## 🎯 Özellikler Özeti

### ✅ Üyelik Sistemi (Mevcut)
- Kayıt/Giriş (email, şifre)
- OAuth (Google, vb.)
- İki faktörlü doğrulama
- Profil yönetimi
- Gizlilik ayarları

### ✅ Sosyal Özellikler (Yeni)
- **Takip Sistemi**: Kullanıcı takip etme/takibi bırakma
- **DM (Direkt Mesajlaşma)**: Birebir ve grup sohbet
- **Aktivite Akışı**: Kullanıcı aktiviteleri, yorumlar, ziyaretler
- **Arkadaş Önerileri**: Ortak bağlantılara göre

### ✅ Mekan Sistemi (Yeni)
- **Kategoriler**: 15+ mekan kategorisi
- **Yorumlar ve Puanlama**: 1-5 yıldız, fotoğraf, etiketler
- **Mekan Ekleme**: Kullanıcılar yeni mekan önerebilir
- **Moderasyon**: Admin onaylı içerik

## 📁 Dosya Yapısı

```
src/
├── lib/
│   ├── social/
│   │   ├── friendship.ts        # In-memory takip sistemi
│   │   ├── friendship-db.ts     # PostgreSQL takip sistemi ⭐
│   │   ├── messaging.ts         # In-memory mesajlaşma
│   │   ├── messaging-db.ts      # PostgreSQL mesajlaşma ⭐
│   │   ├── activity.ts          # Aktivite akışı
│   │   └── index.ts             # Export'lar
│   ├── places/
│   │   ├── reviews.ts           # Yorum ve puanlama
│   │   ├── categories.ts        # Kategori sistemi
│   │   ├── user-submissions.ts  # Mekan ekleme
│   │   └── index.ts             # Export'lar
│   └── user/
│       └── users.ts             # Kullanıcı profili (mevcut)
├── pages/api/
│   ├── social/
│   │   ├── follow.ts            # Takip/unfollow API
│   │   ├── followers.ts         # Takipçiler/following API
│   │   └── messages.ts          # Mesajlaşma API
│   ├── reviews/
│   │   └── index.ts             # Yorum API
│   ├── places/
│   │   └── submissions.ts       # Mekan ekleme API
│   └── admin/
│       └── moderation.ts        # Admin moderasyon API
└── migrations/
    └── 119_user_follows.ts      # DB migration (mevcut)
```

## 🔌 API Endpoint'leri

### Sosyal API'ler

#### Takip İşlemleri
```
POST /api/social/follow
{
  "userId": "user_uuid",
  "action": "follow" | "unfollow"
}
```

#### Takipçiler/Following Listesi
```
GET /api/social/followers?type=followers&limit=50&offset=0
GET /api/social/followers?type=following
GET /api/social/followers?type=pending  # Bekleyen istekler

POST /api/social/followers  # İstek onaylama/reddetme
{
  "requestId": "request_uuid",
  "action": "accept" | "decline"
}
```

#### Mesajlaşma
```
GET /api/social/messages?type=conversations
GET /api/social/messages?conversationId=xxx&limit=50

POST /api/social/messages
{
  "conversationId": "conv_uuid",  // veya
  "recipientId": "user_uuid",     // yeni konuşma için
  "content": "Merhaba!",
  "type": "text" | "image" | "location" | "place_share"
}

// Mekan paylaşma
{
  "action": "sharePlace",
  "conversationId": "conv_uuid",
  "placeId": "place_uuid",
  "placeName": "Göbeklitepe"
}

// Konum paylaşma
{
  "action": "shareLocation",
  "conversationId": "conv_uuid",
  "latitude": 37.2231,
  "longitude": 38.9224
}
```

### Mekan API'leri

#### Yorumlar
```
GET /api/reviews?placeId=xxx&sortBy=newest&rating=5
GET /api/reviews?userId=xxx
GET /api/reviews?placeId=xxx&stats=true  # Puan dağılımı

POST /api/reviews  # Yorum ekleme
{
  "placeId": "place_uuid",
  "rating": 5,
  "content": "Harika bir yer!",
  "title": "Mükemmel",
  "photos": ["url1", "url2"],
  "visitDate": "2024-01-15",
  "visitType": "family",  // solo|couple|family|friends|business
  "pros": ["Mükemmel yemek", "Güzel ambiyans"],
  "cons": ["Pahalı"]
}

POST /api/reviews  # Beğeni/faydalı
{
  "action": "like" | "helpful",
  "reviewId": "review_uuid"
}
```

#### Mekan Ekleme (Kullanıcı)
```
GET /api/places/submissions  # Kullanıcının gönderimleri
GET /api/places/submissions?id=xxx  # Tekil gönderim

POST /api/places/submissions
{
  "name": "Yeni Restoran",
  "category": "restoran",
  "description": "Açıklama...",
  "address": "Atatürk Cad. No:1",
  "district": "Merkez",
  "latitude": 37.1592,
  "longitude": 38.7969,
  "phone": "0414 123 4567",
  "website": "https://ornek.com",
  "features": ["WiFi", "Otopark"],
  "photos": ["url1", "url2"],
  "action": "submit" | "draft"
}
```

### Admin API'leri

#### Moderasyon
```
GET /api/admin/moderation?type=reviews    # Bekleyen yorumlar
GET /api/admin/moderation?type=submissions # İstatistikler

POST /api/admin/moderation  # Yorum moderasyonu
{
  "type": "review",
  "action": "approve" | "reject" | "flag",
  "id": "review_uuid",
  "reason": "Spam"  // reject için zorunlu
}

POST /api/admin/moderation  # Mekan moderasyonu
{
  "type": "submission",
  "action": "approve" | "reject" | "requestInfo",
  "id": "submission_uuid",
  "reason": "Adres eksik",
  "notes": "Onaylandı ve eklendi"
}
```

## 📊 Veritabanı Tabloları

Migration 119 ile oluşturulan tablolar:

```sql
-- Takip ilişkileri
user_follows (id, follower_user_id, following_user_id, is_approved, followed_at)

-- Takip istekleri (gizli profiller için)
follow_requests (id, requester_user_id, recipient_user_id, status, requested_at)

-- Sosyal istatistikler
user_social_stats (user_id, follower_count, following_count, post_count, engagement_score)

-- Konuşmalar
conversations (id, is_group, group_name, group_avatar, created_by, created_at)

-- Konuşma katılımcıları
conversation_participants (conversation_id, user_id, joined_at, last_read_at)

-- Mesajlar
messages (id, conversation_id, sender_id, content, type, metadata, is_read, created_at)
```

## 🎨 Kategoriler

15 mekan kategorisi tanımlı:

| Kategori | Açıklama |
|----------|----------|
| `tarihi-yerler` | Göbeklitepe, Harran, kaleler |
| `restoran` | Kebapçılar, restoranlar |
| `cafe` | Kafeler, çayevleri |
| `otel` | Oteller, pansiyonlar |
| `park` | Parklar, bahçeler |
| `muze` | Müzeler |
| `alisveris` | Çarşı, AVM, mağazalar |
| `eglence` | Sinema, oyun salonları |
| `spor` | Spor salonları, stadyumlar |
| `saglik` | Hastaneler, eczaneler |
| `egitim` | Okullar, üniversiteler |
| `dini` | Camiler, türbeler |
| `dogal` | Göller, mağaralar |
| `piknik` | Piknik alanları |
| `fuar` | Fuar alanları |

## 🖼️ Ücretsiz Görsel Kaynakları

Scripts dizininde otomatik görsel indirme araçları:

```bash
# Kategori görselleri indir
UNSPLASH_ACCESS_KEY=xxx PEXELS_API_KEY=yyy bun run scripts/places-scraper/image-downloader.ts category

# Belirli mekan için görseller
bun run scripts/places-scraper/image-downloader.ts place "Göbeklitepe" tarihi-yerler
```

**Desteklenen kaynaklar:**
- Unsplash (50 istek/saat, ücretsiz)
- Pexels (200 istek/saat, ücretsiz)
- Wikimedia Commons (limitsiz)

## 🗺️ Mekan Verisi Çekme

### OpenStreetMap (Ücretsiz)
```bash
bun run scripts/places-scraper/openstreetmap-places.ts
```
- Şanlıurfa sınırları içinde tüm mekanlar
- Restoran, cafe, otel, vs.
- Telefon, web sitesi, çalışma saatleri

### Wikipedia
```bash
bun run scripts/places-scraper/wikipedia-places.ts
```
- Tarihi yerler
- Açıklamalar ve koordinatlar
- Görseller

## 🚀 Kullanım Akışları

### 1. Kullanıcı Kaydı ve Takip
```javascript
// 1. Kayıt olunur
POST /api/auth/register

// 2. Kullanıcı aranır
GET /api/social/followers?type=search&query=ahmet

// 3. Takip edilir
POST /api/social/follow { "userId": "xxx", "action": "follow" }

// 4. Takipçiler görülür
GET /api/social/followers?type=followers
```

### 2. Mekan Yorumlama
```javascript
// 1. Mekan ziyaret edilir

// 2. Yorum yazılır
POST /api/reviews
{
  "placeId": "gobeklitepe",
  "rating": 5,
  "content": "Mükemmel bir deneyim!",
  "visitType": "family"
}

// 3. Başka yorum beğenilir
POST /api/reviews { "action": "like", "reviewId": "xxx" }
```

### 3. DM Gönderme
```javascript
// 1. Konuşma oluşturulur veya mevcut bulunur
// İlk mesaj otomatik konuşma oluşturur

POST /api/social/messages
{
  "recipientId": "user_uuid",
  "content": "Merhaba, Göbeklitepe hakkında bilgi alabilir miyim?"
}

// 2. Mekan paylaşılır
POST /api/social/messages
{
  "action": "sharePlace",
  "conversationId": "conv_uuid",
  "placeId": "gobeklitepe",
  "placeName": "Göbeklitepe"
}
```

### 4. Mekan Ekleme
```javascript
// 1. Mekan önerilir
POST /api/places/submissions
{
  "name": "Yeni Lokanta",
  "category": "restoran",
  "description": "...",
  "address": "..."
}

// 2. Admin onaylar
POST /api/admin/moderation
{
  "type": "submission",
  "action": "approve",
  "id": "submission_uuid",
  "notes": "Kontrol edildi, onaylandı"
}
```

## 🔒 Güvenlik ve Gizlilik

### Gizlilik Ayarları
Kullanıcılar profilinde ayarlayabilir:
- `profile_public`: Profil herkese açık mı?
- `allow_messages`: DM alınsın mı?
- `show_email`: Email görünsün mü?

### Gizli Profiller
- Takip isteği gönderilir
- Onaylanırsa takip tamamlanır
- Reddedilirse takip oluşmaz

### İçerik Moderasyonu
- Yorumlar onay bekler (`pending`)
- Admin onaylar/reddeder
- Spam/uygunsuz içerik engellenir

## 📈 Gelecek Geliştirmeler

1. **Gerçek Zamanlı**: WebSocket ile anlık mesajlaşma
2. **Bildirimler**: Push notification entegrasyonu
3. **Arama**: Full-text search (Meilisearch)
4. **Öneriler**: ML tabanlı mekan önerileri
5. **Harita**: Leaflet entegrasyonu

## 📝 Önemli Notlar

- Tüm API'ler `requireAuth` middleware'i ile korunur
- Admin API'ler `requireRole('admin')` ile korunur
- In-memory modüller geliştirme/test için
- PostgreSQL modüller üretim için ⭐
- Cache kullanımı performans için kritik
- Rate limiting API anahtarları için önemli
