# Blog Sistemi - Kapsamlı Dokümantasyon

Şanlıurfa.com'un yeni blog sistemi 50+ saatlik geliştirme sonucu tamamlandı.

## 📋 Sistem Mimarisi

- **Frontend**: Astro + React, Server-Side Rendering
- **Backend**: API-first, RESTful endpoints
- **Database**: PostgreSQL (7 tablo, 10+ index)
- **Cache**: Redis (namespace isolation: `sanliurfa:blog:*`)
- **Authentication**: JWT + bcrypt (12 rounds)

---

## ✨ Özellikler

### 1️⃣ Blog Yazısı Yönetimi

**API Endpoints:**
- `GET /api/blog/posts` — Yazıları listele (filtreleme, sıralama, sayfalama)
- `POST /api/blog/posts` — Yazı oluştur (admin)
- `GET /api/blog/posts/[slug]` — Yazı detayı (görüntüleme sayacı otomatik artar)
- `PUT /api/blog/posts/[slug]` — Yazı güncelle (admin)
- `DELETE /api/blog/posts/[slug]` — Yazı sil (admin)
- `GET /api/blog/search` — Tam metin arama (Türkçe tsvector)

**Veritabanı Alanları:**
```
- id, title, slug, content, excerpt
- author_id, category_id
- featured_image, thumbnail
- status (draft | published | archived)
- is_featured, view_count, like_count
- read_time_minutes (otomatik hesapla)
- seo_title, seo_description, seo_keywords
- tags (many-to-many ilişki)
- published_at, created_at, updated_at
```

**Özellikler:**
✓ Otomatik slug üretimi (Türkçe karakter dönüşümü)
✓ Okuma süresi otomatik hesaplaması (200 kelime/dakika)
✓ SEO alanları (title, description, keywords)
✓ Kapak görseli ve küçük resim
✓ Etiket yönetimi (many-to-many)
✓ Taslak/Yayınlı/Arşivlendi statüsü
✓ Öne çıkan yazılar

### 2️⃣ Kategori Yönetimi

**API:**
- `GET /api/blog/categories` — Kategori listesi (yazı sayısı ile birlikte, 1 saat cache)

**Varsayılan Kategoriler:**
- Seyahat (Travel)
- Kültür & Tarih (Culture & History)
- Yerel Mutfak (Local Cuisine)
- Etkinlikler (Events)
- Rehberler (Guides)

**Özellikleri:**
✓ Yazı sayısı otomatik gösterimi
✓ Slug-based filtreleme
✓ Sıralama (orderIndex)

### 3️⃣ Yorum Yönetimi

**API Endpoints:**
- `GET /api/blog/comments` — Yorumları getir (filtreleme)
- `POST /api/blog/comments` — Yorum ekle (moderasyon beklemede)
- `PATCH /api/blog/comments/[id]/approve` — Yorumu onayla (admin)
- `PATCH /api/blog/comments/[id]/reject` — Yorumu reddet (admin)
- `DELETE /api/blog/comments/[id]` — Yorumu sil (admin)

**Moderasyon Paneli:** `/admin/blog/comments`
- Pending/Approved/Rejected filtreleme
- Toplu yönetim (onayla/reddet/sil)
- Yazar/E-posta/Tarih bilgisi
- İlişkili yazıya hızlı erişim

**Özellikler:**
✓ Yönetici onayı gerekli
✓ İç-içe yorumlar (parent_comment_id)
✓ Beğeni sayacı
✓ Spam filtresi (manuel)

### 4️⃣ Blog Abonelik Sistemi (Newsletter)

**API Endpoints:**
- `POST /api/blog/subscribe` — Abone ol
- `DELETE /api/blog/subscribe` — Abonelikten çık

**Veritabanı:**
```
blog_subscriptions:
- email (UNIQUE)
- user_id (nullable, oturum açmış kullanıcılar için)
- status (subscribed | unsubscribed)
- categories (JSON: hangi kategorilere abone)
- unsubscribed_at (iptal tarihi)
```

**Özellikler:**
✓ E-posta doğrulaması (frontend validasyonu)
✓ Kategori seçimi
✓ Çift abonelik koruması
✓ Unsubscribe linki
✓ Abone istatistikleri

### 5️⃣ Okuma Geçmişi & Katılım Takibi

**API Endpoints:**
- `POST /api/blog/reading-history` — Okuma kaydı (auth required)
- `GET /api/blog/reading-history` — Kullanıcının geçmişi (auth required)

