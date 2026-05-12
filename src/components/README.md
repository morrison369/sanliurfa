# Components Guide

Bu klasör yaşayan ürün bileşenlerini içerir. Eski örnek odaklı İngilizce katalog artık kanonik
referans değildir.

## Ana Bileşen Aileleri

- `home/` landing page yüzeyi
- `map/` harita ve Leaflet entegrasyonu
- `places/` mekan detay, yorum, görsel ve aksiyon yüzeyi
- `admin/` yönetim paneli bileşenleri
- `vendor/` işletme paneli bileşenleri
- `ui/` temel paylaşılan yüzeyler

## Çalışma Modeli

- Astro sayfa iskeleti + gerektiğinde React island
- yönetilebilir içerikte DB-first yaklaşım
- yalnızca Türkçe ürün yüzeyi
- mevcut tasarım dilini koruma; tekil demo component üretmeme

## Kullanım Önceliği

Bir sayfayı anlamak için sırayla:

1. ilgili `src/pages/*` dosyasını oku
2. kullanılan layout'u incele
3. ardından bu klasördeki bağlı component ağacına bak

Sayfa gerçeği, bu README'den daha önemlidir.

## Kritik Yüzeyler

- `home/*` landing kalitesi ve ürün ilk izlenimi için kritik
- `admin/*` DB-first yönetim ve release readiness için kritik
- `map/*` CSP, Leaflet ve şehir keşif akışı için kritik
- `places/*` yorum, puan, foto ve CTA akışları için kritik

## Kural

- route veya ürün davranışı bu dosyada tanımlanmaz
- route sahipliği için `docs/ROUTE_OWNERSHIP.md` kullanılır
- yeni büyük component ailesi eklenirse bu rehber bir paragrafla güncellenir
