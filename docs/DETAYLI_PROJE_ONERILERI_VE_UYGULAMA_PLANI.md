# Şanlıurfa.com Detaylı Öneriler ve Uygulama Planı

Bu doküman, proje için ajans seviyesinde kalite hedefini teknik olarak uygulanabilir fazlara böler.
Her madde doğrudan kod/deployment/test akışına bağlanmıştır.

## 1) İçerik ve Landing Kalitesi (P0)

- [x] DB-first landing yönetimi (`homepage.hero`, `homepage.mainCta`, `homepage.primaryActions`, `homepage.quickCategories`, `homepage.featuredGuides`, `homepage.faq`, `homepage.heroQuickLinks`, `homepage.liveStatusCards`, `homepage.serviceQuickLinks`, `homepage.communityPanel`, `homepage.trendingFallbackQueries`)
- [x] Header/Footer yönetilebilir içerik anahtarları
- [x] Admin panelden draft/publish/rollback
- [x] Görsel API (Unsplash + Pexels) admin arama/import
- [x] Medya kütüphanesi (list/filter/delete) + hero’ya tek tık uygula
- [x] Slug bazlı görsel isimlendirme (`public/images/{bucket}/{slug}.jpg`)
- [x] Görsel pipeline DB sync (`images:sync-db`, `images:pipeline:db`)

## 2) Teknik Güvenilirlik ve İzolasyon (P0)

- [x] İzole runtime komutları (`dev:isolated:*`) ve tek proje port standardı (4321)
- [x] DB port standardı 5432, Redis 6379 `.env.example` standardizasyonu
- [x] Dev server kapatma standardı (`npm run dev:isolated:stop`)
- [x] CI’de zorunlu “no orphan dev process” kontrolü
- [x] Runtime health cron + otomatik restart raporu (`dev:isolated:health:report:fix`)
- [x] Admin monitoring route çakışması giderildi (`/api/admin/monitoring.ts` kaldırıldı, tek kaynak: `/api/admin/monitoring/index.ts`)

## 3) API Sözleşme ve Release Gate (P1)

- [x] OpenAPI gap baseline üretimi
- [x] `missingInSpec` listesi için P0 closure raporu (`openapi:p0:report`)
- [x] OpenAPI P0 regresyon gate (`openapi:p0:regression-gate`)
- [x] `missingInSpec` listesindeki kritik endpoint’ler için kontrat kapatma (auth + content + social + route auto-discovery)
- [x] Admin/API kritik smoke setini nightly zorunlu hale getirme
- [x] `api:release:gate` fail ise deploy/release bloklama

## 4) Sosyal Özellikler (P1)

- [x] Temel swipe/match endpoint altyapısı ve UI bileşenleri mevcut
- [x] Arkadaşlık + mesajlaşma + eşleşme akışı için uçtan uca test senaryoları (`e2e/social-phase1.spec.ts`, nightly gate)
- [x] Rate limit/abuse olaylarını audit pipeline'a bağlama (social swipe)
- [x] Moderasyon panelinde sosyal olaylar için özel filtreler (social_abuse)
- [x] Tenant bazlı sosyal abuse limit politikası (`SOCIAL_ABUSE_TENANT_POLICY_JSON`)
- [x] Tenant bazlı sosyal abuse limit politikası DB yönetimi (`tenant_social_policies`, `/admin/social-policies`)

## 5) SEO/AEO/GEO Operasyonları (P1)

- [x] Yapısal veri bileşenleri ve SEO yardımcıları mevcut
- [x] Money page cluster bazlı içerik derinliği için kalite gate (`content:cluster:quality`)
- [x] AI arama görünürlüğü için cite-friendly pasaj standardı (`content:cluster:quality` içinde zorunlu cue + sayısal gerçeklik izi kontrolü)
- [x] Programatik içerik kalite gate’i (tekrarlı metin ve zayıf FAQ bloklayıcı) (`content:programmatic:quality`)

## 7) Kalite Gate Genişletmeleri (P0)

