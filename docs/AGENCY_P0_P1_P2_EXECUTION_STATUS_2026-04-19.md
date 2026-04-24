# Agency Seviyesi Uygulama Durumu (P0/P1/P2)

## P0 (Tamamlandi)
- Canonical domain zorlamasi: `https://sanliurfa.com`
- `www/http` istekleri middleware tarafinda 301 ile canonical domaine yonleniyor.
- CORS varsayilanlari wildcard yerine tek domain (`https://sanliurfa.com`).
- `canonical-domain-gate` CI scripti eklendi ve `gate:done` akisina baglandi.
- Dev process izolasyonu ve orphan kontrolu (`dev:isolated:check-no-orphan`) aktif.

## P1 (Cekirdek Seviyede Tamamlandi)
- Faz-1 ucretsiz politika tek noktaya baglandi (`PHASE1_FREE_MODE`):
  - UI: `PremiumFeatureGuard`
  - API: `/api/subscriptions/checkout`, `/api/billing/checkout`, `/api/subscriptions/tiers`, `/api/user/subscription`
- `phase1:free:gate` CI scripti eklendi ve `gate:done` akisina baglandi.
- Email/SMS/SEO/blog linkleri `PUBLIC_APP_URL` tabanli hale getirildi.

## P2 (Temel Altyapi Tamamlandi)
- Release gate zincirine canonical domain kontrolu eklendi.
- Security config tarafinda origin listesi canonical domain standardina cekildi.
- Tum ajans-oneri seti icin tekil master gate eklendi:
  - `scripts/ci/recommendations-master-gate.mjs`
  - `npm run recommendations:master:gate`
  - `gate:done` akisi icinde zorunlu adim olarak baglandi.
- OpenAPI sehir-servis kontrat kapsami guclendirildi:
  - `src/lib/__tests__/openapi-city-services-contract.test.ts`
  - `scripts/ci/openapi-city-services-gate.mjs`
  - `api:release:gate` akisi icine zorunlu baglandi.
- Lifecycle SLA operasyon aksiyonu eklendi:
  - `POST /api/admin/places/lifecycle/sla` (ack/escalate/label_breach)
  - Aksiyonlar `place_lifecycle_events` tablosuna `sla_action` reason ile kaydedilir.
- Image moderation DB senkronu eklendi:
  - `scripts/content-scraper/sync-image-moderation-to-site-media.ts`
  - `images:pipeline:db` akisina dahil edildi.
- CWP tek komut release bundle:
  - `scripts/cwp-release-bundle.sh`
  - `npm run ops:cwp:release:bundle`
- CI quality gate sertlestirildi:
  - `CI/CD Pipeline / Quality gate (gate:done)` zorunlu
  - lint/typecheck/migration duplicate adimlari advisory olmaktan cikarildi
- Site ayarlarinda approval + diff:
  - `GET /api/admin/site/settings?history=1&approvals=1`
  - `PUT mode=request_approval`
  - `PUT mode=approve_publish`
  - history cevabinda key bazli diff ozeti
- Sosyal rate-limit risk profili:
  - son 24 saatteki `social_abuse` incident sayisina gore limit carpani uygulanir
- OpenAPI -> SDK otomasyonu:
  - `npm run sdk:generate`
  - `api:release:gate` akisi icinde `sdk:generate:check`
- CWP deploy evidence paketi:
  - `npm run ops:cwp:deploy:evidence`
  - `docs/evidence/*.tar.gz` artefakti

## Oneri Seti (Toplu Uygulama Durumu)
- [x] Gate-first release modeli (`gate:done`, `api:release:gate`)
- [x] Admin DB-first site icerik yonetimi (hero/header/footer/seo/schema)
- [x] Landing kritik servis bloklari (nobetci, otobus saatleri, ucak saatleri + API)
- [x] Sosyal guvenlik katmani (social_abuse audit + rate limit + admin risk)
- [x] Mekan lifecycle standardi (timeline + SLA + event kaydi)
- [x] Gorsel pipeline (download/map/validate/moderate + slug gate + DB sync)
- [x] Canonical SEO tekillestirme (`https://sanliurfa.com`, http/www -> 301)
- [x] Tek surec/tek port disiplinine uygun izole runtime
- [x] CWP operasyon komut seti (preflight/release-readiness/smoke)
- [x] Test/smoke kapsam zorunlulugu (API contract + E2E social + critical smoke)

## Operasyon Notu
- Production canonical domain disinda origin kabul edilmez.
- `CORS_ORIGINS` ve `ALLOWED_ORIGINS` degeri `https://sanliurfa.com` olmalidir.
