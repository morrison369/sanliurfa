# Legacy Route Usage Report

- Oluşturulma: `2026-05-06T16:01:07.283Z`
- Remote log örneklemi: son `25000` satır
- Remote log tipi: `application`
- Taranan log dosyaları: `combined.log`, `out.log`, `err.log`
- Bloker: Prod shell tarafinda okunabilir access log bulunamadi; remote sinyal application log fallback ile sinirli.

## Blokerler

- Prod shell tarafinda okunabilir access log bulunamadi; remote sinyal application log fallback ile sinirli.

| Legacy | Canonical | Runtime | Docs | Remote | Durum |
|---|---|---:|---:|---:|---|
| `/places` | `/mekanlar` | 0 | 11 | 0 | access log teyidi bekleniyor |
| `/places/*` | `/isletme/*` | 0 | 7 | 0 | access log teyidi bekleniyor |
| `/vendor/dashboard` | `/isletme/panel` | 0 | 4 | 0 | uyumluluk katmanı korunmalı |
| `/vendor/analytics` | `/isletme/analytics` | 0 | 4 | 0 | uyumluluk katmanı korunmalı |
| `/messages` | `/mesajlar` | 0 | 2 | 0 | access log teyidi bekleniyor |
| `/notifications` | `/bildirimler` | 0 | 4 | 0 | access log teyidi bekleniyor |
| `/profile` | `/profil` | 0 | 3 | 0 | access log teyidi bekleniyor |
| `/işletme/*` | `/isletme/*` | 0 | 3 | 0 | access log teyidi bekleniyor |
| `/kullanıcı/*` | `/kullanici/*` | 0 | 3 | 0 | access log teyidi bekleniyor |

## /places

- Canonical: `/mekanlar`
- Durum: access log teyidi bekleniyor
- Sunset sınıfı: remove-when-zero
- Runtime hit: 0
- Docs hit: 11
- Remote hit: 0
- Sunset kuralı: 3 ardışık monthly raporda sıfır hit ve access log teyidi
- Docs örnek dosyalar:
  - `docs/openapi-coverage-plan.md` (4)
  - `docs/LEGACY_ROUTE_INVENTORY.md` (3)
  - `docs/ROUTE_LEGACY_POLICY.md` (2)
  - `docs/API_GUIDE.md` (1)
  - `docs/ROUTE_OWNERSHIP.md` (1)

## /places/*

- Canonical: `/isletme/*`
- Durum: access log teyidi bekleniyor
- Sunset sınıfı: remove-when-zero
- Runtime hit: 0
- Docs hit: 7
- Remote hit: 0
- Sunset kuralı: 3 ardışık monthly raporda sıfır hit ve access log teyidi
- Docs örnek dosyalar:
  - `docs/openapi-coverage-plan.md` (3)
  - `docs/LEGACY_ROUTE_INVENTORY.md` (2)
  - `docs/ROUTE_LEGACY_POLICY.md` (1)
  - `docs/ROUTE_OWNERSHIP.md` (1)

## /vendor/dashboard

- Canonical: `/isletme/panel`
- Durum: uyumluluk katmanı korunmalı
- Sunset sınıfı: compatibility-registry
- Runtime hit: 0
- Docs hit: 4
- Remote hit: 0
- Sunset kuralı: 3 ardışık monthly raporda sıfır hit ve access log teyidi
- Docs örnek dosyalar:
  - `docs/LEGACY_ROUTE_INVENTORY.md` (2)
  - `docs/ROUTE_LEGACY_POLICY.md` (2)

## /vendor/analytics

- Canonical: `/isletme/analytics`
- Durum: uyumluluk katmanı korunmalı
- Sunset sınıfı: compatibility-registry
- Runtime hit: 0
- Docs hit: 4
- Remote hit: 0
- Sunset kuralı: 3 ardışık monthly raporda sıfır hit ve access log teyidi
- Docs örnek dosyalar:
  - `docs/LEGACY_ROUTE_INVENTORY.md` (2)
  - `docs/ROUTE_LEGACY_POLICY.md` (2)

## /messages

- Canonical: `/mesajlar`
- Durum: access log teyidi bekleniyor
- Sunset sınıfı: remove-when-zero
- Runtime hit: 0
- Docs hit: 2
- Remote hit: 0
- Sunset kuralı: 3 ardışık monthly raporda sıfır hit ve access log teyidi
- Docs örnek dosyalar:
  - `docs/LEGACY_ROUTE_INVENTORY.md` (1)
  - `docs/ROUTE_LEGACY_POLICY.md` (1)

## /notifications

- Canonical: `/bildirimler`
- Durum: access log teyidi bekleniyor
- Sunset sınıfı: remove-when-zero
- Runtime hit: 0
- Docs hit: 4
- Remote hit: 0
- Sunset kuralı: 3 ardışık monthly raporda sıfır hit ve access log teyidi
- Docs örnek dosyalar:
  - `docs/openapi-coverage-plan.md` (2)
  - `docs/LEGACY_ROUTE_INVENTORY.md` (1)
  - `docs/ROUTE_LEGACY_POLICY.md` (1)

## /profile

- Canonical: `/profil`
- Durum: access log teyidi bekleniyor
- Sunset sınıfı: remove-when-zero
- Runtime hit: 0
- Docs hit: 3
- Remote hit: 0
- Sunset kuralı: 3 ardışık monthly raporda sıfır hit ve access log teyidi
- Docs örnek dosyalar:
  - `docs/LEGACY_ROUTE_INVENTORY.md` (1)
  - `docs/openapi-coverage-plan.md` (1)
  - `docs/ROUTE_LEGACY_POLICY.md` (1)

## /işletme/*

- Canonical: `/isletme/*`
- Durum: access log teyidi bekleniyor
- Sunset sınıfı: remove-when-zero
- Runtime hit: 0
- Docs hit: 3
- Remote hit: 0
- Sunset kuralı: 3 ardışık monthly raporda sıfır hit ve access log teyidi
- Docs örnek dosyalar:
  - `docs/LEGACY_ROUTE_INVENTORY.md` (2)
  - `docs/ROUTE_LEGACY_POLICY.md` (1)

## /kullanıcı/*

- Canonical: `/kullanici/*`
- Durum: access log teyidi bekleniyor
- Sunset sınıfı: remove-when-zero
- Runtime hit: 0
- Docs hit: 3
- Remote hit: 0
- Sunset kuralı: 3 ardışık monthly raporda sıfır hit ve access log teyidi
- Docs örnek dosyalar:
  - `docs/LEGACY_ROUTE_INVENTORY.md` (1)
  - `docs/ROUTE_LEGACY_POLICY.md` (1)
  - `docs/ROUTE_OWNERSHIP.md` (1)

## Not

- Bu rapor full access log geçmişi değil, örneklenmiş son log satırları üzerinden üretilir.
- `örnekleme bazlı silme adayı` kararı otomatik silme anlamına gelmez; daha uzun dönem log teyidi gerekir.
- `access log teyidi bekleniyor` durumu, repo temiz olsa bile erişim logu bağlanmadan silme kararı verilmemesi gerektiğini gösterir.

