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
- Node.js `22.13.0` veya daha yeni bir 22.x sürümü
- npm
- Supabase hesabı

### Adımlar

1. Repoyu klonlayın:
```bash
git clone https://github.com/yourusername/sanliurfa.com.git
cd sanliurfa.com/sanliurfa
```

2. Bağımlılıkları yükleyin:
```bash
npm ci
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

```text
sanliurfa/
├── src/
│   ├── components/
│   ├── content/
│   ├── layouts/
│   ├── lib/
│   ├── pages/
│   └── styles/
├── public/
├── scripts/
├── e2e/
└── supabase/
```

## 🧪 Test ve Phase Ops

```bash
npm run test:unit
npm run test:e2e
npm run phase:sync:tsconfig
npm run test:phase:smoke
npm run test:phase:gate:ci
```

## Astro Operasyon Notları
- Repo SSR-first çalışır: `output: "server"` ve `@astrojs/node` adapter.
- Route collision üretmeyin: `src/pages/x.ts` ile `src/pages/x/index.ts` aynı anda yaşamamalı.
- Content collection değişikliklerinde `src/content.config.ts` ve `src/content/` birlikte ele alınmalı.
- PWA build çıktısında service worker dosyası `sw.js` olarak üretilir; build araçlarını buna göre konfigüre edin.

## PR Politikası
- `master` korumalıdır; doğrudan push yapılmaz.
- Phase PR açarken API-first akışı tercih edin:
```bash
npx tsx scripts/phase-pr.ts open --repo titanai777/sanliurfa --base master --head <branch> --title "..." --body-file <file>
```
- Merge sonrası remote durumu doğrulayın:
```bash
npx tsx scripts/phase-pr.ts view --repo titanai777/sanliurfa --pr <number>
```
