# Public Discovery ve GEO Kilidi - 2026-04-23

Bu not, `sanliurfa.com` public keşif yüzeyinin tekrar dağılmaması için eklendi.

## Kilit Kurallar

1. Site yalnızca Türkçe yayın yapar; `tr-TR` hedeflenir.
2. Kanonik domain `https://sanliurfa.com` olur; `Şanlıurfa.com` domain olarak kullanılmaz.
3. Odak anahtar kelime `Şanlıurfa` olarak korunur.
4. Public alıntı kaynakları `llms.txt`, `ai.txt`, `humans.txt`, `robots.txt`, `sitemap-index.xml`, `sitemap.xml`, `blog/sitemap.xml` ve `rss.xml` dosyalarıdır.
5. Admin, API, profil, mesaj, ayar, abonelik, sosyal panel ve kullanıcıya özel alanlar public citation kaynağı değildir.
6. Sahte sosyal medya hesabı veya doğrulanmamış dış platform iddiası eklenmez.
7. Yeni public sayfa eklendiğinde sitemap, robots politikası ve `llms.txt` kapsamı birlikte kontrol edilir.
8. Discovery path ve robots crawler kuralları için kod tarafındaki tek kaynak `src/lib/public-discovery.ts` dosyasıdır.

## Bu Batch'te Yapılanlar

1. Layout head içine `llms.txt`, `ai.txt` ve `humans.txt` keşif linkleri eklendi.
2. Statik `public/robots.txt`, dinamik `src/pages/robots.txt.ts` politikasıyla hizalandı.
3. Robots çıktısına ana sitemap, blog sitemap ve AI discovery dosyaları açıkça eklendi.
4. `public/ai.txt` kısa AI keşif ve alıntı rehberi olarak eklendi.
5. `public/humans.txt` site kimliği, Türkçe dil politikası ve public kaynak özeti olarak eklendi.
6. Sitemap index girdilerine `lastmod` eklendi.
7. `oneriler`, `liderlik-tablosu` ve `fiyatlandirma` public sayfaları ana sitemap statik sayfa listesine eklendi.

## Runtime Kontrat Güncellemesi

1. `ai.txt`, `humans.txt`, `llms.txt`, sitemap, robots ve RSS path'leri middleware public allow-list içinde `PUBLIC_DISCOVERY_PATHS` üzerinden yönetilir.
2. Dinamik `robots.txt` route'u ve legacy SEO helper robots çıktısı aynı `buildRobotsTxt()` fonksiyonunu kullanır.
3. Statik `public/robots.txt` yalnızca fallback dosyasıdır; değişiklikler önce `src/lib/public-discovery.ts` içine işlenir.
4. `npm run security:public-readiness`, `scripts/security/public-discovery-contract.ts` ile discovery path'lerini ve robots fallback drift'ini kontrol eder.

## Doğrulama Beklentisi

Her değişiklikten sonra en az şu kontroller çalıştırılır:

```bash
npm run typecheck:mem
npm run build
npm run security:scan-secrets
npm audit --json
git diff --check
```

Dev server yalnızca görsel/manual smoke gerekiyorsa açılır ve sabit port `4321` kullanılır.
