# Astro-Only Migration Assessment

Bu belge, `Şanlıurfa.com` kod tabanının mevcut Astro + React island mimarisinden daha Astro-merkezli bir yapıya nasıl taşınabileceğini değerlendirir.

## Karar Özeti

- Proje zaten Astro üzerindedir.
- Proje henüz Astro-only değildir.
- Mevcut durumda React island yüzeyi büyüktür; bu yüzden `@astrojs/react` paketini kısa vadede kaldırmak gerçekçi değildir.
- Doğru yaklaşım big-bang rewrite değil, yüzey bazlı kademeli migration'dır.

## Mevcut Durum

2026-04-17 itibarıyla ölçülen yüzey:

- `src/**/*.astro`: `160`
- `src/**/*.tsx`: `95`
- `.astro` dosyalarında `client:*` hydration kullanımı: `36`
- `astro.config.mjs` içinde aktif React entegrasyonu: `@astrojs/react`
- generated inventory: `docs/reports/astro-hydration-inventory.md` (`0 low / 20 medium / 16 high`)

Mevcut yapı:

- SSR ve routing katmanı Astro ile çalışıyor.
- İnteraktif panellerin önemli bölümü React island olarak hydrate ediliyor.
- Admin, analytics, search, social, subscriptions, notifications ve messaging yüzeyleri React bağımlılığını yoğun kullanıyor.
- İlk migration dalgalarında `NotificationBadge`, `QuotaUsageDisplay`, `TrendingPlaces`, `LeaderboardsDisplay`, `PricingPlans`, `UserRecommendations`, `PerformanceMonitor`, `PWAPrompt`, `TransactionHistory`, `BillingHistory`, `RewardsCatalog`, `NotificationPreferencesManager`, `NotificationCenter`, `SubscriptionManager`, `MyActivityLog`, `UserSuggestionsPanel` ve `UserSearchResults` React island olmaktan çıkarıldı.

## Astro-Only Hedefinin Anlamı

Bu repo için `Astro-only` ifadesi aşağıdaki anlama gelir:

1. Yeni sayfalarda varsayılan seçim `.astro` olmalı.
2. Sadece küçük ve net gerekçeli client script'ler kullanılmalı.
3. React island bağımlılığı kademeli azaltılmalı.
4. Orta vadede `@astrojs/react` kaldırılabilir hale gelinmeli.

Bu hedef, sadece framework adı değiştirmek değildir. Aşağıdakiler de değişir:

- UI state yönetim modeli
- component composition biçimi
- fetch/render ayrımı
- hydration maliyeti
- test stratejisi

## Mevcut React Yüzeyinin Sınıflandırması

### 1. Düşük Riskli Taşınabilir Yüzeyler

Bunlar çoğunlukla:

- küçük widget'lar
- tek buton / tek form davranışı
- az state kullanan client parçaları
- server render + hafif script ile çözülebilecek bileşenler

Örnek adaylar:

- `src/components/NotificationBadge.tsx`
- `src/components/ShareButton.tsx`
- `src/components/FollowPlaceButton.tsx`
- `src/components/RsvpButton.tsx`
- `src/components/PlaceFollowersCount.tsx`
- `src/components/QuotaUsageDisplay.tsx`

Taşıma yaklaşımı:

- `.astro` bileşen + küçük inline/client script
- server prop ile render edilen markup
- gerektiğinde `fetch` + `data-*` attribute yaklaşımı

### 2. Orta Riskli Yüzeyler

Bunlar:

- filtreleme
- tablo/list view
- form state
- pagination/search UI
- birden fazla event handler

Örnek adaylar:

- `src/components/SearchResults.tsx`
- `src/components/AdvancedSearchForm.tsx`
- `src/components/UserSettings.tsx`
- `src/components/NotificationsCenter.tsx`
- `src/components/RewardsCatalog.tsx`

Taşıma yaklaşımı:

- server-rendered Astro shell
- ortak browser helper katmanı
- küçük view-model helper'ları
- gerekiyorsa ada ada vanilla TypeScript module

### 3. Yüksek Riskli Yüzeyler

Bunlar pratikte mini SPA davranışı gösterir:

- admin dashboard'lar
- live analytics panelleri
- moderation queue
- webhook yönetimi
- sosyal feed ve messaging
- yoğun tab/state + async orchestration kullanan ekranlar

Örnekler:

- `src/components/AdminAnalyticsDashboard.tsx`
- `src/components/AdminPerformanceDashboard.tsx`
- `src/components/ModerationDashboard.tsx`
- `src/components/ModerationQueueManager.tsx`
- `src/components/WebhookManager.tsx`
- `src/components/WebhookAnalyticsDashboard.tsx`
- `src/components/MessagingInbox.tsx`
- `src/components/ActivityFeed.tsx`
- `src/components/LiveAnalyticsDashboard.tsx`
- `src/components/SubscriptionAdminDashboard.tsx`

Bu yüzeyleri Astro-only yapmak mümkündür, ama maliyeti yüksektir. Kısa vadede bunları React'te bırakmak daha ekonomik olabilir.

## En Yoğun Hydration Bölgeleri

`client:*` kullanan önemli sayfalar:

- `src/pages/admin/dashboard.astro`
- `src/pages/admin/analytics.astro`
- `src/pages/admin/moderation.astro`
- `src/pages/admin/subscriptions.astro`
- `src/pages/admin/verifications.astro`
- `src/pages/admin/loyalty/index.astro`
- `src/pages/arama/index.astro`
- `src/pages/arama/gelismis.astro`
- `src/pages/abonelik.astro`
- `src/pages/ayarlar.astro`
- `src/pages/sosyal/index.astro`
- `src/pages/webhooks.astro`
- `src/pages/mesajlar/index.astro`
- `src/pages/canli-analitik/index.astro`

Bu liste, migration sıralamasında öncelik değil; maliyet haritasıdır.

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

Başarı metriği:

- `client:*` sayısı düşer
- React bağımlı küçük bileşen sayısı azalır

### Faz 3: Orta Riskli Ekranları Böl

Doğrudan rewrite yerine önce parçala:

- data loader
- view model
- DOM/update helper
- bootstrap helper

Bu repo'da admin ops ekranlarında yapılan son modülerleşme buna iyi örnektir.

### Faz 4: Yüksek Riskli Yüzeyleri Tek Tek Değerlendir

Her büyük panel için ayrı karar verilmelidir:

- Astro-only'a taşınacak mı?
- React island olarak kalacak mı?
- hibrit mi olacak?

Özellikle şu alanlarda “React kalsın” kararı teknik olarak makul olabilir:

- moderation queues
- complex analytics dashboards
- messaging inbox
- webhook management

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




