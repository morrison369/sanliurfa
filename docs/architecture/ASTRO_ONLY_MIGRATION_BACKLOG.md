# Astro-Only Migration Backlog

Bu belge, `ASTRO_ONLY_MIGRATION_ASSESSMENT.md` içindeki mimari kararı uygulanabilir backlog'a çevirir.

## Hedef

Amaç:

- Astro-first geliştirme kuralını fiilen uygulamak
- düşük maliyetli React island yüzeylerini azaltmak
- yüksek riskli panelleri yanlış sırayla rewrite etmemek
- `@astrojs/react` kaldırma adaylığını ölçülebilir hale getirmek

## Başarı Ölçütleri

Güncel ölçüm:

- `.astro`: `153`
- `.tsx`: `103`
- `client:*` hydration noktası: `44`
- current generated risk split: `0 low / 28 medium / 16 high`

İlk hedefler:

1. düşük riskli 10-15 React component'i kaldırmak
2. `client:*` yüzeyini ilk dalgada `55` altına indirmek
3. yeni açılan UI yüzeylerinde varsayılan olarak React kullanmamak
4. migration yapılan her sayfa için helper + smoke/test zemini kurmak

## Öncelik Kuralları

Önce taşınacaklar:

- küçük widget'lar
- tek amaçlı CTA bileşenleri
- tek endpoint'e bağlanan hafif paneller
- sınırlı state kullanan bileşenler

Daha sonra taşınacaklar:

- filtreleme ve listeleme yüzeyleri
- form ağırlıklı ama mini-SPA olmayan ekranlar

En sona bırakılacaklar:

- admin analytics
- moderation queue
- webhook manager
- sosyal feed
- messaging inbox

## Dalga 1: Düşük Riskli Widget Temizliği

### Hedef

Astro + plain TypeScript ile kolay taşınabilecek küçük React bileşenlerini azaltmak.

### Tamamlananlar

- `src/components/NotificationBadge.tsx` -> `src/components/NotificationBadge.astro`
- `src/components/QuotaUsageDisplay.tsx` -> `src/components/QuotaUsageDisplay.astro`
- `src/components/TrendingPlaces.tsx` -> `src/components/TrendingPlaces.astro`
- `src/components/LeaderboardsDisplay.tsx` -> `src/components/LeaderboardsDisplay.astro`
- `src/components/PricingPlans.tsx` -> `src/components/PricingPlans.astro`
- `src/components/UserRecommendations.tsx` -> `src/components/UserRecommendations.astro`
- `src/components/PerformanceMonitor.tsx` -> `src/components/PerformanceMonitor.astro`
- `src/components/PWAPrompt.tsx` -> `src/components/PWAPrompt.astro`
- `src/components/TransactionHistory.tsx` -> `src/components/TransactionHistory.astro`

Bu dalga ile:

- `Header.astro` içindeki `NotificationBadge` artık React island değil
- `src/pages/ayarlar/kotalar.astro` içindeki `QuotaUsageDisplay` artık React island değil
- `src/pages/trend/index.astro` ve `src/pages/kesfet/index.astro` içindeki `TrendingPlaces` artık React island değil
- `src/pages/liderlik-tablosu.astro` ve `src/pages/siralamalar/index.astro` içindeki `LeaderboardsDisplay` artık React island değil
- `src/pages/fiyatlandirma.astro` içindeki `PricingPlans` artık React island değil
- `src/pages/kesfet/index.astro` içindeki `UserRecommendations` artık React island değil
- `src/layouts/Layout.astro` içindeki `PerformanceMonitor` artık React island değil
- `src/components/PWARegister.astro` içindeki `PWAPrompt` artık React island değil
- `src/pages/loyalty/transactions.astro` içindeki `TransactionHistory` artık React island değil
- toplam `client:*` sayısı `55 -> 44` düştü

### Önceki Düşük Risk Adayları

- `src/components/ShareButton.tsx`
- `src/components/FollowPlaceButton.tsx`
- `src/components/RsvpButton.tsx`
- `src/components/PlaceFollowersCount.tsx`
- `src/components/PointsDisplay.tsx`
- `src/components/RealtimeNotificationBadge.tsx`
- `src/components/ReviewStats.tsx`
- `src/components/VisitorChart.tsx`
- `src/components/PlaceBadgesDisplay.tsx`
- `src/components/CouponValidator.tsx`

