# Public Route Cache Contract

Şanlıurfa.com public SSR sayfaları doğrudan veritabanı çağrılarını cache koruması olmadan çalıştırmamalıdır. Bu kural prod ortamında ilk istek gecikmesini, yoğun trafikte DB baskısını ve route bazlı performans driftini sınırlamak için release hattına bağlanmıştır.

## Kural

- Public SSR sayfasında `query`, `queryOne`, `getPlaces` veya `getPlaceBySlug` kullanılıyorsa çağrı `getCachedPublicRouteData()` üzerinden yapılmalıdır.
- Homepage doğrudan DB çağırmaz; `src/lib/home-data.ts` içindeki `loadHomepageCoreData()` kullanılır.
- Client-only arama gibi SSR DB kullanmayan sayfalar cache helper kullanmak zorunda değildir.
- Giriş gerektiren SSR sayfaları public cache'e alınmaz; bu dosyalar gate içinde explicit auth-only allowlist ile tutulur ve `/giris` yönlendirmesi zorunludur.
- Route smoke listesine yeni public URL eklenirse `scripts/ci/public-route-cache-contract-gate.mjs` içindeki route dosya eşlemesi de güncellenmelidir.
- Gezilecek yerler, etkinlikler, sağlık kategori, konaklama, alışveriş, eğitim, hizmetler, emlak, ilçe/mahalle detayları, mekan kategori detayları, tarif detayları ve özel gastronomi/şehir rehberi landing sayfaları da bu sözleşmenin içindedir.
- Gate ayrıca `src/pages` altındaki admin/API/profil/vendor dışı tüm `.astro` dosyalarını tarar; smoke listesinde olmayan yeni public DB çağrıları cache helper olmadan eklenirse release hattı düşer.
- Smoke listesine doğrudan eklenmeyen ama public cache sözleşmesine dahil route dosyaları `contractOnlyPublicFiles` içinde tutulur.

## Contract-Only Public Dosyalar

Bu dosyalar route yapısı gereği smoke URL listesine birebir eklenmez, ancak cache sözleşmesinin parçasıdır:

- `src/pages/kategori/[slug].astro`
- `src/pages/mahalleler/[ilce]/index.astro`
- `src/pages/mahalleler/[ilce]/[mahalle].astro`
- `src/pages/[...seopage].astro`

Mahalle ilçe index sayfası smoke kapsamındadır. Mahalle detay sayfası ise prod verisinde doğrulanmış mahalle slug'ları olmadığı sürece smoke listesine eklenmez. Böylece redirect edilen URL ile gerçek şablon ölçümü karıştırılmaz.

## Smoke Final URL Kuralı

Prod smoke ve public performance gate, takip edilen redirect sonucunda final URL'nin test edilen route ile aynı kalmasını bekler. Public route listesine bilerek redirect eden bir URL eklenecekse route objesinde açıkça `allowRedirect: true` tanımlanmalıdır.

## Auth-Only İstisnalar

Bu sayfalar kullanıcıya özel veri veya form state taşıdığı için public SSR cache kullanmaz:

- `src/pages/isletme/panel.astro`
- `src/pages/yorum/[slug].astro`

Bu istisnalar sadece kullanıcı giriş kontrolü ve `/giris` yönlendirmesi korunduğu sürece geçerlidir.

## Gate

```bash
npm run public:cache:contract:gate
```

Bu gate `npm run release:public` içinde `astro check` sonrasında ve build öncesinde çalışır. Böylece cache sözleşmesi bozulursa build/deploy aşamasına geçilmez.

## İlgili Dosyalar

- `src/lib/public-route-cache.ts`
- `src/lib/home-data.ts`
- `scripts/smoke/public-route-smoke-routes.mjs`
- `scripts/ci/public-route-cache-contract-gate.mjs`
- `scripts/ci/release-public-gate.mjs`
