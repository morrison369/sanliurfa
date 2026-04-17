# Astro-Only Migration Assessment

Bu belge, `Şanlıurfa.com` kod tabanının Astro-merkezli yapıya geçişini ve geçiş sonrası bakım kararlarını değerlendirir.

## Karar Özeti

- Proje zaten Astro üzerindedir.
- Proje runtime düzeyinde Astro-only hydration durumuna geldi; kalan React bağımlılığı paket seviyesinde duruyor.
- Hydration yüzeyi `0`a indi; ancak ekip kararıyla `@astrojs/react` entegrasyonu korunacaktır.
- Doğru yaklaşım big-bang rewrite değil, yüzey bazlı kademeli migration'dır.

## Mevcut Durum

2026-04-17 itibarıyla ölçülen yüzey:

- `src/**/*.astro`: `193`
- `src/**/*.tsx`: `0`
- `.astro` dosyalarında `client:*` hydration kullanımı: `0`
- `astro.config.mjs` içinde aktif React entegrasyonu: `@astrojs/react`
- generated inventory: `docs/reports/astro-hydration-inventory.md` (`0 low / 0 medium / 0 high`)
- high-risk feasibility report: `docs/reports/astro-high-risk-feasibility.md` (`0 first / 0 later / 0 last`)
- package removal audit: `docs/reports/react-surface-audit.md`
- config owner: `astro.config.mjs`

Mevcut yapı:

- SSR ve routing katmanı Astro ile çalışıyor.
- İnteraktif paneller plain TS + Astro shell yapısına taşındı; aktif React island kalmadı.
- React paket kaldırma işi aktif hedef değildir; `@astrojs/react` kontrollü compatibility layer olarak tutulur.
- Admin, analytics, search, social, subscriptions, notifications ve messaging yüzeyleri React bağımlılığını yoğun kullanıyordu; bu yüzeylerin tamamı Astro + plain TS modeline taşındı.
- İlk migration dalgalarında `NotificationBadge`, `QuotaUsageDisplay`, `TrendingPlaces`, `LeaderboardsDisplay`, `PricingPlans`, `UserRecommendations`, `PerformanceMonitor`, `PWAPrompt`, `TransactionHistory`, `BillingHistory`, `RewardsCatalog`, `NotificationPreferencesManager`, `NotificationCenter`, `NotificationsCenter`, `SubscriptionManager`, `MyActivityLog`, `UserSuggestionsPanel`, `UserSearchResults`, `HashtagExplorer`, `CollectionsManager`, `ContentManager`, `UserPublicProfile`, `ReportManager`, `VendorDashboard`, `LoyaltyDashboard`, `UserProfile`, `CollectionDetail`, `UserSettings`, `SearchResults`, `BusinessAnalyticsDashboard`, `FeaturedListingsManager`, `MarketingCampaignBuilder`, `AdminLoyaltyPanel`, `AuditLogViewer`, `UserManagementTable`, `AdminDashboardOverview`, `AnalyticsPanel`, `AdminAnalyticsDashboard`, `AdminManager`, `WebhookAnalyticsDashboard`, `LiveAnalyticsDashboard`, `ModerationQueueManager`, `SubscriptionAdminDashboard`, `AdminVerificationQueue`, `OLAPExplorer`, `AdminPerformanceDashboard` ve `MessagingInbox`, `WebhookManager`, `ActivityFeed`, `ModerationDashboard` React island olmaktan çıkarıldı.

## Astro-Only Hedefinin Anlamı

Bu repo için `Astro-only` ifadesi aşağıdaki anlama gelir:

1. Yeni sayfalarda varsayılan seçim `.astro` olmalı.
2. Sadece küçük ve net gerekçeli client script'ler kullanılmalı.
3. React island bağımlılığı kademeli azaltılmalı.
4. React gerekiyorsa Astro içinde resmi entegrasyon olarak kullanılabilmeli.

Bu hedef, sadece framework adı değiştirmek değildir. Aşağıdakiler de değişir:

- UI state yönetim modeli
- component composition biçimi
- fetch/render ayrımı
- hydration maliyeti
- test stratejisi

## Migration Sonrası Öğrenimler

Tamamlanan migration, üç pratik sınıf gösterdi:

### 1. Düşük Riskli Yüzeyler

- küçük widget
- tek aksiyonlu buton/form
- sınırlı polling veya badge durumu

Bu grup en hızlı şekilde `.astro` + küçük browser helper modeline taşındı.

### 2. Orta Riskli Yüzeyler

- filtreleme
- tablo/list view
- pagination/search UI
- birden fazla event handler

Bu grup için doğru yaklaşım doğrudan rewrite değil, önce helper ayrımı oldu:

- data normalize helper
- render/view-model helper
- page bootstrap script

### 3. Yüksek Riskli Yüzeyler

- admin dashboard
- analytics
- moderation
- messaging
- webhook yönetimi
- OLAP explorer

Bu grup taşınabildi; ama maliyet yalnızca framework değişimi değildi. Başarılı batch'ler aynı zamanda:

- endpoint drift düzeltti
- nested API envelope unwrap boşluklarını kapattı
- polling / mutation owner'larını tek script altında topladı

## En Yoğun Hydration Bölgeleri

Aktif `client:*` kullanan sayfa kalmadı.

Bu başlık artık tarihsel maliyet haritası olarak düşünülmeli; yeni hydration eklenirse aynı sayfalar yeniden riskli kümeye dönebilir.

## Güncel Yüksek Risk Sırası

`docs/reports/astro-high-risk-feasibility.md` çıktısına göre:

