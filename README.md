# Şanlıurfa.com

Modern, hızlı ve kullanıcı dostu Şanlıurfa rehberi web uygulaması.

## 🚀 Özellikler

### Kullanıcı Özellikleri
- 🔍 Gelişmiş arama ve filtreleme
- ⭐ Mekan değerlendirme ve yorumları
- ❤️ Favoriler ve kaydetme
- 🗺️ Harita entegrasyonu
- 🌙 Karanlık mod
- 🌐 Çoklu dil desteği (TR/EN/AR)

### Kullanıcı Sistemi
- 🔐 Email ve sosyal medya girişi (Google, Facebook)
- 🏅 Rozet ve seviye sistemi
- 📊 Puan kazanma mekanizması
- 🔔 Bildirim sistemi (In-app, Email)
- 👤 Kullanıcı profili

### Admin Panel
- 📊 Dashboard ve istatistikler
- ✏️ İçerik yönetimi (CRUD)
- ✅ Moderasyon ve onay süreci
- 📈 Veri analizi ve raporlama
- 📤 Veri dışa aktarma (CSV/JSON)

### Teknik Özellikler
- ⚡ Astro 6.1 + React 19 + TypeScript
- 🎨 Tailwind CSS + Lucide Icons
- 🔥 Supabase (PostgreSQL + Auth + Realtime)
- 📱 PWA desteği (Offline, Push notifications)
- 🔒 Güvenlik (Rate limiting, CSP, Security headers)
- 🧪 Test kapsamı (Unit + E2E)
- 🚀 CI/CD (GitHub Actions)
- 🐳 Docker desteği

## 🛠️ Kurulum

### Gereksinimler
- Node.js 22+
- npm veya yarn
- Supabase hesabı

### Adımlar

1. Repoyu klonlayın:
```bash
git clone https://github.com/yourusername/sanliurfa.com.git
cd sanliurfa.com/sanliurfa
```

2. Bağımlılıkları yükleyin:
```bash
npm install --legacy-peer-deps
```

3. Ortam değişkenlerini ayarlayın:
```bash
cp .env.example .env
# .env dosyasını düzenleyin
```

4. Geliştirme sunucusunu başlatın:
```bash
npm run dev
```

## 📁 Proje Yapısı

```
sanliurfa/
├── src/
│   ├── components/     # UI bileşenleri
│   ├── layouts/        # Sayfa şablonları
│   ├── pages/          # Sayfalar ve API rotaları
│   ├── lib/            # Yardımcı fonksiyonlar
│   ├── i18n/           # Çeviri dosyaları
│   ├── middleware/     # Middleware (auth, cache, security)
│   └── styles/         # Global stiller
├── public/             # Statik dosyalar
├── supabase/           # Veritabanı migrasyonları
└── e2e/               # E2E testler
```

## 🧪 Test

### Unit Testler
```bash
npm run test:unit
```

### E2E Testler
```bash
npm run test:e2e
```

### Lighthouse
```bash
npm run lighthouse
```

### Phase Automation
```bash
# Sync versioned phase modules into tsconfig.phase.json
npm run phase:sync:tsconfig

# Check tsconfig.phase.json drift (CI-safe)
npm run phase:check:tsconfig

# Run previous + latest phase suites automatically
npm run test:phase:smoke
```

## 🚀 Deployment

### Docker ile
```bash
docker-compose up -d
```

### Manuel Deployment
```bash
npm run build
npm run preview
```

## 📚 API Dokümantasyonu

API dokümantasyonu için [API.md](./API.md) dosyasına bakın.

## 🔐 Güvenlik

- Rate limiting (API ve auth endpointleri)
- CSRF koruması
- XSS koruması
- Güvenlik header'ları
- Input validasyonu

## 📄 Lisans

MIT License
