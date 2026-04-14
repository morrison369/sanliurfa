# Sanliurfa.com

Sanliurfa'nin en kapsamli mekan rehberi platformu.

## Teknolojiler

- **Frontend**: Astro 6.x + React 19 + TypeScript 6.x
- **Styling**: Tailwind CSS
- **Backend**: Astro SSR (@astrojs/node)
- **Database**: PostgreSQL
- **Cache**: Redis (opsiyonel)
- **Container**: Docker + Docker Compose
- **CI/CD**: GitHub Actions

## Ozellikler

### Genel
- [x] Ana sayfa (Hero, arama, kategoriler, one cikan mekanlar)
- [x] Arama sistemi (Full-text search + filtreler)
- [x] Kategoriler ve filtreleme
- [x] Responsive tasarim
- [x] SEO optimizasyonu
- [x] PWA destegi
- [x] Dark mode

### Mekanlar
- [x] Mekan listeleme ve detay sayfalari
- [x] Yorum sistemi
- [x] Puanlama sistemi
- [x] Fotoğraf galerisi
- [x] Calisma saatleri
- [x] Harita entegrasyonu

### Kullanici
- [x] Kullanici kayit/giris (bcrypt + JWT)
- [x] Profil yonetimi
- [x] Favori mekanlar
- [x] Yorum yapma
- [x] Sosyal giris (Google)

### Isletme Paneli (Vendor)
- [x] Dashboard
- [x] Isletme bilgileri yonetimi
- [x] Fotoğraf yukleme
- [x] Rezervasyon yonetimi
- [x] Kampanya/promosyon olusturma
- [x] Analitik ve raporlar
- [x] Yorumlara yanit verme

### Admin Paneli
- [x] Dashboard istatistikleri
- [x] Kullanici yonetimi
- [x] Isletme onay/red
- [x] Blog yonetimi
- [x] Destek ticketlari

### Iletisim
- [x] Iletisim formu
- [x] Isletme basvuru formu
- [x] Otomatik ticket sistemi

### Guvenlik & Performans
- [x] Rate limiting (IP, User, Endpoint bazli)
- [x] SQL injection korumasi
- [x] XSS korumasi
- [x] Input validasyonu
- [x] Webhook sistemi
- [x] Health check endpoint

## Docker ile Kurulum

```bash
# .env dosyasini olustur
cp .env.example .env

# Container'lari baslat
docker-compose up -d

# Veritabani migrations calistir
docker-compose exec app npm run migrate

# Logs
docker-compose logs -f app
```

## Manuel Kurulum

```bash
# Bagimliliklari yukle
npm install

# .env dosyasini duzenle
cp .env.example .env

# Veritabani migrations calistir
npm run migrate

# Gelistirme sunucusu
npm run dev

# Uretim build'i
npm run build

# Uretim sunucusu
npm run preview
```

## API Dokumantasyonu

```bash
GET /api/docs - API dokumantasyonu
GET /api/health - Saglik kontrolu
```

## Sayfa Haritasi

### Public
- `/` - Ana sayfa
- `/places` - Mekanlar
- `/places/[slug]` - Mekan detay
- `/kategoriler/[slug]` - Kategori
- `/blog` - Blog
- `/blog/[slug]` - Blog yazisi
- `/arama?q=` - Arama sonuclari
- `/iletisim` - Iletisim formu
- `/isletme-kayit` - Isletme basvurusu
- `/hakkimizda` - Hakkinda
- `/gizlilik` - Gizlilik politikasi
- `/404` - 404 sayfasi

### Kullanici
- `/giris` - Giris
- `/kayit` - Kayit
- `/profil` - Profilim

### Isletme
- `/vendor/dashboard` - Panel
- `/vendor/analytics` - Analitik

### Admin
- `/admin` - Dashboard
- `/admin/users` - Kullanicilar
- `/admin/places` - Isletmeler
- `/admin/blog` - Blog yonetimi
- `/admin/tickets` - Destek talepleri

