# Local Static Cache Rules — Şanlıurfa.com

Bu proje CDN kullanmaz. Statik dosyalar ve upload medya aynı sunucudaki local filesystem
üzerinden servis edilir:

- build asset'leri: `dist/client/_astro`
- proje görselleri: `public/images`
- kullanıcı ve içerik upload'ları: `public/uploads`

## Kanonik Cache Politikası

| Path | Kaynak | Header |
|---|---|---|
| `/_astro/**` | build çıktısı | `public, max-age=31536000, immutable` |
| `/images/**` | `public/images` | `public, max-age=2592000, immutable` |
| `/uploads/**` | `public/uploads` | `public, max-age=86400, stale-while-revalidate=604800` |
| `/api/**` | SSR/API | `no-store, no-cache, must-revalidate` |
| HTML sayfaları | SSR | `no-cache, must-revalidate, max-age=0` |

## Operasyon Notları

- `/uploads/**` artık `dist/client` içine kopyalanmaz; SSR runtime doğrudan `public/uploads`
  altından okur.
- Dosya güncelleme veya silme sonrası purge yapılacak bir edge katmanı yoktur.
- Upload medyası mutable kabul edilir; cache invalidation mekanizması origin revalidation ve gerekirse
  dosya adı değişimiyle yönetilir.
- Static vendor asset'leri (`/vendor/**`) self-hosted'dir; üçüncü parti CDN kullanılmaz.

## Doğrulama

```bash
curl -I http://127.0.0.1:4321/uploads/recipes/kaburga-dolmasi.jpg
curl -I http://127.0.0.1:4321/images/hero/sanliurfa-landing.webp
curl -I http://127.0.0.1:4321/_astro/
```

Beklenen sonuç:

- `/images/**` için `Cache-Control: public, max-age=2592000, immutable`
- `/uploads/**` için `Cache-Control: public, max-age=86400, stale-while-revalidate=604800`
- `/_astro/**` için uzun ömürlü immutable header
- Harici edge/CDN header beklentisi yok
