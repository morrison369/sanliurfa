# Astro 2026 Framework Denetimi

Tarih: 2026-04-23

Bu dosya sanliurfa.com için Astro framework kararlarını kilitler. Yeni paket eklemeden önce bu matris kontrol edilir.

## Mevcut Astro Durumu

- Astro: `6.1.9`
- Vite: `7.3.2`
- Node: `22.22.0`
- Output: `server`
- Adapter: `@astrojs/node@10.0.6`
- Aktif entegrasyonlar: `@astrojs/mdx`, `@astrojs/react`, `@astrojs/partytown`, `astro-compress`, `@tailwindcss/vite`
- Resmi feed paketi: `@astrojs/rss`
- Görsel servisi: Astro built-in Sharp image service (`astro/assets/services/sharp`)

## Resmi Astro Özellikleri ve Proje Kararı

| Astro alanı                        | Proje kararı                   | Gerekçe                                                                                                                                                          |
| ---------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SSR / on-demand rendering          | Kullanılıyor                   | Admin, API, auth, DB ve dinamik şehir içerikleri için `output: "server"` doğru modeldir.                                                                         |
| `@astrojs/node`                    | Kullanılıyor                   | CentOS Web Panel / Node standalone runtime için doğru resmi adapter budur.                                                                                       |
| `@astrojs/react`                   | Kullanılıyor                   | Mevcut interaktif paneller ve sosyal bileşenler React 19 ile çalışır.                                                                                            |
| Tailwind 4 / `@tailwindcss/vite`   | Kullanılıyor                   | Astro 6 ve Tailwind 4 için resmi önerilen yol Vite plugin modelidir; deprecated `@astrojs/tailwind` kullanılmaz.                                                 |
| `@astrojs/mdx`                     | Kullanılıyor                   | Blog, rehber ve doküman içerikleri ileride MDX gerektirirse framework tarafı hazırdır.                                                                           |
| `@astrojs/rss`                     | Kullanılıyor                   | Public Türkçe feed üretimi için resmi paket kullanılır.                                                                                                          |
| `@astrojs/partytown`               | Kullanılıyor                   | Geçerli analytics/üçüncü parti script olursa ana thread yükünü azaltmak için aktiftir.                                                                           |
| Astro image service / Sharp        | Kullanılıyor                   | Yerel ve provider kaynaklı görsellerin optimize edilmesi için built-in Sharp servisi doğrudur.                                                                   |
| Content collections                | Kullanılıyor                   | `src/content.config.ts` ile Türkçe içerik koleksiyonları tanımlıdır.                                                                                             |
| Astro Zod schema import            | Kullanılıyor                   | Astro 6 uyumu için `z` yalnızca `astro/zod` üzerinden alınır; `astro:content` içinden `z` import edilmez.                                                        |
| Middleware ve API routes           | Kullanılıyor                   | Auth, canonical redirect, rate limit ve public API yüzeyi Astro SSR içinde çalışır.                                                                              |
| Astro sessions                     | Adapter tarafından desteklenir | Mevcut auth Redis/JWT modeli korunur; framework session desteği gerektiğinde aynı Node adapter ile kullanılabilir.                                               |
| Astro Actions                      | Şimdilik bekletiliyor          | Mevcut 340+ API endpointi ve auth/rate-limit sözleşmesi var; actions'a geçiş ayrı mimari refactor olmalıdır.                                                     |
| Server islands                     | Şimdilik bekletiliyor          | Kişisel alanlarda yararlı olabilir; mevcut sayfa mimarisini bozmayacak şekilde ayrı UX/performance işi olarak ele alınmalıdır.                                   |
| `@astrojs/sitemap`                 | Kurulmaz / aktif edilmez       | Proje SSR dinamik sitemap route'ları kullanıyor. Resmi sitemap entegrasyonu SSR dinamik route'ları tam üretemediği için özel `src/lib/sitemap.ts` tek kaynaktır. |
| `@astrojs/db`                      | Kurulmaz                       | Projede PostgreSQL 15, mevcut migration sistemi ve `pg` tabanlı veri katmanı var. Astro DB bu mimariyi ikileştirir.                                              |
| `@astrojs/starlight`               | Kurulmaz                       | Dokümantasyon sitesi değil, şehir rehberi ve topluluk platformu.                                                                                                 |
| `@astrojs/markdoc`                 | Kurulmaz                       | MDX resmi entegrasyonu yeterli; ikinci markdown formatı içerik yönetimini böler.                                                                                 |
| Diğer UI framework entegrasyonları | Kurulmaz                       | React kullanılıyor; Vue/Svelte/Solid/Preact/Lit eklemek bundle ve bakım karmaşası üretir.                                                                        |
| Diğer deployment adapter'ları      | Kurulmaz                       | Vercel, Netlify, Cloudflare adapter'ları CWP Node standalone prod hedefiyle uyumlu değildir. Vercel kullanılmayacak.                                             |
| i18n / çoklu dil                   | Yasak                          | Site yalnızca Türkçe olacak; `/tr`, `/en`, hreflang ve dil seçici yok.                                                                                           |

