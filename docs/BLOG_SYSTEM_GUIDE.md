# Blog ve İçerik Botu Sistemi - Kullanım Kılavuzu

Bu dokümanda Şanlıurfa.com için geliştirilen blog sistemi ve AI içerik botu açıklanmaktadır.

## 📁 Dosya Yapısı

```
src/
├── lib/
│   ├── blog/
│   │   ├── db.ts              # PostgreSQL blog modülü
│   │   └── index.ts           # Export'lar
│   └── agents/
│       └── content-generator.ts  # AI içerik oluşturucu
├── pages/
│   ├── blog/
│   │   ├── index.astro        # Blog ana sayfası
│   │   └── [slug].astro       # Blog detay sayfası
│   ├── admin/
│   │   ├── blog.astro         # Blog dashboard
│   │   └── blog/
│   │       ├── posts.astro    # Yazı listesi
│   │       ├── new.astro      # Yeni yazı
│   │       ├── edit/[id].astro # Yazı düzenle
│   │       ├── content-bot.astro # İçerik botu
│   │       └── categories.astro # Kategoriler
│   └── api/
│       └── admin/
│           ├── blog/
│           │   ├── index.ts   # Blog API
│           │   ├── [id].ts    # Yazı detay API
│           │   ├── categories.ts
│           │   ├── tags.ts
│           │   └── stats.ts
│           └── content-bot/
│               └── generate.ts # Bot API
├── migrations/
│   └── 120_blog_system.ts     # Database migration
└── content/
    └── config.ts              # Astro content config
```

## 🗄️ Database Tabloları

### blog_posts
- `id`, `slug`, `title`, `excerpt`, `content`
- `status`: draft | published | scheduled | archived
- `category_id`, `author_id`, `author_name`
- `featured_image`, `meta_title`, `meta_description`
- `is_featured`, `is_pinned`
- `view_count`, `like_count`, `reading_time`
- `published_at`, `created_at`, `updated_at`

### blog_categories
- `id`, `slug`, `name`, `description`
- `color`, `icon`, `sort_order`
- `post_count`

### blog_tags
- `id`, `slug`, `name`, `description`
- `color`, `post_count`

### blog_post_tags
- `post_id`, `tag_id` (many-to-many)

### blog_revisions
- `id`, `post_id`, `title`, `content`
- `editor_id`, `editor_name`, `change_summary`

### content_generation_jobs
- `id`, `job_type`, `status`, `parameters`
- `result_post_id`, `error_message`

## 🔧 Admin Panel URL'leri

| Sayfa | URL |
|-------|-----|
| Blog Dashboard | `/admin/blog` |
| Tüm Yazılar | `/admin/blog/posts` |
| Yeni Yazı | `/admin/blog/new` |
| Yazı Düzenle | `/admin/blog/edit/[id]` |
| İçerik Botu | `/admin/blog/content-bot` |
| Kategoriler | `/admin/blog/categories` |

## 🤖 İçerik Botu Kullanımı

### 1. Kategori Rehberi Oluşturma
Bot, belirli bir kategori için kapsamlı rehber yazıları oluşturur:

```
POST /api/admin/content-bot/generate
{
  "type": "category-guide",
  "category": "restoran"  // veya "otel", "tarihi-yerler", "cafe"
}
```

**Oluşturulan içerik:**
- Kategori hakkında genel bilgi
- Mekan listesi (veritabanından çekilir)
- Her mekan için kısa açıklama
- SEO uyumlu başlık ve meta açıklamalar

### 2. Mekan İçeriği Oluşturma
Belirli mekanlar için detaylı blog yazıları:

```
POST /api/admin/content-bot/generate
{
  "type": "places",
  "placeIds": ["uuid1", "uuid2", "uuid3"]
}
```

**Oluşturulan içerik:**
- Mekan tanıtımı
- Tarihçe (tarihi yerler için)
- Özellikler ve hizmetler
- Ziyaret ipuçları
- İletişim bilgileri