- `first`, `later` ve `last` bucket'larının tamamı `0`
- hydration yüzeyi tamamen kapandı

Bu sonuç önemli çünkü migration sıralama işi aktif backlog olmaktan çıktı. Yeni hydration açılırsa aynı raporlar yeniden karar girdisi olarak kullanılmalıdır.

## Paket Seviyesi React Kararı

Hydration yüzeyi kapanmış olsa da paket kararı nettir:

- `@astrojs/react` kalacak.
- `react` ve `react-dom` kalacak.
- Kalan audit raporları uninstall planı değil, sadece bakım görünürlüğü içindir.
- Canlı config owner:
  - `astro.config.mjs` içindeki `react()` integration satırı

Source-of-truth:

- `scripts/react-surface-audit.ts`
- `src/lib/react-surface-audit.ts`
- `docs/reports/react-surface-audit.md`
- `scripts/react-surface-classification.ts`
- `src/lib/react-surface-classification.ts`
- `docs/reports/react-surface-classification.md`

2026-04-17 itibarıyla bu raporlar:

- paket kaldırma kararı üretmek için değil
- config dışı React yüzeyinin geri dönmesini izlemek için
- gerekirse gelecekte seçili React geri dönüşlerini kontrollü yapmak için tutulur
- son bakım batch'i ile `.tsx` ve React hook/lib blokörü `0`a indi; kalan görünür runtime blokörü yalnızca `astro.config.mjs`

## Kısa Vadede Yapılmaması Gerekenler

### 1. Big-Bang React Removal

Tek seferde:

- `@astrojs/react` kaldırmak
- tüm `.tsx` yüzeyi `.astro`ya taşımak
- hydration noktalarını topluca silmek

yanlıştır. Bu yaklaşım hız kazandırmaz; sistemik regresyon üretir.

### 2. Admin Yüzeyi Önce Rewrite Etmek

Admin ekranları en çok state taşıyan alanlardan biridir. Astro-only denemesi admin'den başlamamalı.

### 3. Test Katmanını Taşımadan UI Rewrite Yapmak

Önce behavior helper + smoke test zemini, sonra component dönüşümü yapılmalıdır.

## Önerilen Migration Stratejisi

### Faz 1: Kuralı Sabitle

Yeni kural:

- yeni view'lar varsayılan olarak `.astro`
- React sadece açık gerekçe varsa
- yeni küçük etkileşimler plain TS helper ile çözülmeli

Bu fazda:

- `CLAUDE.md`
- architecture docs
- source-of-truth notları

güncel tutulmalı.

### Faz 2: Küçük Widget Temizliği

Önce düşük riskli widget'lar taşınmalı.

Hedef:

- düşük bağımlı `client:*` yüzeyleri azaltmak
- shared browser helper'ları çoğaltmak
- Astro shell + vanilla TS modelini yerleştirmek

Bu faz tamamlandı.

### Faz 3: Orta Riskli Ekranları Böl

Doğrudan rewrite yerine önce parçala:

- data loader
- view model
- DOM/update helper
- bootstrap helper

Bu repo'da admin ops ekranları ve kullanıcı panel yüzeyleri bu modelle taşındı.

### Faz 4: Yüksek Riskli Yüzeyleri Tek Tek Değerlendir

Her büyük panel için ayrı karar verilmelidir:

- Astro-only'a taşınacak mı?
- React island olarak kalacak mı?
- hibrit mi olacak?

Bu faz da tamamlandı; kalan karar artık framework migration değil, React compatibility layer'ın korunma biçimidir.

## Teknik Geçiş Kuralları

Astro-only migration sırasında şu kurallar uygulanmalı:

1. Yeni interaktif behavior önce helper katmanına çıkarılmalı.
2. DOM güncellemeleri ortak util'lere alınmalı.
3. Local history/refresh/polling tekrar etmemeli.
4. Server veri toplama `.astro` içine gömülmemeli; ayrı data helper kullanılmalı.
5. Her migration batch'i test eklemeden kapanmamalı.

## Test Stratejisi

React'ten Astro-only yapıya geçerken korunması gereken test katmanları:

- helper unit testleri
- browser-level smoke testler
- contract/OpenAPI testleri
- kritik admin gate'ler

Özellikle admin örneğinde doğru model şudur:

- data helper testli
- view helper testli
- page bootstrap helper testli
- browser smoke testli

## Somut Backlog Önerisi

### Dalga 1

- küçük widget inventory çıkar
- düşük riskli 10-15 React component seç
- Astro + plain TS karşılıklarını üret

### Dalga 2

- search/settings/billing gibi orta riskli yüzeyleri böl
- data/view/bootstrap yardımcılarını standardize et

### Dalga 3

- admin dışındaki büyük panelleri ekonomik fizibilite ile sırala
- React'te kalacak yüzeyleri açıkça belgeye yaz

### Dalga 4

- yalnızca React yüzeyi yeterince küçüldüğünde `@astrojs/react` kaldırma adaylığını değerlendir

## Karar

Bugün itibarıyla doğru mühendislik kararı şudur:

- Proje Astro tabanlı kalmalı.
- Yeni yüzeylerde Astro-first kuralı uygulanmalı.
- React bağımlılığı kademeli azaltılmalı.
- Ama kısa vadede “tam Astro-only” hedefi için big-bang rewrite yapılmamalı.

Bu repo için en savunulabilir yaklaşım, Astro-only hedefini mimari yön olarak kabul edip, uygulamayı yüzey bazlı ve ölçülü migration ile yürütmektir.