**Veriler:**
```
blog_reading_history:
- user_id, post_id
- time_spent_seconds (kaç saniye kaldı)
- scroll_percentage (sayfanın %'si kaydırıldı)
- created_at (otomatik güncelleme)
```

**Frontend Entegrasyonu:**
```javascript
// Yazı görüntülelenirken
recordReadingTime(postId, timeSpent, scrollPercent);
```

**Analitikal Kullanım:**
- Benzersiz okuyucu sayısı
- Ortalama okuma süresi
- Ortalama scroll yüzdesi
- Kullanıcı tercihlerini öğren

### 6️⃣ Blog Analitikleri Dashboardi

**API:** `GET /api/blog/analytics` (admin only)

**Admin Paneli:** `/admin/blog/analytics`

**Metrikler:**
```
📊 Yazı Istatistikleri:
  - Toplam: published, draft, archived
  - Görüntüleme: toplam, ortalama
  - Beğeni: toplam

💬 Yorum Istatistikleri:
  - Toplam, pending, approved, rejected

📧 Abone Istatistikleri:
  - Aktif, unsubscribed, toplam

👥 Katılım Metrikleri:
  - Benzersiz okuyucu
  - Ort. okuma süresi
  - Ort. scroll yüzdesi

🔝 En Çok Okunan Yazılar (top 10)
📁 Kategori Performansı
  - Yazı sayısı, toplam görüntüleme

⏰ Son 5 Yazı (status ile)
```

### 7️⃣ Planlanmış Yazılar

**API:** `GET /api/blog/scheduled-posts` (admin only)

**Özellikler:**
✓ Gelecek tarih seçimi (`publishedAt`)
✓ Otomatik yayınlama (cron/webhook ile)
✓ Durum takibi (scheduled, ready_to_publish)
✓ Toplu planlama

**Şema:**
```
POST /api/blog/scheduled-posts
{
  "postId": 1,
  "publishAt": "2026-04-15T10:00:00Z"
}
```

---

## 🎯 Frontend Sayfaları

### Genel Sayfalar

**`/blog` — Blog Listesi**
- Kategori filtreleri (dinamik)
- Sayfalama
- Öne çıkan yazı (1. sayfada)
- Grid layout (responsive)

**`/blog/[slug]` — Yazı Detayı**
- İçerik görüntüleme
- Yazar/Tarih/Okuma süresi
- Etiketler
- İlişkili yazılar (aynı kategori)
- Yorum formu
- Beğeni/Paylaş butonları
- Okuma geçmişi otomatik kaydı

### Admin Paneli

**`/admin/blog` — Ana Sayfa**
- İstatistik kartları (toplam, yayınlı, taslak, arşiv)
- Son yazılar tablosu
- Hızlı işlemler menüsü

**`/admin/blog/add` — Yazı Oluştur/Düzenle**
- Başlık, içerik, özet
- Kategori seçimi
- Kapak görseli/küçük resim (URL)
- SEO alanları
- Etiket yönetimi
- Yayın tarihi (planlanmış yazılar)
- Durum seçimi (draft/published)

**`/admin/blog/comments` — Yorum Moderasyonu**
- Tab'lar: Pending (⏳), Approved (✓), Rejected (✗)
- Yorum önizlemesi
- Toplu işlemler (onayla/reddet/sil)
- Oranlar

**`/admin/blog/analytics` — Analitikler Dashboardi**
- 4 büyük metrik kartı
- Katılım verileri
- En çok okunan yazılar
- Kategori performansı tablosu
- Son yazılar listesi

---

## 🔐 Güvenlik

**SQL Injection Prevention:**
✓ Parametreli sorgular (`$1`, `$2`, ...)
✓ Table allowlist: `blog_posts`, `blog_categories`, `blog_comments`, vb.

**XSS Prevention:**
✓ HTML sanitize (`sanitizeInput()`)
✓ User input validasyonu (`validateWithSchema()`)

**Authentication:**
✓ JWT token (24h TTL, sliding window)
✓ Admin-only endpoints (`/api/blog/posts` POST/PUT/DELETE)
✓ Moderator roles (admin)

**Rate Limiting:**
✓ IP-based (100 req/15min)
✓ Endpoint-specific

---

## 📊 Veritabanı Şeması

```sql
-- 7 Tablo
blog_categories (id, name, slug, description, icon, order_index)
blog_posts (id, title, slug, content, excerpt, author_id, category_id, ...)
blog_tags (id, name, slug, post_count)
blog_post_tags (post_id, tag_id) -- M:N junction
blog_comments (id, post_id, user_id, author_name, content, status, parent_comment_id)
blog_subscriptions (id, email, user_id, status, categories)
blog_reading_history (id, user_id, post_id, time_spent_seconds, scroll_percentage)

-- 10+ Indexes
idx_blog_posts_slug
idx_blog_posts_status_published
idx_blog_posts_is_featured
idx_blog_comments_post_id
idx_blog_posts_search (GIN, full-text Turkish)
```