- [x] Görsel kalite gate (min çözünürlük + max dosya boyutu) (`images:quality`)
- [x] Kritik sayfa varlık smoke gate (`smoke:pages:critical`)
- [x] Kritik görsel URL smoke gate (`smoke:images:critical`)
- [x] `gate:done` zincirine kritik sayfa + görsel kalite kontrollerinin eklenmesi

## 6) Admin-Only Operasyon Modeli (P0/P1)

- [x] Site içerik yönetim ekranı
- [x] Medya DB varlık yönetimi
- [x] Hero dahil tüm landing bloklarının “tamamı” için tek panel JSON şablon/preset kütüphanesi
- [x] Preset uygulama öncesi fark önizleme (diff preview)
- [x] Panelde versiyon karşılaştırma (diff) ekranı
- [x] Panel aksiyonları için detaylı audit timeline görünümü
- [x] Audit CSV dışa aktarma endpoint'i
- [x] Ayrı admin sayfası ile audit timeline + pagination

## 8) Release Operasyonları (P0)

- [x] Kısa release readiness raporu üretimi (`release:readiness:report`)
- [x] CI summary + artifact olarak readiness raporu yayınlama
- [x] Nightly workflow'a kritik smoke ve readiness raporu eklenmesi
- [x] Nightly'de ayrı API smoke job (API gate + artefakt)
- [x] Schema readiness gate (`smoke:schema:ready`) + nightly migration/seed sonrası zorunlu kontrol
- [x] DB backup/restore smoke gate (`smoke:db:backup-restore`) + nightly zorunlu adım

## Hemen Çalıştırılacak Toplu Komut Seti

```bash
npm run db:migrate
npm run images:pipeline:db
npm run jobs:transit:refresh
npm run jobs:places:sla-alert
npm run jobs:social:retention
npm run openapi:sync:routes:gate
npm run smoke:images:critical
npm run smoke:db:backup-restore
npm run smoke:api:critical
npm run gate:done
```

Tek seferde tüm öneri zinciri için:

```bash
npm run recommendations:apply
```

Hızlı doğrulama modu için:

```bash
npm run recommendations:apply:quick
```

## 9) Ek Uygulamalar (P1/P2)

- [x] Admin şema-tabanlı içerik rehberi endpoint + panel görünümü (`/api/admin/site/settings/schema`)
- [x] Rollback dry-run preview endpoint + panel önizleme (`/api/admin/site/settings/rollback-preview`)
- [x] Tenant sosyal politika simulator endpoint + admin sayfası UI (`/api/admin/social/policies/simulate`)
- [x] Mesajlaşma için SSE sync endpoint + inbox unread senkronu (`/api/social/messages/stream`)
- [x] Ulaşım veri tazeliği ingest job + status endpoint (`jobs:transit:refresh`, `/api/transport/status`)
- [x] Search typo-tolerant fuzzy fallback (`getFuzzySuggestions`)
- [x] Problem+JSON standardı için yardımcı fonksiyon (`problemJson`) ve kritik endpoint adaptasyonu
- [x] Admin hero publish -> canlı yansıma E2E sözleşmesi (`e2e/admin-site-content-live.spec.ts`)
- [x] SSE mesaj senkronunda event-driven model (Redis pub/sub + fallback heartbeat)
- [x] Problem+JSON regresyon gate (`problemjson:report`, `problemjson:baseline`)
- [x] Transport provider abstraction (`src/lib/transport/providers.ts`)
- [x] Search fuzzy için pg_trgm migration (`145_search_pg_trgm`)
- [x] Image moderation için pHash duplicate sinyali
- [x] Audit anomaly endpoint + admin kartı (`/api/admin/site/audit/anomaly`)
- [x] Legacy OAuth endpoint uyumluluğu: `/api/auth/social/facebook` -> modern authorize akışına yönlendirme
- [x] Legacy OAuth callback uyumluluğu: `/api/auth/callback` state doğrulama ve `/api/auth/oauth/callback` forward
- [x] `src/lib/sdk/generation.ts` placeholder kaldırıldı, gerçek template üretimi + OpenAPI benzeri spec doğrulama eklendi
- [x] Sosyal mesaj API: `typing` ve `markRead` aksiyonları + SSE sync’e typing bilgisi
- [x] Sosyal mesaj API: hata yanıtlarında `problem+json` standardizasyonu (kritik endpoint)
- [x] Weather upstream fallback: stale cache ile servis sürekliliği (Open-Meteo kesintisinde fail-closed yerine stale-serve)
- [x] Weather refresh job + status endpoint (`jobs:weather:refresh`, `/api/weather/status`)
- [x] `.env.example` genişletme: OAuth ve transport provider değişkenleri eklendi
- [x] Sosyal mesajlaşma read-receipt timeline endpoint (`/api/social/messages/receipts`)
- [x] `last_read_at` tutarlılığı: mesaj fetch/read akışında participant read zamanı güncellemesi
- [x] Admin monitoring endpoint canlı upstream health + review anti-spam sağlık blokları (`/api/admin/monitoring`)
- [x] Admin monitoring sayfasında transport/weather ve review anti-spam panelleri
- [x] Review anti-spam skorlama (`reviews.antiSpam`) + create review akışında auto-moderate/hard-block
- [x] SiteContentManager form tabanlı editörler: `header.utilityLinks`, `homepage.primaryActions`, `homepage.faq`, `footer.links`
- [x] SiteContentManager içinde `reviews.antiSpam` politika editörü (DB-first publish)

