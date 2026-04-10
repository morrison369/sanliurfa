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
npm run test:critical
npm run test:e2e
npm run test:regression:unit
npm run test:regression:e2e
npm run phase:sync:tsconfig
npm run test:phase:range -- 947-952
npm run test:phase:batch -- 947-952 953-958 959-964
npm run test:phase:smoke
npm run test:phase:gate:ci
npm run phase:doctor
npm run phase:changelog:normalize
npm run test:unit -- src/lib/__tests__/report-engine-excel-smoke.test.ts
npm run repo:stabilize:check
npm run security:secrets:scan
npm run governance:imports:check
npm run db:drift:check
npm run db:test:bootstrap
npm run env:contract:check
npm run env:contract:check:ci
npm run migrate:status
npm run migrate:dry-run
npm run typecheck:app
npm run release:gate
npm run test:e2e:smoke
npm run test:e2e:full
```

## Release ve Stabilizasyon
- API geçiş politikası: `docs/API_LEGACY_POLICY.md`
- Repo stabilizasyon runbook: `docs/REPO_STABILIZATION_RUNBOOK.md`
- Release gate: `docs/RELEASE_GATES.md`
- Live status snapshot: `docs/STATUS_LIVE.md`
- Webhook güvenlik politikası: `docs/WEBHOOK_SECURITY_POLICY.md`
- Script envanteri ve deprecate politikası: `docs/SCRIPT_INVENTORY.md`
- Experimental typecheck kapanış planı: `docs/TYPECHECK_EXPERIMENTAL_BACKLOG.md`
- 7 günlük uygulama planı: `docs/SEVEN_DAY_EXECUTION_PLAN.md`

## Clean Worktree Politikası
- Teslimat tabanı her zaman `origin/master` üstünden açılmış temiz `git worktree` olmalı.
- Kirli local root worktree phase tracker, changelog veya operasyon durumu için source of truth değildir.
- Local shell Node sürümü repo politikasının altındaysa `:preferred` wrapper’larını kullanın.
- Tekil `test:phase:<range>` scriptleri compatibility yüzeyidir; yeni operasyonda `test:phase:range`, `test:phase:batch` ve `phase:prepare:batch:preferred` kullanın.

## Source Of Truth
- Aktif operasyon için authoritative set:
  - `README.md`
  - `AGENTS.md`
  - `PHASE_OPERATIONS_GUIDE.md`
  - `docs/WORKTREE_SOURCE_OF_TRUTH.md`
  - `STALE_WORKTREE.md`
  - `ROOT_INVENTORY_ONLY_POLICY.md`
  - `PHASE_INDEX.md`
  - `TASK_TRACKER.md`
  - `memory.md`
- Local root worktree bunlarla çelişiyorsa clean worktree + `origin/master` kazanır.
- Dirty root yalnızca inventory/forensics yüzeyidir.
- Aktif operasyon dosyalarının kısa listesi için `docs/ACTIVE_DOCS.md` kullanın.
- Mimari sabitler için `ARCHITECTURE.md` kullanın.

## Astro Operasyon Notları
- Repo SSR-first çalışır: `output: "server"` ve `@astrojs/node` adapter.
- `npm run dev:1111` öncesi port temizliği otomatik yapılır (`scripts/ensure-port-free.ps1`) ve `--strictPort` kullanılır.
- Route collision üretmeyin: `src/pages/x.ts` ile `src/pages/x/index.ts` aynı anda yaşamamalı.
- Content collection değişikliklerinde `src/content.config.ts` ve `src/content/` birlikte ele alınmalı.
- PWA build çıktısında service worker dosyası `sw.js` olarak üretilir; build araçlarını buna göre konfigüre edin.
- `import.meta.env` kullanan bundled scriptleri keyfi `is:inline` yapmayın.

## Typecheck Scope Ayrımı
- `tsconfig.app.json`: merge-blocking kritik runtime/gate yüzeyi.
- `tsconfig.experimental.json`: geniş/deneysel modül alanı.
- CI blocking typecheck `npm run typecheck:app` ile yapılır.

## PR Politikası
- `master` korumalıdır; doğrudan push yapılmaz.
- Phase içeriği ile phase changelog iki ayrı commit olarak tutulur.
- `PHASE_CHANGELOG.md` duplicate veya malformed satır taşıyorsa PR açmadan önce `npm run phase:changelog:normalize` çalıştırın.
- Phase PR açarken API-first akışı tercih edin:
```bash
npx tsx scripts/phase-pr.ts open --repo titanai777/sanliurfa --base master --head <branch> --title "..." --body-file <file>
```
- Merge sonrası remote durumu doğrulayın:
```bash
npx tsx scripts/phase-pr.ts view --repo titanai777/sanliurfa --pr <number>
```

## Operasyon Hijyeni
- PR açmadan önce `npm run phase:doctor` çalıştırın.
- Changelog hygiene için `npm run phase:changelog:normalize` kullanın.
- Script yüzeyi raporu için `npm run phase:scripts:report` kullanın.
- Dependency risk özeti için `npm run deps:audit:triage` kullanın.
- Dated cleanup ve verification raporları root yerine `docs/archive/cleanup/` altında tutulmalıdır.

## Önerilen Batch Akışı
```bash
npm run phase:generate:block:write -- scripts/phase-blocks/phase-947-952.json
npm run phase:prepare:batch:preferred -- --phase-script test:phase:947-952 --phase-script test:phase:953-958 --phase-script test:phase:959-964
```

## Root Worktree Notu
- `D:\sanliurfa.com\sanliurfa` dirty veya eski bir branch üzerinde olabilir.
- Bu durumda oradan delivery yapmayın.
- Önce `git fetch origin`, sonra temiz worktree açın.
