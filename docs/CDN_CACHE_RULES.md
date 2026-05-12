# Cloudflare Cache Rules — Şanlıurfa.com

Bu dosya Cloudflare CDN katmanında uygulanması önerilen cache kurallarını belgeler. Site `https://sanliurfa.com` Cloudflare arkasında çalışıyor (response header: `Server: cloudflare`).

## Hızlı Özet

| Path | Cache Level | Edge TTL | Browser TTL |
|------|-------------|----------|-------------|
| `/_astro/*.js`, `/_astro/*.css` (hash'li build asset'ler) | **Cache Everything** | 1 yıl | 1 yıl |
| `/_astro/*.svg`, `/_astro/*.webp`, `/_astro/*.avif`, `/_astro/*.jpg`, `/_astro/*.png` | **Cache Everything** | 1 yıl | 1 yıl |
| `/uploads/photos/**` (kullanıcı yüklemeleri) | **Cache Everything** | 30 gün | 30 gün |
| `/images/**` (statik proje görselleri) | **Cache Everything** | 30 gün | 30 gün |
| `/favicon.ico`, `/favicon.svg`, `/manifest.json` | **Cache Everything** | 7 gün | 7 gün |
| `/sitemap.xml`, `/robots.txt`, `/llms.txt` | **Standard** | 1 saat | 5 dakika |
| `/api/health` | **Bypass cache** | – | – |
| `/api/**` (diğer API endpoint'leri) | **Bypass cache** | – | – |
| `/admin/**`, `/profil/**`, `/ayarlar/**` | **Bypass cache** | – | – |
| Diğer HTML rotaları (`/`, `/mekanlar`, `/blog/...`) | **Standard** | 5 dakika | 0 (origin'in `Cache-Control`) |

## Önemli Notlar

### Cookie Bypass

Cloudflare default olarak `Cookie` veya `Set-Cookie` header'ı görürse cache **etmez**. Şanlıurfa.com auth-token cookie kullanır — bu yüzden cookieli istekler edge'de cache **edilmez** (doğru davranış, user-spesifik HTML).

**Sonuç**: Anonim ziyaretçi cache'i hit, login user her zaman origin'e gider.

### `Cache-Control` Origin Davranışı

Astro SSR `output: 'server'` modunda:
- HTML sayfaları → origin no-cache (varsayılan)
- `/api/*` → middleware'de `Cache-Control: no-store, no-cache, must-revalidate` set ediliyor
- `/_astro/**` static asset'ler → Astro build hash'li → immutable

Cloudflare Page Rules'da bu davranışı override edebilir veya origin'in dediğini bırakabilirsiniz. Edge TTL ayarlamak için **Page Rule TTL** > origin Cache-Control.

### Purge Strategy

Cache purge gereken durumlar:
1. **Build deploy sonrası**: `/_astro/*` zaten hash'li olduğundan eski hash'ler cache'te kalsa bile sorun olmaz. Yeni HTML yeni asset hash'lerini referans eder.
2. **`/uploads/photos/**` üzerinde dosya silme/güncelleme**: yöneticisi paneli aksiyondan sonra ilgili URL'i purge edebilir (Cloudflare API ile entegrasyon opsiyonel).
3. **`/sitemap.xml`, `/llms.txt`**: yeni içerik ekleme sonrası purge edilebilir; 1 saatlik TTL zaten görece kısa.

## Tavsiye Edilen Page Rules (Cloudflare Dashboard → Rules → Page Rules)

Cloudflare Free plan: 3 page rule limiti. Bu yüzden en yüksek-etki 3 rule:

```
1. URL: sanliurfa.com/_astro/*
   Setting: Cache Level → Cache Everything
   Setting: Edge Cache TTL → 1 year
   Setting: Browser Cache TTL → 1 year

2. URL: sanliurfa.com/uploads/photos/*
   Setting: Cache Level → Cache Everything
   Setting: Edge Cache TTL → 1 month
   Setting: Browser Cache TTL → 1 month

3. URL: sanliurfa.com/api/*
   Setting: Cache Level → Bypass
   Setting: Disable Performance
```

## Daha İyi Alternatif: Cache Rules (Free Plan'da da var)

Cloudflare 2024+ "Cache Rules" feature (Rules → Cache Rules) — 10 rule limit Free plan'da:

```
Rule 1: Astro assets — Hashed immutable
  Match: (http.request.uri.path matches "^/_astro/.*\.(js|css|svg|webp|avif|jpg|jpeg|png)$")
  Cache: Yes
  Edge TTL: 1 year
  Browser TTL: 1 year

Rule 2: User uploads
  Match: (http.request.uri.path matches "^/uploads/photos/.*")
  Cache: Yes
  Edge TTL: 30 days

Rule 3: API bypass
  Match: (http.request.uri.path matches "^/api/.*")
  Cache: Bypass

Rule 4: Admin/profile bypass
  Match: (http.request.uri.path matches "^(/admin|/profil|/ayarlar)(/.*)?$")
  Cache: Bypass
```

## Doğrulama

Browser DevTools → Network sekmesi → response header'ları:
- `cf-cache-status: HIT` → edge'den serve edildi ✓
- `cf-cache-status: MISS` → origin hit + edge'e yazıldı
- `cf-cache-status: BYPASS` → cookie veya rule bypass
- `cf-cache-status: DYNAMIC` → cacheable değil (default HTML)

Komut satırı doğrulama:
```bash
curl -sI "https://sanliurfa.com/_astro/Layout.Dm3-mkf6.css" | grep -iE "cf-cache-status|cache-control"
curl -sI "https://sanliurfa.com/" | grep -iE "cf-cache-status|cache-control"
```

## Origin Cache Stratejisi (`Cache-Control` header)

Mevcut Astro middleware (`src/middleware.ts`):

- **API endpoint'leri** (`/api/*`): `Cache-Control: no-store, no-cache, must-revalidate` — Cloudflare bypass'e ek defense-in-depth
- **HTML rotaları**: default Astro davranışı (Cache-Control set edilmez → Cloudflare standart cache 5dk)
- **Static assets** (`/_astro/**`, `/uploads/**`, `/images/**`): Astro/Node serve eder, varsayılan `Cache-Control: public, max-age=...` — Astro 6 sharp ile optimize edilmiş resimler için 1 yıl set eder

## Genişletilmiş Performans İpuçları

1. **Brotli compression**: Cloudflare otomatik açar (Free plan'da bile). Astro `astro-compress` paketi build-time gzip yapıyor — Cloudflare bunu Brotli'ye dönüştürür edge'de.
2. **HTTP/3**: Cloudflare Free plan otomatik açık.
3. **Image optimization**: Astro `<Image>` zaten AVIF/WebP üretiyor build-time. Cloudflare Polish (paid feature) ekstra avantaj sağlamaz.
4. **Argo Smart Routing** (paid): origin → user latency düşürür. CWP shared hosting + cloudflare standart routing zaten iyi.

## Olmayan Şeyler (Bilinçli Tercih)

- **Always Online**: cache'den eski sayfa serve edebilir, içerik tutarsızlığı riski → kapalı bırak
- **HTML Minification (Cloudflare)**: Astro `astro-compress` zaten yapıyor, çift minify gereksiz
- **Rocket Loader**: Astro asenkron yükleme zaten doğru, JavaScript engine müdahalesi risk taşır
- **APO (Automatic Platform Optimization for WordPress)**: WP değil, kapalı

## Mevcut Production Durumu (2026-05)

Production'da bilinen cache durumu — `curl` ile teyit:
- `/_astro/*` → tipik `cf-cache-status: HIT` (Cloudflare default static heuristic)
- `/api/health` → `cf-cache-status: DYNAMIC` (cacheable değil — doğru)
- `/` ana sayfa → `cf-cache-status: DYNAMIC` (cookie varsa user-specific)

Cloudflare panel'inde page/cache rule eklenmemişse default davranış zaten makul performans veriyor; bu doküman tuning fırsatlarını listeler.
