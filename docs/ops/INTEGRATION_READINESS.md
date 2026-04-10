# Integration Readiness Checklist

Bu dokuman, kod tarafinda otomatiklestirilemeyen ama release kalitesini dogrudan etkileyen entegrasyon adimlarini tek yerde toplar.

## 1) Zorunlu Uretim Degerleri

- `PUBLIC_SITE_URL=https://sanliurfa.com`
- `RESEND_API_KEY=re_...`
- Analytics kimligi (en az biri):
  - `PUBLIC_GOOGLE_ANALYTICS_ID=G-...`
  - `GOOGLE_ANALYTICS_ID=G-...`
  - `GA_TRACKING_ID=G-...`

Notlar:
- Placeholder degerler (`re_xxx`, `G-XXXXXXXXXX`, `YOUR_*`) readiness sayilmaz.
- `GET /api/health` endpoint'i bu alanlari `checks.integrations` altinda gorunur kilacak sekilde guncellenmistir.
- Env'de bu alanlar bos olsa bile admin panelden girilen global degerler runtime'da otomatik kullanilir.

## 1.1) Admin Panelden Giris (Runtime Fallback)

- Panel: `/admin/integrations`
- API: `GET/PUT /api/admin/system/integration-settings`
- Kaynak onceligi:
  1. Env (`RESEND_API_KEY`, `PUBLIC_GOOGLE_ANALYTICS_ID`, `GOOGLE_ANALYTICS_ID`, `GA_TRACKING_ID`)
  2. Admin panelde kayitli global ayar
- Panelden kaydedilen/silinen degerler icin runtime cache otomatik temizlenir.
- Admin degisiklikleri `user_audit_log` uzerinden kayda alinacak sekilde guncellenmistir.

## 2) Release Oncesi Kontrol

Asagidaki komut release oncesi yerel kontrat/gate kontrolu icin kullanilir:

```bash
npm run release:gate:local
```

Beklenen:
- `env-contract-check` ciktisinda analytics/resend icin placeholder veya empty uyarisi olmamasi.
- `release-gate` sonu `OK`.

## 3) Cloudflare Manuel Ayarlar (Panel)

Bu adimlar kod deposundan otomatik uygulanamaz, panelde elle etkinlestirilir:

- Speed > Optimization:
  - Auto Minify (HTML/CSS/JS): ON
  - Brotli: ON
  - Early Hints: ON
- Caching > Configuration:
  - Browser Cache TTL: 1 month
  - Always Online: ON
- Network:
  - HTTP/3: ON
  - 0-RTT: ON
  - IPv6: ON

## 4) Search Console ve Sitemap

- Google Search Console'a alan adi dogrulamasi yap.
- `https://sanliurfa.com/sitemap-index.xml` URL'ini submit et.
- Build cikisi icinde sitemap artefact check zaten release gate'e dahildir.
