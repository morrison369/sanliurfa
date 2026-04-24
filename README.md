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

### Urun Politikasi (Faz 1)
- [x] Ilk asamada tum ozellikler ucretsiz ve tam acik
- [x] Premium/uyelik kilidi yok (erken erisim donemi)

### Genel
- [x] Ana sayfa (Hero, arama, kategoriler, one cikan mekanlar)
- [x] Arama sistemi (Full-text search + filtreler)
- [x] Kategoriler ve filtreleme
- [x] Responsive tasarim
- [x] SEO optimizasyonu
- [x] PWA destegi
- [x] Dark mode
- [x] Astro core prefetch (dahili linklerde hizli gecis)
- [x] Astro remote image authorization (Pexels/Unsplash)

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
- [x] Uyeler arasi mesajlasma
- [x] Arkadas ekleme / takip sistemi
- [x] Uye profiline en fazla 4 foto ekleme
- [x] Swipe tabanli eslesme (saga/sola kaydirma)
- [x] Eslesen uyeler ile mesajlasma baslatma
- [x] Eslesme aninda otomatik sohbet olusturma
- [x] Gunluk swipe limiti (konfigure edilebilir)

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
- [x] Site icerik yonetimi (DB-first)
- [x] Ana sayfa hero metin/gorsel yonetimi (admin + database)
- [x] Header hizli linkleri ve footer link gruplari (admin + database)
- [x] Ana sayfa ana CTA alani (admin + database)
- [x] Ana sayfa hizli moduller, rehber linkleri ve SSS (admin + database)

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
- [x] Partytown ile 3. parti scriptleri web worker'da calistirma

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
- `/mesajlar` - Uye mesajlasma merkezi
- `/takipciler` - Takipciler
- `/takip-edilenler` - Takip edilenler
- `/eslesme` - Swipe eslesme ve profil foto yonetimi

### Isletme
- `/vendor/dashboard` - Panel
- `/vendor/analytics` - Analitik

### Admin
- `/admin` - Dashboard
- `/admin/site-content` - Site icerik yonetimi (DB-first)
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
- `POST /api/places/submit` - Uye tarafindan mekan ekleme
- `POST /api/places/[id]/like` - Mekan begenme/etkilesim
- `POST /api/places/[id]/share` - Mekan paylasim kaydi

### Social
- `POST /api/social/follow` - Takip/arkadaslik iliskisi
- `GET /api/social/followers` - Takipci/takip edilen listesi
- `GET /api/messages` - Konusma listesi
- `POST /api/messages` - Alici ile konusma baslat
- `GET/POST/DELETE /api/messages/[conversationId]` - Mesajlari listele/gonder/konusmayi gizle
- `GET /api/social/feed` - Aktivite akisi
- `GET/POST /api/social/match-profile` - Eslesme profili (max 4 foto)
- `GET /api/social/match-candidates` - Swipe adaylari
- `POST /api/social/swipe` - Sola/saga kaydirma
- `GET /api/social/matches` - Eslesen uyeler
- `GET /api/social/capabilities` - Sosyal ozellik durumu + swipe kotasi

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
- `GET/PUT /api/admin/site/settings?key=...` - Site ayarlari (DB-first icerik)

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
PUBLIC_FACEBOOK_PIXEL_ID=
PUBLIC_TIKTOK_PIXEL_ID=
SOCIAL_OPEN_ACCESS=true
SOCIAL_TINDER_ENABLED=true
SOCIAL_AUTO_CONVERSATION=true
SOCIAL_SWIPE_DAILY_LIMIT=100

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

# PR icin hizli E2E (sadece chromium)
npm run test:e2e:chromium

# Gece tam matrix E2E
npm run test:e2e:nightly

# Load test
npm run load:test
```

### API Release Gate

```bash
# OpenAPI + endpoint contract + smoke gate (onerilen)
npm run api:release:gate

# Workflow dosyalari standart/hijyen dogrulamasi (onerilen)
npm run workflow:standards:verify

# Workflow standard otomatik duzeltme kontrolu
npm run workflow:standards:autofix:check

# API contract suite (coverage threshold dahil)
npm run test:api-contract:coverage

# OpenAPI route drift regression gate
npm run openapi:sync:routes:gate

# Baseline dosyasini guncelle (bilincli operasyon)
npm run openapi:sync:routes:baseline

# Sadece degisen dosyalarda lint (PR gate)
npm run lint:changed

# OpenAPI gap domain ozeti
npm run openapi:gap:summary

# Secret leakage taramasi
npm run security:scan-secrets

# Migration duplicate kontrolu
npm run db:migrate:check-duplicates
```

Not: `docs/openapi-route-gap-baseline.json` dosyasi mevcut dokumante edilmemis route setini sabitler.
Yeni bir route dosyasi eklenip OpenAPI'ye eklenmezse gate fail olur.

CI notu: API degisikliklerinde hizli kontrol icin `.github/workflows/api-contract-gate.yml`
workflow'u otomatik calisir ve PR'a OpenAPI gap ozeti yorumu yazar.

Guvenlik notu: key rotation adimlari icin `docs/security-key-rotation-runbook.md` dosyasini izleyin.
PR parcalama plani icin `docs/pr-split-plan.md` dosyasini kullanin.
Branch protection checklist icin `docs/branch-protection-checklist.md` dosyasini kullanin.

## Katkida Bulunma

1. Fork yapin
2. Feature branch olusturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'feat: Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. PR acin

## Dokumantasyon

- [Deployment Rehberi](DEPLOYMENT.md) - Detayli deployment adimlari
- [API Dokumantasyonu](src/pages/api/docs.ts) - API endpoint referansi
- [OpenAPI Coverage Plan](docs/openapi-coverage-plan.md) - Gap azaltma sprint plani
- [Type-Check Priority Backlog](docs/typecheck-priority-backlog.md) - Tip hatasi kapanis sirasi

## Lisans

MIT
