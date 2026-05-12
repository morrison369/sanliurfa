# Legacy Route Inventory

Bu dosya repo içinde hâlâ bulunan legacy veya alias rota yüzeylerini izlemek için tutulur.

## Amaç

- hangi alias'ların bilinçli olarak korunduğunu göstermek
- hangilerinin sadece redirect shim olduğunu ayırmak
- sonraki cleanup turunda silinebilir adayları işaretlemek

## Kanonik Public Aileler

- `/`
- `/mekanlar`
- `/isletme`
- `/isletme/panel`
- `/isletme/analytics`
- `/isletme/pazarlama`
- `/kullanici/*`
- `/profil/*`
- `/bildirimler`
- `/mesajlar`
- `/kullanicilar`

## Dosya Seviyesinde Redirect Shim'ler

- `src/pages/places/index.astro` → `/mekanlar`
- `src/pages/places/[slug].astro` → `/isletme/[slug]`
- `src/pages/places/ekle.astro` → `/isletme-kayit`
- `src/pages/vendor/dashboard.astro` → `/isletme/panel`
- `src/pages/vendor/analytics.astro` → `/isletme/analytics`
- `src/pages/profile.astro` → `/profil`
- `src/pages/notifications.astro` → `/bildirimler`
- `src/pages/messages.astro` → `/mesajlar`
- `src/pages/kullanıcı/[id].astro` → `/kullanici/[id]`
- `src/pages/kullanıcılar.astro` → `/kullanicilar`
- `src/pages/işletme/pazarlama.astro` → `/isletme/pazarlama`

## Middleware Alias'ları

Tekil alias:

- `/ara` → `/arama`
- `/gizlilik` → `/gizlilik-politikasi`
- `/kosullar` → `/kullanim-kosullari`
- `/mekan` → `/mekanlar`
- `/places` → `/mekanlar`
- `/places/ekle` → `/isletme-kayit`
- `/yerler` → `/mekanlar`
- `/vendor/dashboard` → `/isletme/panel`
- `/vendor/analytics` → `/isletme/analytics`
- `/messages` → `/mesajlar`
- `/notifications` → `/bildirimler`
- `/profile` → `/profil`
- `/isletme/` → `/isletme`
- `/işletme` → `/isletme`

Prefix alias:

- `/places/*` → `/isletme/*`
- `/yerler/*` → `/isletme/*`
- `/mekan/*` → `/isletme/*`
- `/kategori/*` → `/mekanlar/*`
- `/işletme/*` → `/isletme/*`
- `/kullanıcı/*` → `/kullanici/*`

## Legacy Lazy Registry

- `src/lib/routes.ts` içindeki `legacyLazyRoutes`
- şu an yalnızca exact vendor alias'ları burada tutulur:
- `/vendor/dashboard`
- `/vendor/analytics`

## Bilinçli Olarak Korunan Legacy Katmanlar

- `places` ailesi: eski public linkler ve dış backlink uyumluluğu
- `vendor` ailesi: eski işletme paneli bookmark'ları
- `profile`, `notifications`, `messages`: eski İngilizce kullanıcı yüzeyi bookmark'ları
- Türkçe karakterli path varyantları: tarayıcı ve dış link dayanıklılığı
- `kullanıcı/*`: yalnızca redirect ve dış link uyumluluğu; iç link üretimi artık `kullanici/*`

## Silme Adayları

Bu dosyalar ancak aşağıdaki koşullardan sonra silinmeli:

- iç linklerde hiç referans kalmaması
- prod loglarında anlamlı hit almamaları
- sitemap, canonical ve smoke yüzeyinin tamamen kanonik olması

Öncelikli silme adayları:

- `src/pages/vendor/dashboard.astro`
- `src/pages/vendor/analytics.astro`
- `src/pages/profile.astro`
- `src/pages/notifications.astro`
- `src/pages/messages.astro`
- `src/pages/kullanıcılar.astro`
- `src/pages/kullanıcı/[id].astro`
- `src/pages/işletme/pazarlama.astro`

## Not

API yüzeyindeki `/api/places/*` legacy sayılmaz; bu rota ailesi şu an ürün kontratının parçasıdır.

Rapor komutu:

- `npm run route:legacy:report`
- çıktı: `docs/legacy-route-usage-report.json` ve `docs/legacy-route-usage-report.md`

Politika:

- `docs/ROUTE_LEGACY_POLICY.md`

Operasyon notu:

- `2026-05-06` itibarıyla prod shell tarafında okunabilir access log yok; mevcut remote rapor application log fallback ile çalışır.
