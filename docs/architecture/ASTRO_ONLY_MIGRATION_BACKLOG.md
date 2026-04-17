# Astro-Only Migration Backlog

Bu belge, `ASTRO_ONLY_MIGRATION_ASSESSMENT.md` içindeki mimari kararı uygulanabilir backlog'a çevirir.

## Hedef

Amaç:

- Astro-first geliştirme kuralını fiilen uygulamak
- düşük maliyetli React island yüzeylerini azaltmak
- yüksek riskli panelleri yanlış sırayla rewrite etmemek
- React yüzeyini görünür tutmak, ama `@astrojs/react` entegrasyonunu korumak

## Başarı Ölçütleri

Güncel ölçüm:

- `.astro`: `193`
- `.tsx`: `0`
- `client:*` hydration noktası: `0`
- current generated risk split: `0 low / 0 medium / 0 high`
- current high-risk feasibility split: `0 first / 0 later / 0 last`
- current package removal blockers: `0 tsx / 0 hook-lib / 1 runtime`
- current classification goal: `server-only / dead / migrate / keep`

İlk hedefler:

1. düşük riskli 10-15 React component'i kaldırmak
2. `client:*` yüzeyini ilk dalgada `55` altına indirmek
3. yeni açılan UI yüzeylerinde varsayılan olarak React kullanmamak
4. migration yapılan her sayfa için helper + smoke/test zemini kurmak
5. hydration `0` olduktan sonra `npm run astro:react:audit` ile kalan React yüzeyini görünür tutmak
6. kalan `.tsx` yüzeyi için `npm run astro:react:classify` ile bakım sınıflaması üretmek

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
- `src/components/BillingHistory.tsx` -> `src/components/BillingHistory.astro`
- `src/components/RewardsCatalog.tsx` -> `src/components/RewardsCatalog.astro`
- `src/components/NotificationPreferencesManager.tsx` -> `src/components/NotificationPreferencesManager.astro`
- `src/components/NotificationCenter.tsx` -> `src/components/NotificationCenter.astro`
- `src/components/NotificationsCenter.tsx` -> `src/components/NotificationsCenter.astro`
- `src/components/SubscriptionManager.tsx` -> `src/components/SubscriptionManager.astro`
- `src/components/MyActivityLog.tsx` -> `src/components/MyActivityLog.astro`
- `src/components/UserSuggestionsPanel.tsx` -> `src/components/UserSuggestionsPanel.astro`
- `src/components/UserSearchResults.tsx` -> `src/components/UserSearchResults.astro`
- `src/components/HashtagExplorer.tsx` -> `src/components/HashtagExplorer.astro`
- `src/components/CollectionsManager.tsx` -> `src/components/CollectionsManager.astro`
- `src/components/ContentManager.tsx` -> `src/components/ContentManager.astro`
- `src/components/UserPublicProfile.tsx` -> `src/components/UserPublicProfile.astro`
- `src/components/ReportManager.tsx` -> `src/components/ReportManager.astro`
- `src/components/VendorDashboard.tsx` -> `src/components/VendorDashboard.astro`
- `src/components/LoyaltyDashboard.tsx` -> `src/components/LoyaltyDashboard.astro`
- `src/components/UserProfile.tsx` -> `src/components/UserProfile.astro`
- `src/components/CollectionDetail.tsx` -> `src/components/CollectionDetail.astro`
- `src/components/UserSettings.tsx` -> `src/components/UserSettings.astro`
- `src/components/SearchResults.tsx` -> `src/components/SearchResults.astro`
- `src/components/BusinessAnalyticsDashboard.tsx` -> `src/components/BusinessAnalyticsDashboard.astro`
- `src/components/FeaturedListingsManager.tsx` -> `src/components/FeaturedListingsManager.astro`
- `src/components/MarketingCampaignBuilder.tsx` -> `src/components/MarketingCampaignBuilder.astro`
- `src/components/AdminLoyaltyPanel.tsx` -> `src/components/AdminLoyaltyPanel.astro`
- `src/components/admin/AuditLogViewer.tsx` -> `src/components/admin/AuditLogViewer.astro`
- `src/components/UserManagementTable.tsx` -> `src/components/UserManagementTable.astro`
- `src/components/AdminDashboardOverview.tsx` -> `src/components/AdminDashboardOverview.astro`
- `src/components/AnalyticsPanel.tsx` -> `src/components/AnalyticsPanel.astro`
- `src/components/AdminAnalyticsDashboard.tsx` -> `src/components/AdminAnalyticsDashboard.astro`
- `src/components/admin/AdminManager.tsx` -> `src/components/admin/AdminManager.astro`
- `src/components/WebhookAnalyticsDashboard.tsx` -> `src/components/WebhookAnalyticsDashboard.astro`
- `src/components/LiveAnalyticsDashboard.tsx` -> `src/components/LiveAnalyticsDashboard.astro`
- `src/components/ModerationQueueManager.tsx` -> `src/components/ModerationQueueManager.astro`
- `src/components/SubscriptionAdminDashboard.tsx` -> `src/components/SubscriptionAdminDashboard.astro`
- `src/components/AdminVerificationQueue.tsx` -> `src/components/AdminVerificationQueue.astro`
- `src/components/OLAPExplorer.tsx` -> `src/components/OLAPExplorer.astro`
- `src/components/AdminPerformanceDashboard.tsx` -> `src/components/AdminPerformanceDashboard.astro`
- `src/components/MessagingInbox.tsx` -> `src/components/MessagingInbox.astro`

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
- `src/pages/abonelik.astro` içindeki `BillingHistory` artık React island değil
- `src/pages/aktivitelerim/index.astro` içindeki `MyActivityLog` artık React island değil
- `src/pages/sosyal/index.astro` içindeki `UserSuggestionsPanel` artık React island değil
- `src/pages/kullanıcılar.astro` içindeki `UserSearchResults` artık React island değil
- `src/pages/sosyal/index.astro` içindeki `HashtagExplorer` artık React island değil
- `src/pages/koleksiyonlar/index.astro` içindeki `CollectionsManager` artık React island değil
- `src/pages/bildirimler/index.astro` içindeki `NotificationsCenter` artık React island değil
- `src/pages/icerik.astro` içindeki `ContentManager` artık React island değil
- `src/pages/kullanıcı/[id].astro` içindeki `UserPublicProfile` artık React island değil
- `src/pages/raporlar/index.astro` içindeki `ReportManager` artık React island değil
- `src/pages/vendor/dashboard.astro` içindeki `VendorDashboard` artık React island değil
- `src/pages/loyalty/index.astro` ve `src/pages/kullanici/sadakat.astro` içindeki `LoyaltyDashboard` artık React island değil
- `src/pages/profile.astro` içindeki `UserProfile` artık React island değil
- `src/pages/koleksiyonlar/[id].astro` içindeki `CollectionDetail` artık React island değil
- `src/pages/ayarlar.astro` içindeki `UserSettings` artık React island değil
- `src/pages/arama/index.astro` ve `src/pages/arama/gelismis.astro` içindeki `SearchResults` artık React island değil
- `src/pages/isletme/analytics.astro` içindeki `BusinessAnalyticsDashboard` artık React island değil
- `src/pages/işletme/pazarlama.astro` içindeki `FeaturedListingsManager` artık React island değil
- `src/pages/işletme/pazarlama.astro` içindeki `MarketingCampaignBuilder` artık React island değil
- `src/pages/admin/loyalty/index.astro` içindeki `AdminLoyaltyPanel` artık React island değil
- `src/pages/admin/audit-logs.astro` içindeki `AuditLogViewer` artık React island değil
- `src/pages/admin/dashboard.astro` içindeki `UserManagementTable` artık React island değil
- `src/pages/admin/dashboard.astro` içindeki `AdminDashboardOverview` artık React island değil
- `src/pages/admin/analytics.astro` içindeki `AnalyticsPanel` artık React island değil
- `src/pages/admin/analytics.astro` içindeki `AdminAnalyticsDashboard` artık React island değil
- `src/pages/admin/manage.astro` içindeki `AdminManager` artık React island değil
- `src/pages/webhooks.astro` içindeki `WebhookAnalyticsDashboard` artık React island değil
- `src/pages/canli-analitik/index.astro` içindeki `LiveAnalyticsDashboard` artık React island değil
- `src/pages/admin/dashboard.astro` içindeki `ModerationQueueManager` artık React island değil
- `src/pages/admin/subscriptions.astro` içindeki `SubscriptionAdminDashboard` artık React island değil
- `src/pages/admin/verifications.astro` içindeki `AdminVerificationQueue` artık React island değil
- `src/pages/veri-ambarı/index.astro` içindeki `OLAPExplorer` artık React island değil
- `src/pages/admin/analytics.astro` içindeki `AdminPerformanceDashboard` artık React island değil
- `src/pages/mesajlar/index.astro` içindeki `MessagingInbox` artık React island değil
- toplam `client:*` sayısı `55 -> 4` düştü

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