## Kurulum Kuralı

1. Önce Astro core özelliği kullanılacak.
2. Core yetmiyorsa resmi `@astrojs/*` entegrasyonu tercih edilecek.
3. Mevcut kurulu Astro uyumlu paket varsa yeniden yazılmayacak.
4. Yeni paket ancak yukarıdaki matriste `Kullanılıyor` veya açıkça gerekli hale gelen alan için eklenecek.
5. Adapter, sitemap, DB, i18n ve ikinci UI framework kararları bu doküman değiştirilmeden değiştirilmeyecek.
6. Vercel hedefi, Vercel adapter'ı, Vercel analytics endpoint'i veya Vercel deploy dokümanı eklenmeyecek.

## Resmi Astro Referansları - 2026-04-23

- `@astrojs/node`: https://docs.astro.build/en/guides/integrations-guide/node/
- `@astrojs/react`: https://docs.astro.build/en/guides/integrations-guide/react/
- `@astrojs/mdx`: https://docs.astro.build/en/guides/integrations-guide/mdx/
- `@astrojs/partytown`: https://docs.astro.build/en/guides/integrations-guide/partytown/
- Astro görsel optimizasyonu ve Sharp servis modeli: https://docs.astro.build/en/guides/images/
- `@astrojs/sitemap`: https://docs.astro.build/en/guides/integrations-guide/sitemap/

## Sitemap Kararı - Resmi Doküman Notu

`@astrojs/sitemap` resmi ve doğru bir Astro entegrasyonudur; ancak bu projede canonical sitemap üreticisi olarak aktif edilmez.

Gerekçe:

1. Proje `output: "server"` ve `@astrojs/node` standalone SSR ile çalışır.
2. Sitemap içeriği PostgreSQL, curated fallback verileri, görsel girdileri ve runtime Türkçe içerik sözleşmesinden üretilir.
3. Resmi Astro sitemap dokümanı entegrasyonun build sırasında statik üretilen rotalardan sitemap oluşturduğunu ve SSR moddaki dinamik route girdilerini üretemediğini belirtir.
4. Bu nedenle `src/lib/sitemap.ts`, `src/pages/sitemap.xml.ts`, `src/pages/sitemap-index.xml.ts` ve `src/pages/blog/sitemap.xml.ts` bu projenin canonical sitemap yüzeyidir.
5. `scripts/security/sitemap-indexability-contract.ts`, noindex sayfaların statik sitemap listesine geri eklenmesini engeller.
6. Yeni sitemap işi yapılırken önce bu runtime kontratı güncellenir; sırf resmi paket var diye `@astrojs/sitemap` eklenmez.

## Eksik Paket Denetimi - 2026-04-23

