# City Taxonomy and Social Surface

Son guncelleme: 2026-05-07

Bu proje `kategoriler.txt` dosyasindaki sehir rehberi omurgasini kod tarafinda `src/data/city-taxonomy.ts` ile kilitler.

## Kategori Omurgasi

- Ana kategori registry: `src/data/city-taxonomy.ts`
- Ortak kategori landing bileseni: `src/components/public/CategoryHub.astro`
- Eksik tek segment kategori hub sayfalari: `/otomotiv`, `/acil-durum`, `/hukuk-ve-finans`, `/ev-ve-yasam`, `/spor-ve-fitness`, `/aile-ve-cocuk`, `/tarim-ve-hayvancilik`, `/medya-ve-iletisim`, `/dini-ve-kulturel-yerler`, `/is-dunyasi-ve-sanayi`
- Ilce registry: 13 Sanliurfa ilcesi `CITY_DISTRICTS`
- Ilce alt servis registry: mekanlar, hastaneler, eczaneler, okullar, noterler, kafeler, firinlar, pastaneler, oteller, emlak, etkinlikler

## Ana Sayfa Baglantisi

Ana sayfa `src/components/home/CityGuideLanding.astro` icinde:

- `getPrimaryCityTaxonomyCategories()` ile merkezi kategori registry kullanir.
- `homepage.heroQuickLinks` ayarini admin/site-content fallback olarak okur.
- `homepage.communityPanel` ayarini admin/site-content fallback olarak okur.
- Balikligol, Gobeklitepe ve Harran kartlarinda gercek lokasyon gorselleri kullanir.

## Sosyal ve Katkı Katmanı

Sosyal ve katkı katmanı public yuzeyden koparilamaz:

- `/topluluk`: takip, mesajlasma, mekan katkisi ve eslesme girisi.
- `/eslesme`: 4 fotograflı profil, swipe, karsilikli eslesme ve mesajlasma girisi.
- `/mesajlar`: auth kullanici mesaj kutusu.
- Mekan ekleme: uye ve isletme basvuru akisi public CTA ile gorunur kalir.
- Mekan yorum/puan: mekan detay akisi yorum ve puan vermeyi destekler.
- Etkinlik ekleme: uye etkinlik onerisi veya basvuru akisi public yuzeyde gorunur kalir.

Header, footer ve ana sayfa bu yuzeylere gorunur baglanti vermek zorundadir.

## Gate

Yapiyi koruyan komut:

```bash
npm run public:city:structure:gate
```

Astro release gate bu kontrolu de calistirir:

```bash
npm run release:astro:gate
```