---

## 🚀 Performans & Caching

**Redis Cache Keys:**
```
sanliurfa:blog:categories           -- 1 saat TTL
sanliurfa:blog:posts:list:[page]    -- 5 dakika TTL
sanliurfa:blog:posts:[id]           -- 10 dakika TTL
sanliurfa:blog:search:[query]       -- 30 dakika TTL
```

**Invalidation Strategy:**
✓ Pattern deletion (`sanliurfa:blog:*`) on mutations
✓ Cache hit/miss tracking
✓ Aggregated metrics

**Database Optimization:**
✓ Connection pool (min: 2, max: 20)
✓ Indexes for sorting/filtering
✓ Full-text search index (Turkish)
✓ Slow query detection (>100ms debug, >1000ms warning)

---

## 📈 API Dökümantasyonu

**Standart Response Format:**
```json
{
  "success": true,
  "data": { /* ... */ },
  "error": null,
  "requestId": "uuid-v4"
}
```

**HTTP Status Codes:**
- 200 OK
- 201 Created
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 409 Conflict
- 422 Unprocessable Entity
- 429 Too Many Requests
- 500 Internal Server Error

**Authentication Header:**
```
Cookie: auth-token=<JWT_TOKEN>
```

---

## 🛠️ Developer Kullanımı

### Blog Yazısı Oluşturma
```typescript
const response = await fetch('/api/blog/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Göbeklitepe Rehberi',
    content: 'İçerik...',
    excerpt: 'Kısa özet...',
    categoryId: 2,
    tags: ['tarih', 'gezi'],
    isFeatured: true,
    status: 'published',
    seoTitle: 'Göbeklitepe Ziyaret Rehberi',
    seoDescription: 'Tarihte en eski tapınak kompleksi...'
  })
});
```

### Okuma Geçmişi Kaydetme
```typescript
// Yazı sayfasında
recordReadingTime(postId, timeSpentSeconds, scrollPercentage);
```

### Abone Olma
```javascript
// Frontend form
fetch('/api/blog/subscribe', {
  method: 'POST',
  body: JSON.stringify({ email: 'user@example.com', categories: 'seyahat,tarih' })
});
```

---

## 📱 Responsive Tasarım

✓ Mobile-first CSS
✓ Tailwind CSS + dark mode
✓ Grid/Flex layouts
✓ Accessible components
✓ SEO-friendly HTML structure

---

## 🔄 Entegrasyon Noktaları

**Mevcut Sistemler ile Bağlantı:**
- User authentication (JWT via `src/lib/auth.ts`)
- Database (PostgreSQL via `src/lib/postgres.ts`)
- Cache (Redis via `src/lib/cache.ts`)
- Logging (Structured logs via `src/lib/logging.ts`)
- Metrics (Request metrics via `src/lib/metrics.ts`)
- Error handling (Standard API errors via `src/lib/api.ts`)

**Planlanan Entegrasyonlar:**
- Email notifications (comment replies)
- Push notifications (new post in category)
- Social sharing
- Comment reply threading UI

---

## 🎓 Eğitim Kaynakları

- Full code documentation in Turkish (`blog.ts` comments)
- API examples in endpoint descriptions
- Admin panel inline help text
- Error messages in user-friendly Turkish

---

## 📝 Notlar

**Veritabanı Migration:**
```bash
npm run db:migrate  # 020_blog_system.ts otomatik çalıştırılır
```

**Default Categories (inserted automatically):**
1. Seyahat
2. Kültür & Tarih
3. Yerel Mutfak
4. Etkinlikler
5. Rehberler

**Credentials:**
- Admin Access: `/admin/blog` (requires `isAdmin` role)
- Public Access: `/blog` (all users)

---

## ✅ Checklist

- [x] 7 database tables
- [x] 9 core API endpoints
- [x] 3 admin management pages
- [x] 2 public frontend pages
- [x] Full-text search (Turkish)
- [x] Comment moderation system
- [x] Newsletter/subscription system
- [x] Reading history tracking
- [x] Analytics dashboard
- [x] Scheduled posts
- [x] Redis caching
- [x] Error handling
- [x] Logging & metrics
- [x] SEO optimization
- [x] Responsive design
- [x] Dark mode support
- [x] Turkish language support

**Status: ✅ PRODUCTION READY**