### Çıkış Kriteri

- Her taşınan bileşen için `.astro` veya plain TS modül karşılığı olmalı.
- Gerekirse hydration yerine:
  - server render
  - `data-*`
  - küçük DOM helper
  kullanılmalı.

## Dalga 2: Orta Riskli Kullanıcı Yüzeyleri

### Hedef

Form/list/tab davranışı olan ama tam dashboard olmayan yüzeyleri Astro-first modele çekmek.

### Aday Bileşenler

- `src/components/SearchResults.tsx`
- `src/components/AdvancedSearchForm.tsx`
- `src/components/AdvancedSearchPanel.tsx`
- `src/components/UserSettings.tsx`
- `src/components/BillingHistory.tsx`
- `src/components/NotificationsCenter.tsx`
- `src/components/RewardsCatalog.tsx`
- `src/components/SubscriptionManager.tsx`
- `src/components/SearchHistoryViewer.tsx`
- `src/components/SavedSearchesManager.tsx`

### Zorunlu Teknik Adımlar

Bu sınıftaki her migration'da önce:

1. data loader helper
2. render/view-model helper
3. DOM/bootstrap helper
4. smoke test

eklenmeli.

## Dalga 3: Sayfa Bazlı Hydration Azaltımı

### Hedef

`client:*` kullanan büyük sayfaları topyekun rewrite etmeden, sayfa içindeki küçük island sayısını azaltmak.

### Öncelikli Sayfalar

- `src/pages/abonelik.astro`
- `src/pages/ayarlar.astro`
- `src/pages/arama/index.astro`
- `src/pages/arama/gelismis.astro`
- `src/pages/bildirimler/index.astro`
- `src/pages/notifications.astro`
- `src/pages/kullanici/sadakat.astro`

### Yaklaşım

- tek sayfada birden fazla React island varsa mümkün olduğunda bir kısmını Astro + browser helper modeline taşı
- ama tüm sayfayı tek batch'te yeniden yazma

## Dalga 4: Yüksek Riskli Panellerin Fizibilite Kararı

### Bu dalgada hemen rewrite yapılmaz

Önce her yüzey için karar verilir:

- Astro-only taşınacak
- hibrit kalacak
- React'te kalacak

### Karar Bekleyen Yüzeyler

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

### Beklenen Karar Çıkışı

Her yüzey için:

- state yoğunluğu
- hydration zorunluluğu
- plain TS ile yeniden yazılabilirlik
- test maliyeti
- business risk

ayrı yazılmalı.

## React'te Kalması Makul Olan Yüzeyler

İlk değerlendirmede aşağıdaki alanların React'te kalması teknik olarak makul görünüyor:

- moderation queue
- live analytics dashboards
- webhook management
- messaging inbox
- sosyal feed benzeri yüksek etkileşimli yüzeyler

Bu, kalıcı karar değildir; ama erken rewrite önceliği değildir.

## Her Migration Batch'i İçin Kural

Her Astro migration batch'i şu çıktıları birlikte üretmeli:

1. yüzey taşıma
2. helper extraction
3. test ekleme
4. hydration sayısında veya React yüzeyinde somut azalma
5. gerekiyorsa doküman güncellemesi

## Ölçüm Tablosu

İzlenecek metrikler:

- toplam `.tsx` sayısı
- toplam `client:*` sayısı
- admin sayfalarında React island sayısı
- kullanıcı yüzeylerinde React island sayısı
- plain browser helper kullanan sayfa sayısı

## Sıradaki En Mantıklı Teknik Batch

İlk gerçek migration batch'i için en doğru kapsam:

1. düşük riskli 5-8 widget seç
2. bunları `.astro` + plain TS'e taşı
3. sayfa bazlı `client:*` kullanımında düşüş yarat
4. bu dalga için ayrı migration raporu yaz

Bu repo için doğru hız budur. Daha agresif rewrite, gereksiz risk üretir.

## Aktif Inventory Kuralı

- Sonraki Astro migration batch'i seçilmeden önce `npm run astro:migration:inventory` çalıştırılır.
- Önce `docs/reports/astro-hydration-inventory.md` içindeki `low` bucket değerlendirilir; `low=0` ise en ucuz `medium` yüzeyler seçilir.
- `medium` veya `high` yüzeye ancak açık gerekçe varsa girilir.