## Sonraki Detaylı Öneriler (Yeni Sprint)

- [x] Review anti-spam için adminde canlı “son 100 flagged event” API endpointi + allowlist politika desteği
- [x] Message read-receipt için konuşma başına “en son okuyan” badge ve unread drift alarmı
- [x] `problem+json` kapanış sprinti tamamlandı: 93 -> 0
- [x] Monitoring dashboard’a SLO paneli (API p95, error ratio, cache hit ratio)
- [x] Site içerik admin formunda sıralama (up/down) ve “taslak kaydet + home önizle” akışı

## Sonraki Detaylı Öneriler (Yeni Sprint / Wave-2)

- [x] `problem+json` closure wave-2: `reviews/*`, `notifications/*`, `mobile/*`, `social/*`, `admin/blog/*`, `events/*`, `favorites/*`, `users/*`, `reservations/*`, `promotions/*`, `historical-sites/*` endpointlerinde kapsamlı temizleme tamamlandı
- [x] `problem+json` wave-2 batch: `reviews/[id]/*`, `upload/*`, `webhooks/trigger`, `auth/login|logout|register`
- [x] `problem+json` wave-2 batch-2: `admin/blog/*`, `events/*`, `favorites/*`, `users/[id]/*`, `users/points-history`
- [x] `problem+json` wave-2 batch-3: `historical-sites/*`, `promotions/*`, `reservations/*`, `places/[id]/*`
- [x] 2FA login akışı opt-in hale getirildi: varsayılan kapalı, sadece `two_factor_enabled=true` olan kullanıcıda ikinci adım zorunlu
- [x] Anti-spam event ekranında “tek tık allowlist ekle” butonu (UI)
- [x] Messaging inbox’ta typing kullanıcı adlarını gerçek isimle gösterme
- [x] Monitoring alarm eşikleri (p95/error ratio/drift) için kırmızı-sarı-yeşil threshold policy
- [x] SiteContentManager form editörlerine item ekle/sil kontrolleri

## Notlar

- Proje Türkçe tek dilde kalacaktır (i18n/hreflang yok).
- Ücretli servis yerine ücretsiz API ve yerel işleme (Sharp, OSM vb.) kullanılacaktır.
- API anahtarları yalnızca `.env` / gizli ortam değişkenlerinden yönetilmelidir.

## Güncel Durum Özeti (2026-04-28)