### Bot Özellikleri
- ✅ Otomatik slug oluşturma
- ✅ SEO meta başlıklar
- ✅ Kategori eşleştirme
- ✅ Taslak olarak kaydetme (admin onayı için)
- ✅ Tekrar oluşturmayı önleme (kontrol mekanizması)

## 📝 Blog API Endpoints

### Public API'ler
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/blog` | Blog ana sayfası |
| GET | `/blog/[slug]` | Yazı detayı |

### Admin API'ler
| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/api/admin/blog` | Yazıları listele (filtreli) |
| POST | `/api/admin/blog` | Yeni yazı oluştur |
| GET | `/api/admin/blog/[id]` | Yazı detayı |
| PUT | `/api/admin/blog/[id]` | Yazı güncelle |
| DELETE | `/api/admin/blog/[id]` | Yazı sil |
| GET | `/api/admin/blog/categories` | Kategorileri listele |
| POST | `/api/admin/blog/categories` | Kategori oluştur |
| GET | `/api/admin/blog/tags` | Etiketleri listele |
| POST | `/api/admin/blog/tags` | Etiket oluştur |
| GET | `/api/admin/blog/stats` | İstatistikler |

## 🎨 Özellikler

### Yönetim Özellikleri
- ✅ Zengin metin editörü (Markdown destekli)
- ✅ Kategori ve etiket yönetimi
- ✅ Öne çıkan yazılar
- ✅ Sabitlenmiş yazılar
- ✅ SEO meta alanları
- ✅ Yazı revizyon geçmişi
- ✅ Görüntülenme ve beğeni sayaçları
- ✅ Okuma süresi hesaplama

### Bot Özellikleri
- ✅ Kategori bazlı toplu içerik oluşturma
- ✅ Mekan bazlı detaylı içerik
- ✅ Otomatik SEO optimizasyonu
- ✅ Tekrar kontrolü
- ✅ Taslak modda kaydetme
- ✅ İşlem geçmişi

### Frontend Özellikleri
- ✅ Responsive blog tasarımı
- ✅ Sosyal paylaşım butonları
- ✅ İlgili yazılar önerisi
- ✅ Kategori ve etiket filtreleme
- ✅ Arama fonksiyonu
- ✅ RSS feed desteği

## 🚀 Kullanım Akışı

### 1. Manuel Yazı Ekleme
1. Admin panel → Blog → Yeni Yazı
2. Başlık, slug ve içerik gir
3. Kategori ve etiket seç
4. SEO alanlarını doldur (opsiyonel)
5. Durum: Taslak veya Yayınla
6. Kaydet

### 2. Bot ile İçerik Oluşturma
1. Admin panel → Blog → İçerik Botu
2. Kategori seç ve "Rehber Oluştur" butonuna tıkla
3. VEYA mekanları listele ve seç
4. "İçerik Oluştur" butonuna tıkla
5. Oluşan taslakları kontrol et ve yayınla

### 3. Yazı Düzenleme
1. Admin panel → Blog → Tüm Yazılar
2. Düzenlenecek yazıyı bul
3. "Düzenle" linkine tıkla
4. Değişiklikleri yap
5. Revizyon otomatik kaydedilir
6. Kaydet

## 📊 Dashboard İstatistikleri

Blog dashboard'da gösterilen istatistikler:
- Toplam yazı sayısı
- Yayında olan yazılar
- Taslak yazılar
- Toplam görüntülenme
- En popüler yazılar
- Son eklenen yazılar
- Kategoriye göre dağılım

## 🔒 Güvenlik

- Tüm admin API'leri `requireRole('admin')` ile korunur
- Yazı revizyonları editor bilgisiyle kaydedilir
- Silme işlemi onay gerektirir
- Bot oluşturulan içerikler varsayılan olarak taslak durumundadır

## 📝 Notlar

- İçerik botu kural tabanlı çalışır (ücretli API kullanmaz)
- Markdown formatı desteklenir
- Otomatik slug oluşturma (Türkçe karakter dönüşümü)
- Cache mekanizması ile performans optimizasyonu
- Responsive tasarım (mobil uyumlu)