- `src/components/AdvancedSearchForm.tsx`
- `src/components/AdvancedSearchPanel.tsx`
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
- `src/components/WebhookAnalyticsDashboard.tsx`
- `src/components/MessagingInbox.tsx`
- `src/components/LiveAnalyticsDashboard.tsx`

### Beklenen Karar Çıkışı

Her yüzey için:

- state yoğunluğu
- hydration zorunluluğu
- plain TS ile yeniden yazılabilirlik
- test maliyeti
- business risk

ayrı yazılmalı.

### Güncel Sıralama

`docs/reports/astro-high-risk-feasibility.md` şu sırayı öneriyor:

`docs/reports/astro-high-risk-feasibility.md` artık `later` bucket bırakmıyor; kalan sıralama:

- `ModerationDashboard`

Bu şu anlama gelir:

1. sıradaki tüm yüzeyler pahalı `last` dalgasına girdi
2. sonraki seçim artık sadece “en ucuz high-risk” değil, business-risk sırasıyla yapılmalı

Bu yüzeyler dışında kalan yüksek-risk bileşenler şu an için son dalga adayıdır.

## React'te Kalması Makul Olan Yüzeyler

İlk değerlendirmede aşağıdaki alanların React'te kalması teknik olarak makul görünüyor:

- moderation queue
- live analytics dashboards
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
- `medium` biterse `npm run astro:migration:high-risk` çalıştırılır ve sıralama oradan alınır.
- `high` yüzeye ancak üretilen feasibility raporu bunu destekliyorsa girilir.