- OpenAPI route kapsaması: `documented paths = file routes = 456`, aktif gap: `0`
- OpenAPI route baseline: `missingInSpec=0`, tarihsel cozum `resolvedFromHistoricalBaseline=230`, `newlyMissingVsBaseline=0`
- OpenAPI P0 regression baseline: `totalMissing=0`, `withSource=0`
- `api:release:gate` zinciri geçiyor (contract coverage + route sync + critical smoke + p0 gates)
- `ops:targeted:release-lite` zinciri geçiyor (type-check + security defaults + build + API contract coverage + route sync + problem+json)
- Type-check durumu: `0 errors / 0 warnings / 0 hints`
- Lint kalite metriği: `0 errors / 0 warnings / 0 problems`
- `@ts-nocheck` audit: `0 / 1484`
- Sosyal abuse olayları artık audit tablosunda ve admin panelinde filtrelenebilir durumda
- `problem+json` baseline: `93` -> aktif offender: `0` (regression yok)
- `problemjson:strict` release gate'e eklendi (offender > 0 ise fail)
- `smoke:site-settings:schema` release gate'e eklendi (DB'deki canlı ayarlar şema doğrulaması)
- Site settings link şeması geriye uyumlu: `label` veya `title` kabul ediliyor
- 2FA davranışı kullanıcı talebine göre varsayılan kapalı; sadece kullanıcı açık ettiğinde login ikinci adım ister
- Sosyal tek event hattı: `src/lib/social/event-stream.ts` (Redis pub/sub + local fallback)
- Sosyal SSE endpointi: `/api/social/events/stream` (kullanıcıya özel olay akışı)
- `follow` ve `swipe` API'leri ortak social event hattına publish ediyor
- Mekan lifecycle state machine: `src/lib/place/lifecycle.ts`
- Lifecycle kontrolü `places/submissions`, `admin/moderation`, `admin/places` endpointlerinde zorunlu
- Sosyal tek event hattı eklendi: `social:events:v1` (mesaj/follow/swipe olayları ortak bus)
- Yeni SSE endpoint: `/api/social/events/stream` (kullanıcıya özel sosyal event akışı)
- Mekan lifecycle state machine aktif: `draft|pending|needs_info|active|rejected|suspended|deleted`
- Lifecycle doğrulaması `places/submissions`, `admin/moderation`, `admin/places` akışlarına bağlandı
- Social event store tablosu eklendi (`social_event_store`) ve publish anında DB persist aktif
- Place lifecycle event tablosu eklendi (`place_lifecycle_events`) ve geçişlerde otomatik timeline kaydı aktif
- Admin sosyal event timeline endpointi eklendi (`/api/admin/social/events`)
- Admin sosyal event canlı stream endpointi eklendi (`/api/admin/social/events/stream`)
- Admin mekan lifecycle timeline endpointi eklendi (`/api/admin/places/lifecycle`)
- Admin mekan lifecycle SLA endpointi eklendi (`/api/admin/places/lifecycle/sla`)
- Admin dashboard hızlı erişim: `/admin/social-events` ve `/admin/places/lifecycle` sayfaları eklendi
- Migration eklendi: `146_social_event_store_place_lifecycle`
- Sosyal SSE endpointinde bağlantı kopuşunda cleanup davranışı eklendi (`/api/social/events/stream`)
- Yeni admin timeline endpointlerinde (`/api/admin/social/events`, `/api/admin/places/lifecycle*`) beklenmeyen hatalar için `problem+json` 500 zarfı standardize edildi
- Retention + SLA jobları eklendi: `jobs:social:retention`, `jobs:places:sla-alert`
- Scheduled rapor jobı eklendi: `jobs:reports:social-lifecycle`
- OpenAPI response şemaları derinleştirildi: social timeline/stream + lifecycle timeline/SLA
- Admin export endpointleri eklendi: `/api/admin/social/events/export`, `/api/admin/places/lifecycle/export`
- Social timeline cursor/replay token desteği eklendi (`cursor`, `last-event-id`, `nextCursor`)
- SLA alert cooldown state eklendi (`place_sla_alert_state`, varsayılan 24s)
- Monitoring paneline yeni job health kartları eklendi (retention/sla-alert/report)
- Social archive partition bakım jobı eklendi (`jobs:social:archive-partitions`)
- Signed export token endpointi eklendi (`/api/admin/exports/token`) ve export/report uçlarına token tüketimi bağlandı
- Social risk dashboard eklendi (`/api/admin/social/risk`, `/admin/social-risk`)
- Social lifecycle raporu `json/html/pdf` formatlarını ve e-posta attachment gönderimini destekliyor
- Segment bazlı SLA hedefi eklendi (`places.lifecycle.sla.targets` => `defaultHours/byDistrict/byTeam`)
- Export token güvenliği artırıldı: IP/User-Agent bind alanları + revoke endpoint + export/report uçlarında bağlam doğrulaması
- Social risk dashboard artık DB ayarlı eşikler (`social.risk.thresholds`) ile alarm üretiyor ve webhook dispatch/cooldown state yönetiyor (`social.risk.webhook`, `jobs.socialRiskAlert.lastDispatch`)
- Site Content Manager’a yeni JSON editörleri eklendi: `places.lifecycle.sla.targets`, `social.risk.thresholds`, `social.risk.webhook`
- Social lifecycle PDF çıktısı headless Chromium render (Playwright) ile üretiliyor; ortamda tarayıcı yoksa fallback PDF devreye giriyor
- Daily partition wrapper job eklendi: `jobs:social:archive-partitions:daily` (hata durumunda site_settings kaydı + email + webhook alarmı)
- Sosyal risk için admin webhook test/log endpointleri eklendi: `/api/admin/social/risk/webhook-test`, `/api/admin/social/risk/webhook-log`
- Export token yönetimi genişletildi: `GET /api/admin/exports/token` listeleme + `tokenId` ile revoke desteği + admin ekranı `/admin/export-tokens`
- Monitoring API/UI cron-health sinyali içeriyor: fail/stale job sayacı ve daily wrapper job görünürlüğü
- `SiteContentManager` içinde SLA hedefleri için JSON yanında form tabanlı editör eklendi (byDistrict/byTeam satır bazlı)
- Export token üretim ekranı güçlendirildi: tek-sefer token reveal (45sn) + clipboard copy audit endpointi (`/api/admin/exports/token/clipboard`)
- Social risk thresholdları tenant override destekli hale getirildi (`social.risk.thresholds.byTenant`)
- Social risk dashboard’a webhook retry/failure metrikleri eklendi (`/api/admin/social/risk/webhook-metrics`)
- Monitoring için alarm acknowledge endpointi eklendi (`/api/admin/monitoring/ack`) ve UI’da Ack butonları aktif
- Cron health için son 7 gün trend state’i tutuluyor (`jobs.monitoring.cronHealth.history`) ve monitoring panelinde sparkline gösteriliyor
- Export token policy desteği eklendi: `allowedIpCidrs` (CIDR allowlist) + `allowedCountries` (risk flag) ve admin üretim ekranına alanlar eklendi
- Token consumption artık risk flag döndürüyor (`private_ip`, `country_missing`, `country_mismatch`) ve CIDR policy ihlalinde token reddediliyor
- Social risk auto action profili eklendi: `social.risk.autoActions` etkinse alarm tenantlarına otomatik `tenant_social_policies` sıkılaştırması uygulanıyor
- Monitoring alarm motoruna auto-resolve eklendi: ack edilmiş alarm tekrar sağlıklı seviyeye dönerse `resolvedAt` set edilir
- Social risk webhook metriklerine latency percentile eklendi (`p50_ms`, `p95_ms`)
- Export token replay/lockout sertleştirmesi eklendi: fingerprint replay koruması + başarısız deneme lockout penceresi
- Export token policy genişletildi: `replayProtection` flag (default açık), admin token üretim ekranında kontrol mevcut
- Monitoring alarmları için `snooze` ve `maintenance window` kontrolü eklendi (`jobs.monitoring.alarms.control`)
- Monitoring UI’da alarm kartları için `Ack` + `Snooze` ve global bakım penceresi butonları eklendi
- Social risk auto action için sağlıklı tenant auto-rollback eklendi (`rollbackToDefaultWhenHealthy`)

## Kapanan Endpointler (Tamamlandı)

- `admin/content-bot/*`, `admin/site/audit/export`, `admin/users/index`
- `contact/*`, `coupons/validate`, `newsletter/subscribe`
- `places/index|apply|submissions`, `v1|v2 places/favorites/users`
- `saglik/nobetci`, `voice/parse`, `nlp/analyze`, `predictions/trends`
- sse/notifications, user/favorites, governance/dashboard, cache/stats


