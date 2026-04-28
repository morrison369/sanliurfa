# Proje Backlog (P1/P2/P3) - 2026-04-19

Bu backlog, "önerilerin hepsini yap" talebi doğrultusunda operasyonel olarak uygulanmış ve kalan işleri önceliklendirilmiş halde listeler.

## P1 (Hemen / Release Bloklayıcı)

1. Güvenlik fallback temizliği
- `JWT_SECRET` ve webhook secret için insecure default fallback'ler kaldırıldı.
- Gate eklendi: `npm run security:defaults:gate`

2. Süreç ve port disiplini
- İzole runtime + zorunlu cleanup akışı aktif.
- Ana komut: `npm run gate:agency`

3. SEO/GEO yüzey zorunluluğu
- `llms.txt`, `sitemap`, `robots` gate ile zorunlu.
- Komut: `npm run seo:geo:gate`

4. Sosyal core gate
- Health + sosyal temel akış smoke zorunlu.
- Komutlar:
  - `npm run social:core:gate`
  - `npm run social:core:gate:strict` (place submit de bloklayıcı)

5. Görsel slug standardı
- Manifestte slug dışı dosya adı gate ile engelleniyor.
- Komut: `npm run images:slug:gate`

## P2 (Yakın Dönem / Operasyon Verimliliği)

1. Nightly core otomasyonu
- Ulaşım/hava/sosyal-retention/SLA/freshness tek işte.
- Komut: `npm run jobs:nightly:core`

2. Ajans toplu operasyon
- Gate + nightly + quick recommendation tek akış.
- Komut: `npm run ops:agency:all`

3. Place lifecycle standardı
- Lifecycle modeli `verified/featured/archived` adımlarını destekleyecek şekilde genişletildi.
- Dosya: `src/lib/place/lifecycle.ts`

## P3 (İyileştirme / Teknik Borç)

1. `type-check` hint borcunun azaltılması
- Şu an derleme geçiyor, ancak hint yoğunluğu yüksek.

2. `Place Submit` strict ortam uyumu
- Bazı ortamlarda `apply=500`, `submit=403` görülebiliyor.
- Strict mod prod-ready hale getirilip default strict yapılmalı.

3. Secret manager geçişi
- Prod için env dosyası yerine secret manager (CWP secret storage + rotation policy) tamamlanmalı.

## Çalıştırma Sırası (Önerilen)

```bash
npm run gate:agency
npm run jobs:nightly:core
npm run social:core:gate:strict
```