Gerekli ve projeye uyumlu Astro tarafı şu anda kurulu veya aktif:

- SSR adapter: `@astrojs/node`
- React islands: `@astrojs/react`
- MDX: `@astrojs/mdx`
- Üçüncü parti script izolasyonu: `@astrojs/partytown`
- RSS/feed: `@astrojs/rss`
- Görsel optimizasyonu: Astro built-in Sharp service + `sharp`
- Tailwind 4 entegrasyonu: `@tailwindcss/vite`
- Type checking: `@astrojs/check`

Bu denetimde yeni zorunlu Astro paketi bulunmadı. Kurulmayan paketler eksik değil, bu projenin SSR/CWP/PostgreSQL mimarisine gereksiz veya çakışmalı olduğu için bilinçli olarak dışarıda bırakıldı.

## Bugünkü Kapanış

- Resmi Astro paketlerinin npm üzerindeki güncel sürümleri doğrulandı.
- `package.json` Astro paket aralıkları mevcut kurulu sürümlerle aynı seviyeye çekildi.
- Astro 6 deprecated `z from astro:content` kullanımı kaldırıldı; content collection şemaları `astro/zod` kullanır.
- `/rss.xml`, resmi `@astrojs/rss` helper'ı ile üretilir; elde yazılmış RSS XML'e geri dönülmez.
- RSS çıktısı `scripts/security/rss-output-contract.ts` ile route çağrısı üzerinden doğrulanır.
- `scripts/security/env-access-contract.ts` ile dinamik `import.meta.env` erişim kalıpları CI bağımsız yerel gate zincirinde engellenir.
- `scripts/security/canonical-origin-contract.ts` ile canonical origin (`https://sanliurfa.com`) ve CORS wildcard yasağı gate zincirinde doğrulanır.
- `scripts/security/turkish-only-contract.ts` ile `hreflang`, `Accept-Language` yönlendirmesi ve `/en`-`/tr` prefix route ihlalleri gate zincirinde engellenir.
- `scripts/security/port-lock-contract.ts` ile 4321 dışında app port drift'i (`1111`, `1112`, `1113`, `3000`, `6000`) gate zincirinde engellenir.
- `scripts/security/image-provider-secret-contract.ts` ile Pexels/Unsplash provider anahtarlarının yalnızca environment üzerinden kullanıldığı ve source/docs içinde hardcoded key kalmadığı gate zincirinde doğrulanır.
- `scripts/security/env-template-contract.ts` ile `.env.example` ve `.env.production.template` içindeki canonical domain, CORS origin, `PORT=4321` ve `REDIS_KEY_PREFIX=sanliurfa:` kilidi gate zincirinde doğrulanır.
- `scripts/security/redis-isolation-contract.ts` ile Redis default DB izolasyonu (`REDIS_DB=15`) ve `sanliurfa:` key prefix kilidi gate zincirinde doğrulanır.
- `scripts/security/astro-types-entrypoint-contract.ts` ile `src/env.d.ts` Astro type entrypoint satırı ve `tsconfig.json` Astro strict extend kilidi gate zincirinde doğrulanır.
- Yeni dev server açılmadı, 4321 dışı port kullanılmadı.
- Proje SSR Node standalone hedefi korunur.
- CWP production hedefinde aktif PM2 dosyası `ecosystem.config.cjs`, aktif port `4321`, canonical deploy dokümanı `docs/ACTIVE_DEPLOYMENT_CWP_4321.md` olarak kilitlendi.
- Tailwind CDN kalıntısı kaldırıldı; React ada bileşenlerinde kritik olmayan hydration kullanımları `client:idle` / `client:visible` olarak sadeleştirildi.
- Tailwind 4'e geçildi; `@tailwindcss/vite` aktif edildi, `@astrojs/tailwind`, `autoprefixer` ve PostCSS Tailwind config'i kaldırıldı.
