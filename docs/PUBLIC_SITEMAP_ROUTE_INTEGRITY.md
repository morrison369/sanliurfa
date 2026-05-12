# Public Sitemap Route Integrity

Sitemap sadece kanonik, doğrudan 2xx dönen public URL'leri yayınlamalıdır. Redirect eden legacy URL'ler, auth-only yüzeyler, dil prefix'leri ve yanlış origin release hattında blocker kabul edilir.

## Kural

- Sitemap URL origin'i `SITE_URL`/kanonik domain ile aynı olmalıdır. Lokal gate sitemap'i lokal sunucudan okur ama URL origin'inin `https://sanliurfa.com` kalmasını bekler.
- `/en` veya `/tr` dil prefix'i kullanılmaz; site sadece Türkçedir.
- Prod gate final URL'yi sıkı kontrol eder; sitemap'teki URL redirect sonrası farklı path'e düşerse release durur.
- `/kategori/:slug` legacy yüzeyi sitemap'e eklenmez; kategori kanoniği `/mekanlar/:slug` olur.
- Statik `/isletme/:slug` kayıtları sadece gerçek işletme sayfası 2xx dönüyorsa sitemap'te kalır.

## Komutlar

```bash
npm run sitemap:routes:local
npm run sitemap:routes:prod
```

`npm run release:public` içinde local sitemap gate ve prod sitemap gate çalışır. Local gate ilk 200 URL ile hızlı regresyon yakalar; prod gate canlı sitemap'in tamamını kontrol eder.

## İlgili Dosyalar

- `src/pages/sitemap.xml.ts`
- `scripts/ci/sitemap-route-integrity-gate.mjs`
- `scripts/ci/release-public-gate.mjs`