## API Endpoint'leri

### Auth
- `POST /api/auth/register` - Kayit ol
- `POST /api/auth/login` - Giris yap

### Places
- `GET /api/places` - Listele
- `GET /api/places/[id]` - Detay
- `POST /api/places/apply` - Basvuru yap
- `POST /api/places/[id]/reviews` - Yorum ekle

### Search
- `GET /api/search?q=` - Ara

### Upload
- `POST /api/upload` - Dosya yukle

### Reservations
- `GET/POST /api/reservations` - Rezervasyonlar

### Promotions
- `GET/POST /api/promotions` - Kampanyalar

### Admin
- `GET /api/admin/dashboard` - Istatistikler
- `GET/PUT /api/admin/users` - Kullanici yonetimi
- `GET/PUT /api/admin/places` - Isletme yonetimi

### User
- `GET/POST/DELETE /api/user/favorites` - Favoriler

### Contact
- `POST /api/contact` - Iletisim formu
- `GET /api/contact/[id]` - Ticket detayi (admin)
- `PUT /api/contact/[id]` - Ticket guncelle (admin)

### Webhooks
- `POST /api/webhooks/trigger` - Webhook tetikle

## Database Migrations

Migrations `src/migrations/` klasorunde tutulur. Son migration versiyonu: **132**

Baslica tablolar:
- `users` - Kullanicilar
- `places` - Isletmeler
- `reviews` - Yorumlar
- `blog_posts` - Blog yazilari
- `reservations` - Rezervasyonlar
- `promotions` - Kampanyalar
- `support_tickets` - Destek talepleri
- `user_favorites` - Favoriler
- `rate_limit_logs` - Rate limit kayitlari
- `webhooks` - Webhook yapilandirmasi

## Ortam Degiskenleri

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sanliurfa

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Redis (opsiyonel)
REDIS_URL=redis://localhost:6379

# API Keys
GOOGLE_MAPS_API_KEY=

# Application
NODE_ENV=production
PORT=3000
APP_URL=http://localhost:3000
```

## Rate Limiting

| Endpoint | Limit | Pencere |
|----------|-------|---------|
| Default | 100 | 15 dakika |
| Auth endpoints | 5 | 1 saat |
| Kullanici | 1000 | 15 dakika |

## Build

Son basarili build: **~9 saniye**
- CSS: 3.29 KB (compressed)
- JS: 6.33 KB (compressed)
- Toplam: 780+ dosya

## CI/CD

GitHub Actions ile otomatik build ve deploy:
- Her PR'da test calisir
- Main branch'e push'ta Docker image build edilir
- VPS'e otomatik deploy (SSH ile)

## Production Deployment

### Hizli Deploy

```bash
# 1. Depoyu klonla
git clone https://github.com/username/sanliurfa.git
cd sanliurfa

# 2. Ortam degiskenlerini ayarla
cp .env.example .env
nano .env  # Gerekli degisiklikleri yap

# 3. Kontrol et
node scripts/check-env.js

# 4. Deploy et
chmod +x scripts/deploy.sh
./scripts/deploy.sh
```

### SSL Sertifikasi (Let's Encrypt)

```bash
export DOMAIN=sanliurfa.com
export EMAIL=admin@sanliurfa.com
./scripts/init-ssl.sh
```

### Monitoring

- Uygulama durumu: `GET /api/health`
- Admin monitoring: `/admin/monitoring`
- Sistem loglari: `docker-compose logs -f app`

## Test

```bash
# Unit testler
npm run test:unit

# E2E testler
npm run test:e2e

# Load test
npm run load:test
```

## Katkida Bulunma

1. Fork yapin
2. Feature branch olusturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. PR acin

## Dokumantasyon

- [Deployment Rehberi](DEPLOYMENT.md) - Detayli deployment adimlari
- [API Dokumantasyonu](src/pages/api/docs.ts) - API endpoint referansi

## Lisans

MIT
