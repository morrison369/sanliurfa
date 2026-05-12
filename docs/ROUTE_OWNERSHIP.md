# Route Ownership

Bu dosya kritik public yüzeylerde kanonik rota kararını ve alias politikasını tanımlar.

## Kanonik Public Rotalar

- `/` landing
- `/mekanlar` public place listing
- `/isletme` business-facing listing/detail surface
- `/isletme-kayit` place/business submission surface
- `/mekan-ekle` member place contribution alias only if routed to canonical submission flow
- `/etkinlikler` public event listing
- `/etkinlik-ekle` member event submission alias only if routed to canonical event submission flow
- `/topluluk` local social surface
- `/eslesme` swipe/match surface
- `/mesajlar` member messaging surface
- `/isletme/panel` business management surface
- `/isletme/analytics` business analytics surface
- `/isletme/pazarlama` business marketing surface
- `/kullanici/*` user-facing public/profile surface
- `/blog/*` editorial surface
- `/admin/*` admin surface

## Geçiş Dönemi Aliasları

Şu dizinler repoda bulunabilir ama kanonik yüzey sayılmaz:

- `/places/*`
- `/vendor/*`
- `/kullanıcı/*`
- `/places/*`

Bu yüzeyler:

- legacy alias
- geçici uyumluluk katmanı
- README veya yeni dokümanlarda birincil rota gibi sunulmayacak alanlar

## Sahiplik

- `/`: frontend, landing UX, content integration
- `/mekanlar`: public listing template owner
- `/isletme`: business conversion + detail template owner
- `/isletme-kayit`: place/business submission owner
- `/etkinlikler`: event discovery owner
- `/etkinlik-ekle`: event submission owner when present
- `/topluluk`: social feed/follow/member discovery owner
- `/eslesme`: swipe/match owner
- `/mesajlar`: messaging owner
- `/isletme/panel`: business management owner
- `/isletme/analytics`: business analytics owner
- `/isletme/pazarlama`: business marketing owner
- `/kullanici/*`: profile and member-facing surface owner
- `/blog/*`: editorial template + SEO owner
- `/admin/*`: admin workflow + DB-first management owner

## Kabul Kriteri

- template standardına uyum
- SEO helper kullanımına uyum
- mobil ve PWA görünürlüğü
- görsel intent doğruluğu
- DB-first içerik alanlarında hardcoded kritik copy bırakmama

## Release Kuralı

- sahibi tanımlı olmayan kritik rota blocker kabul edilir
- legacy alias üstünde yeni özellik başlatılmaz
- yeni public feature önce kanonik rota ailesine eklenir
