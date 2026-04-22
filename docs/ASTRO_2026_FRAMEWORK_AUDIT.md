# Astro 2026 Framework Denetimi

Tarih: 2026-04-23

Bu dosya sanliurfa.com için Astro framework kararlarını kilitler. Yeni paket eklemeden önce bu matris kontrol edilir.

## Mevcut Astro Durumu

- Astro: `6.1.9`
- Vite: `7.3.2`
- Node: `22.22.0`
- Output: `server`
- Adapter: `@astrojs/node@10.0.6`
- Aktif entegrasyonlar: `@astrojs/mdx`, `@astrojs/tailwind`, `@astrojs/react`, `@astrojs/partytown`, `astro-compress`
- Resmi feed paketi: `@astrojs/rss`
- Görsel servisi: Astro built-in Sharp image service (`astro/assets/services/sharp`)

## Resmi Astro Özellikleri ve Proje Kararı

| Astro alanı | Proje kararı | Gerekçe |
| --- | --- | --- |
| SSR / on-demand rendering | Kullanılıyor | Admin, API, auth, DB ve dinamik şehir içerikleri için `output: "server"` doğru modeldir. |
| `@astrojs/node` | Kullanılıyor | CentOS Web Panel / Node standalone runtime için doğru resmi adapter budur. |
| `@astrojs/react` | Kullanılıyor | Mevcut interaktif paneller ve sosyal bileşenler React 19 ile çalışır. |
| `@astrojs/tailwind` | Kullanılıyor | Mevcut tasarım sistemi Tailwind 3.4 üzerinde; Tailwind 4 majör geçişi ayrı iş olmalıdır. |
| `@astrojs/mdx` | Kullanılıyor | Blog, rehber ve doküman içerikleri ileride MDX gerektirirse framework tarafı hazırdır. |
| `@astrojs/rss` | Kullanılıyor | Public Türkçe feed üretimi için resmi paket kullanılır. |
| `@astrojs/partytown` | Kullanılıyor | Geçerli analytics/üçüncü parti script olursa ana thread yükünü azaltmak için aktiftir. |
| Astro image service / Sharp | Kullanılıyor | Yerel ve provider kaynaklı görsellerin optimize edilmesi için built-in Sharp servisi doğrudur. |
| Content collections | Kullanılıyor | `src/content.config.ts` ile Türkçe içerik koleksiyonları tanımlıdır. |
| Astro Zod schema import | Kullanılıyor | Astro 6 uyumu için `z` yalnızca `astro/zod` üzerinden alınır; `astro:content` içinden `z` import edilmez. |
| Middleware ve API routes | Kullanılıyor | Auth, canonical redirect, rate limit ve public API yüzeyi Astro SSR içinde çalışır. |
| Astro sessions | Adapter tarafından desteklenir | Mevcut auth Redis/JWT modeli korunur; framework session desteği gerektiğinde aynı Node adapter ile kullanılabilir. |
| Astro Actions | Şimdilik bekletiliyor | Mevcut 340+ API endpointi ve auth/rate-limit sözleşmesi var; actions'a geçiş ayrı mimari refactor olmalıdır. |
| Server islands | Şimdilik bekletiliyor | Kişisel alanlarda yararlı olabilir; mevcut sayfa mimarisini bozmayacak şekilde ayrı UX/performance işi olarak ele alınmalıdır. |
| `@astrojs/sitemap` | Kurulmaz / aktif edilmez | Proje SSR dinamik sitemap route'ları kullanıyor. Resmi sitemap entegrasyonu SSR dinamik route'ları tam üretemediği için özel `src/lib/sitemap.ts` tek kaynaktır. |
| `@astrojs/db` | Kurulmaz | Projede PostgreSQL 15, mevcut migration sistemi ve `pg` tabanlı veri katmanı var. Astro DB bu mimariyi ikileştirir. |
| `@astrojs/starlight` | Kurulmaz | Dokümantasyon sitesi değil, şehir rehberi ve topluluk platformu. |
| `@astrojs/markdoc` | Kurulmaz | MDX resmi entegrasyonu yeterli; ikinci markdown formatı içerik yönetimini böler. |
| Diğer UI framework entegrasyonları | Kurulmaz | React kullanılıyor; Vue/Svelte/Solid/Preact/Lit eklemek bundle ve bakım karmaşası üretir. |
| Diğer deployment adapter'ları | Kurulmaz | Vercel, Netlify, Cloudflare adapter'ları CWP Node standalone prod hedefiyle uyumlu değildir. Vercel kullanılmayacak. |
| i18n / çoklu dil | Yasak | Site yalnızca Türkçe olacak; `/tr`, `/en`, hreflang ve dil seçici yok. |

## Kurulum Kuralı

1. Önce Astro core özelliği kullanılacak.
2. Core yetmiyorsa resmi `@astrojs/*` entegrasyonu tercih edilecek.
3. Mevcut kurulu Astro uyumlu paket varsa yeniden yazılmayacak.
4. Yeni paket ancak yukarıdaki matriste `Kullanılıyor` veya açıkça gerekli hale gelen alan için eklenecek.
5. Adapter, sitemap, DB, i18n ve ikinci UI framework kararları bu doküman değiştirilmeden değiştirilmeyecek.
6. Vercel hedefi, Vercel adapter'ı, Vercel analytics endpoint'i veya Vercel deploy dokümanı eklenmeyecek.

## Bugünkü Kapanış

- Resmi Astro paketlerinin npm üzerindeki güncel sürümleri doğrulandı.
- `package.json` Astro paket aralıkları mevcut kurulu sürümlerle aynı seviyeye çekildi.
- Astro 6 deprecated `z from astro:content` kullanımı kaldırıldı; content collection şemaları `astro/zod` kullanır.
- Yeni dev server açılmadı, 4321 dışı port kullanılmadı.
- Proje SSR Node standalone hedefi korunur.
- CWP production hedefinde aktif PM2 dosyası `ecosystem.config.cjs`, aktif port `4321`, canonical deploy dokümanı `docs/ACTIVE_DEPLOYMENT_CWP_4321.md` olarak kilitlendi.
