# Source of Truth — Doküman Registry

Bu dosya hangi konuda hangi belgenin **authoritative** olduğunu belirtir. Repo geçmişte 187+ tarihsel `.md` dosya biriktirdi — `.archive/` altına taşındılar ve karar üretmezler. Aşağıdaki dosyalar canonical kabul edilir.

---

## Birincil Belgeler (root)

| Konu | Dosya | Açıklama |
|------|-------|----------|
| Claude Code / günlük komutlar | [`CLAUDE.md`](../CLAUDE.md) | Stack, komutlar, mimari, konvansiyon, yasaklar |
| Agent çalışma kuralları | [`AGENTS.md`](../AGENTS.md) | Agent harness konfigürasyon ve kuralları |
| Proje overview + navigation | [`README.md`](../README.md) | Hızlı başlangıç, kanonik route'lar, doküman politikası |
| Mimari haritası | [`ARCHITECTURE-MAP.md`](../ARCHITECTURE-MAP.md) | Veri akışı, modül ilişkileri |
| Production deploy hattı | [`DEPLOYMENT.md`](../DEPLOYMENT.md) | CWP + PM2 + Apache reverse proxy |
| Operasyon runbook | [`DEPLOY-OPS-RUNBOOK.md`](../DEPLOY-OPS-RUNBOOK.md) | SSH, deploy, rollback, health komutları |
| DB index audit | [`DB-INDEX-AUDIT.md`](../DB-INDEX-AUDIT.md) | 18 missing index, Tier 1 öneriler |
| Manuel test senaryoları | [`TEST.md`](../TEST.md) | Her kod değişikliğinin son adımı — kümülatif |
| CWP Node.js deploy detayı | [`CWP-NODEJS-DEPLOYMENT.md`](../CWP-NODEJS-DEPLOYMENT.md) | CWP üzerinde Node.js + Apache reverse proxy |
| CWP web server örnek konfig | [`CWP-WEB-SERVER-CONFIG-SAMPLE.md`](../CWP-WEB-SERVER-CONFIG-SAMPLE.md) | Apache/Nginx reverse proxy şablonu |
| Cron job kurulumu | [`CRON-SETUP.md`](../CRON-SETUP.md) | Production cron job listesi ve install |
| Deploy hazırlık checklist | [`DEPLOY-CHECKLIST.md`](../DEPLOY-CHECKLIST.md) | Pre-deploy doğrulama adımları |
| Deploy checklist 2026 | [`DEPLOYMENT-CHECKLIST-2026.md`](../DEPLOYMENT-CHECKLIST-2026.md) | 2026 çalışan kanonik deploy listesi |
| Production readiness | [`PROD-READINESS.md`](../PROD-READINESS.md) | Prod hazırlık state audit |
| Production incident kaydı | [`PROD-INCIDENT-2026-05-05.md`](../PROD-INCIDENT-2026-05-05.md) | 2026-05-05 incident tanı + fix planı |
| Endpoint öncelik | [`ENDPOINT-PRIORITY.md`](../ENDPOINT-PRIORITY.md) | TOP 50 endpoint test kapsama planı |
| Untested helpers | [`UNTESTED-HELPERS.md`](../UNTESTED-HELPERS.md) | Henüz test edilmeyen helper listesi |
| MVP backlog audit | [`MVP-BACKLOG-AUDIT.md`](../MVP-BACKLOG-AUDIT.md) | MVP scope ve eksik kalan iş kalemleri |
| Cleanup audit | [`CLEANUP-AUDIT.md`](../CLEANUP-AUDIT.md) | Repo cleanup planı ve durum |
| Contribution guide | [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Katkı kuralları, PR formatı |

---

## docs/ Alt Belgeler

| Konu | Dosya | Açıklama |
|------|-------|----------|
| Güvenlik kuralları | [`docs/SECURITY.md`](SECURITY.md) | 53 HARD RULE + 43 static lock test |
| Astro framework detayları | [`docs/ASTRO_DETAILED.md`](ASTRO_DETAILED.md) | Patterns, directives, server islands, SEO |
| Production deploy detay | [`docs/DEPLOYMENT.md`](DEPLOYMENT.md) | PM2, CWP, lifecycle, admin entegrasyonları |
| Astro SSR baseline | [`docs/ASTRO_BASELINE.md`](ASTRO_BASELINE.md) | Astro SSR temel kontratları |
| Astro SSR frontend stack | [`docs/ASTRO_SSR_FRONTEND_STACK.md`](ASTRO_SSR_FRONTEND_STACK.md) | Frontend test ve runtime sözleşmesi |
| UI tasarım sözleşmesi | [`docs/UI_CONTRACTS.md`](UI_CONTRACTS.md) | Tema, palet, layout kontratları |
| Şehir taksonomi + sosyal yüzey | [`docs/CITY_TAXONOMY_AND_SOCIAL_SURFACE.md`](CITY_TAXONOMY_AND_SOCIAL_SURFACE.md) | Şehir ve sosyal eşleşme modeli |
| MVP public kabul kriteri | [`docs/MVP_PUBLIC_ACCEPTANCE.md`](MVP_PUBLIC_ACCEPTANCE.md) | Public site kabul checklist'i |
| Route ownership | [`docs/ROUTE_OWNERSHIP.md`](ROUTE_OWNERSHIP.md) | Kanonik route alias kararı |
| Sayfa template sistemi | [`docs/PAGE_TEMPLATE_SYSTEM.md`](PAGE_TEMPLATE_SYSTEM.md) | Public sayfa şablon kontratı |
| Worktree politikası | [`docs/WORKTREE_POLICY.md`](WORKTREE_POLICY.md) | Çoklu çalışma ağacı ve mirror rolü |
| Worktree temizlik planı | [`docs/WORKTREE_CLEANUP_PLAN.md`](WORKTREE_CLEANUP_PLAN.md) | Worktree temizleme sırası |
| DB-first site management | [`docs/DB_FIRST_SITE_MANAGEMENT.md`](DB_FIRST_SITE_MANAGEMENT.md) | DB-first içerik yönetimi |
| DB-first platform expansion | [`docs/DB_FIRST_PLATFORM_EXPANSION.md`](DB_FIRST_PLATFORM_EXPANSION.md) | DB-first platform genişlemesi |
| Public route cache | [`docs/PUBLIC_ROUTE_CACHE_CONTRACT.md`](PUBLIC_ROUTE_CACHE_CONTRACT.md) | Public route cache kontratı |
| Public sitemap integrity | [`docs/PUBLIC_SITEMAP_ROUTE_INTEGRITY.md`](PUBLIC_SITEMAP_ROUTE_INTEGRITY.md) | Sitemap doğruluğu |
| Script surface reduction | [`docs/SCRIPT_SURFACE_REDUCTION_PLAN.md`](SCRIPT_SURFACE_REDUCTION_PLAN.md) | npm script azaltma planı |
| Otomatik rapor indeksi | [`docs/REPORT_INDEX.md`](REPORT_INDEX.md) | Quality/release/test/upload raporlarının tek indeksi |
| Local upload lifecycle | [`docs/LOCAL_UPLOAD_LIFECYCLE.md`](LOCAL_UPLOAD_LIFECYCLE.md) | Local filesystem upload durumları ve manuel arşiv/silme kuralları |
| Content pipeline ops | [`docs/CONTENT_PIPELINE_OPERATIONS.md`](CONTENT_PIPELINE_OPERATIONS.md) | İçerik üretim hattı operasyon |
| Content pipeline standard | [`docs/CONTENT_PIPELINE_STANDARD.md`](CONTENT_PIPELINE_STANDARD.md) | İçerik standartları |
| Şehir içerik ajanları | [`docs/SEHIR_ICERIK_AJANLARI.md`](SEHIR_ICERIK_AJANLARI.md) | Şehir içerik üretici ajan tanımları |
| SEO template standard | [`docs/SEO_TEMPLATE_STANDARD.md`](SEO_TEMPLATE_STANDARD.md) | SEO meta + JSON-LD şablonu |
| Performance budget | [`docs/PERFORMANCE_BUDGET.md`](PERFORMANCE_BUDGET.md) | Performans bütçesi |
| SSR PWA runtime checklist | [`docs/SSR_PWA_RUNTIME_CHECKLIST.md`](SSR_PWA_RUNTIME_CHECKLIST.md) | SSR + PWA runtime kontrolü |
| Frontend release gate | [`docs/RELEASE_FRONTEND_GATE.md`](RELEASE_FRONTEND_GATE.md) | Frontend release çıkış kapısı |
| Frontend release checklist | [`docs/FRONTEND_RELEASE_CHECKLIST.md`](FRONTEND_RELEASE_CHECKLIST.md) | Frontend release çıkış checklist |
| Weekly frontend rhythm | [`docs/WEEKLY_FRONTEND_QUALITY_RHYTHM.md`](WEEKLY_FRONTEND_QUALITY_RHYTHM.md) | Haftalık kalite ritmi |
| API guide | [`docs/API_GUIDE.md`](API_GUIDE.md) | API rehberi |
| API legacy policy | [`docs/API_LEGACY_POLICY.md`](API_LEGACY_POLICY.md) | Legacy API politikası |
| Route legacy policy | [`docs/ROUTE_LEGACY_POLICY.md`](ROUTE_LEGACY_POLICY.md) | Legacy route politikası |
| Blog system guide | [`docs/BLOG_SYSTEM_GUIDE.md`](BLOG_SYSTEM_GUIDE.md) | Blog sistemi kullanım |
| User guide | [`docs/USER_GUIDE.md`](USER_GUIDE.md) | Kullanıcı dokümantasyonu |
| Free APIs guide | [`docs/FREE_APIS_GUIDE.md`](FREE_APIS_GUIDE.md) | Ücretsiz API entegrasyonu |
| Security key rotation runbook | [`docs/security-key-rotation-runbook.md`](security-key-rotation-runbook.md) | Anahtar rotasyon adımları |
| Frontend rebuild plan | [`docs/FRONTEND_REBUILD_PLAN.md`](FRONTEND_REBUILD_PLAN.md) | Frontend yeniden yapılandırma planı |
| Legacy route inventory | [`docs/LEGACY_ROUTE_INVENTORY.md`](LEGACY_ROUTE_INVENTORY.md) | Legacy route envanteri |
| Migration duplicate remediation | [`docs/MIGRATION_DUPLICATE_REMEDIATION.md`](MIGRATION_DUPLICATE_REMEDIATION.md) | Migration tekrar düzeltme |
| Project local Redis Astro | [`docs/PROJECT_LOCAL_REDIS_ASTRO.md`](PROJECT_LOCAL_REDIS_ASTRO.md) | Local Redis + Astro setup |
| Social places implementation | [`docs/SOCIAL_PLACES_IMPLEMENTATION.md`](SOCIAL_PLACES_IMPLEMENTATION.md) | Sosyal mekanlar feature |
| Isolated runtime | [`docs/isolated-runtime.md`](isolated-runtime.md) | İzole runtime notları |
| Release readiness | [`docs/release-readiness.md`](release-readiness.md) | Release readiness raporu |
| Branch protection checklist | [`docs/branch-protection-checklist.md`](branch-protection-checklist.md) | Branch protection kuralları |
| Legacy route usage report | [`docs/legacy-route-usage-report.md`](legacy-route-usage-report.md) | Legacy route kullanım raporu |
| OpenAPI coverage plan | [`docs/openapi-coverage-plan.md`](openapi-coverage-plan.md) | OpenAPI kapsama planı |

`docs/api/` altında ek API alt belgeleri bulunabilir.

---

## Operasyonel Runbook'lar (Hangi Konu Hangi Dosya)

- Geliştirme komutları → [`CLAUDE.md`](../CLAUDE.md) "Commands"
- SSH / deploy / rollback / health → [`DEPLOY-OPS-RUNBOOK.md`](../DEPLOY-OPS-RUNBOOK.md)
- Production lifecycle + PM2 + CWP → [`docs/DEPLOYMENT.md`](DEPLOYMENT.md)
- Güvenlik kuralları (53 HARD RULE) → [`docs/SECURITY.md`](SECURITY.md)
- Astro framework patterns → [`docs/ASTRO_DETAILED.md`](ASTRO_DETAILED.md)
- DB index audit + öneriler → [`DB-INDEX-AUDIT.md`](../DB-INDEX-AUDIT.md)
- DB retirement/drop kararları → [`docs/REPORT_INDEX.md`](REPORT_INDEX.md) içindeki DB retirement raporu; otomatik drop/index silme yok, en az 14 gün production gözlemi ve 30 günlük snapshot rotasyonu gerekir.
- Local media storage → [`docs/LOCAL_UPLOAD_LIFECYCLE.md`](LOCAL_UPLOAD_LIFECYCLE.md) ve [`docs/REPORT_INDEX.md`](REPORT_INDEX.md). CDN/object storage önerilmez; upload quota ve bucket ownership parity raporunda takip edilir.
- Release final artefakt tazeliği → [`docs/REPORT_INDEX.md`](REPORT_INDEX.md) içindeki freshness raporu; eski raporla release geçmek yasaktır.
- Logger runtime profili → `src/lib/logger.ts`; test profili `debug`, production profili `info`, release profili `warn` seviyesinden başlar.
- Manuel test senaryoları → [`TEST.md`](../TEST.md)
- Cron job kurulum → [`CRON-SETUP.md`](../CRON-SETUP.md)
- Deploy checklist → [`DEPLOY-CHECKLIST.md`](../DEPLOY-CHECKLIST.md) ve [`DEPLOYMENT-CHECKLIST-2026.md`](../DEPLOYMENT-CHECKLIST-2026.md)
- Incident kaydı → [`PROD-INCIDENT-2026-05-05.md`](../PROD-INCIDENT-2026-05-05.md)

---

## Arşivlenmiş (`.archive/`)

Geçmiş audit raporları, phase notları, implementation log'ları, tek-kullanımlık fix raporları `.archive/` klasöründe — git history için saklanır, karar üretmezler:

- `.archive/phases/` — 81 PHASE_*.md (multi-phase governance/optimization notları, Apr 2026)
- `.archive/status/` — 25 PROJECT_/SESSION_/FINAL_/DEPLOYMENT-STATUS gibi anlık durum dosyaları
- `.archive/audits/` — 10 eski test/performance/migration audit raporu
- `.archive/implementations/` — 2 IMPLEMENTATION_*.md
- `.archive/optimization/` — 7 OPTIMIZATION_*/PERFORMANCE_OPTIMIZATION_*/FUTURE_OPTIMIZATION_*
- `.archive/cwp-old/` — 7 CWP-* + APACHE_DEPLOYMENT + SHARED-HOSTING-DEPLOY (eski CWP varyantları)
- `.archive/deployment-old/` — 7 DEPLOYMENT_*/POST_DEPLOYMENT/EMERGENCY_RUNBOOK eski varyantları
- `.archive/misc/` — 29 historical: CHANGELOG, WEBHOOKS, BLOG_SYSTEM_DOCS, SEO-TOOLS, MIGRATIONS, FEATURES, vb.

**Toplam: 168 arşivlenmiş dosya.** Hiçbir dosya silinmedi — sadece taşındı. Git history korunur.

---

## Stale Belge Sinyalleri

Aşağıdaki özelliklerden birini taşıyan belge otomatik olarak şüpheli kabul edilir ve `.archive/` adayıdır:

- Public tasarım için eski koyu tema veya hazır liste sitesi dili öneriyor
- Şanlıurfa şehir rehberi yerine başka sektör, demo ticaret veya farklı proje dili kullanıyor
- `hero-home.webp`, emoji placeholder veya alakasız görsel fallback'i public hedef gibi sunuyor
- Cloudflare/CDN/object storage/S3/R2 gibi medya dağıtım önerilerini kanonik çözüm gibi anlatıyor
- Docker veya Kubernetes'i kanonik production gibi anlatıyor
- `npm run migrate` gibi artık var olmayan script isimleri kullanıyor
- `vendor` ve `places` yüzeylerini tek doğru public rota gibi sunuyor
- Eski fix scriptleri, örnek şifreler veya tek kullanımlık incident komutları taşıyor
- Güncel CWP + PM2 + Node 22.13+ hattıyla çelişiyor

---

## Bakım Kuralı

- Yeni karar **önce** kanonik dosyalara yazılır (`CLAUDE.md`, `docs/SECURITY.md`, `docs/ASTRO_DETAILED.md`, `docs/DEPLOYMENT.md`, `DEPLOY-OPS-RUNBOOK.md`).
- Stale belge korunacaksa `.archive/` altına taşınır; root'ta veya `docs/`'ta karar üretmesi yasak.
- `README.md` ve `docs/SOURCE_OF_TRUTH.md` (bu dosya) sadece yönlendirme yapar — ikinci bir gerçeklik üretmez.
- Yeni `.md` dosya ekleniyorsa: önce mevcut canonical'lardan birine ek bölüm açılabilir mi sorgula. Yeni dosya gerekiyorsa, bu registry tablosuna ekle.
