# Şanlıurfa.com

Şanlıurfa için Astro tabanlı şehir rehberi, şehir servisleri ve admin yönetim platformu.

## Güncel Belgeler

Repo geçmişte 187+ tarihsel `.md` dosyası biriktirdi; tarihsel olanlar `.archive/` altına taşındı. Aşağıdaki dosyalar **canonical** (karar üreten) kabul edilir:

| Konu | Dosya |
|------|-------|
| Claude Code rehberi + günlük komutlar | [`CLAUDE.md`](CLAUDE.md) |
| Agent çalışma kuralları | [`AGENTS.md`](AGENTS.md) |
| Güvenlik (53 HARD RULE) | [`docs/SECURITY.md`](docs/SECURITY.md) |
| Astro framework detayları | [`docs/ASTRO_DETAILED.md`](docs/ASTRO_DETAILED.md) |
| Production deploy | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) |
| Operations runbook (SSH/deploy/rollback) | [`DEPLOY-OPS-RUNBOOK.md`](DEPLOY-OPS-RUNBOOK.md) |
| DB index audit | [`DB-INDEX-AUDIT.md`](DB-INDEX-AUDIT.md) |
| Manuel test senaryoları | [`TEST.md`](TEST.md) |
| Tüm doküman registry | [`docs/SOURCE_OF_TRUTH.md`](docs/SOURCE_OF_TRUTH.md) |

> Eski (`FINAL_*`, `PHASE_*`, `IMPLEMENTATION_*`, `OPTIMIZATION_*`, vb.) dosyalar `.archive/` altında — git history için saklanır, karar üretmezler. Tam liste için `docs/SOURCE_OF_TRUTH.md` "Arşivlenmiş" bölümüne bak.

## Önce Burayı Oku

Yeni oturumda hızlı yönlendirme için:

- `CLAUDE.md` — bu repoda çalışırken kullanılacak komutlar ve konvansiyonlar
- `AGENTS.md` — agent harness konfigürasyonu
- `ARCHITECTURE-MAP.md` — modül ve veri akışı haritası
- `docs/SOURCE_OF_TRUTH.md` — hangi konuda hangi belge authoritative
- `docs/ROUTE_OWNERSHIP.md` — route alias politikası

## Kanonik Gerçekler

- Framework: Astro SSR + React 19
- Dil: TypeScript strict
- Stil: Tailwind CSS 4
- Runtime: Node.js `22.13.0+`
- Önerilen Node sürümü: `22.19.0` (`.nvmrc`)
- Veritabanı: PostgreSQL (`pg`)
- Cache: Redis
- Production: CWP shared hosting + PM2 + Apache reverse proxy
- Dil politikası: yalnızca Türkçe
- İçerik modeli: DB-first admin yönetimi
- Medya depolama: yalnızca local filesystem (`public/images`, `public/uploads`)

Not:
- Docker dosyaları repoda bulunabilir, ancak bu proje için kanonik runtime değildir.
- `public-worktree-sync/` ana uygulama ağacı değildir; rolü için `docs/WORKTREE_POLICY.md` dosyasına bak.

## Hızlı Başlangıç

```bash
npm install
npm run type-check
npm run build
```

Geliştirme:

```bash
npm run dev
```

## Temel Komutlar

```bash
npm run dev
npm run build
npm run preview
npm run type-check
npm run lint
npm run test:unit
npm run test:e2e
```

Veritabanı:

```bash
npm run db:migrate
npm run db:migrate:status
npm run db:seed
```

Production operasyonları:

```bash
npm run ops:cwp:status
npm run ops:cwp:smoke
npm run ops:cwp:deploy
npm run ops:cwp:release-readiness
npm run ops:cwp:cron:doctor
```

Ops notu:
`ops:cwp:preflight` hafif runtime kontrolüdür.
`ops:cwp:predeploy-checks` ağır deploy öncesi gate zinciridir.
`ops:cwp:release-readiness` bounded smoke timeout ile saniyeler içinde özet üretmelidir.

## Kanonik Route Aileleri

Kabul edilen ana yüzeyler:

- `/` landing
- `/mekanlar` public place listing
- `/isletme` business-facing listing/detail surface
- `/blog` editorial surface
- `/admin/*` admin surface

Detay sahiplik ve alias politikası için `docs/ROUTE_OWNERSHIP.md` dosyasını kullan.

## Repo Yapısı

```text
src/
  components/   UI, islands, page sections
  layouts/      Astro layout katmanı
  lib/          domain logic, DB helpers, shared utilities
  pages/        Astro routes ve API endpoint'leri
  migrations/   PostgreSQL migration dosyaları
scripts/        operasyon, gate, build, deploy scriptleri
public/         statik dosyalar
docs/           yaşayan operasyon ve ürün belgeleri
```

## Doküman Politikası

- Tarihsel veya deneysel belgeler source-of-truth kabul edilmez.
- Yeni çalışma turunda önce `docs/SOURCE_OF_TRUTH.md` güncellenir.
- Route, deploy ve worktree kararları dağınık dosyalardan değil kanonik rehberlerden okunur.

## Mevcut Öncelikler

- Landing, admin ve şehir servisleri yüzeylerinde DB-first ürün tamamlama
- CWP production hattında düşük sürprizli deploy
- Route ve doküman tutarlılığını artırma
- Görsel, içerik ve SEO yüzeylerini tek standarda çekme
